import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAccountOverview } from '../src/api/accountOverview'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('static account results', () => {
  it('treats a municipality missing from the publication index as not available', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        period: '2025',
        municipalities: [],
      }), { status: 200 }),
    )

    await expect(getAccountOverview('5001', 'Trondheim')).resolves.toMatchObject({
      municipalityNumber: '5001',
      municipalityName: 'Trondheim',
      period: '2025',
      status: 'not_available',
    })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('loads a published municipality result from the static data directory', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.endsWith('/index.json')) {
        return Promise.resolve(new Response(JSON.stringify({
          period: '2025',
          municipalities: ['5001'],
        }), { status: 200 }))
      }

      return Promise.resolve(new Response(JSON.stringify({
        municipalityNumber: '5001',
        municipalityName: 'Trondheim',
        period: '2025',
        status: 'available',
        metrics: [
          { id: 'nature', areaKm2: 10, sharePercent: null },
          { id: 'agriculture', areaKm2: 2, sharePercent: null },
          { id: 'built', areaKm2: 1, sharePercent: null },
        ],
      }), { status: 200 }))
    })

    await expect(getAccountOverview('5001', 'Trondheim')).resolves.toMatchObject({
      municipalityNumber: '5001',
      status: 'available',
    })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})
