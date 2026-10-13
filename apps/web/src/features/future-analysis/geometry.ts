import clipping from 'polygon-clipping'
import EsriJSON from 'ol/format/EsriJSON'
import Polygon from 'ol/geom/Polygon'
import MultiPolygon from 'ol/geom/MultiPolygon'
import { exploreOverlapGeometry } from '../../map/exploreOverlapGeometry'
import type { PlannedDevelopmentOverlayGrid } from '../../map/plannedDevelopment'
export type Geometry = import('polygon-clipping').MultiPolygon
export const AREA_TOLERANCE_M2 = 0.01

/** Translate around a ring vertex to avoid cancellation in UTM coordinates. */
export function ringArea(ring: number[][]): number {
  const [x, y] = ring[0]
  let sum = 0
  for (let i = 1; i < ring.length; i++) sum += (ring[i - 1][0] - x) * (ring[i][1] - y) - (ring[i][0] - x) * (ring[i - 1][1] - y)
  return sum / 2
}
export function geometryArea(geometry: Geometry): number {
  return geometry.reduce((total, polygon) => total + Math.abs(ringArea(polygon[0])) - polygon.slice(1).reduce((sum, ring) => sum + Math.abs(ringArea(ring)), 0), 0)
}
export function union(geometries: Geometry[]): Geometry {
  // Balanced pairwise union avoids very large function argument lists and intermediate sweeps.
  let level = geometries.filter((g) => g.length)
  while (level.length > 1) {
    const next: Geometry[] = []
    for (let i = 0; i < level.length; i += 2) next.push(i + 1 < level.length ? clipping.union(level[i], level[i + 1]) : level[i])
    level = next
  }
  return level[0] ?? []
}
function cross(a: number[], b: number[], c: number[]) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) }
function validRing(ring: number[][]) {
  if (ring.length < 4 || ring.some((p) => p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) return false
  if (ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1]) return false
  const segments = ring.slice(1).map((b, i) => ({ a: ring[i], b, i, min: Math.min(b[0], ring[i][0]), max: Math.max(b[0], ring[i][0]) })).sort((a, b) => a.min - b.min)
  for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length && segments[j].min <= segments[i].max; j++) {
    const a = segments[i], b = segments[j]
    if (Math.abs(a.i - b.i) <= 1 || Math.abs(a.i - b.i) === ring.length - 2) continue
    if (Math.max(a.a[1], a.b[1]) < Math.min(b.a[1], b.b[1]) || Math.max(b.a[1], b.b[1]) < Math.min(a.a[1], a.b[1])) continue
    const c1 = cross(a.a, a.b, b.a), c2 = cross(a.a, a.b, b.b), c3 = cross(b.a, b.b, a.a), c4 = cross(b.a, b.b, a.b)
    // Proper self-crossings and collinear overlaps are invalid; repeated adjacent vertices are handled by the clipping library.
    if (c1 * c2 < 0 && c3 * c4 < 0 || c1 === 0 && c2 === 0 && c3 === 0 && c4 === 0) return false
  }
  return true
}
export function sourceGeometry(rings: unknown): Geometry {
  if (!Array.isArray(rings) || !rings.length) throw new Error('Manglende geometri')
  if (!rings.every((ring) => Array.isArray(ring) && validRing(ring))) throw new Error('Ugyldig eller ufullstendig ringgeometri')
  const geometry = new EsriJSON().readGeometry({ rings, spatialReference: { wkid: 25833 } })
  let coords: Geometry
  if (geometry instanceof MultiPolygon) coords = geometry.getCoordinates() as Geometry
  else if (geometry instanceof Polygon) coords = [geometry.getCoordinates()] as Geometry
  else throw new Error('Ugyldig polygongeometri')
  const area = geometryArea(coords)
  if (!(area > 0)) throw new Error('Nullareal')
  const normalized = clipping.union(coords)
  if (Math.abs(geometryArea(normalized) - area) > Math.max(AREA_TOLERANCE_M2, area * 1e-8)) throw new Error('Inkonsekvent topologi; ingen automatisk reparasjon utført')
  return normalized
}
export function clipToMask(geometry: Geometry, grid: PlannedDevelopmentOverlayGrid): Geometry {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const polygon of geometry) for (const ring of polygon) for (const [x, y] of ring) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y) }
  const dx = (grid.extent[2] - grid.extent[0]) / grid.width, dy = (grid.extent[3] - grid.extent[1]) / grid.height
  const left = Math.max(0, Math.floor((minX - grid.extent[0]) / dx))
  const right = Math.min(grid.width, Math.ceil((maxX - grid.extent[0]) / dx))
  const top = Math.max(0, Math.floor((grid.extent[3] - maxY) / dy))
  const bottom = Math.min(grid.height, Math.ceil((grid.extent[3] - minY) / dy))
  if (right <= left || bottom <= top) return []
  const width = right - left, height = bottom - top, mask = new Uint8Array(width * height)
  let hits = 0
  for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
    if (grid.analysisMask[(row + top) * grid.width + col + left]) { mask[row * width + col] = 1; hits++ }
  }
  if (!hits) return []
  const boundary = exploreOverlapGeometry({ mask, width, height,
    extent: [grid.extent[0] + left * dx, grid.extent[3] - bottom * dy, grid.extent[0] + right * dx, grid.extent[3] - top * dy], fillColor: '', strokeColor: '' })
  return clipping.intersection(geometry, boundary.getCoordinates() as Geometry)
}
