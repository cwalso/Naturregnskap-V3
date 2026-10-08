import { getMunicipalityAreaFactor, municipalityAreaFactor } from '../map/utmArea'
import proj4 from 'proj4'

import type { MunicipalityBoundary } from './municipalities'
import { valuedNature } from '../datasets/registry'
import type { PlannedDevelopmentAnalysis } from '../map/plannedDevelopment'

const PAGE_SIZE = 5000
const COVERAGE_QUERY_URL =
  'https://kart.miljodirektoratet.no/arcgis/rest/services/naturtyper_nin/FeatureServer/1/query'

const ETRS89_UTM33 =
  '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs +type=crs'

export const valuedNatureValueColors: Record<string, string> = {
  'Svært stor verdi': '#AF0C0C',
  'Stor verdi': '#FD7032',
  'Middels verdi': '#FEC02D',
  'Noe verdi': '#FFCC00',
  'Vurderes per lokalitet': '#0084A8',
  'Vurderes per naturtype': '#86A9E6',
  'Ikke gitt verdi': '#AEB39C',
  'Ikke oppgitt': '#D8DDDA',
}

const valueCategoryOrder = [
  'Svært stor verdi',
  'Stor verdi',
  'Middels verdi',
  'Noe verdi',
  'Vurderes per lokalitet',
  'Vurderes per naturtype',
  'Ikke gitt verdi',
  'Ikke oppgitt',
] as const

type EsriRing = readonly (readonly [number, number])[]
type EsriRings = readonly EsriRing[]

interface EsriFeature {
  readonly attributes?: Record<string, unknown>
  readonly geometry?: {
    readonly rings?: EsriRings
  }
}

interface EsriQueryResponse {
  readonly features?: readonly EsriFeature[]
  readonly exceededTransferLimit?: boolean
  readonly error?: {
    readonly message?: string
  }
}

export interface ValuedNatureStatisticMetric {
  readonly label: string
  readonly featureCount: number
  readonly areaKm2: number
  readonly sharePercent: number
  readonly color?: string
}

export interface ValuedNatureStatistics {
  readonly municipalityNumber: string
  readonly municipalityName: string
  readonly status: 'available'
  readonly methodVersion: 'valued-nature-statistics-v2'
  readonly source: 'Miljødirektoratet'
  readonly featureCount: number
  readonly registeredAreaKm2: number
  readonly mappedCoverageKm2: number
  readonly municipalityAreaKm2: number
  readonly mappedCoveragePercent: number
  readonly coverageCellMeters: number
  readonly valueMetrics: readonly ValuedNatureStatisticMetric[]
  readonly typeMetrics: readonly ValuedNatureStatisticMetric[]
  readonly warnings: readonly string[]
}

export interface PlannedCoverageGap {
  readonly analysisId: string
  readonly municipalityNumber: string
  readonly status: 'available'
  readonly methodVersion: 'planned-coverage-gap-v2'
  readonly plannedAreaKm2: number
  readonly mappedPlannedAreaKm2: number
  readonly unmappedPlannedAreaKm2: number
  readonly mappedSharePercent: number
}

const statisticsCache = new Map<string, Promise<ValuedNatureStatistics>>()
const coverageGapCache = new Map<string, { request: Promise<PlannedCoverageGap>; signal?: AbortSignal; completed: boolean }>()

export function getValuedNatureStatistics(
  boundary: MunicipalityBoundary,
  signal?: AbortSignal,
): Promise<ValuedNatureStatistics> {
  const key = boundary.properties.number
  const cached = statisticsCache.get(key)
  if (cached) return cached

  const request = runStatistics(boundary, signal).catch((error: unknown) => {
    statisticsCache.delete(key)
    throw error
  })
  statisticsCache.set(key, request)
  return request
}

export async function getPlannedCoverageGap(
  analysis: PlannedDevelopmentAnalysis,
  signal?: AbortSignal,
): Promise<PlannedCoverageGap> {
  signal?.throwIfAborted()
  const key = `${analysis.municipalityNumber}:${analysis.analysisId}`
  const cached = coverageGapCache.get(key)
  if (cached && (cached.completed || !cached.signal?.aborted)) {
    coverageGapCache.delete(key)
    coverageGapCache.set(key, cached)
    const result = await cached.request
    signal?.throwIfAborted()
    return result
  }
  const request = runPlannedCoverageGap(analysis, signal).then((result) => {
    signal?.throwIfAborted()
    entry.completed = true
    let count = [...coverageGapCache.values()].filter((item) => item.completed).length
    for (const [oldKey, old] of coverageGapCache) {
      if (count <= 16) break
      if (old.completed) { coverageGapCache.delete(oldKey); count -= 1 }
    }
    return result
  }).catch((error: unknown) => {
    if (coverageGapCache.get(key) === entry) coverageGapCache.delete(key)
    throw error
  })
  const entry = { request, signal, completed: false }
  coverageGapCache.set(key, entry)
  return request
}

async function runStatistics(
  boundary: MunicipalityBoundary,
  signal?: AbortSignal,
): Promise<ValuedNatureStatistics> {
  const [valuedFeatures, coverageFeatures] = await Promise.all([
    fetchFeatures(
      valuedNature.analysisSource?.queryUrl
        ?? (() => { throw new Error('Verdsatte naturtyper mangler analysekilde') })(),
      municipalityQueryBody(boundary, 'OBJECTID,KuverdiNaturtypeId,Verdikategori,Naturtype,Områdenavn'),
      signal,
    ),
    fetchFeatures(
      COVERAGE_QUERY_URL,
      municipalityQueryBody(boundary, 'OBJECTID'),
      signal,
    ),
  ])

  const projectedBoundary = projectBoundary(boundary)
  const factor = municipalityAreaFactor(boundary)
  const municipalityAreaKm2 = geometryArea(projectedBoundary) / 1_000_000 * factor
  const coverage = rasterCoverage(projectedBoundary, coverageFeatures)
  const mappedCoverageKm2 = coverage.coveredCellCount
    * coverage.cellMeters * coverage.cellMeters / 1_000_000 * factor

  const featureMetrics = valuedFeatures.map((feature) => ({
    areaKm2: featureArea(feature) / 1_000_000 * factor,
    value: attributeText(feature.attributes, 'Verdikategori'),
    type: attributeText(feature.attributes, 'Naturtype'),
  }))

  const registeredAreaKm2 = featureMetrics.reduce((sum, item) => sum + item.areaKm2, 0)

  return {
    municipalityNumber: boundary.properties.number,
    municipalityName: boundary.properties.name,
    status: 'available',
    methodVersion: 'valued-nature-statistics-v2',
    source: 'Miljødirektoratet',
    featureCount: valuedFeatures.length,
    registeredAreaKm2,
    mappedCoverageKm2,
    municipalityAreaKm2,
    mappedCoveragePercent: municipalityAreaKm2 > 0
      ? Math.min(100, mappedCoverageKm2 / municipalityAreaKm2 * 100)
      : 0,
    coverageCellMeters: coverage.cellMeters,
    valueMetrics: aggregateMetrics(featureMetrics, 'value', registeredAreaKm2, true),
    typeMetrics: aggregateMetrics(featureMetrics, 'type', registeredAreaKm2, false),
    warnings: [
      'Dekningsgraden er et arealanslag basert på dekningskartet for naturtyper etter Miljødirektoratets instruks.',
      'Areal for verdsatte naturtyper er summen av registrerte lokaliteters geometri som krysser kommunegrensen. Overlapp mellom lokaliteter kan derfor telles mer enn én gang, og lokaliteter som krysser kommunegrensen er foreløpig ikke klippet til grensen.',
      'Kildene er løpende tjenester og er ikke låst til en bestemt dataversjon i prototypen.',
    ],
  }
}

async function runPlannedCoverageGap(
  analysis: PlannedDevelopmentAnalysis,
  signal?: AbortSignal,
): Promise<PlannedCoverageGap> {
  const coverageFeatures = await fetchFeatures(
    COVERAGE_QUERY_URL,
    extentQueryBody(analysis.overlay.extent, 'OBJECTID'),
    signal,
  )

  const overlay = analysis.overlay
  const coverageMask = new Uint8Array(overlay.analysisMask.length)

  for (const feature of coverageFeatures) {
    const rings = normalizeRings(feature.geometry?.rings)
    if (rings.length === 0) continue
    markGridCells(
      rings,
      overlay.extent,
      overlay.width,
      overlay.height,
      coverageMask,
      overlay.analysisMask,
    )
  }

  let plannedCells = 0
  let mappedPlannedCells = 0
  for (let index = 0; index < overlay.analysisMask.length; index += 1) {
    if (!overlay.analysisMask[index]) continue
    plannedCells += 1
    if (coverageMask[index]) mappedPlannedCells += 1
  }

  const cellAreaKm2 =
    (overlay.extent[2] - overlay.extent[0]) / overlay.width
    * (overlay.extent[3] - overlay.extent[1]) / overlay.height
    / 1_000_000
    * await getMunicipalityAreaFactor(analysis.municipalityNumber, signal)

  const plannedAreaKm2 = plannedCells * cellAreaKm2
  const mappedPlannedAreaKm2 = mappedPlannedCells * cellAreaKm2

  return {
    status: 'available',
    methodVersion: 'planned-coverage-gap-v2',
    analysisId: analysis.analysisId,
    municipalityNumber: analysis.municipalityNumber,
    plannedAreaKm2,
    mappedPlannedAreaKm2,
    unmappedPlannedAreaKm2: Math.max(0, plannedAreaKm2 - mappedPlannedAreaKm2),
    mappedSharePercent: plannedAreaKm2 > 0
      ? mappedPlannedAreaKm2 / plannedAreaKm2 * 100
      : 0,
  }
}

function municipalityQueryBody(
  boundary: MunicipalityBoundary,
  outFields: string,
): URLSearchParams {
  return new URLSearchParams({
    f: 'json',
    where: '1=1',
    geometry: JSON.stringify(toEsriPolygon(boundary.geometry)),
    geometryType: 'esriGeometryPolygon',
    inSR: '4326',
    outSR: '25833',
    spatialRel: 'esriSpatialRelIntersects',
    outFields,
    returnGeometry: 'true',
    geometryPrecision: '1',
    orderByFields: 'OBJECTID',
    resultRecordCount: String(PAGE_SIZE),
  })
}

function extentQueryBody(
  extent: readonly [number, number, number, number],
  outFields: string,
): URLSearchParams {
  return new URLSearchParams({
    f: 'json',
    where: '1=1',
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
    outFields,
    returnGeometry: 'true',
    geometryPrecision: '1',
    orderByFields: 'OBJECTID',
    resultRecordCount: String(PAGE_SIZE),
  })
}

async function fetchFeatures(
  queryUrl: string,
  initialBody: URLSearchParams,
  signal?: AbortSignal,
): Promise<readonly EsriFeature[]> {
  const features: EsriFeature[] = []
  let offset = 0

  while (true) {
    const body = new URLSearchParams(initialBody)
    body.set('resultOffset', String(offset))

    const response = await fetch(queryUrl, {
      method: 'POST',
      body,
      signal,
    })
    if (!response.ok) {
      throw new Error(`Temadatatjenesten feilet med HTTP ${response.status}`)
    }

    const data = await response.json() as EsriQueryResponse
    if (data.error) {
      throw new Error(data.error.message ?? 'Temadatatjenesten returnerte en feil')
    }

    if (!Array.isArray(data.features)) throw new Error('Deknings-/temadatatjenesten ga et ugyldig svar')
    const page = data.features
    if (data.exceededTransferLimit && page.length === 0) throw new Error('Deknings-/temadatatjenesten ga et ufullstendig svar')
    features.push(...page)

    if (!data.exceededTransferLimit && page.length < PAGE_SIZE) break
    if (page.length === 0) break
    offset += page.length
  }

  return features
}

function aggregateMetrics(
  metrics: readonly { areaKm2: number; value: string; type: string }[],
  field: 'value' | 'type',
  totalAreaKm2: number,
  useValueColors: boolean,
): ValuedNatureStatisticMetric[] {
  const grouped = new Map<string, { featureCount: number; areaKm2: number }>()

  for (const metric of metrics) {
    const label = metric[field]
    const current = grouped.get(label) ?? { featureCount: 0, areaKm2: 0 }
    grouped.set(label, {
      featureCount: current.featureCount + 1,
      areaKm2: current.areaKm2 + metric.areaKm2,
    })
  }

  const result = [...grouped.entries()].map(([label, item]) => ({
    label,
    featureCount: item.featureCount,
    areaKm2: item.areaKm2,
    sharePercent: totalAreaKm2 > 0 ? item.areaKm2 / totalAreaKm2 * 100 : 0,
    color: useValueColors ? valuedNatureValueColors[label] ?? '#D8DDDA' : undefined,
  }))

  if (useValueColors) {
    return result.sort((a, b) => {
      const aIndex = valueCategoryOrder.indexOf(a.label as typeof valueCategoryOrder[number])
      const bIndex = valueCategoryOrder.indexOf(b.label as typeof valueCategoryOrder[number])
      const normalizedA = aIndex === -1 ? valueCategoryOrder.length : aIndex
      const normalizedB = bIndex === -1 ? valueCategoryOrder.length : bIndex
      return normalizedA - normalizedB
    })
  }

  return result.sort((a, b) => b.areaKm2 - a.areaKm2 || b.featureCount - a.featureCount)
}

function rasterCoverage(
  boundary: readonly (readonly EsriRing[])[],
  features: readonly EsriFeature[],
): { cellMeters: number; coveredCellCount: number } {
  const bounds = geometryBounds(boundary)
  if (!bounds) return { cellMeters: 100, coveredCellCount: 0 }

  const [minX, minY, maxX, maxY] = bounds
  const bboxArea = Math.max(1, (maxX - minX) * (maxY - minY))
  const targetCells = 300_000
  const rawCell = Math.sqrt(bboxArea / targetCells)
  const cellMeters = clamp(Math.ceil(rawCell / 25) * 25, 25, 150)
  const width = Math.max(1, Math.ceil((maxX - minX) / cellMeters))
  const height = Math.max(1, Math.ceil((maxY - minY) / cellMeters))
  const extent: readonly [number, number, number, number] = [
    minX,
    minY,
    minX + width * cellMeters,
    minY + height * cellMeters,
  ]

  const municipalityMask = new Uint8Array(width * height)
  for (let row = 0; row < height; row += 1) {
    const y = extent[3] - (row + 0.5) * cellMeters
    for (let column = 0; column < width; column += 1) {
      const x = extent[0] + (column + 0.5) * cellMeters
      if (pointInMultiPolygon(x, y, boundary)) {
        municipalityMask[row * width + column] = 1
      }
    }
  }

  const coverageMask = new Uint8Array(width * height)
  for (const feature of features) {
    const rings = normalizeRings(feature.geometry?.rings)
    if (rings.length === 0) continue
    markGridCells(rings, extent, width, height, coverageMask, municipalityMask)
  }

  let coveredCellCount = 0
  for (let index = 0; index < coverageMask.length; index += 1) {
    if (coverageMask[index]) coveredCellCount += 1
  }

  return { cellMeters, coveredCellCount }
}

function markGridCells(
  rings: readonly EsriRing[],
  extent: readonly [number, number, number, number],
  width: number,
  height: number,
  outputMask: Uint8Array,
  allowedMask: Uint8Array,
) {
  const bounds = ringsBounds(rings)
  if (!bounds) return

  const resolutionX = (extent[2] - extent[0]) / width
  const resolutionY = (extent[3] - extent[1]) / height
  const minColumn = clamp(Math.floor((bounds[0] - extent[0]) / resolutionX), 0, width - 1)
  const maxColumn = clamp(Math.floor((bounds[2] - extent[0]) / resolutionX), 0, width - 1)
  const minRow = clamp(Math.floor((extent[3] - bounds[3]) / resolutionY), 0, height - 1)
  const maxRow = clamp(Math.floor((extent[3] - bounds[1]) / resolutionY), 0, height - 1)

  if (
    bounds[2] < extent[0]
    || bounds[0] > extent[2]
    || bounds[3] < extent[1]
    || bounds[1] > extent[3]
  ) return

  for (let row = minRow; row <= maxRow; row += 1) {
    const y = extent[3] - (row + 0.5) * resolutionY
    const rowStart = row * width
    for (let column = minColumn; column <= maxColumn; column += 1) {
      const index = rowStart + column
      if (!allowedMask[index]) continue
      const x = extent[0] + (column + 0.5) * resolutionX
      if (pointInPolygon(x, y, rings)) outputMask[index] = 1
    }
  }
}

function projectBoundary(
  boundary: MunicipalityBoundary,
): readonly (readonly EsriRing[])[] {
  return boundaryPolygons(boundary.geometry).map((polygon) => (
    polygon.map((ring) => ring.map((point) => {
      const projected = proj4('EPSG:4326', ETRS89_UTM33, [point[0], point[1]])
      return [projected[0], projected[1]] as const
    }))
  ))
}

function toEsriPolygon(
  geometry: MunicipalityBoundary['geometry'],
): { rings: number[][][]; spatialReference: { wkid: 4326 } } {
  return {
    rings: boundaryPolygons(geometry).flatMap((polygon) => polygon.map((ring) => (
      ring.map((point) => [point[0], point[1]])
    ))),
    spatialReference: { wkid: 4326 },
  }
}

function boundaryPolygons(
  geometry: MunicipalityBoundary['geometry'],
): readonly (readonly EsriRing[])[] {
  if (geometry.type === 'Polygon') {
    return [boundaryPolygon(geometry.coordinates)]
  }
  return geometry.coordinates.map((polygon) => boundaryPolygon(polygon))
}

function boundaryPolygon(value: unknown): readonly EsriRing[] {
  if (!Array.isArray(value)) {
    throw new Error('Kommunegeometrien inneholder et ugyldig polygon')
  }
  return value.map((ring) => boundaryRing(ring))
}

function boundaryRing(value: unknown): EsriRing {
  if (!Array.isArray(value)) {
    throw new Error('Kommunegeometrien inneholder en ugyldig ring')
  }

  return value.map((point) => {
    if (
      !Array.isArray(point)
      || point.length < 2
      || !Number.isFinite(Number(point[0]))
      || !Number.isFinite(Number(point[1]))
    ) {
      throw new Error('Kommunegeometrien inneholder et ugyldig punkt')
    }
    return [Number(point[0]), Number(point[1])] as const
  })
}

function geometryArea(polygons: readonly (readonly EsriRing[])[]): number {
  return polygons.reduce((sum, rings) => sum + Math.abs(
    rings.reduce((ringSum, ring) => ringSum + signedRingArea(ring), 0),
  ), 0)
}

function featureArea(feature: EsriFeature): number {
  const rings = normalizeRings(feature.geometry?.rings)
  return Math.abs(rings.reduce((sum, ring) => sum + signedRingArea(ring), 0))
}

function signedRingArea(ring: EsriRing): number {
  if (ring.length < 3) return 0
  let area = 0
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index]
    const next = ring[(index + 1) % ring.length]
    area += current[0] * next[1] - next[0] * current[1]
  }
  return area / 2
}

function normalizeRings(value: EsriRings | undefined): readonly EsriRing[] {
  if (!Array.isArray(value)) return []
  return value.filter((ring) => Array.isArray(ring) && ring.length >= 3)
}

function pointInMultiPolygon(
  x: number,
  y: number,
  polygons: readonly (readonly EsriRing[])[],
): boolean {
  return polygons.some((rings) => pointInPolygon(x, y, rings))
}

function pointInPolygon(
  x: number,
  y: number,
  rings: readonly EsriRing[],
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
  ring: EsriRing,
): boolean {
  let inside = false
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index, index += 1
  ) {
    const [xi, yi] = ring[index]
    const [xj, yj] = ring[previous]
    const crosses = (yi > y) !== (yj > y)
      && x < (xj - xi) * (y - yi) / (yj - yi) + xi
    if (crosses) inside = !inside
  }
  return inside
}

function geometryBounds(
  polygons: readonly (readonly EsriRing[])[],
): [number, number, number, number] | null {
  const allRings = polygons.flatMap((polygon) => [...polygon])
  return ringsBounds(allRings)
}

function ringsBounds(
  rings: readonly EsriRing[],
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

function attributeText(
  attributes: Record<string, unknown> | undefined,
  field: string,
): string {
  const value = attributes?.[field]
  return typeof value === 'string' && value.trim() ? value.trim() : 'Ikke oppgitt'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
