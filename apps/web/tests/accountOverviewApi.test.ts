import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAccountOverview } from '../src/api/accountOverview'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getAccountOverview', () => {
  it('aksepterer beregnede Level0-andeler fra backend', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      municipalityNumber: '5001',
      municipalityName: 'Trondheim',
      period: '2025',
      status: 'available',
      metrics: [
        { id: 'nature', areaKm2: 380, sharePercent: 71.9 },
        { id: 'agriculture', areaKm2: 72, sharePercent: 13.6 },
        { id: 'built', areaKm2: 76.6, sharePercent: 14.5 },
      ],
    }), { status: 200 }))

    const result = await getAccountOverview('5001')

    expect(result.status).toBe('available')
    expect(result.metrics.map((metric) => metric.sharePercent)).toEqual([
      71.9,
      13.6,
      14.5,
    ])
  })

  it('avviser ugyldige andeler', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      municipalityNumber: '5001',
      municipalityName: 'Trondheim',
      period: '2025',
      status: 'available',
      metrics: [
        { id: 'nature', areaKm2: 380, sharePercent: 101 },
        { id: 'agriculture', areaKm2: 72, sharePercent: 0 },
        { id: 'built', areaKm2: 76.6, sharePercent: 0 },
      ],
    }), { status: 200 }))

    await expect(getAccountOverview('5001')).rejects.toThrow(
      'Arealbalansen returnerte et ugyldig svar',
    )
  })
})
