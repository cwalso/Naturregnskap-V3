import { exploreOverlapGeometry } from '../../map/exploreOverlapGeometry'
import clipping from 'polygon-clipping'
import { valuedAnalysisCategories } from '../../map/plannedValuedNature'
import { getMunicipalityAreaFactor } from '../../map/utmArea'
import { valuedNature } from '../../datasets/registry'
import type { PlannedDevelopmentOverlayGrid } from '../../map/plannedDevelopment'
import { loadFutureNatureMask } from './analysisMask'
import { AREA_TOLERANCE_M2, clipToMask, geometryArea, sourceGeometry, union, type Geometry } from './geometry'
import { fetchCompleteNatureFeatures, localityIdentity, text, type SourceFeature } from './source'
export const METHOD_VERSION = 'future-valued-nature-geometry-v3' as const
export interface Locality {
  id: string; kuIds: string[]; objectIds: number[]; name: string; natureType: string; value: string
  fullGeometry: Geometry; overlapGeometry: Geometry; totalAreaDaa: number; overlapAreaDaa: number; overlapSharePercent: number
}
export interface Metric { label: string; areaDaa: number; count: number; sharePercent: number; geometry: Geometry; values: string[] }
export interface Analysis {
  status: 'available'; municipalityNumber: string; analysisId: string; methodVersion: typeof METHOD_VERSION
  uniqueAreaDaa: number; localityCount: number; highestAreaDaa: number; highestCount: number
  maskGeometries: { nature: Geometry; agriculture: Geometry };
  localities: Locality[]; values: Metric[]; types: Metric[]; uniqueGeometry: Geometry
  quality: { excludedCategories: Record<string, number>; invalidGeometries: { objectId: unknown; reason: string }[]; sourceObjectCount: number }
  provenance: { retrievedAt: string; source: string; sourceHash: string; maskHash: string; gridMeters: number; areaFactor: number; computationMs: number; sourceVersion: string; grunnkartVersion: string }
}
export type Result = Analysis | { status: 'not_available'; municipalityNumber: string; reason: string }
export type Selection = { kind: 'all' } | { kind: 'value' | 'type' | 'locality'; label: string }
const completed = new Map<string, Analysis>()

export function summarizeGeometricNature(features: SourceFeature[], mask: PlannedDevelopmentOverlayGrid, areaFactor = 1) {
  const quality: Analysis['quality'] = { excludedCategories: {}, invalidGeometries: [], sourceObjectCount: features.length }
  const groups = new Map<string, { features: SourceFeature[]; geometry: Geometry[]; value: string; natureType: string }>()
  for (const feature of features) {
    const value = text(feature.attributes.Verdikategori)
    if (!valuedAnalysisCategories.includes(value as typeof valuedAnalysisCategories[number])) {
      quality.excludedCategories[value] = (quality.excludedCategories[value] ?? 0) + 1
      continue
    }
    const id = localityIdentity(feature.attributes), natureType = text(feature.attributes.Naturtype)
    const group = groups.get(id) ?? { features: [], geometry: [], value, natureType }
    if (group.value !== value || group.natureType !== natureType) throw new Error(`Lokalitet ${id} har motstridende KU-verdi eller naturtype. Endelige tall kan ikke beregnes.`)
    group.features.push(feature)
    try { group.geometry.push(sourceGeometry(feature.geometry?.rings)) }
    catch (error) { quality.invalidGeometries.push({ objectId: feature.attributes.OBJECTID, reason: String(error instanceof Error ? error.message : error) }) }
    groups.set(id, group)
  }
  // Incomplete geometry cannot silently remove parts or create an incorrect area denominator.
  if (quality.invalidGeometries.length) throw new Error(`${quality.invalidGeometries.length} kildeobjekter har manglende, ugyldig eller nullareal-geometri. Ingen kvalitetssikrede arealer/andeler publiseres.`)
  const localities: Locality[] = []
  for (const [id, group] of groups) {
    const fullGeometry = union(group.geometry), overlapGeometry = clipToMask(fullGeometry, mask)
    const fullArea = geometryArea(fullGeometry), overlap = geometryArea(overlapGeometry)
    if (!(overlap > 0)) continue
    if (overlap - fullArea > AREA_TOLERANCE_M2) throw new Error(`Overlapp overstiger totalareal for ${id}.`)
    localities.push({ id, kuIds: [...new Set(group.features.map((f) => text(f.attributes.KuverdiNaturtypeId)))], objectIds: [...new Set(group.features.map((f) => Number(f.attributes.OBJECTID)))],
      name: text(group.features[0].attributes.Områdenavn), natureType: group.natureType, value: group.value, fullGeometry, overlapGeometry,
      totalAreaDaa: fullArea * areaFactor / 1000, overlapAreaDaa: overlap * areaFactor / 1000, overlapSharePercent: Math.min(100, overlap / fullArea * 100) })
  }
  const uniqueGeometry = union(localities.map((l) => l.overlapGeometry)), unique = geometryArea(uniqueGeometry)
  let assigned: Geometry = []
  const values = valuedAnalysisCategories.map((label): Metric => {
    const selected = localities.filter((l) => l.value === label), all = union(selected.map((l) => l.overlapGeometry))
    const geometry = all.length && assigned.length ? clipping.difference(all, assigned) : all
    assigned = union([assigned, all])
    const area = geometryArea(geometry)
    return { label, geometry, areaDaa: area * areaFactor / 1000, count: selected.length, sharePercent: unique ? area / unique * 100 : 0, values: [label] }
  })
  if (Math.abs(values.reduce((sum, m) => sum + m.areaDaa, 0) - unique * areaFactor / 1000) > AREA_TOLERANCE_M2 * areaFactor / 1000) throw new Error('KU-fordelingen stemmer ikke med unik union.')
  const types = [...new Set(localities.map((l) => l.natureType))].map((label): Metric => {
    const selected = localities.filter((l) => l.natureType === label), geometry = union(selected.map((l) => l.overlapGeometry))
    return { label, geometry, areaDaa: geometryArea(geometry) * areaFactor / 1000, count: selected.length, sharePercent: 0, values: valuedAnalysisCategories.filter((v) => selected.some((l) => l.value === v)) }
  }).sort((a, b) => b.areaDaa - a.areaDaa)
  return { localities, quality, values, types, uniqueGeometry, uniqueAreaDaa: unique * areaFactor / 1000, localityCount: localities.length,
    highestAreaDaa: values[0].areaDaa + values[1].areaDaa, highestCount: localities.filter((l) => l.value === values[0].label || l.value === values[1].label).length }
}
async function hash(bytes: BufferSource) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((v) => v.toString(16).padStart(2, '0')).join('') }
export async function calculateFutureNature(number: string, signal?: AbortSignal): Promise<Result> {
  signal?.throwIfAborted()
  const key = `${METHOD_VERSION}:${number}`
  const cached = completed.get(key)
  if (cached) return cached
  const retrievedAt = new Date().toISOString()
  const mask = await loadFutureNatureMask(number, signal)
  if (!mask) return { status: 'not_available', municipalityNumber: number, reason: 'Et klargjort kommunevis Grunnkart-raster mangler. Overlapp er ikke beregnet; dette betyr ikke null treff.' }
  const [features, areaFactor] = await Promise.all([fetchCompleteNatureFeatures(mask.extent, signal), getMunicipalityAreaFactor(number, signal)])
  const start = performance.now()
  const summary = summarizeGeometricNature(features, mask, areaFactor)
  const maskGeometries = {
    nature: exploreOverlapGeometry({ mask: mask.analysisMask, width: mask.width, height: mask.height, extent: mask.extent, fillColor: '', strokeColor: '' }, 1).getCoordinates() as Geometry,
    agriculture: exploreOverlapGeometry({ mask: mask.analysisMask, width: mask.width, height: mask.height, extent: mask.extent, fillColor: '', strokeColor: '' }, 2).getCoordinates() as Geometry,
  }
  const computationMs = performance.now() - start
  signal?.throwIfAborted()
  const [sourceHash, maskHash] = await Promise.all([hash(new TextEncoder().encode(JSON.stringify(features))), hash(mask.analysisMask as Uint8Array<ArrayBuffer>)])
  const result: Analysis = { ...summary, maskGeometries, municipalityNumber: number, status: 'available', methodVersion: METHOD_VERSION,
    analysisId: `${METHOD_VERSION}:${number}:${maskHash}:${sourceHash}`,
    provenance: { retrievedAt, source: valuedNature.analysisSource.queryUrl, sourceHash, maskHash, areaFactor, computationMs,
      gridMeters: (mask.extent[2] - mask.extent[0]) / mask.width, sourceVersion: 'Løpende KU- og DiBK-tjenester; uttrekksdato og innholdshash dokumenterer denne analysen', grunnkartVersion: '2025, oversiktsraster hentet 05.10.2026' } }
  signal?.throwIfAborted()
  completed.set(key, result)
  if (completed.size > 16) completed.delete(completed.keys().next().value!)
  return result
}
export function selectionGeometry(result: Analysis, selection: Selection): Geometry {
  if (selection.kind === 'all') return result.uniqueGeometry
  if (selection.kind === 'locality') return result.localities.find((l) => l.id === selection.label)?.overlapGeometry ?? []
  return (selection.kind === 'value' ? result.values : result.types).find((m) => m.label === selection.label)?.geometry ?? []
}
export function selectionLocalities(result: Analysis, selection: Selection) {
  return result.localities.filter((l) => selection.kind === 'all' || (selection.kind === 'locality' ? l.id === selection.label : selection.kind === 'value' ? l.value === selection.label : l.natureType === selection.label))
}
