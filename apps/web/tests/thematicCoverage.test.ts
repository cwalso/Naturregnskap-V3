import { afterEach, describe, expect, it, vi } from 'vitest'

import { getThematicCoverage } from '../src/api/thematicCoverage'
import type { MunicipalityBoundary } from '../src/api/municipalities'

const boundary: MunicipalityBoundary = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [10, 63],
      [11, 63],
      [11, 64],
      [10, 63],
    ]],
  },
  properties: {
    number: '5001',
    name: 'Trondheim',
  },
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('browser thematic coverage', () => {
  it('queries connected ArcGIS datasets directly and preserves coverage semantics', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      const count = url.includes('/naturtyper_kuverdi/')
        ? 3
        : url.includes('/vern/')
          ? 2
          : 0
      return Promise.resolve(new Response(JSON.stringify({ count }), { status: 200 }))
    })

    const response = await getThematicCoverage(boundary)

    expect(response.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ datasetId: 'valued-nature', status: 'hit', featureCount: 3 }),
      expect.objectContaining({ datasetId: 'protected-areas', status: 'hit', featureCount: 2 }),
      expect.objectContaining({ datasetId: 'wild-reindeer-areas', status: 'no_hit', featureCount: 0 }),
    ]))
    expect(fetchSpy).toHaveBeenCalledTimes(3)

    const [, request] = fetchSpy.mock.calls[0]
    expect(request).toMatchObject({ method: 'POST' })
    expect(String(request?.body)).toContain('geometryType=esriGeometryPolygon')
    expect(String(request?.body)).toContain('returnCountOnly=true')
  })

  it('marks one source unavailable without hiding results from the others', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.includes('/vern/MapServer/0/query')) {
        return Promise.resolve(new Response(null, { status: 503 }))
      }
      return Promise.resolve(new Response(JSON.stringify({ count: 0 }), { status: 200 }))
    })

    const response = await getThematicCoverage(boundary)

    expect(response.results.find((item) => item.datasetId === 'protected-areas')).toMatchObject({
      status: 'unavailable',
      featureCount: null,
    })
    expect(response.results.find((item) => item.datasetId === 'wild-reindeer-areas')).toMatchObject({
      status: 'no_hit',
      featureCount: 0,
    })
  })
})
