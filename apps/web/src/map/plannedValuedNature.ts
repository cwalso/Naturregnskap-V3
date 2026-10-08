import { getMunicipalityAreaFactor } from './utmArea'
import { valuedNature } from '../datasets/registry'
import {
  PLAN_PIXEL_METERS,
  type PlannedDevelopmentAnalysis,
  type PlannedDevelopmentOverlayGrid,
} from './plannedDevelopment'
import type { AnalysisRasterOverlay } from './analysisRasterOverlay'

const PAGE_SIZE = 1000

const valueCategoryColors: Record<string, string> = {
  'Svært stor verdi': '#AF0C0C',
  'Stor verdi': '#FD7032',
  'Middels verdi': '#FEC02D',
  'Noe verdi': '#FFFE37',
  'Vurderes per lokalitet': '#0084A8',
  'Vurderes per naturtype': '#BED2FF',
  'Ikke gitt verdi': '#C4C9AD',
  'Ikke oppgitt': '#D8DDDA',
}

export const valuedAnalysisCategories = [
  'Svært stor verdi',
  'Stor verdi',
  'Middels verdi',
  'Noe verdi',
] as const
const valueCategoryOrder: readonly string[] = valuedAnalysisCategories

type EsriRing = readonly (readonly [number, number])[]
type EsriRings = readonly EsriRing[]

interface EsriValuedNatureFeature {
  readonly attributes: Record<string, unknown>
  readonly geometry?: {
    readonly rings?: EsriRings
  }
}

interface EsriQueryResponse {
  readonly features?: readonly EsriValuedNatureFeature[]
  readonly exceededTransferLimit?: boolean
  readonly error?: {
    readonly message?: string
  }
}

export interface ValuedNatureBreakdownMetric {
  readonly label: string
  readonly color?: string
  readonly featureCount: number
  readonly areaKm2: number
  readonly sharePercent: number
  readonly mapPixelIndices: Uint32Array
}

export type ValuedNatureMapSelection =
  | { readonly kind: 'all' }
  | { readonly kind: 'value'; readonly label: string }
  | { readonly kind: 'type'; readonly label: string }

export interface ValuedNatureLocality {
  readonly id: string
  readonly name: string
  readonly natureType: string
  readonly value: string
  readonly color: string
  /** Source geometry in EPSG:25833, independent of the calculation grid. */
  readonly rings: EsriRings
  readonly overlapAreaKm2: number
}

export interface PlannedValuedNatureAnalysis {
  readonly municipalityNumber: string
  readonly analysisId: string
  readonly status: 'available'
  readonly source: 'Miljødirektoratet – naturtyper med KU-verdi'
  readonly methodVersion: 'planned-valued-nature-v2'
  readonly pixelMeters: number
  readonly candidateFeatureCount: number
  readonly affectedFeatureCount: number
  readonly uniqueOverlapAreaKm2: number
  readonly registeredOverlapAreaKm2: number
  readonly hasOverlappingRegistrations: boolean
  readonly allOverlapPixelIndices: Uint32Array
  readonly valueMetrics: readonly ValuedNatureBreakdownMetric[]
  readonly typeMetrics: readonly ValuedNatureBreakdownMetric[]
  readonly localities: readonly ValuedNatureLocality[]
}

interface CachedAnalysisRequest {
  readonly request: Promise<PlannedValuedNatureAnalysis>
  readonly signal?: AbortSignal
  completed: boolean
}

const analysisCache = new Map<string, CachedAnalysisRequest>()
const MAX_COMPLETED_ANALYSES = 16

function trimAnalysisCache() {
  let completed = Array.from(analysisCache.values()).filter((entry) => entry.completed).length
  for (const [key, entry] of analysisCache) {
    if (completed <= MAX_COMPLETED_ANALYSES) break
    if (entry.completed) { analysisCache.delete(key); completed -= 1 }
  }
}

export async function calculatePlannedValuedNatureAnalysis(
  analysis: PlannedDevelopmentAnalysis,
  signal?: AbortSignal,
): Promise<PlannedValuedNatureAnalysis> {
  signal?.throwIfAborted()
  const cacheKey = `${analysis.municipalityNumber}:${analysis.analysisId}`
  const cached = analysisCache.get(cacheKey)
  if (cached && (cached.completed || !cached.signal?.aborted)) {
    analysisCache.delete(cacheKey)
    analysisCache.set(cacheKey, cached)
    const result = await cached.request
    signal?.throwIfAborted()
    return result
  }

  const request = runAnalysis(analysis, signal)
    .then((result) => {
      entry.completed = true
      trimAnalysisCache()
      return result
    })
    .catch((error: unknown) => {
      if (analysisCache.get(cacheKey) === entry) analysisCache.delete(cacheKey)
      throw error
    })
  const entry: CachedAnalysisRequest = { request, signal, completed: false }
  analysisCache.set(cacheKey, entry)
  return request
}

async function runAnalysis(
  analysis: PlannedDevelopmentAnalysis,
  signal?: AbortSignal,
): Promise<PlannedValuedNatureAnalysis> {
  const features = await fetchValuedNatureFeatures(analysis.overlay.extent, signal)
  signal?.throwIfAborted()
  const factor = await getMunicipalityAreaFactor(analysis.municipalityNumber, signal)
  const summary = summarizeFeatures(features, analysis.overlay, factor)
  const pixelAreaKm2 = PLAN_PIXEL_METERS * PLAN_PIXEL_METERS / 1_000_000 * factor
  const registeredOverlapAreaKm2 = summary.featurePixelTotal * pixelAreaKm2
  const uniqueOverlapAreaKm2 = summary.uniquePixelCount * pixelAreaKm2

  return {
    municipalityNumber: analysis.municipalityNumber,
    analysisId: analysis.analysisId,
    status: 'available',
    source: 'Miljødirektoratet – naturtyper med KU-verdi',
    methodVersion: 'planned-valued-nature-v2',
    pixelMeters: PLAN_PIXEL_METERS,
    candidateFeatureCount: features.length,
    affectedFeatureCount: summary.affectedFeatureCount,
    uniqueOverlapAreaKm2,
    registeredOverlapAreaKm2,
    hasOverlappingRegistrations:
      summary.featurePixelTotal > summary.uniquePixelCount,
    allOverlapPixelIndices: summary.uniquePixelIndices,
    localities: summary.localities,
    valueMetrics: buildMetrics(
      summary.byValue,
      summary.affectedFeatureCount,
      summary.uniquePixelCount,
      pixelAreaKm2,
      true,
    ),
    typeMetrics: buildMetrics(
      summary.byType,
      summary.affectedFeatureCount,
      summary.featurePixelTotal,
      pixelAreaKm2,
      false,
    ),
  }
}

export function buildValuedNatureMapOverlay(
  analysis: PlannedValuedNatureAnalysis,
  planOverlay: PlannedDevelopmentOverlayGrid,
  selection: ValuedNatureMapSelection,
): AnalysisRasterOverlay | null {
  let indices: Uint32Array
  let fillColor = '#6F3FA0'
  let strokeColor = '#3D1463'

  if (selection.kind === 'all') {
    indices = analysis.allOverlapPixelIndices
  } else {
    const metrics = selection.kind === 'value'
      ? analysis.valueMetrics
      : analysis.typeMetrics
    const metric = metrics.find((item) => item.label === selection.label)
    if (!metric) return null
    indices = metric.mapPixelIndices

    if (selection.kind === 'value' && metric.color) {
      fillColor = metric.color
      strokeColor = darkenHex(metric.color)
    }
  }

  if (indices.length === 0) return null

  const mask = new Uint8Array(planOverlay.analysisMask.length)
  for (const index of indices) {
    if (index < mask.length) mask[index] = 1
  }

  return {
    width: planOverlay.width,
    height: planOverlay.height,
    extent: planOverlay.extent,
    mask,
    fillColor,
    strokeColor,
    strong: true,
  }
}

function darkenHex(hex: string): string {
  const normalized = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '#3D1463'

  const channels = [0, 2, 4].map((offset) => (
    Math.max(0, Math.round(Number.parseInt(normalized.slice(offset, offset + 2), 16) * 0.62))
  ))

  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

export function buildValuedNatureQueryBody(
  extent: readonly [number, number, number, number],
  offset = 0,
): URLSearchParams {
  return new URLSearchParams({
    f: 'json',
    where: `Verdikategori IN (${valuedAnalysisCategories.map((category) => `'${category}'`).join(',')})`,
    geometry: JSON.stringify({
      xmin: extent[0],
      ymin: extent[1],
      xmax: extent[2],
      ymax: extent[3],
      spatialReference: { wkid: 25833 },
    }),
    geometryType: 'esriGeometryEnvelope',
    inSR: '25833',
    outSR: '25833',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'OBJECTID,KuverdiNaturtypeId,Verdikategori,Naturtype,Områdenavn',
    returnGeometry: 'true',
    geometryPrecision: '1',
    orderByFields: 'OBJECTID',
    resultOffset: String(offset),
    resultRecordCount: String(PAGE_SIZE),
  })
}

async function fetchValuedNatureFeatures(
  extent: readonly [number, number, number, number],
  signal?: AbortSignal,
): Promise<readonly EsriValuedNatureFeature[]> {
  const queryUrl = valuedNature.analysisSource?.queryUrl
  if (!queryUrl) throw new Error('Verdsatte naturtyper mangler analysekilde')

  const features: EsriValuedNatureFeature[] = []
  let offset = 0

  while (true) {
    const response = await fetch(queryUrl, {
      method: 'POST',
      body: buildValuedNatureQueryBody(extent, offset),
      signal,
    })
    if (!response.ok) {
      throw new Error(`Verdsatte naturtyper feilet med HTTP ${response.status}`)
    }

    const data = await response.json() as EsriQueryResponse
    if (data.error) {
      throw new Error(data.error.message ?? 'Verdsatte naturtyper returnerte en feil')
    }

    if (!Array.isArray(data.features)) throw new Error('Verdsatte naturtyper returnerte et ugyldig svar')
    const page = data.features
    if (data.exceededTransferLimit && page.length === 0) throw new Error('Verdsatte naturtyper ga et ufullstendig svar')
    features.push(...page)

    if (!data.exceededTransferLimit && page.length < PAGE_SIZE) break
    if (page.length === 0) break
    offset += page.length
  }

  return features
}

interface GroupCounter {
  featureCount: number
  pixelCount: number
  pixelIndices: Set<number>
}

interface FeatureSummary {
  localities: ValuedNatureLocality[]
  affectedFeatureCount: number
  featurePixelTotal: number
  uniquePixelCount: number
  uniquePixelIndices: Uint32Array
  byValue: Map<string, GroupCounter>
  byType: Map<string, GroupCounter>
}

export function summarizeValuedNatureFeaturesForTest(
  features: readonly EsriValuedNatureFeature[],
  overlay: PlannedDevelopmentOverlayGrid,
): FeatureSummary {
  return summarizeFeatures(features, overlay)
}

function summarizeFeatures(
  features: readonly EsriValuedNatureFeature[],
  overlay: PlannedDevelopmentOverlayGrid,
  areaFactor = 1,
): FeatureSummary {
  const byValue = new Map<string, GroupCounter>()
  const byType = new Map<string, GroupCounter>()
  const uniqueOverlap = new Uint8Array(overlay.analysisMask.length)
  const winningValue = new Uint8Array(overlay.analysisMask.length)
  const localities: ValuedNatureLocality[] = []
  const seenIds = new Set<string>()

  let affectedFeatureCount = 0
  let featurePixelTotal = 0

  for (const feature of features) {
    const value = attributeText(feature.attributes, 'Verdikategori')
    const rank = valueCategoryOrder.indexOf(value)
    if (rank < 0) continue
    const id = feature.attributes.OBJECTID
    if (id === undefined || id === null) throw new Error('Verdsatte naturtyper mangler kildeobjekt-ID')
    const sourceId = String(id)
    if (seenIds.has(sourceId)) continue
    seenIds.add(sourceId)
    const rings = normalizeRings(feature.geometry?.rings)
    if (rings.length === 0) continue

    const pixelIndices = featurePixelIndices(rings, overlay, uniqueOverlap)
    if (pixelIndices.length === 0) continue

    affectedFeatureCount += 1
    featurePixelTotal += pixelIndices.length

    const natureType = attributeText(feature.attributes, 'Naturtype')
    localities.push({
      id: sourceId,
      name: attributeText(feature.attributes, 'Områdenavn'),
      natureType, value, color: valueCategoryColors[value] ?? '#D8DDDA', rings,
      overlapAreaKm2: pixelIndices.length * PLAN_PIXEL_METERS * PLAN_PIXEL_METERS / 1_000_000 * areaFactor,
    })
    incrementGroup(byValue, value, pixelIndices)
    incrementGroup(byType, natureType, pixelIndices)
    for (const index of pixelIndices) {
      if (!winningValue[index] || rank + 1 < winningValue[index]) winningValue[index] = rank + 1
    }
  }

  // Category areas partition the unique union. Counts and per-locality areas
  // still describe affected registrations, including lower-value overlaps.
  for (const counter of byValue.values()) { counter.pixelCount = 0; counter.pixelIndices.clear() }
  for (let index = 0; index < winningValue.length; index += 1) {
    const rank = winningValue[index]
    if (!rank) continue
    const counter = byValue.get(valueCategoryOrder[rank - 1])!
    counter.pixelCount += 1
    counter.pixelIndices.add(index)
  }

  const uniquePixelIndices: number[] = []
  for (let index = 0; index < uniqueOverlap.length; index += 1) {
    if (uniqueOverlap[index]) uniquePixelIndices.push(index)
  }

  return {
    localities,
    affectedFeatureCount,
    featurePixelTotal,
    uniquePixelCount: uniquePixelIndices.length,
    uniquePixelIndices: Uint32Array.from(uniquePixelIndices),
    byValue,
    byType,
  }
}

function featurePixelIndices(
  rings: readonly (readonly [number, number])[][],
  overlay: PlannedDevelopmentOverlayGrid,
  uniqueOverlap: Uint8Array,
): number[] {
  const bounds = polygonBounds(rings)
  if (!bounds) return []

  const [minX, minY, maxX, maxY] = bounds
  const [extentMinX, extentMinY, extentMaxX, extentMaxY] = overlay.extent
  const resolutionX = (extentMaxX - extentMinX) / overlay.width
  const resolutionY = (extentMaxY - extentMinY) / overlay.height

  const minColumn = clamp(Math.floor((minX - extentMinX) / resolutionX), 0, overlay.width - 1)
  const maxColumn = clamp(Math.floor((maxX - extentMinX) / resolutionX), 0, overlay.width - 1)
  const minRow = clamp(Math.floor((extentMaxY - maxY) / resolutionY), 0, overlay.height - 1)
  const maxRow = clamp(Math.floor((extentMaxY - minY) / resolutionY), 0, overlay.height - 1)

  if (
    maxX < extentMinX
    || minX > extentMaxX
    || maxY < extentMinY
    || minY > extentMaxY
  ) {
    return []
  }

  const pixelIndices: number[] = []
  for (let row = minRow; row <= maxRow; row += 1) {
    const y = extentMaxY - (row + 0.5) * resolutionY
    const rowStart = row * overlay.width

    for (let column = minColumn; column <= maxColumn; column += 1) {
      const index = rowStart + column
      if (!overlay.analysisMask[index]) continue

      const x = extentMinX + (column + 0.5) * resolutionX
      if (!pointInPolygon(x, y, rings)) continue

      pixelIndices.push(index)
      uniqueOverlap[index] = 1
    }
  }

  return pixelIndices
}

function normalizeRings(
  value: EsriRings | undefined,
): readonly (readonly [number, number])[][] {
  if (!Array.isArray(value)) return []

  const rings: [number, number][][] = []
  for (const ring of value) {
    if (!Array.isArray(ring)) continue

    const points: [number, number][] = []
    for (const point of ring) {
      if (
        Array.isArray(point)
        && point.length >= 2
        && Number.isFinite(Number(point[0]))
        && Number.isFinite(Number(point[1]))
      ) {
        points.push([Number(point[0]), Number(point[1])])
      }
    }
    if (points.length >= 3) rings.push(points)
  }
  return rings
}

function pointInPolygon(
  x: number,
  y: number,
  rings: readonly (readonly [number, number])[][],
): boolean {
  let inside = false
  for (const ring of rings) {
    if (pointInRing(x, y, ring)) inside = !inside
  }
  return inside
}

function pointInRing(
  x: number,
  y: number,
  ring: readonly (readonly [number, number])[],
): boolean {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [xi, yi] = ring[index]
    const [xj, yj] = ring[previous]
    const crosses = (yi > y) !== (yj > y)
      && x < (xj - xi) * (y - yi) / (yj - yi) + xi
    if (crosses) inside = !inside
  }
  return inside
}

function polygonBounds(
  rings: readonly (readonly [number, number])[][],
): [number, number, number, number] | null {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const ring of rings) {
    for (const [x, y] of ring) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null
}

function attributeText(attributes: Record<string, unknown>, field: string): string {
  const value = attributes[field]
  return typeof value === 'string' && value.trim() ? value.trim() : 'Ikke oppgitt'
}

function incrementGroup(
  groups: Map<string, GroupCounter>,
  label: string,
  pixelIndices: readonly number[],
) {
  const current = groups.get(label) ?? {
    featureCount: 0,
    pixelCount: 0,
    pixelIndices: new Set<number>(),
  }
  for (const index of pixelIndices) current.pixelIndices.add(index)
  groups.set(label, {
    featureCount: current.featureCount + 1,
    pixelCount: current.pixelCount + pixelIndices.length,
    pixelIndices: current.pixelIndices,
  })
}

function buildMetrics(
  groups: Map<string, GroupCounter>,
  affectedFeatureCount: number,
  featurePixelTotal: number,
  pixelAreaKm2: number,
  useValueColors: boolean,
): ValuedNatureBreakdownMetric[] {
  const metrics = [...groups.entries()].map(([label, counter]) => ({
    label,
    color: useValueColors ? valueCategoryColors[label] ?? '#D8DDDA' : undefined,
    featureCount: counter.featureCount,
    areaKm2: counter.pixelCount * pixelAreaKm2,
    sharePercent: featurePixelTotal > 0
      ? counter.pixelCount / featurePixelTotal * 100
      : affectedFeatureCount > 0
        ? counter.featureCount / affectedFeatureCount * 100
        : 0,
    mapPixelIndices: Uint32Array.from(counter.pixelIndices),
  }))

  if (useValueColors) {
    return metrics.sort((a, b) => {
      const aIndex = valueCategoryOrder.indexOf(a.label as typeof valueCategoryOrder[number])
      const bIndex = valueCategoryOrder.indexOf(b.label as typeof valueCategoryOrder[number])
      const normalizedA = aIndex === -1 ? valueCategoryOrder.length : aIndex
      const normalizedB = bIndex === -1 ? valueCategoryOrder.length : bIndex
      return normalizedA - normalizedB
    })
  }

  return metrics.sort((a, b) => b.areaKm2 - a.areaKm2 || b.featureCount - a.featureCount)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
