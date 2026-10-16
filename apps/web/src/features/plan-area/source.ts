import { loadFutureNatureMask } from '../future-analysis/analysisMask'
import { buildNatureTypeTileUrl, PLAN_TILE_PIXELS } from '../../map/plannedDevelopment'
import { loadSharedImageBlob } from '../../map/sharedImageRequests'
import { futureDevelopmentPixels } from '../../map/futureDevelopmentDisplay'
import { getMunicipalityAreaFactor } from '../../map/utmArea'
import { applyClassificationTile, createPlanAreaGrid, PLAN_AREA_METHOD, summarizePlanArea, type PlanAreaAnalysis, type PlanAreaResult } from './model'

const completed = new Map<string, PlanAreaAnalysis>()
const pending = new Map<string, Promise<PlanAreaResult>>()
async function sha256(bytes: BufferSource) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('') }

async function compute(number: string): Promise<PlanAreaResult> {
  const started = performance.now(), retrievedAt = new Date().toISOString()
  const parent = await loadFutureNatureMask(number)
  if (!parent) return { status: 'not_available', municipalityNumber: number, reason: 'Klargjort kommunevis Grunnkart mangler. Planarealer er ikke beregnet; dette betyr ikke null treff.' }
  const grid = createPlanAreaGrid(parent), areaFactor = await getMunicipalityAreaFactor(number)
  const coordinates = new Map<string, number[]>()
  for (let i = 0; i < parent.analysisMask.length; i++) if (parent.analysisMask[i] === 1) {
    const tc = [9, Math.floor((parent.cx0 + i % parent.width) / PLAN_TILE_PIXELS), Math.floor((parent.cy0 + Math.floor(i / parent.width)) / PLAN_TILE_PIXELS)]
    coordinates.set(tc.join(':'), tc)
  }
  const tiles = [...coordinates.values()], tileHashes: PlanAreaAnalysis['provenance']['tileHashes'] = []
  let next = 0, classificationError: string | null = null
  await Promise.all(Array.from({ length: Math.min(4, tiles.length) }, async () => {
    while (next < tiles.length) {
      const coordinate = tiles[next++]
      try {
        const blob = await loadSharedImageBlob(buildNatureTypeTileUrl(coordinate))
        const pixels = await futureDevelopmentPixels(blob)
        applyClassificationTile(grid, parent, coordinate, pixels)
        tileHashes.push({ coordinate, sha256: await sha256(await blob.arrayBuffer()) })
      } catch (error) { classificationError = error instanceof Error ? error.message : 'Økosystemkilden kunne ikke leses.' }
    }
  }))
  // A failed download is not zero or a complete category result. Keep level-0
  // totals, but withdraw all subtype totals rather than mixing partial tiles.
  if (classificationError) for (let i = 0; i < grid.mask.length; i++) if (grid.mask[i] && grid.mask[i] !== 7) grid.mask[i] = 6
  const summary = summarizePlanArea(grid, areaFactor)
  const maskHash = await sha256(parent.analysisMask as Uint8Array<ArrayBuffer>), classificationHash = await sha256(grid.mask as Uint8Array<ArrayBuffer>)
  const unclassifiedDaa = summary.categories[5].areaDaa
  const result: PlanAreaAnalysis = { ...summary, status: 'available', municipalityNumber: number, methodVersion: PLAN_AREA_METHOD, analysisId: `${PLAN_AREA_METHOD}:${number}:${maskHash}:${classificationHash}`, grid,
    classification: { status: classificationError ? 'error' : unclassifiedDaa > 0 ? 'partial' : 'complete', unclassifiedDaa, reason: classificationError },
    provenance: { retrievedAt, planSource: 'https://nap.ft.dibk.no/services/wms/kommuneplaner/', classificationSource: 'https://wms.nibio.no/cgi-bin/grunnkart_arealanalyse', classificationLevel: 'Natur/Jordbruk: eksisterende nivå 0. Naturdetalj: okosystemtypeniva1.', grunnkartVersion: '2025 (etablert prototypegrunnlag; WMS-uttaket er ikke en låst årsdistribusjon)', overviewRetrieved: '2026-10-05', maskHash, classificationHash, tileHashes: tileHashes.sort((a,b) => a.coordinate.join(':').localeCompare(b.coordinate.join(':'))), areaFactor, planCellMeters: 21.15625, classificationCellMeters: 10.578125, crs: 'EPSG:25833', computationMs: performance.now() - started } }
  if (!classificationError) { completed.set(number, result); if (completed.size > 16) completed.delete(completed.keys().next().value!) }
  return result
}
export async function calculatePlanArea(number: string, signal?: AbortSignal): Promise<PlanAreaResult> {
  signal?.throwIfAborted()
  const cached = completed.get(number)
  if (cached) return cached
  let request = pending.get(number)
  if (!request) {
    request = compute(number); pending.set(number, request)
    void request.finally(() => { if (pending.get(number) === request) pending.delete(number) }).catch(() => {})
  }
  // Shared preparation survives one consumer's cancellation; no stale consumer
  // may publish a result. Existing network pools still limit each source to 4.
  const result = await request
  signal?.throwIfAborted()
  return result
}
