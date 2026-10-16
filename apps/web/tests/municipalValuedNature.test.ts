import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MunicipalityBoundary } from '../src/api/municipalities'
import { getMunicipalValuedNature, municipalNatureQuery } from '../src/api/municipalValuedNature'

const boundary = (number: string): MunicipalityBoundary => ({ type: 'Feature', properties: { number, name: 'Kommunen' },
  geometry: { type: 'Polygon', coordinates: [[[10, 63], [11, 63], [11, 64], [10, 64], [10, 63]], [[10.2, 63.2], [10.2, 63.4], [10.4, 63.4], [10.4, 63.2], [10.2, 63.2]]] } })
const feature = (id: number) => ({ attributes: { OBJECTID: id, KuverdiNaturtypeId: `source-${id}`, Naturtype: id === 1 ? 'Naturtype A' : 'Naturtype B', Verdikategori: 'Stor verdi', Områdenavn: `Lokalitet ${id}` },
  geometry: { rings: [[[270000, 7030000], [270100, 7030000], [270100, 7030100], [270000, 7030000]]] } })
const json = (value: unknown) => new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } })
afterEach(() => vi.unstubAllGlobals())

describe('kommunal naturtypeoversikt uavhengig av analyse', () => {
  it('bruker eksakt kommunepolygon med riktig ringretning og fire verdikategorier', () => {
    const query = municipalNatureQuery(boundary('9100'))
    const rings = JSON.parse(query.get('geometry')!).rings as number[][][]
    const signedArea = (ring: number[][]) => ring.slice(1).reduce((sum, point, i) => sum + ring[i][0] * point[1] - point[0] * ring[i][1], 0)
    expect(signedArea(rings[0])).toBeLessThan(0)
    expect(signedArea(rings[1])).toBeGreaterThan(0)
    expect(query.get('spatialRel')).toBe('esriSpatialRelIntersects')
    expect(query.get('geometryType')).toBe('esriGeometryPolygon')
    expect(query.get('where')).toContain('Noe verdi')
    expect(query.get('returnIdsOnly')).toBe('true')
  })
  it('henter hele ID-settet selv når attributt-/geometrisvaret blir avkortet', async () => {
    const fetcher = vi.fn(async (_url: unknown, options: RequestInit) => {
      const body = options.body as URLSearchParams
      if (body.get('returnIdsOnly')) return json({ objectIds: [2, 1, 1] })
      if (body.get('objectIds') === '1,2') return json({ features: [feature(1)], exceededTransferLimit: true })
      return json({ features: [feature(Number(body.get('objectIds')))] })
    })
    vi.stubGlobal('fetch', fetcher)
    const data = await getMunicipalValuedNature(boundary('9101'))
    expect(data.localities.map((item) => item.id)).toEqual(['1', '2'])
    expect(data.natureTypes).toEqual(['Naturtype A', 'Naturtype B'])
    expect(fetcher).toHaveBeenCalledTimes(4)
    expect(data.localities[1].sourceId).toBe('source-2')
  })
  it('avviser manglende objekt og ugyldig svar framfor å vise null registreringer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ objectIds: [1] })).mockResolvedValueOnce(json({ features: [] })))
    await expect(getMunicipalValuedNature(boundary('9102'))).rejects.toThrow('fullstendig')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: { message: 'Kilden utilgjengelig' } })))
    await expect(getMunicipalValuedNature(boundary('9103'))).rejects.toThrow('Kilden utilgjengelig')
  })
  it('et avbrutt svar legges ikke i kommunecache og blokkerer ikke et nytt forsøk', async () => {
    const abort = new AbortController()
    const fetcher = vi.fn(async (_url: unknown, options: RequestInit) => {
      if ((options.body as URLSearchParams).get('returnIdsOnly')) return json({ objectIds: [1] })
      abort.abort()
      return json({ features: [feature(1)] })
    })
    vi.stubGlobal('fetch', fetcher)
    await expect(getMunicipalValuedNature(boundary('9104'), abort.signal)).rejects.toMatchObject({ name: 'AbortError' })
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, options: RequestInit) => (options.body as URLSearchParams).get('returnIdsOnly') ? json({ objectIds: [] }) : json({ features: [] })))
    expect((await getMunicipalValuedNature(boundary('9104'))).localities).toEqual([])
  })
})
