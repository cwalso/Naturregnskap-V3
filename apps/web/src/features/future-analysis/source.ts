import { valuedNature } from '../../datasets/registry'
export interface SourceFeature { attributes: Record<string, unknown>; geometry?: { rings?: number[][][] } }
interface Response { objectIds?: number[]; features?: SourceFeature[]; exceededTransferLimit?: boolean; error?: { message?: string } }
export const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : 'Ikke oppgitt'

/** The source explicitly links its KU registration to the original NiN/Naturbase locality. */
export function localityIdentity(attributes: Record<string, unknown>): string {
  const kuId = text(attributes.KuverdiNaturtypeId)
  let original: string | null, registered: string | null
  try {
    original = new URL(text(attributes.FaktaarkLokalitet)).searchParams.get('id')
    registered = new URL(text(attributes.Faktaark)).searchParams.get('id')
  } catch { throw new Error('Faglig lokalitetsidentitet kan ikke verifiseres mot kildens faktaark.') }
  if (!original || !/^[A-Z]{2,8}\d+$/.test(original) || registered !== kuId || ![`VKU-${original}`, `VKU-UN-${original}`].includes(kuId)) throw new Error('Faglig ID og KU-faktaark er ikke konsistente.')
  return original
}
export async function fetchCompleteNatureFeatures(extent: readonly number[], signal?: AbortSignal): Promise<SourceFeature[]> {
  const endpoint = valuedNature.analysisSource.queryUrl
  async function query(args: Record<string, string>): Promise<Response> {
    signal?.throwIfAborted()
    const response = await fetch(endpoint, { method: 'POST', body: new URLSearchParams({ f: 'json', ...args }), signal })
    if (!response.ok) throw new Error(`Naturtypetjenesten feilet (HTTP ${response.status}).`)
    const result = await response.json() as Response
    if (result.error) throw new Error(result.error.message ?? 'Naturtypetjenesten feilet.')
    signal?.throwIfAborted()
    return result
  }
  async function ids(args: Record<string, string>) {
    const result = await query({ ...args, returnIdsOnly: 'true' })
    if (!Array.isArray(result.objectIds) || result.exceededTransferLimit || !result.objectIds.every(Number.isInteger)) throw new Error('Ufullstendig kildeobjektoversikt.')
    return [...new Set(result.objectIds)].sort((a, b) => a - b)
  }
  async function features(objectIds: number[]): Promise<SourceFeature[]> {
    if (!objectIds.length) return []
    const result = await query({ objectIds: objectIds.join(','), outFields: '*', returnGeometry: 'true', outSR: '25833' })
    const found = new Set(result.features?.map((f) => Number(f.attributes.OBJECTID)))
    if (result.exceededTransferLimit || !result.features || objectIds.some((id) => !found.has(id))) {
      if (objectIds.length === 1) throw new Error('Fullstendig lokalitetsgeometri kunne ikke hentes.')
      const half = Math.ceil(objectIds.length / 2)
      return [...await features(objectIds.slice(0, half)), ...await features(objectIds.slice(half))]
    }
    return result.features
  }
  async function batches(objectIds: number[]) {
    const parts = Array.from({ length: Math.ceil(objectIds.length / 200) }, (_, i) => objectIds.slice(i * 200, (i + 1) * 200))
    const result: SourceFeature[][] = new Array(parts.length)
    let next = 0
    await Promise.all(Array.from({ length: Math.min(4, parts.length) }, async () => { while (next < parts.length) { const i = next++; result[i] = await features(parts[i]) } }))
    return result.flat()
  }
  const candidates = await batches(await ids({ where: '1=1', geometry: JSON.stringify({ xmin: extent[0], ymin: extent[1], xmax: extent[2], ymax: extent[3], spatialReference: { wkid: 25833 } }), geometryType: 'esriGeometryEnvelope', inSR: '25833', spatialRel: 'esriSpatialRelIntersects' }))
  const identities = [...new Set(candidates.map((feature) => localityIdentity(feature.attributes)))]
  const allIds = new Set(candidates.map((feature) => Number(feature.attributes.OBJECTID)))
  // Fetch all objects of every original locality without a spatial filter, including pieces outside the municipality.
  const identityBatches = Array.from({ length: Math.ceil(identities.length / 100) }, (_, i) => identities.slice(i * 100, (i + 1) * 100))
  let nextIdentity = 0
  await Promise.all(Array.from({ length: Math.min(4, identityBatches.length) }, async () => {
    while (nextIdentity < identityBatches.length) {
      const part = identityBatches[nextIdentity++]
      const kuIds = part.flatMap((id) => [`VKU-${id}`, `VKU-UN-${id}`])
      const where = `KuverdiNaturtypeId IN (${kuIds.map((id) => `'${id}'`).join(',')})`
      for (const id of await ids({ where })) allIds.add(id)
    }
  }))
  const present = new Set(candidates.map((feature) => Number(feature.attributes.OBJECTID)))
  const additional = await batches([...allIds].filter((id) => !present.has(id)).sort((a, b) => a - b))
  const complete = [...new Map([...candidates, ...additional].map((feature) => [Number(feature.attributes.OBJECTID), feature])).values()].sort((a, b) => Number(a.attributes.OBJECTID) - Number(b.attributes.OBJECTID))
  if (complete.some((feature) => !identities.includes(localityIdentity(feature.attributes)))) throw new Error('Kildeuttrekk og faglige lokalitets-ID-er er inkonsistente.')
  return complete
}
