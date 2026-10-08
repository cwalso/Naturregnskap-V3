import { describe, expect, it } from 'vitest'
import { analysisPresentation, buildGrunnkartMapOverlay } from '../src/map/analysisPresentation'
import type { PlannedDevelopmentAnalysis } from '../src/map/plannedDevelopment'
import type { PlannedValuedNatureAnalysis } from '../src/map/plannedValuedNature'
import { maskExtent } from '../src/map/analysisRasterOverlay'

const overlay = {
  kind: 'planned' as const, zoom: 9 as const, cx0: 0, cy0: 0,
  width: 3, height: 2, extent: [0, 0, 30, 20] as const,
  cleaned: Uint8Array.from([1, 0, 2, 0, 0, 1]),
  analysisMask: Uint8Array.from([1, 1, 1, 1, 1, 1]),
}
const result = {
  status: 'available', natureKm2: .002, agricultureKm2: .001, overlay,
} as PlannedDevelopmentAnalysis
const input: Parameters<typeof analysisPresentation>[0] = {
  state: 'idle', result, basis: 'grunnkart', valued: null, valuedState: 'idle',
  selection: 'all', valuedSelection: { kind: 'all' }, visible: true, drawing: false, renderState: 'ready',
}

describe('analysis result presentation', () => {
  it('filters only existing hit pixels without changing the valid area, and includes spread hits in the extent', () => {
    const before = overlay.cleaned.slice()
    expect(buildGrunnkartMapOverlay(overlay, 'nature')!.mask).toEqual(Uint8Array.from([1, 0, 0, 0, 0, 1]))
    expect(buildGrunnkartMapOverlay(overlay, 'agriculture')!.mask).toEqual(Uint8Array.from([0, 0, 2, 0, 0, 0]))
    expect(maskExtent(buildGrunnkartMapOverlay(overlay, 'nature')!)).toEqual([0, 0, 30, 20])
    expect(maskExtent(buildGrunnkartMapOverlay(overlay, 'agriculture')!)).toEqual([20, 10, 30, 20])
    expect(overlay.cleaned).toEqual(before)
    expect(overlay.analysisMask).toEqual(Uint8Array.from([1, 1, 1, 1, 1, 1]))
    expect(buildGrunnkartMapOverlay({ ...overlay, cleaned: new Uint8Array(6) }, 'all')).toBeNull()
  })

  it('distinguishes not started, computing, hits, hidden, no hits and calculation/rendering errors', () => {
    expect(analysisPresentation({ ...input, result: null }).kind).toBe('not_started')
    expect(analysisPresentation({ ...input, result: null, state: 'loading' }).kind).toBe('loading')
    expect(analysisPresentation(input).kind).toBe('hits')
    expect(analysisPresentation({ ...input, visible: false }).kind).toBe('hidden')
    expect(analysisPresentation({ ...input, result: { ...result, natureKm2: 0, agricultureKm2: 0 } }).kind).toBe('no_hits')
    expect(analysisPresentation({ ...input, state: 'error' }).title).toBe('Analysen kunne ikke beregnes')
    expect(analysisPresentation({ ...input, renderState: 'error' }).title).toBe('Kartresultatet kunne ikke vises')
    expect(analysisPresentation({ ...input, drawing: true }).kind).toBe('drawing')
  })

  it('treats missing valued data as loading and zero registered overlap as no hits with a coverage warning', () => {
    const valuedInput = { ...input, basis: 'valued-nature' }
    expect(analysisPresentation(valuedInput).kind).toBe('loading')
    const valued = { allOverlapPixelIndices: new Uint32Array(), valueMetrics: [], typeMetrics: [] } as unknown as PlannedValuedNatureAnalysis
    const presentation = analysisPresentation({ ...valuedInput, valued })
    expect(presentation.kind).toBe('no_hits')
    expect(presentation.detail).toContain('ikke heldekkende')
    expect(analysisPresentation({ ...valuedInput, valued, visible: false }).kind).toBe('hidden')
    expect(analysisPresentation({ ...valuedInput, valuedState: 'error' }).kind).toBe('error')
  })
})
