import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  clearMunicipalityDataCache,
  loadMunicipalityAccount,
  loadMunicipalityBoundary,
  loadMunicipalityThematicCoverage,
} from '../src/data/municipalityWorkspace'
import { datasetsForPage } from '../src/datasets/pageCatalog'

afterEach(() => {
  clearMunicipalityDataCache()
  vi.restoreAllMocks()
})

describe('shared municipality data core', () => {
  it('caches kommunegrensen per kommune', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        kommunenummer: '5001',
        kommunenavn: 'Trondheim',
        omrade: { type: 'Polygon', coordinates: [] },
      }), { status: 200 }),
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
          sourceVersions: ['2025'],
          methodVersion: 'level0-v0.3-prototype',
          sourceFormat: null,
          sourceFeatureCount: null,
          areaMethod: null,
          classifiedAreaKm2: null,
          excludedAreaKm2: null,
          warnings: [],
        }), { status: 200 }))
      }

      return Promise.resolve(new Response(JSON.stringify({
        municipalityNumber: '5001',
        municipalityName: 'Trondheim',
        methodVersion: 'thematic-intersection-v1',
        warnings: [],
        results: [
          {
            datasetId: 'protected-areas',
            status: 'hit',
            featureCount: 1,
            note: 'Treff.',
          },
          {
            datasetId: 'wild-reindeer-areas',
            status: 'no_hit',
            featureCount: 0,
            note: 'Ingen registrerte treff.',
          },
        ],
      }), { status: 200 }))
    })

    await loadMunicipalityAccount('5001', 'Trondheim')
    await loadMunicipalityAccount('5001', 'Trondheim')
    await loadMunicipalityThematicCoverage('5001')
    await loadMunicipalityThematicCoverage('5001')

    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it('does not retain transient thematic unavailable responses', async () => {
    let calls = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      calls += 1
      const status = calls === 1 ? 'unavailable' : 'no_hit'
      return Promise.resolve(new Response(JSON.stringify({
        municipalityNumber: '5001',
        municipalityName: 'Trondheim',
        methodVersion: 'thematic-intersection-v1',
        warnings: [],
        results: [
          {
            datasetId: 'protected-areas',
            status,
            featureCount: status === 'unavailable' ? null : 0,
            note: status === 'unavailable' ? 'Midlertidig utilgjengelig.' : 'Ingen treff.',
          },
          {
            datasetId: 'wild-reindeer-areas',
            status: 'no_hit',
            featureCount: 0,
            note: 'Ingen treff.',
          },
        ],
      }), { status: 200 }))
    })

    const first = await loadMunicipalityThematicCoverage('5001')
    const second = await loadMunicipalityThematicCoverage('5001')

    expect(first.results[0].status).toBe('unavailable')
    expect(second.results[0].status).toBe('no_hit')
    expect(calls).toBe(2)
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
