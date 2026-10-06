import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  clearMunicipalityDataCache,
  loadMunicipalityAccount,
  loadMunicipalityBoundary,
  loadMunicipalityThematicCoverage,
} from '../src/data/municipalityWorkspace'
import { datasetsForPage } from '../src/datasets/pageCatalog'

const boundarySource = {
  kommunenummer: '5001',
  kommunenavn: 'Trondheim',
  omrade: {
    type: 'Polygon',
    coordinates: [[
      [10, 63],
      [11, 63],
      [11, 64],
      [10, 63],
    ]],
  },
}

afterEach(() => {
  clearMunicipalityDataCache()
  vi.restoreAllMocks()
})

describe('shared municipality data core', () => {
  it('caches kommunegrensen per kommune', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(boundarySource), { status: 200 }),
    )

    const first = await loadMunicipalityBoundary('5001')
    const second = await loadMunicipalityBoundary('5001')

    expect(first).toEqual(second)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('caches regnskap og temadatastatus uavhengig', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.endsWith('/data/account-overview/2025/index.json')) {
        return Promise.resolve(new Response(JSON.stringify({
          period: '2025',
          municipalities: ['5001'],
        }), { status: 200 }))
      }
      if (url.endsWith('/data/account-overview/2025/5001.json')) {
        return Promise.resolve(new Response(JSON.stringify({
          municipalityNumber: '5001',
          municipalityName: 'Trondheim',
          period: '2025',
          status: 'not_available',
          metrics: [
            { id: 'nature', areaKm2: null, sharePercent: null },
            { id: 'agriculture', areaKm2: null, sharePercent: null },
            { id: 'built', areaKm2: null, sharePercent: null },
          ],
        }), { status: 200 }))
      }
      if (url.endsWith('/kommuner/5001/omrade')) {
        return Promise.resolve(new Response(JSON.stringify(boundarySource), { status: 200 }))
      }
      if (url.includes('kart.miljodirektoratet.no/arcgis/rest/services/')) {
        return Promise.resolve(new Response(JSON.stringify({ count: 1 }), { status: 200 }))
      }
      throw new Error(`Uventet URL i test: ${url}`)
    })

    await loadMunicipalityAccount('5001', 'Trondheim')
    await loadMunicipalityAccount('5001', 'Trondheim')
    await loadMunicipalityThematicCoverage('5001')
    await loadMunicipalityThematicCoverage('5001')

    expect(fetchSpy).toHaveBeenCalledTimes(6)
  })

  it('does not retain transient thematic unavailable responses', async () => {
    let protectedCalls = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.endsWith('/kommuner/5001/omrade')) {
        return Promise.resolve(new Response(JSON.stringify(boundarySource), { status: 200 }))
      }
      if (url.includes('/vern/MapServer/0/query')) {
        protectedCalls += 1
        if (protectedCalls === 1) {
          return Promise.resolve(new Response(null, { status: 503 }))
        }
        return Promise.resolve(new Response(JSON.stringify({ count: 0 }), { status: 200 }))
      }
      if (url.includes('kart.miljodirektoratet.no/arcgis/rest/services/')) {
        return Promise.resolve(new Response(JSON.stringify({ count: 0 }), { status: 200 }))
      }
      throw new Error(`Uventet URL i test: ${url}`)
    })

    const first = await loadMunicipalityThematicCoverage('5001')
    const second = await loadMunicipalityThematicCoverage('5001')

    expect(first.results.find((item) => item.datasetId === 'protected-areas')?.status).toBe('unavailable')
    expect(second.results.find((item) => item.datasetId === 'protected-areas')?.status).toBe('no_hit')
    expect(protectedCalls).toBe(2)
  })

  it('maps datasets to the four V3 pages with explicit roles', () => {
    expect(datasetsForPage('overview')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          datasetId: 'national-land-cover-analysis-2025',
          role: 'account-basis',
        }),
      ]),
    )

    expect(datasetsForPage('nature')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ datasetId: 'protected-areas' }),
        expect.objectContaining({ datasetId: 'wild-reindeer-areas' }),
      ]),
    )

    expect(datasetsForPage('nature-loss')).toEqual([])
  })
})
