import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAnalysisRasterBlob, type AnalysisRasterOverlay } from '../src/map/analysisRasterOverlay'

let rendered: Uint8ClampedArray
beforeEach(() => {
  const context = {
    createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    putImageData: (image: ImageData) => { rendered = image.data.slice() },
  } as unknown as CanvasRenderingContext2D
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob()))
})
afterEach(() => vi.restoreAllMocks())

const overlay: AnalysisRasterOverlay = {
  width: 6, height: 3, extent: [0, 0, 60, 30], fillColor: '#006B57',
  mask: Uint8Array.from([0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0]),
}

describe('windowed analysis raster rendering', () => {
  it.each(['hits', 'outline'] as const)('preserves the full %s rendering across tile seams without changing the mask', async (kind) => {
    const input = { ...overlay, strong: kind === 'hits', outlineOnly: kind === 'outline' }
    const original = input.mask.slice()
    await createAnalysisRasterBlob(input)
    const full = rendered.slice()
    const stitched = new Uint8ClampedArray(full.length)
    for (const x of [0, 3]) {
      await createAnalysisRasterBlob(input, { x, y: 0, width: 3, height: 3 })
      for (let row = 0; row < 3; row++) {
        stitched.set(rendered.subarray(row * 12, (row + 1) * 12), (row * 6 + x) * 4)
      }
    }
    expect(stitched).toEqual(full)
    expect(stitched[(1 * 6 + 2) * 4 + 3]).toBe(kind === 'hits' ? 210 : 0)
    if (kind === 'hits') expect(stitched.subarray(24, 28)).toEqual(Uint8ClampedArray.from([255, 255, 255, 240]))
    expect(input.mask).toEqual(original)
  })

  it('pads a partial edge tile transparently without stretching the source pixels', async () => {
    await createAnalysisRasterBlob({ ...overlay, strong: true }, { x: 4, y: 2, width: 3, height: 2 })
    expect(rendered.subarray(0, 8)).toEqual(Uint8ClampedArray.from([0, 107, 87, 255, 255, 255, 255, 240]))
    expect(rendered.subarray(8)).toEqual(new Uint8ClampedArray(16))
  })
})
