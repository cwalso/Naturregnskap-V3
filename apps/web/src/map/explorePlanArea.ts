import ImageLayer from 'ol/layer/Image'
import ImageStatic from 'ol/source/ImageStatic'
import { ACCOUNT_CRS } from './accountOverviewRaster'
import type { PlannedDevelopmentAnalysis } from './plannedDevelopment'

// Display the existing valid mask, including built-up/water pixels. This
// adapter does not classify pixels or calculate an area.
export function planAreaSource(analysis: PlannedDevelopmentAnalysis, outlineOnly = false): ImageStatic {
  const { width, height, extent, analysisMask } = analysis.overlay
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Kartvisning av planområdet krever Canvas 2D')
  const pixels = context.createImageData(width, height)
  for (let i = 0; i < analysisMask.length; i += 1) {
    if (!analysisMask[i]) continue
    const x = i % width
    const y = Math.floor(i / width)
    const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1
      || !analysisMask[i - 1] || !analysisMask[i + 1]
      || !analysisMask[i - width] || !analysisMask[i + width]
    if (outlineOnly && !edge) continue
    pixels.data.set(edge ? [5, 58, 130, 255] : [24, 111, 205, 190], i * 4)
  }
  context.putImageData(pixels, 0, 0)
  const source = new ImageStatic({
    url: canvas.toDataURL(),
    imageExtent: [...extent],
    projection: ACCOUNT_CRS,
    interpolate: false,
  })
  canvas.width = 0
  canvas.height = 0
  return source
}

export function createPlanAreaLayer() {
  return new ImageLayer<ImageStatic>({ className: 'explore-plan-area', visible: false })
}
