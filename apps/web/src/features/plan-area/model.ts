import { exploreOverlapGeometry } from '../../map/exploreOverlapGeometry'
import { natureTypeDefinitions, PLAN_PIXEL_METERS, type PlannedDevelopmentOverlayGrid } from '../../map/plannedDevelopment'
import type { Geometry } from '../future-analysis/geometry'
export const PLAN_AREA_METHOD = 'planned-land-cover-area-v1' as const
export const planDaa=(value:number)=>`${new Intl.NumberFormat('nb-NO',{maximumFractionDigits:2}).format(value)} daa`
export const planAreaCategories = [
  ...natureTypeDefinitions.map((d, i) => ({ id: d.id as string, label: d.label as string, code: i + 1, group: 'nature' as const, color: d.displayColor as string })),
  { id: 'unclassified-nature', label: 'Ufordelt natur', code: 6, group: 'nature' as const, color: '#87948b' },
  { id: 'agriculture', label: 'Jordbruk', code: 7, group: 'agriculture' as const, color: '#FFD16E' },
] as const
export interface PlanAreaGrid { mask: Uint8Array; width: number; height: number; extent: [number, number, number, number]; offsetX: number; offsetY: number }
export interface PlanAreaMetric { id: string; label: string; code: number; group: 'nature' | 'agriculture'; color: string; areaDaa: number; cells: number }
export interface PlanAreaAnalysis {
  status: 'available'; municipalityNumber: string; methodVersion: typeof PLAN_AREA_METHOD; analysisId: string
  natureDaa: number; agricultureDaa: number; totalDaa: number; categories: PlanAreaMetric[]; grid: PlanAreaGrid
  classification: { status: 'complete' | 'partial' | 'error'; unclassifiedDaa: number; reason: string | null }
  provenance: { retrievedAt: string; planSource: string; classificationSource: string; classificationLevel: string; grunnkartVersion: string; overviewRetrieved: string; maskHash: string; classificationHash: string; tileHashes: { coordinate: number[]; sha256: string }[]; areaFactor: number; planCellMeters: number; classificationCellMeters: number; crs: 'EPSG:25833'; computationMs: number }
}
export type PlanAreaResult = PlanAreaAnalysis | { status: 'not_available'; municipalityNumber: string; reason: string }
export type PlanAreaSelection = { kind: 'all' | 'nature' | 'agriculture' } | { kind: 'category'; id: string }

export function createPlanAreaGrid(parent: PlannedDevelopmentOverlayGrid): PlanAreaGrid {
  if (parent.analysisMask.length !== parent.width * parent.height) throw new Error('Ugyldig planmaske.')
  const dx = (parent.extent[2] - parent.extent[0]) / parent.width, dy = (parent.extent[3] - parent.extent[1]) / parent.height
  if (Math.abs(dx - PLAN_PIXEL_METERS) > 1e-6 || Math.abs(dy - dx) > 1e-6) throw new Error('Planmasken bruker et annet rutenett.')
  let minX = parent.width, minY = parent.height, maxX = -1, maxY = -1
  for (let i = 0; i < parent.analysisMask.length; i++) {
    const value = parent.analysisMask[i]
    if (![0, 1, 2].includes(value)) throw new Error('Planmasken inneholder andre klasser enn Natur/Jordbruk.')
    if (value) { const x = i % parent.width, y = Math.floor(i / parent.width); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y) }
  }
  if (maxX < 0) { minX = minY = maxX = maxY = 0 }
  const width = (maxX - minX + 1) * 2, height = (maxY - minY + 1) * 2, mask = new Uint8Array(width * height)
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const value = parent.analysisMask[y * parent.width + x], code = value === 1 ? 6 : value === 2 ? 7 : 0
    const i = (y - minY) * 2 * width + (x - minX) * 2
    mask[i] = mask[i + 1] = mask[i + width] = mask[i + width + 1] = code
  }
  return { mask, width, height, extent: [parent.extent[0] + minX * dx, parent.extent[3] - (maxY + 1) * dy, parent.extent[0] + (maxX + 1) * dx, parent.extent[3] - minY * dy], offsetX: minX * 2, offsetY: minY * 2 }
}
// Exact colors from the existing custom SLD. No nearest-color assignment.
export function classifyPlanNature(r: number, g: number, b: number, alpha: number): number {
  if (alpha < 100) return 6
  const found = natureTypeDefinitions.findIndex(d => d.color[0] === r && d.color[1] === g && d.color[2] === b)
  return found < 0 ? 6 : found + 1
}
export function applyClassificationTile(grid: PlanAreaGrid, parent: PlannedDevelopmentOverlayGrid, coordinate: number[], pixels: Uint8ClampedArray) {
  const size = 1024
  if (pixels.length !== size * size * 4) throw new Error('Økosystemflisen har feil størrelse.')
  const offsetX = coordinate[1] * size - parent.cx0 * 2 - grid.offsetX, offsetY = coordinate[2] * size - parent.cy0 * 2 - grid.offsetY
  for (let sy = Math.max(0, -offsetY); sy < Math.min(size, grid.height - offsetY); sy++) for (let sx = Math.max(0, -offsetX); sx < Math.min(size, grid.width - offsetX); sx++) {
    const i = (sy + offsetY) * grid.width + sx + offsetX
    if (grid.mask[i] !== 6) continue
    const rgba = (sy * size + sx) * 4
    grid.mask[i] = classifyPlanNature(pixels[rgba], pixels[rgba + 1], pixels[rgba + 2], pixels[rgba + 3])
  }
}
export function summarizePlanArea(grid: PlanAreaGrid, areaFactor: number) {
  if (!Number.isFinite(areaFactor) || areaFactor <= 0) throw new Error('Manglende arealkorreksjon.')
  const cells = new Array<number>(8).fill(0)
  for (const code of grid.mask) { if (code > 7) throw new Error('Ukjent resultatklasse.'); cells[code]++ }
  const cellAreaDaa = (PLAN_PIXEL_METERS / 2) ** 2 * areaFactor / 1000
  const categories = planAreaCategories.map(c => ({ ...c, cells: cells[c.code], areaDaa: cells[c.code] * cellAreaDaa }))
  const natureDaa = categories.filter(c => c.group === 'nature').reduce((n, c) => n + c.areaDaa, 0), agricultureDaa = categories[6].areaDaa
  return { categories, natureDaa, agricultureDaa, totalDaa: natureDaa + agricultureDaa }
}
export function planAreaSelectedMetrics(result: PlanAreaAnalysis, selection: PlanAreaSelection) {
  return result.categories.filter(c => selection.kind === 'all' || (selection.kind === 'category' ? c.id === selection.id : c.group === selection.kind))
}
const geometries = new WeakMap<PlanAreaAnalysis, Map<string, Geometry>>()
export function planAreaGeometry(result: PlanAreaAnalysis, selection: PlanAreaSelection): Geometry {
  const key = JSON.stringify(selection), cache = geometries.get(result) ?? new Map<string, Geometry>()
  geometries.set(result, cache)
  if (!cache.has(key)) {
    const codes = new Set(planAreaSelectedMetrics(result, selection).map(c => c.code))
    const mask = result.grid.mask.map(code => codes.has(code) ? 1 : 0)
    cache.set(key, exploreOverlapGeometry({ ...result.grid, mask, fillColor: '', strokeColor: '' }).getCoordinates() as Geometry)
  }
  return cache.get(key)!
}
