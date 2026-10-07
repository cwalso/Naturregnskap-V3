import { loadSharedImageBlob } from '../map/sharedImageRequests'
import {
  ACCOUNT_CRS,
  ACCOUNT_RESOLUTIONS,
  accountTileGrid,
  classifyAccountPixel,
  loadOverviewRaster,
  type LoadedOverviewRaster,
} from '../map/accountOverviewRaster'

const ACCOUNT_ENDPOINT = 'https://wms.nibio.no/cgi-bin/grunnkart_arealanalyse'
const FOREST_ANALYSIS_ZOOM = 10
const FOREST_TILE_PIXELS = 512
const MAX_CONCURRENT_REQUESTS = 4
const NATURE_CLASS = 2

export interface ForestTypeDefinition {
  readonly id: string
  readonly label: string
  readonly sourceValue: string
  readonly color: string
  readonly rgb: readonly [number, number, number]
}

export const forestTypeDefinitions: readonly ForestTypeDefinition[] = [
  { id: 'gran', label: 'Granskog', sourceValue: 'skogGran', color: '#66C2A4', rgb: [102, 194, 164] },
  { id: 'furu', label: 'Furuskog', sourceValue: 'skogFuru', color: '#A5BA1B', rgb: [165, 186, 27] },
  { id: 'barblanding', label: 'Barblandingsskog', sourceValue: 'skogBarblanding', color: '#1C8548', rgb: [28, 133, 72] },
  { id: 'blanding', label: 'Blandingsskog', sourceValue: 'skogBlanding', color: '#67A64F', rgb: [103, 166, 79] },
  { id: 'lauv', label: 'Lauvskog', sourceValue: 'skogLauv', color: '#9ECC73', rgb: [158, 204, 115] },
] as const

export const FOREST_WMS_ENDPOINT = ACCOUNT_ENDPOINT
export const FOREST_WMS_LAYER = 'arealdekkeniva2'

const FOREST_STYLE = (() => {
  const rules = forestTypeDefinitions.map((definition) => (
    '<Rule><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>arealdekkeniva2</ogc:PropertyName><ogc:Literal>'
    + definition.sourceValue
    + '</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>'
    + '<PolygonSymbolizer><Fill><CssParameter name="fill">'
    + definition.color
    + '</CssParameter></Fill></PolygonSymbolizer></Rule>'
  )).join('')

  return '<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>arealdekkeniva2</Name><UserStyle><FeatureTypeStyle>'
    + rules
    + '</FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>'
})()

export interface ForestTypeMetric {
  readonly id: string
  readonly label: string
  readonly color: string
  readonly areaKm2: number
  readonly sharePercent: number
}

export interface ForestStatisticsAvailable {
  readonly status: 'available'
  readonly municipalityNumber: string
  readonly municipalityName: string
  readonly source: 'NIBIO Grunnkart for arealanalyse'
  readonly sourceVersion: '2025'
  readonly methodVersion: 'forest-tiled-raster-v2'
  readonly forestAreaKm2: number
  readonly municipalityMappedAreaKm2: number
  readonly forestSharePercent: number
  readonly natureAreaKm2: number
  readonly forestShareOfNaturePercent: number | null
  readonly typeMetrics: readonly ForestTypeMetric[]
  readonly dominantType: ForestTypeMetric | null
  readonly pixelMetersApprox: number
  readonly warnings: readonly string[]
}

export interface ForestStatisticsUnavailable {
  readonly status: 'not_available'
  readonly municipalityNumber: string
  readonly municipalityName: string
  readonly reason: string
}

export type ForestStatistics = ForestStatisticsAvailable | ForestStatisticsUnavailable

const cache = new Map<string, Promise<ForestStatistics>>()

export function buildForestTileUrl(tileCoord: readonly number[]): string {
  return ACCOUNT_ENDPOINT + '?' + new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: FOREST_WMS_LAYER,
    styles: '',
    crs: ACCOUNT_CRS,
    bbox: accountTileGrid.getTileCoordExtent([...tileCoord]).map((value) => value.toFixed(2)).join(','),
    width: String(FOREST_TILE_PIXELS),
    height: String(FOREST_TILE_PIXELS),
    format: 'image/png; mode=8bit',
    transparent: 'true',
    sld_body: FOREST_STYLE,
  })
}

export function getForestStatistics(
  municipalityNumber: string,
  municipalityName: string,
  signal?: AbortSignal,
): Promise<ForestStatistics> {
  const cached = cache.get(municipalityNumber)
  if (cached) return cached

  const request = calculateForestStatistics(municipalityNumber, municipalityName, signal)
    .catch((error: unknown) => {
      cache.delete(municipalityNumber)
      throw error
    })
  cache.set(municipalityNumber, request)
  return request
}

async function calculateForestStatistics(
  municipalityNumber: string,
  municipalityName: string,
  signal?: AbortSignal,
): Promise<ForestStatistics> {
  const raster = await loadOverviewRaster(municipalityNumber)
  if (!raster) {
    return {
      status: 'not_available',
      municipalityNumber,
      municipalityName,
      reason: 'Skogstatistikken krever et klargjort Grunnkart-raster for kommunen i prototypen.',
    }
  }

  const tileCoords = forestTileCoordinates(raster.extent)
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
      (tileCoord) => analyseForestTile(tileCoord, raster, overviewBitmap, signal),
    )

    const typeCounts = new Array<number>(forestTypeDefinitions.length).fill(0)
    let mappedPixels = 0
    let naturePixels = 0

    for (const item of partial) {
      mappedPixels += item.mappedPixels
      naturePixels += item.naturePixels
      item.typeCounts.forEach((count, index) => {
        typeCounts[index] += count
      })
    }

    const pixelMetersApprox = ACCOUNT_RESOLUTIONS[FOREST_ANALYSIS_ZOOM] / 2
    const pixelAreaKm2 = pixelMetersApprox * pixelMetersApprox / 1_000_000
    const forestPixels = typeCounts.reduce((sum, count) => sum + count, 0)
    const forestAreaKm2 = forestPixels * pixelAreaKm2
    const municipalityMappedAreaKm2 = mappedPixels * pixelAreaKm2
    const natureAreaKm2 = naturePixels * pixelAreaKm2

    const typeMetrics = forestTypeDefinitions
      .map((definition, index) => ({
        id: definition.id,
        label: definition.label,
        color: definition.color,
        areaKm2: typeCounts[index] * pixelAreaKm2,
        sharePercent: forestPixels > 0 ? typeCounts[index] / forestPixels * 100 : 0,
      }))
      .filter((metric) => metric.areaKm2 > 0)
      .sort((a, b) => b.areaKm2 - a.areaKm2)

    return {
      status: 'available',
      municipalityNumber,
      municipalityName,
      source: 'NIBIO Grunnkart for arealanalyse',
      sourceVersion: '2025',
      methodVersion: 'forest-tiled-raster-v2',
      forestAreaKm2,
      municipalityMappedAreaKm2,
      forestSharePercent: mappedPixels > 0 ? forestPixels / mappedPixels * 100 : 0,
      natureAreaKm2,
      forestShareOfNaturePercent: naturePixels > 0 ? forestPixels / naturePixels * 100 : null,
      typeMetrics,
      dominantType: typeMetrics[0] ?? null,
      pixelMetersApprox,
      warnings: [
        'Skogarealet på denne siden beregnes fra skogklassene i arealdekke nivå 2 i Grunnkart for arealanalyse, årsversjon 2025.',
        'Fordelingen viser granskog, furuskog, barblandingsskog, blandingsskog og lauvskog.',
        'Beregningen gjøres rutevis på samme Grunnkart-tjeneste som kartvisningen for å sikre samsvar mellom kart og statistikk.',
      ],
    }
  } finally {
    overviewBitmap.close()
  }
}

interface ForestTileAnalysis {
  readonly mappedPixels: number
  readonly naturePixels: number
  readonly typeCounts: readonly number[]
}

async function analyseForestTile(
  tileCoord: [number, number, number],
  raster: LoadedOverviewRaster,
  overviewBitmap: ImageBitmap,
  signal?: AbortSignal,
): Promise<ForestTileAnalysis> {
  const forestBitmap = await createImageBitmap(await loadForestTile(tileCoord, signal))
  try {
    const forestCanvas = createTileCanvas()
    const forestContext = forestCanvas.getContext('2d', { willReadFrequently: true })
    if (!forestContext) throw new Error('Kunne ikke lese skogdata i nettleseren')
    forestContext.drawImage(forestBitmap, 0, 0)
    const forestPixels = forestContext.getImageData(
      0, 0, FOREST_TILE_PIXELS, FOREST_TILE_PIXELS,
    ).data

    const maskCanvas = createTileCanvas()
    const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true })
    if (!maskContext) throw new Error('Kunne ikke lese kommunegrensen i nettleseren')
    const tileExtent = accountTileGrid.getTileCoordExtent(tileCoord)
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
      0, 0, FOREST_TILE_PIXELS, FOREST_TILE_PIXELS,
    ).data

    let mappedPixels = 0
    let naturePixels = 0
    const typeCounts = new Array<number>(forestTypeDefinitions.length).fill(0)

    for (let pixel = 0, rgba = 0; pixel < FOREST_TILE_PIXELS * FOREST_TILE_PIXELS; pixel += 1, rgba += 4) {
      if (maskPixels[rgba + 3] < 100) continue
      mappedPixels += 1

      if (classifyAccountPixel(maskPixels[rgba], maskPixels[rgba + 1], maskPixels[rgba + 2]) === NATURE_CLASS) {
        naturePixels += 1
      }

      if (forestPixels[rgba + 3] < 100) continue
      const typeIndex = classifyForestTypePixel(
        forestPixels[rgba],
        forestPixels[rgba + 1],
        forestPixels[rgba + 2],
      )
      if (typeIndex >= 0) typeCounts[typeIndex] += 1
    }

    return { mappedPixels, naturePixels, typeCounts }
  } finally {
    forestBitmap.close()
  }
}

function forestTileCoordinates(
  extent: readonly [number, number, number, number],
): [number, number, number][] {
  const result: [number, number, number][] = []
  accountTileGrid.forEachTileCoord(
    [...extent],
    FOREST_ANALYSIS_ZOOM,
    (tileCoord) => result.push([tileCoord[0], tileCoord[1], tileCoord[2]]),
  )
  return result
}

async function loadForestTile(
  tileCoord: [number, number, number],
  signal?: AbortSignal,
): Promise<Blob> {
  return loadSharedImageBlob(buildForestTileUrl(tileCoord), signal)
}

function classifyForestTypePixel(red: number, green: number, blue: number): number {
  let best = -1
  let bestDistance = Number.POSITIVE_INFINITY
  forestTypeDefinitions.forEach((definition, index) => {
    const [r, g, b] = definition.rgb
    const distance = (red - r) ** 2 + (green - g) ** 2 + (blue - b) ** 2
    if (distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  })
  return bestDistance < 900 ? best : -1
}

function createTileCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = FOREST_TILE_PIXELS
  canvas.height = FOREST_TILE_PIXELS
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

  const factorX = FOREST_TILE_PIXELS / sourceWidth
  const factorY = FOREST_TILE_PIXELS / sourceHeight
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
