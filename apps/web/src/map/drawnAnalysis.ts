import type { Extent } from 'ol/extent'

import {
  classifyAccountPixel,
  loadOverviewRaster,
  type LoadedOverviewRaster,
} from './accountOverviewRaster'
import {
  getPlanTileCoordinates,
  PLAN_ANALYSIS_ZOOM,
  PLAN_PIXEL_METERS,
  PLAN_TILE_PIXELS,
  planTileGrid,
  type PlannedDevelopmentAnalysis,
  type PlannedDevelopmentResult,
} from './plannedDevelopment'

const MAX_CONCURRENT_REQUESTS = 4
const MAX_ANALYSIS_TILES = 256
const NATURE_CLASS = 2
const AGRICULTURE_CLASS = 1

export interface DrawnAnalysisArea {
  readonly id: string
  readonly rings: readonly (readonly [number, number])[][]
  readonly extent: readonly [number, number, number, number]
  readonly areaKm2: number
}

interface DrawnTileResult {
  readonly tileCoord: [number, number, number]
  readonly classified: Uint8Array
  readonly analysisMask: Uint8Array
  readonly nature: number
  readonly agriculture: number
  readonly analysisPixels: number
}

export async function calculateDrawnAreaAnalysis(
  municipalityNumber: string,
  area: DrawnAnalysisArea,
  signal?: AbortSignal,
): Promise<PlannedDevelopmentResult> {
  signal?.throwIfAborted()
  const raster = await loadOverviewRaster(municipalityNumber)
  if (!raster) {
    return {
      municipalityNumber,
      status: 'not_available',
      reason: 'Beregningen krever et klargjort Grunnkart-raster for kommunen.',
    }
  }

  const clippedExtent = intersectExtent(area.extent, raster.extent)
  if (!clippedExtent) {
    return {
      municipalityNumber,
      status: 'not_available',
      reason: 'Det tegnede området ligger ikke innenfor valgt kommune.',
    }
  }

  const tileCoords = getPlanTileCoordinates(clippedExtent)
  if (tileCoords.length === 0) {
    return {
      municipalityNumber,
      status: 'not_available',
      reason: 'Fant ingen analyseruter for det tegnede området.',
    }
  }
  if (tileCoords.length > MAX_ANALYSIS_TILES) {
    return {
      municipalityNumber,
      status: 'not_available',
      reason: 'Det tegnede området er for stort for nettleseranalysen. Tegn et mindre område.',
    }
  }

  const overviewBitmap = await createImageBitmap(raster.rawBlob)
  try {
    const tileResults = await mapWithConcurrency(
      tileCoords,
      MAX_CONCURRENT_REQUESTS,
      (tileCoord) => analyseDrawnTile(tileCoord, area, raster, overviewBitmap, signal),
    )

    const minX = Math.min(...tileResults.map((tile) => tile.tileCoord[1]))
    const maxX = Math.max(...tileResults.map((tile) => tile.tileCoord[1]))
    const minY = Math.min(...tileResults.map((tile) => tile.tileCoord[2]))
    const maxY = Math.max(...tileResults.map((tile) => tile.tileCoord[2]))
    const width = (maxX - minX + 1) * PLAN_TILE_PIXELS
    const height = (maxY - minY + 1) * PLAN_TILE_PIXELS
    const classified = new Uint8Array(width * height)
    const analysisMask = new Uint8Array(width * height)

    let naturePixels = 0
    let agriculturePixels = 0
    let areaPixels = 0

    for (const tile of tileResults) {
      const tileX = (tile.tileCoord[1] - minX) * PLAN_TILE_PIXELS
      const tileY = (tile.tileCoord[2] - minY) * PLAN_TILE_PIXELS

      for (let row = 0; row < PLAN_TILE_PIXELS; row += 1) {
        const sourceStart = row * PLAN_TILE_PIXELS
        const targetStart = (tileY + row) * width + tileX
        classified.set(
          tile.classified.subarray(sourceStart, sourceStart + PLAN_TILE_PIXELS),
          targetStart,
        )
        analysisMask.set(
          tile.analysisMask.subarray(sourceStart, sourceStart + PLAN_TILE_PIXELS),
          targetStart,
        )
      }

      naturePixels += tile.nature
      agriculturePixels += tile.agriculture
      areaPixels += tile.analysisPixels
    }

    if (areaPixels === 0) {
      return {
        municipalityNumber,
        status: 'not_available',
        reason: 'Det tegnede området ga ingen analyserbare ruter innenfor kommunen.',
      }
    }

    const pixelAreaKm2 = PLAN_PIXEL_METERS * PLAN_PIXEL_METERS / 1_000_000
    const topLeftExtent = planTileGrid.getTileCoordExtent([
      PLAN_ANALYSIS_ZOOM,
      minX,
      minY,
    ])
    const bottomRightExtent = planTileGrid.getTileCoordExtent([
      PLAN_ANALYSIS_ZOOM,
      maxX,
      maxY,
    ])

    const result: PlannedDevelopmentAnalysis = {
      municipalityNumber,
      analysisId: area.id,
      analysisAreaKind: 'drawn',
      analysisAreaKm2: areaPixels * pixelAreaKm2,
      status: 'available',
      natureKm2: naturePixels * pixelAreaKm2,
      agricultureKm2: agriculturePixels * pixelAreaKm2,
      natureWithNarrowStripsKm2: naturePixels * pixelAreaKm2,
      agricultureWithNarrowStripsKm2: agriculturePixels * pixelAreaKm2,
      natureSharePercent: null,
      agricultureSharePercent: null,
      natureShareOfAnalysisAreaPercent: naturePixels / areaPixels * 100,
      agricultureShareOfAnalysisAreaPercent: agriculturePixels / areaPixels * 100,
      tileCount: tileResults.length,
      pixelMeters: PLAN_PIXEL_METERS,
      source: 'Eget tegnet område',
      methodVersion: 'drawn-area-raster-v1',
      overlay: {
        kind: 'drawn',
        zoom: PLAN_ANALYSIS_ZOOM,
        cx0: minX * PLAN_TILE_PIXELS,
        cy0: minY * PLAN_TILE_PIXELS,
        width,
        height,
        extent: [
          topLeftExtent[0],
          bottomRightExtent[1],
          bottomRightExtent[2],
          topLeftExtent[3],
        ],
        cleaned: classified,
        analysisMask,
      },
    }

    signal?.throwIfAborted()
    return result
  } finally {
    overviewBitmap.close()
  }
}

async function analyseDrawnTile(
  tileCoord: [number, number, number],
  area: DrawnAnalysisArea,
  raster: LoadedOverviewRaster,
  overviewBitmap: ImageBitmap,
  signal?: AbortSignal,
): Promise<DrawnTileResult> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const tileExtent = planTileGrid.getTileCoordExtent(tileCoord)
  const maskCanvas = createTileCanvas()
  const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true })
  if (!maskContext) throw new Error('Kunne ikke rasterisere det tegnede området')
  drawAreaMask(maskContext, area.rings, tileExtent)
  const maskPixels = maskContext.getImageData(
    0,
    0,
    PLAN_TILE_PIXELS,
    PLAN_TILE_PIXELS,
  ).data

  const classesCanvas = createTileCanvas()
  const classesContext = classesCanvas.getContext('2d', { willReadFrequently: true })
  if (!classesContext) throw new Error('Kunne ikke lese Grunnkart-rasteret')

  const rasterResolution = (raster.extent[2] - raster.extent[0]) / raster.width
  drawImageSection(
    classesContext,
    overviewBitmap,
    (tileExtent[0] - raster.extent[0]) / rasterResolution,
    (raster.extent[3] - tileExtent[3]) / rasterResolution,
    (tileExtent[2] - tileExtent[0]) / rasterResolution,
    (tileExtent[3] - tileExtent[1]) / rasterResolution,
  )
  const classes = classesContext.getImageData(
    0,
    0,
    PLAN_TILE_PIXELS,
    PLAN_TILE_PIXELS,
  ).data

  const classified = new Uint8Array(PLAN_TILE_PIXELS * PLAN_TILE_PIXELS)
  const analysisMask = new Uint8Array(PLAN_TILE_PIXELS * PLAN_TILE_PIXELS)
  let nature = 0
  let agriculture = 0
  let analysisPixels = 0

  for (let pixel = 0, rgba = 0; pixel < classified.length; pixel += 1, rgba += 4) {
    if (maskPixels[rgba + 3] < 128 || classes[rgba + 3] < 100) continue

    analysisMask[pixel] = 1
    analysisPixels += 1

    const accountClass = classifyAccountPixel(
      classes[rgba],
      classes[rgba + 1],
      classes[rgba + 2],
    )

    if (accountClass === NATURE_CLASS) {
      classified[pixel] = 1
      nature += 1
    } else if (accountClass === AGRICULTURE_CLASS) {
      classified[pixel] = 2
      agriculture += 1
    }
  }

  return {
    tileCoord,
    classified,
    analysisMask,
    nature,
    agriculture,
    analysisPixels,
  }
}

function drawAreaMask(
  context: CanvasRenderingContext2D,
  rings: DrawnAnalysisArea['rings'],
  extent: Extent,
) {
  const [minX, minY, maxX, maxY] = extent
  const scaleX = PLAN_TILE_PIXELS / (maxX - minX)
  const scaleY = PLAN_TILE_PIXELS / (maxY - minY)

  context.clearRect(0, 0, PLAN_TILE_PIXELS, PLAN_TILE_PIXELS)
  context.beginPath()
  for (const ring of rings) {
    ring.forEach(([x, y], index) => {
      const px = (x - minX) * scaleX
      const py = (maxY - y) * scaleY
      if (index === 0) context.moveTo(px, py)
      else context.lineTo(px, py)
    })
    context.closePath()
  }
  context.fillStyle = '#000'
  context.fill('evenodd')
}

function createTileCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = PLAN_TILE_PIXELS
  canvas.height = PLAN_TILE_PIXELS
  return canvas
}

function drawImageSection(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceX: number,
  sourceY: number,
  sourceWidth: number,
  sourceHeight: number,
) {
  const x0 = Math.max(0, sourceX)
  const y0 = Math.max(0, sourceY)
  const imageWidth = 'width' in image ? Number(image.width) : 0
  const imageHeight = 'height' in image ? Number(image.height) : 0
  const x1 = Math.min(imageWidth, sourceX + sourceWidth)
  const y1 = Math.min(imageHeight, sourceY + sourceHeight)
  if (!(x1 > x0 && y1 > y0)) return

  const factorX = PLAN_TILE_PIXELS / sourceWidth
  const factorY = PLAN_TILE_PIXELS / sourceHeight
  context.drawImage(
    image,
    x0,
    y0,
    x1 - x0,
    y1 - y0,
    (x0 - sourceX) * factorX,
    (y0 - sourceY) * factorY,
    (x1 - x0) * factorX,
    (y1 - y0) * factorY,
  )
}

function intersectExtent(
  first: readonly [number, number, number, number],
  second: readonly [number, number, number, number],
): readonly [number, number, number, number] | null {
  const minX = Math.max(first[0], second[0])
  const minY = Math.max(first[1], second[1])
  const maxX = Math.min(first[2], second[2])
  const maxY = Math.min(first[3], second[3])
  if (maxX <= minX || maxY <= minY) return null
  return [minX, minY, maxX, maxY]
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await worker(items[index])
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  )
  return results
}
