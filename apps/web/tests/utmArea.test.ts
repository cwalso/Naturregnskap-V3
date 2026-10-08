import proj4 from 'proj4'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMunicipalityAreaFactor, municipalityAreaFactor, terrainAreaKm2 } from '../src/map/utmArea'
import type { MunicipalityBoundary } from '../src/api/municipalities'

const UTM33 = '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs +type=crs'
function boundary(number: string): MunicipalityBoundary {
  const ring = [[250000, 7010000], [286000, 7010000], [286000, 7050000], [250000, 7050000], [250000, 7010000]]
    .map((point) => proj4(UTM33, 'EPSG:4326', point))
  return { type: 'Feature', properties: { number, name: 'Kontrollkommune' }, geometry: { type: 'Polygon', coordinates: [ring] } }
}
afterEach(() => vi.restoreAllMocks())

describe('shared EPSG:25833 scale correction', () => {
  it('corrects a known square at the central meridian and at a Trondheim-like midpoint', () => {
    expect(terrainAreaKm2(1_000_000, 500_000)).toBeCloseTo(1 / .9996 ** 2, 12)
    const k = .9996 * (1 + (268_000 - 500_000) ** 2 / (2 * 6_380_000 ** 2))
    expect(terrainAreaKm2(1_000_000, 268_000)).toBeCloseTo(1 / k ** 2, 12)
    expect(municipalityAreaFactor(boundary('geometry'))).toBeCloseTo(1 / k ** 2, 12)
    expect(terrainAreaKm2(0, 268_000)).toBe(0)
    expect(() => terrainAreaKm2(1, NaN)).toThrow('kommunemidtpunkt')
  })

  it('shares boundary requests, isolates municipalities and aborts only the stale consumer', async () => {
    let finish: (value: Response) => void = () => {}
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const controller = new AbortController()
    const stale = getMunicipalityAreaFactor('utm-cache-A', controller.signal)
    const rejected = expect(stale).rejects.toMatchObject({ name: 'AbortError' })
    const active = getMunicipalityAreaFactor('utm-cache-A')
    controller.abort()
    const feature = boundary('utm-cache-A')
    finish(new Response(JSON.stringify({ kommunenummer: 'utm-cache-A', kommunenavn: 'Kontrollkommune', omrade: feature.geometry })))
    const factor = await active
    await rejected
    expect(factor).toBeCloseTo(municipalityAreaFactor(feature), 12)
    expect(await getMunicipalityAreaFactor('utm-cache-A')).toBe(factor)
    expect(fetch).toHaveBeenCalledTimes(1)
    fetch.mockResolvedValue(new Response(null, { status: 503 }))
    await expect(getMunicipalityAreaFactor('utm-cache-B')).rejects.toThrow('HTTP 503')
    fetch.mockResolvedValue(new Response(JSON.stringify({ kommunenummer: 'utm-cache-B', kommunenavn: 'Kontrollkommune', omrade: feature.geometry })))
    expect(await getMunicipalityAreaFactor('utm-cache-B')).toBeCloseTo(factor, 12)
    expect(fetch).toHaveBeenCalledTimes(3)
  })
})
