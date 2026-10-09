import type { MunicipalityBoundary } from './municipalities'
import { valuedNature } from '../datasets/registry'
import { valuedAnalysisCategories } from '../map/plannedValuedNature'

export const municipalValueLegend = [
  { label: 'Svært stor verdi', color: '#AF0C0C', wmsLayer: 'kuverdi_svært_stor_verdi' },
  { label: 'Stor verdi', color: '#FD7032', wmsLayer: 'kuverdi_stor_verdi' },
  { label: 'Middels verdi', color: '#FEC02D', wmsLayer: 'kuverdi_middels_verdi' },
  { label: 'Noe verdi', color: '#FFFE37', wmsLayer: 'kuverdi_noe_verdi' },
] as const

export interface RegisteredNatureLocality {
  readonly id: string
  readonly sourceId: string
  readonly name: string
  readonly natureType: string
  readonly value: string
  readonly color: string
  readonly rings: number[][][]
}
export interface MunicipalValuedNature {
  readonly municipalityNumber: string
  readonly localities: readonly RegisteredNatureLocality[]
  readonly natureTypes: readonly string[]
}
export interface MunicipalNatureFilter {
  readonly natureType: string | null
  readonly value: string | null
}
export const noMunicipalNatureFilter: MunicipalNatureFilter = { natureType: null, value: null }
export function filterRegisteredNature(data: MunicipalValuedNature, filter: MunicipalNatureFilter) {
  return data.localities.filter((item) => (!filter.natureType || item.natureType === filter.natureType)
    && (!filter.value || item.value === filter.value))
}

interface QueryResponse {
  objectIds?: number[]
  features?: { attributes: Record<string, unknown>; geometry?: { rings?: number[][][] } }[]
  exceededTransferLimit?: boolean
  error?: { message?: string }
}
const completed = new Map<string, MunicipalValuedNature>()
const BATCH_SIZE = 200

// Spatial membership uses the municipality polygon, never a plan/analysis mask.
export function municipalNatureQuery(boundary: MunicipalityBoundary): URLSearchParams {
  const polygons = boundary.geometry.type === 'Polygon'
    ? [boundary.geometry.coordinates] : boundary.geometry.coordinates
  const rings = (polygons as number[][][][]).flatMap((polygon) => polygon.map((ring, index) => {
    const signedArea = ring.slice(1).reduce((sum, point, i) => sum + ring[i][0] * point[1] - point[0] * ring[i][1], 0)
    // ArcGIS requires clockwise exteriors and counterclockwise holes.
    return (signedArea > 0) === (index === 0) ? [...ring].reverse() : ring
  }))
  return new URLSearchParams({
    f: 'json', where: `Verdikategori IN (${valuedAnalysisCategories.map((value) => `'${value}'`).join(',')})`,
    geometry: JSON.stringify({ rings, spatialReference: { wkid: 4326 } }),
    geometryType: 'esriGeometryPolygon', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', returnIdsOnly: 'true',
  })
}

export async function getMunicipalValuedNature(boundary: MunicipalityBoundary, signal?: AbortSignal): Promise<MunicipalValuedNature> {
  signal?.throwIfAborted()
  const key = boundary.properties.number
  const cached = completed.get(key)
  if (cached) return cached
  const endpoint = valuedNature.analysisSource.queryUrl
  async function query(body: URLSearchParams): Promise<QueryResponse> {
    signal?.throwIfAborted()
    const response = await fetch(endpoint, { method: 'POST', body, signal })
    if (!response.ok) throw new Error(`Naturtypeoversikten kunne ikke hentes (HTTP ${response.status}).`)
    const data = await response.json() as QueryResponse
    signal?.throwIfAborted()
    if (data.error) throw new Error(data.error.message ?? 'Naturtypetjenesten returnerte en feil.')
    return data
  }
  const idResponse = await query(municipalNatureQuery(boundary))
  if (!Array.isArray(idResponse.objectIds) || idResponse.exceededTransferLimit
    || !idResponse.objectIds.every(Number.isInteger)) throw new Error('Naturtypetjenesten ga en ufullstendig objektoversikt.')
  const ids = [...new Set(idResponse.objectIds)].sort((a, b) => a - b)
  async function batch(batchIds: number[]): Promise<NonNullable<QueryResponse['features']>> {
    const response = await query(new URLSearchParams({
      f: 'json', objectIds: batchIds.join(','), outFields: 'OBJECTID,KuverdiNaturtypeId,Verdikategori,Naturtype,Områdenavn',
      returnGeometry: 'true', outSR: '25833',
    }))
    if (!Array.isArray(response.features)) throw new Error('Naturtypetjenesten ga et ugyldig objektsvar.')
    const returnedIds = new Set(response.features.map((feature) => Number(feature.attributes.OBJECTID)))
    if (response.exceededTransferLimit || batchIds.some((id) => !returnedIds.has(id))) {
      if (batchIds.length === 1) throw new Error('En registrert lokalitet kunne ikke hentes fullstendig.')
      const half = Math.ceil(batchIds.length / 2)
      return [...await batch(batchIds.slice(0, half)), ...await batch(batchIds.slice(half))]
    }
    return response.features
  }
  const batches = Array.from({ length: Math.ceil(ids.length / BATCH_SIZE) }, (_, i) => ids.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE))
  const pages: NonNullable<QueryResponse['features']>[] = new Array(batches.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(4, batches.length) }, async () => {
    while (next < batches.length) {
      const index = next++
      pages[index] = await batch(batches[index])
    }
  }))
  const features = new Map(pages.flat().map((feature) => [String(feature.attributes.OBJECTID), feature]))
  const text = (value: unknown) => typeof value === 'string' && value.trim() ? value : 'Ikke oppgitt'
  const localities = ids.map((id): RegisteredNatureLocality => {
    const feature = features.get(String(id))!
    const rings = feature.geometry?.rings
    const value = text(feature.attributes.Verdikategori)
    const category = municipalValueLegend.find((category) => category.label === value)
    if (!category || !rings?.length || rings.some((ring) => ring.length < 4 || ring.some((point) => point.length < 2 || !point.every(Number.isFinite)))) {
      throw new Error('En registrert lokalitet har ugyldig verdi eller geometri.')
    }
    return { id: String(id), sourceId: text(feature.attributes.KuverdiNaturtypeId), name: text(feature.attributes.Områdenavn),
      natureType: text(feature.attributes.Naturtype), value, color: category.color, rings }
  })
  signal?.throwIfAborted()
  const result: MunicipalValuedNature = { municipalityNumber: key, localities,
    natureTypes: [...new Set(localities.map((item) => item.natureType))].sort((a, b) => a.localeCompare(b, 'nb')) }
  completed.set(key, result)
  while (completed.size > 16) completed.delete(completed.keys().next().value!)
  return result
}
