import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAccountOverview } from '../src/api/accountOverview'

const codes = [
  '01', '02', '03', '04', '05', '06', '07', '08-09', '10-11', '12-13', '14',
  '15-16', '17', '18', '19', '20', '21', '24', '22.01', '22.02',
]

function ssbResponse(values: number[], period = '2025') {
  return {
    dimension: {
      ArealKlasse: {
        category: {
          index: Object.fromEntries(codes.map((code, index) => [code, index])),
        },
      },
      Tid: {
        category: {
          index: { [period]: 0 },
        },
      },
    },
    value: values,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SSB prototype account', () => {
  it('uses the same three SSB groups as the public demonstrator', async () => {
    const values = new Array(codes.length).fill(0)
    values[codes.indexOf('01')] = 10
    values[codes.indexOf('15-16')] = 20
    values[codes.indexOf('17')] = 100
    values[codes.indexOf('18')] = 30
    values[codes.indexOf('22.01')] = 7
    values[codes.indexOf('22.02')] = 3

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(ssbResponse(values)), { status: 200 }),
    )

    await expect(getAccountOverview('5001', 'Trondheim')).resolves.toMatchObject({
      municipalityNumber: '5001',
      municipalityName: 'Trondheim',
      period: '2025',
      status: 'available',
      sourceKind: 'ssb-prototype',
      sourceName: 'SSB tabell 09594',
      metrics: [
        { id: 'nature', areaKm2: 130, sharePercent: null },
        { id: 'agriculture', areaKm2: 20, sharePercent: null },
        { id: 'built', areaKm2: 10, sharePercent: null },
      ],
    })

    const requestedUrl = new URL(String(fetchSpy.mock.calls[0][0]))
    expect(requestedUrl.hostname).toBe('data.ssb.no')
    expect(requestedUrl.pathname).toBe('/api/pxwebapi/v2/tables/09594/data')
    expect(requestedUrl.searchParams.get('valueCodes[Region]')).toBe('5001')
    expect(requestedUrl.searchParams.get('valueCodes[Tid]')).toBe('top(1)')
    expect(requestedUrl.searchParams.get('valueCodes[ArealKlasse]')).toContain('22.01')
  })

  it('accepts JSON-stat category indexes represented as arrays', async () => {
    const values = new Array(codes.length).fill(0)
    values[codes.indexOf('01')] = 1
    values[codes.indexOf('15-16')] = 2
    values[codes.indexOf('17')] = 3

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        dimension: {
          ArealKlasse: { category: { index: codes } },
          Tid: { category: { index: ['2025'] } },
        },
        value: values,
      }), { status: 200 }),
    )

    await expect(getAccountOverview('5001', 'Trondheim')).resolves.toMatchObject({
      metrics: [
        { id: 'nature', areaKm2: 3 },
        { id: 'agriculture', areaKm2: 2 },
        { id: 'built', areaKm2: 1 },
      ],
    })
  })

  it('fails instead of silently undercounting when SSB omits a requested class', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        dimension: {
          ArealKlasse: { category: { index: { '01': 0 } } },
          Tid: { category: { index: { '2025': 0 } } },
        },
        value: [1],
      }), { status: 200 }),
    )

    await expect(getAccountOverview('5001', 'Trondheim')).rejects.toThrow(
      'SSB-svaret mangler arealklasse',
    )
  })
})
