import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPlannedCoverageGap } from '../src/api/valuedNatureStatistics'
import type { PlannedDevelopmentAnalysis } from '../src/map/plannedDevelopment'

function analysis(id: string, x = 0): PlannedDevelopmentAnalysis {
  return {
    municipalityNumber: '5001', analysisId: id, analysisAreaKind: 'drawn', status: 'available',
    analysisAreaKm2: .000004, natureKm2: .000003, agricultureKm2: 0,
    natureWithNarrowStripsKm2: .000003, agricultureWithNarrowStripsKm2: 0,
    natureSharePercent: null, agricultureSharePercent: null,
    natureShareOfAnalysisAreaPercent: 75, agricultureShareOfAnalysisAreaPercent: 0,
    source: 'Eget tegnet område', methodVersion: 'drawn-area-raster-v2', pixelMeters: 1, tileCount: 1,
    overlay: { kind: 'drawn', zoom: 9, cx0: 0, cy0: 0, width: 2, height: 2, extent: [x, 0, x + 2, 2], analysisMask: new Uint8Array(4).fill(1), cleaned: new Uint8Array(4).fill(1) },
  }
}
const response = () => new Response(JSON.stringify({ features: [
  { geometry: { rings: [[[0, 0], [0, 2], [1, 2], [1, 0], [0, 0]]] } },
  { geometry: { rings: [[[0, 0], [0, 2], [1, 2], [1, 0], [0, 0]]] } },
] }))
afterEach(() => vi.restoreAllMocks())

describe('coverage of the active valid analysis mask', () => {
  it('unions coverage without double counting and isolates plan → A → B → plan', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => response())
    const plan = { ...analysis('planned:coverage-sequence'), analysisAreaKind: 'planned' as const }
    const first = await getPlannedCoverageGap(plan)
    expect(first).toMatchObject({ analysisId: plan.analysisId, municipalityNumber: '5001', mappedSharePercent: 50, mappedPlannedAreaKm2: .000002, unmappedPlannedAreaKm2: .000002 })
    expect(await getPlannedCoverageGap(analysis('drawn:coverage-A', 100))).toMatchObject({ mappedSharePercent: 0 })
    expect(await getPlannedCoverageGap(analysis('drawn:coverage-B'))).toMatchObject({ mappedSharePercent: 50 })
    expect(await getPlannedCoverageGap(plan)).toBe(first)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('restarts aborted requests and ignores late rejection without evicting the new result', async () => {
    const pending: ((response: Response) => void)[] = []
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise((resolve) => pending.push(resolve)))
    const area = analysis('drawn:coverage-late')
    const controller = new AbortController()
    const first = getPlannedCoverageGap(area, controller.signal)
    const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort()
    const second = getPlannedCoverageGap(area)
    pending[1](response())
    const result = await second
    pending[0](response())
    await rejected
    expect(await getPlannedCoverageGap(area)).toBe(result)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('distinguishes empty coverage from unavailable or malformed coverage', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ features: [] })))
    expect(await getPlannedCoverageGap(analysis('drawn:coverage-empty'))).toMatchObject({ mappedSharePercent: 0 })
    fetch.mockResolvedValueOnce(new Response(null, { status: 503 }))
    await expect(getPlannedCoverageGap(analysis('drawn:coverage-error'))).rejects.toThrow('HTTP 503')
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({})))
    await expect(getPlannedCoverageGap(analysis('drawn:coverage-invalid'))).rejects.toThrow('ugyldig svar')
  })
})

vi.mock('../src/map/utmArea', async (original) => ({ ...await original<typeof import('../src/map/utmArea')>(), getMunicipalityAreaFactor: vi.fn(async () => 1) }))
