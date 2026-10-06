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
      if (url.startsWith('https://data.ssb.no/api/pxwebapi/v2/tables/09594/data?')) {
        const codes = [
          '01', '02', '03', '04', '05', '06', '07', '08-09', '10-11', '12-13', '14',
          '15-16', '17', '18', '19', '20', '21', '24', '22.01', '22.02',
        ]
        const values = new Array(codes.length).fill(0)
        values[codes.indexOf('01')] = 1
        values[codes.indexOf('15-16')] = 2
        values[codes.indexOf('17')] = 12
        return Promise.resolve(new Response(JSON.stringify({
          dimension: {
            ArealKlasse: { category: { index: Object.fromEntries(codes.map((code, index) => [code, index])) } },
            Tid: { category: { index: { '2025': 0 } } },
          },
          value: values,
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

    expect(fetchSpy).toHaveBeenCalledTimes(5)
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
