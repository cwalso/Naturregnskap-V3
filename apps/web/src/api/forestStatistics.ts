import {
  ACCOUNT_CRS,
  classifyAccountPixel,
  loadOverviewRaster,
} from '../map/accountOverviewRaster'

const ACCOUNT_ENDPOINT = 'https://wms.nibio.no/cgi-bin/grunnkart_arealanalyse'
const MAX_ANALYSIS_PIXELS = 1_400_000
const FOREST_CLASS_COLOR = [31, 110, 73] as const
const NATURE_CLASS = 2

export interface ForestTypeDefinition {
  readonly id: string
  readonly label: string
  readonly sourceValue: string
  readonly color: string
  readonly rgb: readonly [number, number, number]
}

export const forestTypeDefinitions: readonly ForestTypeDefinition[] = [
  { id: 'gran', label: 'Granskog', sourceValue: 'skogGran', color: '#315C3B', rgb: [49, 92, 59] },
  { id: 'furu', label: 'Furuskog', sourceValue: 'skogFuru', color: '#557C45', rgb: [85, 124, 69] },
  { id: 'barblanding', label: 'Barblandingsskog', sourceValue: 'skogBarblanding', color: '#759B58', rgb: [117, 155, 88] },
  { id: 'blanding', label: 'Blandingsskog', sourceValue: 'skogBlanding', color: '#9DB86B', rgb: [157, 184, 107] },
  { id: 'lauv', label: 'Lauvskog', sourceValue: 'skogLauv', color: '#C4D58B', rgb: [196, 213, 139] },
] as const

export const FOREST_WMS_ENDPOINT = ACCOUNT_ENDPOINT
export const FOREST_WMS_LAYER = 'okosystemtype'
export const FOREST_WMS_STYLE = buildForestEcosystemStyle()

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
  readonly methodVersion: 'forest-raster-v1'
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

export function getForestStatistics(
  municipalityNumber: string,
  municipalityName: string,
  signal?: AbortSignal,
): Promise<ForestStatistics> {
  const cached = cache.get(municipalityNumber)
  if (cached) return cached

  const request = calculateForestStatistics(
    municipalityNumber,
    municipalityName,
    signal,
  ).catch((error: unknown) => {
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

  const scale = Math.min(
    1,
    Math.sqrt(MAX_ANALYSIS_PIXELS / (raster.width * raster.height)),
  )
  const width = Math.max(1, Math.round(raster.width * scale))
  const height = Math.max(1, Math.round(raster.height * scale))
  const pixelAreaKm2 =
    ((raster.extent[2] - raster.extent[0]) / width)
    * ((raster.extent[3] - raster.extent[1]) / height)
    / 1_000_000
  const pixelMetersApprox = Math.sqrt(pixelAreaKm2 * 1_000_000)

  const [ecosystemBlob, typeBlob] = await Promise.all([
    fetchWmsRaster(
      buildWmsUrl(
        raster.extent,
        width,
        height,
        FOREST_WMS_LAYER,
        FOREST_WMS_STYLE,
      ),
      signal,
    ),
    fetchWmsRaster(
      buildWmsUrl(
        raster.extent,
        width,
        height,
        'arealdekkeniva2',
        buildForestTypeStyle(),
      ),
      signal,
    ),
  ])

  const [rawBitmap, ecosystemBitmap, typeBitmap] = await Promise.all([
    createImageBitmap(raster.rawBlob),
    createImageBitmap(ecosystemBlob),
    createImageBitmap(typeBlob),
  ])

  try {
    const rawPixels = bitmapPixels(rawBitmap, width, height)
    const ecosystemPixels = bitmapPixels(ecosystemBitmap, width, height)
    const typePixels = bitmapPixels(typeBitmap, width, height)

    let mappedPixels = 0
    let naturePixels = 0
    let forestPixels = 0
    const typeCounts = new Array<number>(forestTypeDefinitions.length).fill(0)

    for (let index = 0; index < width * height; index += 1) {
      const offset = index * 4
      if (rawPixels[offset + 3] < 32) continue
      mappedPixels += 1

      if (
        classifyAccountPixel(
          rawPixels[offset],
          rawPixels[offset + 1],
          rawPixels[offset + 2],
        ) === NATURE_CLASS
      ) {
        naturePixels += 1
      }

      if (
        ecosystemPixels[offset + 3] >= 32
        && colorDistanceSquared(
          ecosystemPixels[offset],
          ecosystemPixels[offset + 1],
          ecosystemPixels[offset + 2],
          FOREST_CLASS_COLOR,
        ) < 500
      ) {
        forestPixels += 1
      }

      if (typePixels[offset + 3] < 32) continue
      const typeIndex = nearestForestType(
        typePixels[offset],
        typePixels[offset + 1],
        typePixels[offset + 2],
      )
      if (typeIndex >= 0) typeCounts[typeIndex] += 1
    }

    const forestAreaKm2 = forestPixels * pixelAreaKm2
    const municipalityMappedAreaKm2 = mappedPixels * pixelAreaKm2
    const natureAreaKm2 = naturePixels * pixelAreaKm2
    const typeAreaTotal = typeCounts.reduce((sum, count) => sum + count, 0) * pixelAreaKm2

    const typeMetrics = forestTypeDefinitions
      .map((definition, index) => ({
        id: definition.id,
        label: definition.label,
        color: definition.color,
        areaKm2: typeCounts[index] * pixelAreaKm2,
        sharePercent: typeAreaTotal > 0
          ? typeCounts[index] * pixelAreaKm2 / typeAreaTotal * 100
          : 0,
      }))
      .filter((metric) => metric.areaKm2 > 0)
      .sort((a, b) => b.areaKm2 - a.areaKm2)

    return {
      status: 'available',
      municipalityNumber,
      municipalityName,
      source: 'NIBIO Grunnkart for arealanalyse',
      sourceVersion: '2025',
      methodVersion: 'forest-raster-v1',
      forestAreaKm2,
      municipalityMappedAreaKm2,
      forestSharePercent: municipalityMappedAreaKm2 > 0
        ? forestAreaKm2 / municipalityMappedAreaKm2 * 100
        : 0,
      natureAreaKm2,
      forestShareOfNaturePercent: natureAreaKm2 > 0
        ? forestAreaKm2 / natureAreaKm2 * 100
        : null,
      typeMetrics,
      dominantType: typeMetrics[0] ?? null,
      pixelMetersApprox,
      warnings: [
        'Skogarealet er et prototypeanslag beregnet fra økosystemtype nivå 1 i Grunnkart for arealanalyse, årsversjon 2025.',
        'Fordelingen på gran, furu, barblanding, blandingsskog og lauvskog er hentet fra arealdekke nivå 2 og er en annen egenskap enn økosystemtypen.',
        'Beregningen gjøres på et forenklet raster i nettleseren og skal ikke brukes som offisiell arealstatistikk før metode og dataleveranse er kvalitetssikret.',
      ],
    }
  } finally {
    rawBitmap.close()
    ecosystemBitmap.close()
    typeBitmap.close()
  }
}

function buildForestEcosystemStyle(): string {
  const color = rgbToHex(FOREST_CLASS_COLOR)
  return '<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>okosystemtype</Name><UserStyle><FeatureTypeStyle>'
    + '<Rule><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>okosystemtypeniva1</ogc:PropertyName><ogc:Literal>skog</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>'
    + '<PolygonSymbolizer><Fill><CssParameter name="fill">' + color + '</CssParameter></Fill></PolygonSymbolizer></Rule>'
    + '</FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>'
}

function buildForestTypeStyle(): string {
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
}

function buildWmsUrl(
  extent: readonly [number, number, number, number],
  width: number,
  height: number,
  layer: string,
  sld: string,
): string {
  return ACCOUNT_ENDPOINT + '?' + new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: layer,
    styles: '',
    crs: ACCOUNT_CRS,
    bbox: extent.map((value) => value.toFixed(2)).join(','),
    width: String(width),
    height: String(height),
    format: 'image/png; mode=8bit',
    transparent: 'true',
    sld_body: sld,
  })
}

async function fetchWmsRaster(url: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`Kunne ikke hente skogdata fra Grunnkart, HTTP ${response.status}`)
  }
  return response.blob()
}

function bitmapPixels(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Uint8ClampedArray {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Nettleseren kunne ikke opprette rasterkontekst')
  context.drawImage(bitmap, 0, 0, width, height)
  return context.getImageData(0, 0, width, height).data
}

function nearestForestType(red: number, green: number, blue: number): number {
  let bestIndex = -1
  let bestDistance = Number.POSITIVE_INFINITY
  forestTypeDefinitions.forEach((definition, index) => {
    const distance = colorDistanceSquared(red, green, blue, definition.rgb)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })
  return bestDistance < 1400 ? bestIndex : -1
}

function colorDistanceSquared(
  red: number,
  green: number,
  blue: number,
  color: readonly [number, number, number],
): number {
  return (red - color[0]) ** 2
    + (green - color[1]) ** 2
    + (blue - color[2]) ** 2
}

function rgbToHex(color: readonly [number, number, number]): string {
  return '#' + color.map((value) => value.toString(16).padStart(2, '0')).join('')
}
