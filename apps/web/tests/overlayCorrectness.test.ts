import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadOverviewRaster } from '../src/map/accountOverviewRaster'
import { calculateDrawnAreaAnalysis, type DrawnAnalysisArea } from '../src/map/drawnAnalysis'
import {
  calculatePlannedDevelopment,
  calculatePlannedNatureBreakdown,
  PLAN_PIXEL_METERS,
  planTileGrid,
  type PlannedDevelopmentAnalysis,
} from '../src/map/plannedDevelopment'
import { calculatePlannedValuedNatureAnalysis } from '../src/map/plannedValuedNature'
import { loadSharedImageBlob } from '../src/map/sharedImageRequests'

vi.mock('../src/map/accountOverviewRaster', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/map/accountOverviewRaster')>(),
  loadOverviewRaster: vi.fn(),
}))
vi.mock('../src/map/sharedImageRequests', () => ({ loadSharedImageBlob: vi.fn() }))

const tileExtent = planTileGrid.getTileCoordExtent([9, 253, 184])
const extent: [number, number, number, number] = [
  tileExtent[0] + 0.01, tileExtent[1] + 0.01,
  tileExtent[2] - 0.01, tileExtent[3] - 0.01,
]
const rawBlob = new Blob(['raw'])
const planBlob = new Blob(['plan'])
const natureBlob = new Blob(['ecosystem'])
const pixelAreaKm2 = PLAN_PIXEL_METERS ** 2 / 1_000_000
let polygonPixels: Uint8ClampedArray
let classes: Uint8ClampedArray
let planPixels: Uint8ClampedArray

function setPixel(pixels: Uint8ClampedArray, x: number, y: number, color: number[]) {
  pixels.set(color, (y * 512 + x) * 4)
}

function polygon(id: string): DrawnAnalysisArea {
  return { id, extent, areaKm2: 999, rings: [[
    [extent[0], extent[1]], [extent[2], extent[1]],
    [extent[2], extent[3]], [extent[0], extent[3]], [extent[0], extent[1]],
  ]] }
}

function available(result: Awaited<ReturnType<typeof calculatePlannedDevelopment>>) {
  expect(result.status).toBe('available')
  if (result.status !== 'available') throw new Error(result.reason)
  return result
}

beforeEach(() => {
  classes = new Uint8ClampedArray(512 * 512 * 4)
  planPixels = new Uint8ClampedArray(classes.length)
  polygonPixels = new Uint8ClampedArray(classes.length)
  // A broad 3×3 Nature/Agriculture core, plus built/water pixels.
  // Two additional masked source pixels must not count: total 14, Nature 6, Agriculture 3.
  for (let y = 1; y <= 4; y += 1) {
    for (let x = 1; x <= 4; x += 1) {
      const color = x <= 3 && y <= 3
        ? (y <= 2 ? [0, 0, 255, 255] : [0, 255, 0, 255])
        : (y === 4 ? [255, 128, 255, 255] : [255, 0, 0, 255])
      if (x === 4 && y >= 3) color[3] = 99
      setPixel(classes, x, y, color)
      setPixel(planPixels, x, y, [0, 0, 0, 255])
      setPixel(polygonPixels, x, y, [0, 0, 0, 255])
    }
  }
  vi.mocked(loadOverviewRaster).mockResolvedValue({
    name: 'Controlled raster', file: 'test.png', extent,
    width: 512, height: 512, resolutionMetersApprox: PLAN_PIXEL_METERS,
    blob: rawBlob, rawBlob,
  })
  vi.mocked(loadSharedImageBlob).mockImplementation(async (url) => (
    url.includes('nap.ft.dibk.no') ? planBlob : natureBlob
  ))
  const naturePixels = new Uint8ClampedArray(1024 * 1024 * 4)
  for (let i = 0; i < naturePixels.length; i += 4) {
    naturePixels.set([255, 0, 0, 255], i)
  }
  vi.stubGlobal('createImageBitmap', vi.fn(async (blob: Blob) => ({
    width: blob === natureBlob ? 1024 : 512,
    height: blob === natureBlob ? 1024 : 512,
    pixels: blob === rawBlob ? classes : blob === planBlob ? planPixels : naturePixels,
    close: vi.fn(),
  })))
  // Canvas rasterization is stubbed with a known polygon mask; counting,
  // classification, strip cleaning, aggregation and caches run unchanged.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
    let pixels = polygonPixels
    return {
      drawImage: (bitmap: { pixels: Uint8ClampedArray }) => { pixels = bitmap.pixels },
      getImageData: () => ({ data: pixels }),
      clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      closePath: vi.fn(), fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('analysis area denominator under the existing raster method', () => {
  it.each(['planned', 'drawn'] as const)('counts all valid %s pixels, including built and water', async (kind) => {
    const result = available(kind === 'planned'
      ? await calculatePlannedDevelopment('denominator-test')
      : await calculateDrawnAreaAnalysis('5001', polygon('drawn:denominator-test')))

    expect(result.analysisAreaKm2).toBeCloseTo(14 * pixelAreaKm2, 12)
    expect(result.natureKm2).toBeCloseTo(6 * pixelAreaKm2, 12)
    expect(result.agricultureKm2).toBeCloseTo(3 * pixelAreaKm2, 12)
    expect(result.natureShareOfAnalysisAreaPercent).toBeCloseTo(6 / 14 * 100)
    expect(result.agricultureShareOfAnalysisAreaPercent).toBeCloseTo(3 / 14 * 100)
    expect(result.natureKm2 + result.agricultureKm2).toBeLessThan(result.analysisAreaKm2!)
    expect(result.overlay.analysisMask.reduce((sum, pixel) => sum + pixel, 0)).toBe(14)
  })

  it('excludes valid source pixels outside the drawn polygon mask', async () => {
    setPixel(polygonPixels, 1, 1, [0, 0, 0, 127])
    const result = available(await calculateDrawnAreaAnalysis('5001', polygon('drawn:clipped-mask')))
    expect(result.analysisAreaKm2).toBeCloseTo(13 * pixelAreaKm2, 12)
    expect(result.natureShareOfAnalysisAreaPercent).toBeCloseTo(5 / 13 * 100)
  })

  it('distinguishes empty plan coverage and a drawn mask with no valid pixels', async () => {
    planPixels.fill(0)
    const plan = available(await calculatePlannedDevelopment('empty-plan-test'))
    expect(plan.analysisAreaKm2).toBe(0)
    expect(plan.natureShareOfAnalysisAreaPercent).toBeNull()
    expect(plan.agricultureShareOfAnalysisAreaPercent).toBeNull()
    polygonPixels.fill(0)
    expect(await calculateDrawnAreaAnalysis('5001', polygon('drawn:empty')))
      .toMatchObject({ status: 'not_available' })
  })
})

function valuedResponse() {
  return new Response(JSON.stringify({ features: [{
    attributes: { OBJECTID: 1, Verdikategori: 'Stor verdi', Naturtype: 'Testnatur' },
    geometry: { rings: [[
      [tileExtent[0], tileExtent[1]], [tileExtent[2], tileExtent[1]],
      [tileExtent[2], tileExtent[3]], [tileExtent[0], tileExtent[3]],
      [tileExtent[0], tileExtent[1]],
    ]] },
  }] }), { status: 200 })
}

describe('analysis cache isolation', () => {
  it('keeps plan → polygon A → polygon B → plan isolated for both analysis bases', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => valuedResponse())
    const controller = new AbortController()
    const plan = available(await calculatePlannedDevelopment('sequence-test'))
    const planTypes = await calculatePlannedNatureBreakdown(plan)
    const planValued = await calculatePlannedValuedNatureAnalysis(plan, controller.signal)
    controller.abort() // Switching away must preserve a completed result.

    polygonPixels.fill(0)
    setPixel(polygonPixels, 1, 1, [0, 0, 0, 255])
    const a = available(await calculateDrawnAreaAnalysis('5001', polygon('drawn:sequence-A')))
    const aTypes = await calculatePlannedNatureBreakdown(a)
    const aValued = await calculatePlannedValuedNatureAnalysis(a)

    setPixel(polygonPixels, 2, 1, [0, 0, 0, 255])
    const b = available(await calculateDrawnAreaAnalysis('5001', polygon('drawn:sequence-B')))
    const bTypes = await calculatePlannedNatureBreakdown(b)
    const bValued = await calculatePlannedValuedNatureAnalysis(b)

    expect([plan, a, b].map((item) => item.analysisAreaKm2))
      .toEqual([14, 1, 2].map((count) => count * pixelAreaKm2))
    for (const [analysis, types, valued, count] of [
      [plan, planTypes, planValued, 14], [a, aTypes, aValued, 1], [b, bTypes, bValued, 2],
    ] as const) {
      expect(types.analysisId).toBe(analysis.analysisId)
      expect(valued.analysisId).toBe(analysis.analysisId)
      expect(valued.allOverlapPixelIndices).toHaveLength(count)
      expect(valued.uniqueOverlapAreaKm2).toBeCloseTo(count * pixelAreaKm2, 12)
      expect(types.classifiedAreaKm2).toBeCloseTo(analysis.natureKm2, 12)
    }
    expect(await calculatePlannedDevelopment('sequence-test')).toBe(plan)
    expect(await calculatePlannedNatureBreakdown(plan)).toBe(planTypes)
    expect(await calculatePlannedValuedNatureAnalysis(plan)).toBe(planValued)
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it('restarts an aborted pending request and prevents its late rejection from evicting the replacement', async () => {
    const pending: { resolve: (value: Response) => void }[] = []
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>((resolve) => {
      pending.push({ resolve })
    }))
    const plan = available(await calculatePlannedDevelopment('abort-cache-test'))
    const firstController = new AbortController()
    const first = calculatePlannedValuedNatureAnalysis(plan, firstController.signal)
    const firstRejected = expect(first).rejects.toMatchObject({ name: 'AbortError' })
    firstController.abort()
    const replacement = calculatePlannedValuedNatureAnalysis(plan)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    pending[1].resolve(valuedResponse())
    const result = await replacement
    pending[0].resolve(valuedResponse())
    await firstRejected
    expect(await calculatePlannedValuedNatureAnalysis(plan)).toBe(result)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('rejects an aborted consumer even when a valued-nature result is cached', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => valuedResponse())
    const plan: PlannedDevelopmentAnalysis = available(await calculatePlannedDevelopment('aborted-consumer'))
    await calculatePlannedValuedNatureAnalysis(plan)
    const controller = new AbortController()
    controller.abort()
    await expect(calculatePlannedValuedNatureAnalysis(plan, controller.signal))
      .rejects.toMatchObject({ name: 'AbortError' })
  })
})
