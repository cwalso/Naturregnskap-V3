import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getMunicipalities,
  getMunicipalityBoundary,
} from '../src/api/municipalities'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Kartverket municipality client', () => {
  it('loads and normalizes municipalities directly from Kartverket', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([
        { kommunenummer: '5001', kommunenavnNorsk: 'Trondheim' },
        { kommunenummer: '0301', kommunenavnNorsk: 'Oslo' },
      ]), { status: 200 }),
    )

    await expect(getMunicipalities()).resolves.toEqual([
      { number: '0301', name: 'Oslo' },
      { number: '5001', name: 'Trondheim' },
    ])
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.kartverket.no/kommuneinfo/v1/kommuner',
      { signal: undefined },
    )
  })

  it('normalizes Kartverket municipality boundary to internal GeoJSON feature', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        kommunenummer: '5001',
        kommunenavn: 'Trondheim',
        omrade: {
          type: 'MultiPolygon',
          coordinates: [],
        },
      }), { status: 200 }),
    )

    await expect(getMunicipalityBoundary('5001')).resolves.toEqual({
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [],
      },
      properties: {
        number: '5001',
        name: 'Trondheim',
      },
    })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.kartverket.no/kommuneinfo/v1/kommuner/5001/omrade',
      { signal: undefined },
    )
  })
})
