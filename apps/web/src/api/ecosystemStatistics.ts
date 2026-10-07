import { loadSharedImageBlob } from '../map/sharedImageRequests'
import {
  classifyAccountPixel,
  loadOverviewRaster,
  type LoadedOverviewRaster,
} from '../map/accountOverviewRaster'
import {
  buildNatureTypeTileUrl,
  classifyNatureTypePixel,
  getPlanTileCoordinates,
  natureTypeDefinitions,
  NATURE_TYPE_PIXEL_METERS,
  NATURE_TYPE_TILE_PIXELS,
  planTileGrid,
  type PlannedNatureTypeId,
} from '../map/plannedDevelopment'

const NATURE_CLASS = 2
const MAX_CONCURRENT_REQUESTS = 4

export type EcosystemPageId = Extract<PlannedNatureTypeId, 'vatmark'>

export interface EcosystemMetric {
  readonly id: PlannedNatureTypeId
  readonly label: string
  readonly color: string
  readonly areaKm2: number
  readonly shareOfNaturePercent: number
  readonly shareOfMappedMunicipalityPercent: number
}

export interface EcosystemStatisticsAvailable {
  readonly status: 'available'
  readonly municipalityNumber: string
  readonly municipalityName: string
  readonly source: 'NIBIO Grunnkart for arealanalyse'
  readonly sourceVersion: '2025'
  readonly methodVersion: 'ecosystem-types-raster-v1'
  readonly municipalityMappedAreaKm2: number
  readonly natureAreaKm2: number
  readonly metrics: readonly EcosystemMetric[]
  readonly pixelMeters: number
  readonly warnings: readonly string[]
}

export interface EcosystemStatisticsUnavailable {
  readonly status: 'not_available'
  readonly municipalityNumber: string
  readonly municipalityName: string
  readonly reason: string
}

export type EcosystemStatistics =
  | EcosystemStatisticsAvailable
  | EcosystemStatisticsUnavailable

const resultCache = new Map<string, Promise<EcosystemStatistics>>()

export function getEcosystemStatistics(
  municipalityNumber: string,
  municipalityName: string,
  signal?: AbortSignal,
): Promise<EcosystemStatistics> {
  const cached = resultCache.get(municipalityNumber)
  if (cached) return cached

  const request = calculateEcosystemStatistics(
    municipalityNumber,
    municipalityName,
    signal,
  ).catch((error: unknown) => {
    resultCache.delete(municipalityNumber)
    throw error
  })

  resultCache.set(municipalityNumber, request)
  return request
}

async function calculateEcosystemStatistics(
  municipalityNumber: string,
  municipalityName: string,
  signal?: AbortSignal,
): Promise<EcosystemStatistics> {
  const raster = await loadOverviewRaster(municipalityNumber)
  if (!raster) {
    return {
      status: 'not_available',
      municipalityNumber,
      municipalityName,
      reason: 'Beregningen krever et klargjort oversiktsraster for kommunen i prototypen.',
    }
  }

  const tileCoords = getPlanTileCoordinates(raster.extent)
  if (tileCoords.length === 0) {
    return {
      status: 'not_available',
      municipalityNumber,
      municipalityName,
      reason: 'Fant ingen Grunnkart-ruter for kommunen.',
    }
  }

  const overviewBitmap = await createImageBitmap(raster.rawBlob)
  try {
    const partial = await mapWithConcurrency(
      tileCoords,
      MAX_CONCURRENT_REQUESTS,
      (tileCoord) => analyseTile(tileCoord, raster, overviewBitmap, signal),
    )

    const counts = new Array<number>(natureTypeDefinitions.length).fill(0)
    let mappedPixels = 0
    let naturePixels = 0

    for (const item of partial) {
      mappedPixels += item.mappedPixels
      naturePixels += item.naturePixels
      item.counts.forEach((count, index) => {
        counts[index] += count
      })
    }

    const pixelAreaKm2 =
      NATURE_TYPE_PIXEL_METERS * NATURE_TYPE_PIXEL_METERS / 1_000_000
    const municipalityMappedAreaKm2 = mappedPixels * pixelAreaKm2
    const natureAreaKm2 = naturePixels * pixelAreaKm2

    const metrics = natureTypeDefinitions.map((definition, index) => ({
      id: definition.id,
      label: definition.label,
      color: definition.displayColor,
      areaKm2: counts[index] * pixelAreaKm2,
      shareOfNaturePercent: naturePixels > 0
        ? counts[index] / naturePixels * 100
        : 0,
      shareOfMappedMunicipalityPercent: mappedPixels > 0
        ? counts[index] / mappedPixels * 100
        : 0,
    }))

    return {
      status: 'available',
      municipalityNumber,
      municipalityName,
      source: 'NIBIO Grunnkart for arealanalyse',
      sourceVersion: '2025',
      methodVersion: 'ecosystem-types-raster-v1',
      municipalityMappedAreaKm2,
      natureAreaKm2,
      metrics,
      pixelMeters: NATURE_TYPE_PIXEL_METERS,
      warnings: [
        'Tallene er prototypeberegninger fra økosystemtype nivå 1 i Grunnkart for arealanalyse, årsversjon 2025.',
        'Kart og statistikk bruker samme rutevise Grunnkart-kilde.',
        'Beregningen skal kvalitetssikres mot endelig dataleveranse og metode før bruk som offisiell statistikk.',
      ],
    }
  } finally {
    overviewBitmap.close()
  }
}

interface TileResult {
  readonly mappedPixels: number
  readonly naturePixels: number
  readonly counts: readonly number[]
}

async function analyseTile(
  tileCoord: [number, number, number],
  raster: LoadedOverviewRaster,
  overviewBitmap: ImageBitmap,
  signal?: AbortSignal,
): Promise<TileResult> {
  const blob = await loadSharedImageBlob(buildNatureTypeTileUrl(tileCoord), signal)
  const natureBitmap = await createImageBitmap(blob)

  try {
    const natureCanvas = createCanvas()
    const natureContext = natureCanvas.getContext('2d', { willReadFrequently: true })
    if (!natureContext) throw new Error('Kunne ikke lese økosystemtypene i nettleseren')
    natureContext.drawImage(natureBitmap, 0, 0)
    const naturePixels = natureContext.getImageData(
      0,
      0,
      NATURE_TYPE_TILE_PIXELS,
      NATURE_TYPE_TILE_PIXELS,
    ).data

    const maskCanvas = createCanvas()
    const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true })
    if (!maskContext) throw new Error('Kunne ikke lese kommunegrunnlaget i nettleseren')

    const tileExtent = planTileGrid.getTileCoordExtent(tileCoord)
    const rasterResolution = (raster.extent[2] - raster.extent[0]) / raster.width
    drawImageSection(
      maskContext,
      overviewBitmap,
      (tileExtent[0] - raster.extent[0]) / rasterResolution,
      (raster.extent[3] - tileExtent[3]) / rasterResolution,
      (tileExtent[2] - tileExtent[0]) / rasterResolution,
      (tileExtent[3] - tileExtent[1]) / rasterResolution,
    )
    const maskPixels = maskContext.getImageData(
      0,
      0,
      NATURE_TYPE_TILE_PIXELS,
      NATURE_TYPE_TILE_PIXELS,
    ).data

    const counts = new Array<number>(natureTypeDefinitions.length).fill(0)
    let mappedPixels = 0
    let landNaturePixels = 0

    for (
      let pixel = 0, rgba = 0;
      pixel < NATURE_TYPE_TILE_PIXELS * NATURE_TYPE_TILE_PIXELS;
      pixel += 1, rgba += 4
    ) {
      if (maskPixels[rgba + 3] < 100) continue
      mappedPixels += 1

      if (
        classifyAccountPixel(
          maskPixels[rgba],
          maskPixels[rgba + 1],
          maskPixels[rgba + 2],
        ) === NATURE_CLASS
      ) {
        landNaturePixels += 1
      }

      if (naturePixels[rgba + 3] < 100) continue
      counts[classifyNatureTypePixel(
        naturePixels[rgba],
        naturePixels[rgba + 1],
        naturePixels[rgba + 2],
      )] += 1
    }

    return {
      mappedPixels,
      naturePixels: landNaturePixels,
      counts,
    }
  } finally {
    natureBitmap.close()
  }
}

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = NATURE_TYPE_TILE_PIXELS
  canvas.height = NATURE_TYPE_TILE_PIXELS
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

  const factorX = NATURE_TYPE_TILE_PIXELS / sourceWidth
  const factorY = NATURE_TYPE_TILE_PIXELS / sourceHeight
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
