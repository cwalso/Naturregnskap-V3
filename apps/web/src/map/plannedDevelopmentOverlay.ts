import ImageTile from 'ol/ImageTile'

import { classifyAccountPixel } from './accountOverviewRaster'
import {
  buildRawAccountPlanTileUrl,
  isPlannedDevelopmentCellKept,
  PLAN_ANALYSIS_ZOOM,
  PLAN_TILE_PIXELS,
  type PlannedDevelopmentOverlayGrid,
} from './plannedDevelopment'

export const PLANNED_NATURE_COLOR = '#171C1A'
export const PLANNED_AGRICULTURE_COLOR = '#92400E'

const NATURE_CLASS = 2
const AGRICULTURE_CLASS = 1
const EMPTY_TILE =
  'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E'

const plannedNatureRgb = [23, 28, 26] as const
const plannedAgricultureRgb = [146, 64, 14] as const

export async function createPlannedDevelopmentOverviewBlob(
  overlay: PlannedDevelopmentOverlayGrid,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = overlay.width
  canvas.height = overlay.height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Nettleseren kunne ikke opprette planoverlay')

  const image = context.createImageData(overlay.width, overlay.height)
  const pixels = image.data

  for (let index = 0; index < overlay.cleaned.length; index += 1) {
    const value = overlay.cleaned[index]
    if (value !== 1 && value !== 2) continue

    const rgba = index * 4
    const color = value === 1 ? plannedNatureRgb : plannedAgricultureRgb
    pixels[rgba] = color[0]
    pixels[rgba + 1] = color[1]
    pixels[rgba + 2] = color[2]
    pixels[rgba + 3] = 255
  }

  context.putImageData(image, 0, 0)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Nettleseren kunne ikke lage planoverlay'))
    }, 'image/png')
  })
}

export async function loadPlannedDevelopmentDetailTile(
  tile: ImageTile,
  planUrl: string,
  accountEndpoint: string,
  overlay: PlannedDevelopmentOverlayGrid,
): Promise<void> {
  const tileCoord = tile.getTileCoord()
  if (tileCoord[0] <= PLAN_ANALYSIS_ZOOM) {
    setTileImage(tile, EMPTY_TILE)
    return
  }

  try {
    const [accountResponse, planResponse] = await Promise.all([
      fetch(buildRawAccountPlanTileUrl(accountEndpoint, tileCoord)),
      fetch(planUrl),
    ])

    if (!accountResponse.ok || !planResponse.ok) {
      throw new Error('Kartflis kunne ikke hentes')
    }

    const [accountBitmap, planBitmap] = await Promise.all([
      createImageBitmap(await accountResponse.blob()),
      createImageBitmap(await planResponse.blob()),
    ])

    try {
      const accountCanvas = tileCanvas()
      const accountContext = accountCanvas.getContext('2d', { willReadFrequently: true })
      const planCanvas = tileCanvas()
      const planContext = planCanvas.getContext('2d', { willReadFrequently: true })
      const outputCanvas = tileCanvas()
      const outputContext = outputCanvas.getContext('2d')

      if (!accountContext || !planContext || !outputContext) {
        throw new Error('Nettleseren kunne ikke lese kartflisen')
      }

      accountContext.drawImage(accountBitmap, 0, 0)
      planContext.drawImage(planBitmap, 0, 0)

      const account = accountContext.getImageData(
        0,
        0,
        PLAN_TILE_PIXELS,
        PLAN_TILE_PIXELS,
      ).data
      const plan = planContext.getImageData(
        0,
        0,
        PLAN_TILE_PIXELS,
        PLAN_TILE_PIXELS,
      ).data
      const output = outputContext.createImageData(PLAN_TILE_PIXELS, PLAN_TILE_PIXELS)
      const pixels = output.data
      let hasContent = false

      for (
        let pixel = 0, rgba = 0;
        pixel < PLAN_TILE_PIXELS * PLAN_TILE_PIXELS;
        pixel += 1, rgba += 4
      ) {
        if (account[rgba + 3] < 100 || plan[rgba + 3] < 128) continue

        const accountClass = classifyAccountPixel(
          account[rgba],
          account[rgba + 1],
          account[rgba + 2],
        )
        if (accountClass !== NATURE_CLASS && accountClass !== AGRICULTURE_CLASS) continue

        const x = pixel % PLAN_TILE_PIXELS
        const y = Math.floor(pixel / PLAN_TILE_PIXELS)
        if (!isPlannedDevelopmentCellKept(overlay, tileCoord, x, y)) continue

        const color = accountClass === NATURE_CLASS
          ? plannedNatureRgb
          : plannedAgricultureRgb

        pixels[rgba] = color[0]
        pixels[rgba + 1] = color[1]
        pixels[rgba + 2] = color[2]
        pixels[rgba + 3] = 255
        hasContent = true
      }

      if (!hasContent) {
        setTileImage(tile, EMPTY_TILE)
        return
      }

      outputContext.putImageData(output, 0, 0)
      const blob = await canvasBlob(outputCanvas)
      const objectUrl = URL.createObjectURL(blob)
      setTileImage(tile, objectUrl, true)
    } finally {
      accountBitmap.close()
      planBitmap.close()
    }
  } catch {
    setTileImage(tile, EMPTY_TILE)
  }
}

function tileCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = PLAN_TILE_PIXELS
  canvas.height = PLAN_TILE_PIXELS
  return canvas
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Nettleseren kunne ikke lage kartflis'))
    }, 'image/png')
  })
}

function setTileImage(tile: ImageTile, src: string, revoke = false) {
  const image = tile.getImage()
  if (revoke) {
    image.addEventListener('load', () => URL.revokeObjectURL(src), { once: true })
  }
  image.src = src
}
