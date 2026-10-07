import TileGrid from 'ol/tilegrid/TileGrid'

import { loadSharedImageBlob } from './sharedImageRequests'
import {
  ACCOUNT_CRS,
  ACCOUNT_ORIGIN,
  buildRawAccountTileUrl,
  ACCOUNT_RESOLUTIONS,
  classifyAccountPixel,
  loadOverviewRaster,
  type LoadedOverviewRaster,
} from './accountOverviewRaster'

const PLAN_ENDPOINT = 'https://nap.ft.dibk.no/services/wms/kommuneplaner/'
const PLAN_ANALYSIS_ZOOM = 9
const PLAN_TILE_PIXELS = 512
const PLAN_SOURCE_TILE_SIZE = 256
const MAX_CONCURRENT_REQUESTS = 4
const NATURE_CLASS = 2
const AGRICULTURE_CLASS = 1
const ACCOUNT_ENDPOINT = 'https://wms.nibio.no/cgi-bin/grunnkart_arealanalyse'
export const NATURE_TYPE_SCALE = 2
export const NATURE_TYPE_TILE_PIXELS = PLAN_TILE_PIXELS * NATURE_TYPE_SCALE

export const natureTypeDefinitions = [
  { id: 'skog', label: 'Skog', sourceValue: 'skog', color: [255, 0, 0], displayColor: '#9ECC73' },
  { id: 'hei-buskmark', label: 'Hei og buskmark', sourceValue: 'heiBuskmark', color: [0, 255, 0], displayColor: '#E1C790' },
  { id: 'lite-vegetert-mark', label: 'Lite vegetert mark', sourceValue: 'liteVegetertMark', color: [0, 0, 255], displayColor: '#FFE8C2' },
  { id: 'vatmark', label: 'Våtmark', sourceValue: 'vatmark', color: [255, 0, 255], displayColor: '#C9B0EC' },
  { id: 'kyst', label: 'Kyststrender, svaberg og dyner', sourceValue: 'kyststrenderSvabergDyner', color: [0, 255, 255], displayColor: '#DCDCDC' },
] as const

const plannedDevelopmentCache = new Map<string, PlannedDevelopmentResult>()
const natureBreakdownCache = new Map<string, PlannedNatureBreakdown>()

export const PLAN_PIXEL_METERS = ACCOUNT_RESOLUTIONS[PLAN_ANALYSIS_ZOOM] / 2
export const NATURE_TYPE_PIXEL_METERS = PLAN_PIXEL_METERS / NATURE_TYPE_SCALE

const planTileGrid = new TileGrid({
  origin: ACCOUNT_ORIGIN,
  resolutions: ACCOUNT_RESOLUTIONS,
  tileSize: PLAN_SOURCE_TILE_SIZE,
  minZoom: 5,
})

const planLike = (value: string) =>
  `<PropertyIsLike wildCard="*" singleChar="?" escapeChar="!"><PropertyName>arealformål</PropertyName><Literal>${value}</Literal></PropertyIsLike>`

const PLAN_FILTER =
  `<Filter xmlns="http://www.opengis.net/ogc"><And><PropertyIsEqualTo><PropertyName>arealbruksstatus</PropertyName><Literal>2</Literal></PropertyIsEqualTo><Or>${planLike('1*')}${planLike('2*')}</Or></And></Filter>`

const PLAN_STYLE =
  '<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld"><NamedLayer><Name>kparealformalomrade</Name><UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer><Fill><CssParameter name="fill">#000000</CssParameter></Fill></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>'

export interface PlannedDevelopmentOverlayGrid {
  readonly kind: 'planned' | 'drawn'
  readonly zoom: 9
  readonly cx0: number
  readonly cy0: number
  readonly width: number
  readonly height: number
  readonly extent: readonly [number, number, number, number]
  readonly cleaned: Uint8Array
  readonly analysisMask: Uint8Array
}

export type PlannedNatureTypeId = typeof natureTypeDefinitions[number]['id']

export function plannedNatureDisplayColor(id: PlannedNatureTypeId): string {
  return natureTypeDefinitions.find((definition) => definition.id === id)?.displayColor ?? '#000000'
}

export interface PlannedNatureTypeMetric {
  readonly id: PlannedNatureTypeId
  readonly label: string
  readonly color: string
  readonly areaKm2: number
  readonly sharePercent: number
}

export interface PlannedNatureBreakdown {
  readonly municipalityNumber: string
  readonly status: 'available'
  readonly source: 'NIBIO Grunnkart for arealanalyse'
  readonly level: 'okosystemtypeniva1'
  readonly methodVersion: 'planned-nature-types-v1'
  readonly tileCount: number
  readonly pixelMeters: number
  readonly classificationPixelMeters: number
  readonly classifiedAreaKm2: number
  readonly unclassifiedAreaKm2: number
  readonly metrics: readonly PlannedNatureTypeMetric[]
}

export interface PlannedDevelopmentAnalysis {
  readonly municipalityNumber: string
  readonly analysisId: string
  readonly analysisAreaKind: 'planned' | 'drawn'
  readonly analysisAreaKm2: number | null
  readonly status: 'available'
  readonly natureKm2: number
  readonly agricultureKm2: number
  readonly natureWithNarrowStripsKm2: number
  readonly agricultureWithNarrowStripsKm2: number
  readonly natureSharePercent: number | null
  readonly agricultureSharePercent: number | null
  readonly natureShareOfAnalysisAreaPercent: number | null
  readonly agricultureShareOfAnalysisAreaPercent: number | null
  readonly tileCount: number
  readonly pixelMeters: number
  readonly source: 'DiBK kommuneplaner' | 'Eget tegnet område'
  readonly methodVersion: 'dibk-plan-raster-v1' | 'drawn-area-raster-v1'
  readonly overlay: PlannedDevelopmentOverlayGrid
}

export interface PlannedDevelopmentUnavailable {
  readonly municipalityNumber: string
  readonly status: 'not_available'
  readonly reason: string
}

export type PlannedDevelopmentResult =
  | PlannedDevelopmentAnalysis
  | PlannedDevelopmentUnavailable

interface TileAnalysis {
  readonly tileCoord: [number, number, number]
  readonly planned: Uint8Array
  readonly plannedAny: Uint8Array
  readonly nature: number
  readonly agriculture: number
  readonly plannedNature: number
  readonly plannedAgriculture: number
}

export async function calculatePlannedDevelopment(
  municipalityNumber: string,
  signal?: AbortSignal,
): Promise<PlannedDevelopmentResult> {
  const cached = plannedDevelopmentCache.get(municipalityNumber)
  if (cached) return cached

  const raster = await loadOverviewRaster(municipalityNumber)
  if (!raster) {
    return {
      municipalityNumber,
      status: 'not_available',
      reason: 'Beregningen krever et klargjort oversiktsraster for kommunen i denne prototypen.',
    }
  }

  const tileCoords = getPlanTileCoordinates(raster.extent)
  if (tileCoords.length === 0) {
    return {
      municipalityNumber,
      status: 'not_available',
      reason: 'Fant ingen analyseruter for kommunen.',
    }
  }

  const overviewBitmap = await createImageBitmap(raster.rawBlob)
  try {
    const tileResults = await mapWithConcurrency(
      tileCoords,
      MAX_CONCURRENT_REQUESTS,
      (tileCoord) => analyseTile(tileCoord, raster, overviewBitmap, signal),
    )

    const minX = Math.min(...tileResults.map((tile) => tile.tileCoord[1]))
    const maxX = Math.max(...tileResults.map((tile) => tile.tileCoord[1]))
    const minY = Math.min(...tileResults.map((tile) => tile.tileCoord[2]))
    const maxY = Math.max(...tileResults.map((tile) => tile.tileCoord[2]))
    const width = (maxX - minX + 1) * PLAN_TILE_PIXELS
    const height = (maxY - minY + 1) * PLAN_TILE_PIXELS
    const planned = new Uint8Array(width * height)
    const plannedAny = new Uint8Array(width * height)

    let totalNature = 0
    let totalAgriculture = 0
    let rawNature = 0
    let rawAgriculture = 0

    for (const tile of tileResults) {
      const tileX = (tile.tileCoord[1] - minX) * PLAN_TILE_PIXELS
      const tileY = (tile.tileCoord[2] - minY) * PLAN_TILE_PIXELS

      for (let row = 0; row < PLAN_TILE_PIXELS; row += 1) {
        const sourceStart = row * PLAN_TILE_PIXELS
        const targetStart = (tileY + row) * width + tileX
        planned.set(
          tile.planned.subarray(sourceStart, sourceStart + PLAN_TILE_PIXELS),
          targetStart,
        )
        plannedAny.set(
          tile.plannedAny.subarray(sourceStart, sourceStart + PLAN_TILE_PIXELS),
          targetStart,
        )
      }

      totalNature += tile.nature
      totalAgriculture += tile.agriculture
      rawNature += tile.plannedNature
      rawAgriculture += tile.plannedAgriculture
    }

    const cleaned = removeNarrowPlanStrips(planned, width)
    const cleanedAnalysisMask = removeNarrowPlanStrips(plannedAny, width)
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
      analysisId: `planned:${municipalityNumber}`,
      analysisAreaKind: 'planned',
      analysisAreaKm2: cleanedAnalysisMask.nature * pixelAreaKm2,
      status: 'available',
      natureKm2: cleaned.nature * pixelAreaKm2,
      agricultureKm2: cleaned.agriculture * pixelAreaKm2,
      natureWithNarrowStripsKm2: rawNature * pixelAreaKm2,
      agricultureWithNarrowStripsKm2: rawAgriculture * pixelAreaKm2,
      natureSharePercent: totalNature > 0 ? cleaned.nature / totalNature * 100 : null,
      agricultureSharePercent: totalAgriculture > 0
        ? cleaned.agriculture / totalAgriculture * 100
        : null,
      natureShareOfAnalysisAreaPercent: cleanedAnalysisMask.nature > 0
        ? cleaned.nature / cleanedAnalysisMask.nature * 100
        : null,
      agricultureShareOfAnalysisAreaPercent: cleanedAnalysisMask.nature > 0
        ? cleaned.agriculture / cleanedAnalysisMask.nature * 100
        : null,
      tileCount: tileResults.length,
      pixelMeters: PLAN_PIXEL_METERS,
      source: 'DiBK kommuneplaner',
      methodVersion: 'dibk-plan-raster-v1',
      overlay: {
        kind: 'planned',
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
        cleaned: cleaned.cleaned,
        analysisMask: cleanedAnalysisMask.cleaned,
      },
    }
    plannedDevelopmentCache.set(municipalityNumber, result)
    return result
  } finally {
    overviewBitmap.close()
  }
}

export function buildPlanTileUrl(tileCoord: number[]): string {
  return PLAN_ENDPOINT + '?' + new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: 'kparealformalomrade',
    sld_body: PLAN_STYLE,
    crs: ACCOUNT_CRS,
    bbox: planTileGrid.getTileCoordExtent(tileCoord).map((value) => value.toFixed(2)).join(','),
    width: String(PLAN_TILE_PIXELS),
    height: String(PLAN_TILE_PIXELS),
    format: 'image/png8',
    transparent: 'true',
    filter: PLAN_FILTER,
  })
}

export function loadPlanTileBlobByUrl(url: string, signal?: AbortSignal): Promise<Blob> {
  return loadSharedImageBlob(url, signal)
}

const NATURE_TYPE_STYLE = (() => {
  const rules = natureTypeDefinitions.map(({ sourceValue, color }) => {
    const hex = '#' + color.map((value) => value.toString(16).padStart(2, '0')).join('')
    return `<Rule><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>okosystemtypeniva1</ogc:PropertyName><ogc:Literal>${sourceValue}</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter><PolygonSymbolizer><Fill><CssParameter name="fill">${hex}</CssParameter></Fill></PolygonSymbolizer></Rule>`
  }).join('')

  return `<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>okosystemtype</Name><UserStyle><FeatureTypeStyle>${rules}</FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`
})()

export function buildNatureTypeTileUrl(tileCoord: number[]): string {
  return ACCOUNT_ENDPOINT + '?' + new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: 'okosystemtype',
    styles: '',
    crs: ACCOUNT_CRS,
    bbox: planTileGrid.getTileCoordExtent(tileCoord).map((value) => value.toFixed(2)).join(','),
    width: String(NATURE_TYPE_TILE_PIXELS),
    height: String(NATURE_TYPE_TILE_PIXELS),
    format: 'image/png; mode=8bit',
    transparent: 'true',
    sld_body: NATURE_TYPE_STYLE,
  })
}

export function buildSelectedNatureTypeTileUrl(
  tileCoord: number[],
  id: PlannedNatureTypeId,
): string {
  const definition = natureTypeDefinitions.find((item) => item.id === id)
  if (!definition) return ''

  const style =
    '<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>okosystemtype</Name><UserStyle><FeatureTypeStyle>'
    + '<Rule><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>okosystemtypeniva1</ogc:PropertyName><ogc:Literal>'
    + definition.sourceValue
    + '</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>'
    + '<PolygonSymbolizer><Fill><CssParameter name="fill">'
    + definition.displayColor
    + '</CssParameter></Fill></PolygonSymbolizer></Rule>'
    + '</FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>'

  return ACCOUNT_ENDPOINT + '?' + new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: 'okosystemtype',
    styles: '',
    crs: ACCOUNT_CRS,
    bbox: planTileGrid.getTileCoordExtent(tileCoord).map((value) => value.toFixed(2)).join(','),
    width: String(NATURE_TYPE_TILE_PIXELS),
    height: String(NATURE_TYPE_TILE_PIXELS),
    format: 'image/png; mode=8bit',
    transparent: 'true',
    sld_body: style,
  })
}

export async function calculatePlannedNatureBreakdown(
  analysis: PlannedDevelopmentAnalysis,
  signal?: AbortSignal,
): Promise<PlannedNatureBreakdown> {
  const cacheKey = analysis.analysisId
  const cached = natureBreakdownCache.get(cacheKey)
  if (cached) return cached

  const overlay = analysis.overlay
  const tiles = overlayTilesWithNature(overlay)
  const partial = await mapWithConcurrency(
    tiles,
    MAX_CONCURRENT_REQUESTS,
    (tileCoord) => countNatureTypesInTile(tileCoord, overlay, signal),
  )

  const counts = new Array<number>(natureTypeDefinitions.length).fill(0)
  let unclassified = 0
  for (const item of partial) {
    item.counts.forEach((count, index) => { counts[index] += count })
    unclassified += item.unclassified
  }

  const pixelAreaKm2 = NATURE_TYPE_PIXEL_METERS * NATURE_TYPE_PIXEL_METERS / 1_000_000
  const plannedNaturePixels = Math.round(
    analysis.natureKm2 / (PLAN_PIXEL_METERS * PLAN_PIXEL_METERS / 1_000_000),
  ) * NATURE_TYPE_SCALE * NATURE_TYPE_SCALE
  const metrics = natureTypeDefinitions
    .map((definition, index) => ({
      id: definition.id,
      label: definition.label,
      color: definition.displayColor,
      areaKm2: counts[index] * pixelAreaKm2,
      sharePercent: plannedNaturePixels > 0 ? counts[index] / plannedNaturePixels * 100 : 0,
    }))
    .filter((metric) => metric.areaKm2 > 0)
    .sort((a, b) => b.areaKm2 - a.areaKm2)

  const result: PlannedNatureBreakdown = {
    municipalityNumber: analysis.municipalityNumber,
    status: 'available',
    source: 'NIBIO Grunnkart for arealanalyse',
    level: 'okosystemtypeniva1',
    methodVersion: 'planned-nature-types-v1',
    tileCount: tiles.length,
    pixelMeters: PLAN_PIXEL_METERS,
    classificationPixelMeters: NATURE_TYPE_PIXEL_METERS,
    classifiedAreaKm2: counts.reduce((sum, count) => sum + count, 0) * pixelAreaKm2,
    unclassifiedAreaKm2: unclassified * pixelAreaKm2,
    metrics,
  }
  natureBreakdownCache.set(cacheKey, result)
  return result
}

function overlayTilesWithNature(
  overlay: PlannedDevelopmentOverlayGrid,
): [number, number, number][] {
  const minTileX = overlay.cx0 / PLAN_TILE_PIXELS
  const minTileY = overlay.cy0 / PLAN_TILE_PIXELS
  const tileColumns = overlay.width / PLAN_TILE_PIXELS
  const tileRows = overlay.height / PLAN_TILE_PIXELS
  const result: [number, number, number][] = []

  for (let row = 0; row < tileRows; row += 1) {
    for (let column = 0; column < tileColumns; column += 1) {
      const startX = column * PLAN_TILE_PIXELS
      const startY = row * PLAN_TILE_PIXELS
      let hasNature = false

      for (let y = 0; y < PLAN_TILE_PIXELS && !hasNature; y += 1) {
        const start = (startY + y) * overlay.width + startX
        for (let x = 0; x < PLAN_TILE_PIXELS; x += 1) {
          if (overlay.cleaned[start + x] === 1) {
            hasNature = true
            break
          }
        }
      }

      if (hasNature) {
        result.push([
          overlay.zoom,
          minTileX + column,
          minTileY + row,
        ])
      }
    }
  }
  return result
}

async function countNatureTypesInTile(
  tileCoord: [number, number, number],
  overlay: PlannedDevelopmentOverlayGrid,
  signal?: AbortSignal,
): Promise<{ counts: number[]; unclassified: number }> {
  const blob = await loadSharedImageBlob(buildNatureTypeTileUrl(tileCoord), signal)
  const bitmap = await createImageBitmap(blob)

  try {
    const canvas = document.createElement('canvas')
    canvas.width = NATURE_TYPE_TILE_PIXELS
    canvas.height = NATURE_TYPE_TILE_PIXELS
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Kunne ikke lese naturfordelingen i nettleseren')
    context.drawImage(bitmap, 0, 0)
    const pixels = context.getImageData(
      0,
      0,
      NATURE_TYPE_TILE_PIXELS,
      NATURE_TYPE_TILE_PIXELS,
    ).data

    const counts = new Array<number>(natureTypeDefinitions.length).fill(0)
    let unclassified = 0
    const tileOffsetX = tileCoord[1] * PLAN_TILE_PIXELS - overlay.cx0
    const tileOffsetY = tileCoord[2] * PLAN_TILE_PIXELS - overlay.cy0

    for (let y = 0; y < PLAN_TILE_PIXELS; y += 1) {
      const globalRow = (tileOffsetY + y) * overlay.width
      for (let x = 0; x < PLAN_TILE_PIXELS; x += 1) {
        const globalIndex = globalRow + tileOffsetX + x
        if (overlay.cleaned[globalIndex] !== 1) continue

        for (let subY = 0; subY < NATURE_TYPE_SCALE; subY += 1) {
          for (let subX = 0; subX < NATURE_TYPE_SCALE; subX += 1) {
            const sourceX = x * NATURE_TYPE_SCALE + subX
            const sourceY = y * NATURE_TYPE_SCALE + subY
            const rgba = 4 * (sourceY * NATURE_TYPE_TILE_PIXELS + sourceX)

            if (pixels[rgba + 3] < 100) {
              unclassified += 1
              continue
            }
            counts[classifyNatureTypePixel(
              pixels[rgba],
              pixels[rgba + 1],
              pixels[rgba + 2],
            )] += 1
          }
        }
      }
    }

    return { counts, unclassified }
  } finally {
    bitmap.close()
  }
}

export function classifyNatureTypePixel(red: number, green: number, blue: number): number {
  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY
  natureTypeDefinitions.forEach((definition, index) => {
    const [r, g, b] = definition.color
    const distance = (red - r) ** 2 + (green - g) ** 2 + (blue - b) ** 2
    if (distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  })
  return best
}

export function buildRawAccountPlanTileUrl(endpoint: string, tileCoord: number[]): string {
  return buildRawAccountTileUrl(endpoint, tileCoord)
}

export function isPlannedDevelopmentCellKept(
  overlay: PlannedDevelopmentOverlayGrid,
  tileCoord: readonly number[],
  pixelX: number,
  pixelY: number,
): boolean {
  const [zoom, tileX, tileY] = tileCoord
  if (zoom < overlay.zoom) return false
  const shift = zoom - overlay.zoom
  const x = ((tileX * PLAN_TILE_PIXELS + pixelX) >> shift) - overlay.cx0
  const y = ((tileY * PLAN_TILE_PIXELS + pixelY) >> shift) - overlay.cy0
  if (x < 0 || y < 0 || x >= overlay.width || y >= overlay.height) return false

  const index = y * overlay.width + x
  const grid = overlay.cleaned
  return Boolean(
    grid[index]
    || (x > 0 && grid[index - 1])
    || (x < overlay.width - 1 && grid[index + 1])
    || (y > 0 && grid[index - overlay.width])
    || (y < overlay.height - 1 && grid[index + overlay.width])
  )
}

export { planTileGrid, PLAN_ANALYSIS_ZOOM, PLAN_TILE_PIXELS }

export function getPlanTileCoordinates(
  extent: readonly [number, number, number, number],
): [number, number, number][] {
  const coordinates: [number, number, number][] = []
  planTileGrid.forEachTileCoord(
    [...extent],
    PLAN_ANALYSIS_ZOOM,
    (tileCoord) => coordinates.push([tileCoord[0], tileCoord[1], tileCoord[2]]),
  )
  return coordinates
}

export function removeNarrowPlanStrips(
  planned: Uint8Array,
  width: number,
): { cleaned: Uint8Array; nature: number; agriculture: number } {
  const candidates: number[] = []
  for (let index = 0; index < planned.length; index += 1) {
    if (planned[index] === 1 || planned[index] === 2) candidates.push(index)
  }

  const cleaned = new Uint8Array(planned.length)
  let frontier: number[] = []

  for (const index of candidates) {
    const x = index % width
    if (
      x > 0
      && x < width - 1
      && index >= width
      && index < planned.length - width
      && planned[index - 1]
      && planned[index + 1]
      && planned[index - width]
      && planned[index + width]
    ) {
      cleaned[index] = planned[index]
      frontier.push(index)
    }
  }

  while (frontier.length > 0) {
    const next: number[] = []
    for (const index of frontier) {
      for (const neighbour of [
        index - 1,
        index + 1,
        index - width,
        index + width,
        index - width - 1,
        index - width + 1,
        index + width - 1,
        index + width + 1,
      ]) {
        if (
          neighbour >= 0
          && neighbour < planned.length
          && (planned[neighbour] === 1 || planned[neighbour] === 2)
          && cleaned[neighbour] === 0
        ) {
          cleaned[neighbour] = planned[neighbour]
          next.push(neighbour)
        }
      }
    }
    frontier = next
  }

  let nature = 0
  let agriculture = 0
  for (const index of candidates) {
    if (cleaned[index] === 1) nature += 1
    else if (cleaned[index] === 2) agriculture += 1
  }

  return { cleaned, nature, agriculture }
}

async function analyseTile(
  tileCoord: [number, number, number],
  raster: LoadedOverviewRaster,
  overviewBitmap: ImageBitmap,
  signal?: AbortSignal,
): Promise<TileAnalysis> {
  const tileExtent = planTileGrid.getTileCoordExtent(tileCoord)
  const classesCanvas = createTileCanvas()
  const classesContext = classesCanvas.getContext('2d', { willReadFrequently: true })
  if (!classesContext) throw new Error('Kunne ikke lese Grunnkart-rasteret i nettleseren')

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

  const planBitmap = await createImageBitmap(
    await loadPlanTileBlobByUrl(buildPlanTileUrl(tileCoord), signal),
  )
  let plan: Uint8ClampedArray
  try {
    const planCanvas = createTileCanvas()
    const planContext = planCanvas.getContext('2d', { willReadFrequently: true })
    if (!planContext) throw new Error('Kunne ikke lese kommuneplanrasteret i nettleseren')
    planContext.drawImage(planBitmap, 0, 0)
    plan = planContext.getImageData(0, 0, PLAN_TILE_PIXELS, PLAN_TILE_PIXELS).data
  } finally {
    planBitmap.close()
  }

  const planned = new Uint8Array(PLAN_TILE_PIXELS * PLAN_TILE_PIXELS)
  const plannedAny = new Uint8Array(PLAN_TILE_PIXELS * PLAN_TILE_PIXELS)
  let nature = 0
  let agriculture = 0
  let plannedNature = 0
  let plannedAgriculture = 0

  for (let pixel = 0, rgba = 0; pixel < planned.length; pixel += 1, rgba += 4) {
    if (classes[rgba + 3] < 100) continue

    const isPlanned = plan[rgba + 3] >= 128
    if (isPlanned) plannedAny[pixel] = 1

    const accountClass = classifyAccountPixel(
      classes[rgba],
      classes[rgba + 1],
      classes[rgba + 2],
    )
    if (accountClass !== NATURE_CLASS && accountClass !== AGRICULTURE_CLASS) continue

    if (accountClass === NATURE_CLASS) {
      nature += 1
      if (isPlanned) {
        planned[pixel] = 1
        plannedNature += 1
      }
    } else {
      agriculture += 1
      if (isPlanned) {
        planned[pixel] = 2
        plannedAgriculture += 1
      }
    }
  }

  return {
    tileCoord,
    planned,
    plannedAny,
    nature,
    agriculture,
    plannedNature,
    plannedAgriculture,
  }
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
