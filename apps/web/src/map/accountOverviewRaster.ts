import TileGrid from 'ol/tilegrid/TileGrid'

export const ACCOUNT_CRS = 'EPSG:25833'
export const ACCOUNT_ORIGIN = [-2500000, 9045984] as const
export const ACCOUNT_RESOLUTIONS = Array.from({ length: 19 }, (_, z) => 21664 / 2 ** z)
export const ACCOUNT_DETAIL_MAX_RESOLUTION = 30
export const accountTileGrid = new TileGrid({
  origin: ACCOUNT_ORIGIN,
  resolutions: ACCOUNT_RESOLUTIONS,
  tileSize: 256,
  minZoom: 10,
})

const DATA_COLORS = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 128, 255],
  [0, 128, 255],
  [255, 128, 128],
] as const

const DISPLAY_COLORS = [
  [232, 100, 116],
  [255, 209, 110],
  [158, 204, 115],
  [189, 215, 231],
  [107, 174, 214],
  [8, 81, 156],
] as const

const CLASS_RULES = [
  { values: ['bebygdOpparbeidetAreal'], color: '#E86474' },
  { values: ['dyrketmark', 'grasmark'], color: '#FFD16E' },
  { values: ['skog', 'heiBuskmark', 'liteVegetertMark', 'vatmark', 'kyststrenderSvabergDyner'], color: '#9ECC73' },
  { values: ['hav'], color: '#BDD7E7' },
  { values: ['innsjoerVannmagasiner'], color: '#6BAED6' },
  { values: ['elverBekkerKanaler'], color: '#08519C' },
] as const

const ACCOUNT_SLD = (() => {
  const rules = CLASS_RULES.map(({ values, color }) => {
    const comparisons = values
      .map((value) => `<ogc:PropertyIsEqualTo><ogc:PropertyName>okosystemtypeniva1</ogc:PropertyName><ogc:Literal>${value}</ogc:Literal></ogc:PropertyIsEqualTo>`)
      .join('')
    const filter = values.length > 1 ? `<ogc:Or>${comparisons}</ogc:Or>` : comparisons
    return `<Rule><ogc:Filter>${filter}</ogc:Filter><PolygonSymbolizer><Fill><CssParameter name="fill">${color}</CssParameter></Fill></PolygonSymbolizer></Rule>`
  }).join('')

  return `<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>okosystemtype</Name><UserStyle><FeatureTypeStyle>${rules}</FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`
})()

export function buildAccountTileUrl(endpoint: string, tileCoord: number[]): string {
  return endpoint + '?' + new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: 'okosystemtype',
    styles: '',
    crs: ACCOUNT_CRS,
    bbox: accountTileGrid.getTileCoordExtent(tileCoord).map((value) => value.toFixed(2)).join(','),
    width: '512',
    height: '512',
    format: 'image/png; mode=8bit',
    transparent: 'true',
    sld_body: ACCOUNT_SLD,
  })
}

interface OverviewRasterEntry {
  readonly name: string
  readonly file: string
  readonly extent: readonly [number, number, number, number]
  readonly width: number
  readonly height: number
  readonly resolutionMetersApprox: number
}

interface OverviewRasterIndex {
  readonly crs: 'EPSG:25833'
  readonly municipalities: Readonly<Record<string, OverviewRasterEntry>>
}

export interface LoadedOverviewRaster extends OverviewRasterEntry {
  readonly blob: Blob
}

let indexPromise: Promise<OverviewRasterIndex> | null = null
const rasterPromises = new Map<string, Promise<Blob>>()

export async function loadOverviewRaster(municipalityNumber: string): Promise<LoadedOverviewRaster | null> {
  const index = await loadOverviewIndex()
  const entry = index.municipalities[municipalityNumber]
  if (!entry) return null

  let rasterPromise = rasterPromises.get(municipalityNumber)
  if (!rasterPromise) {
    rasterPromise = fetchRaster(entry.file)
    rasterPromises.set(municipalityNumber, rasterPromise)
  }

  return {
    ...entry,
    blob: await rasterPromise,
  }
}

async function loadOverviewIndex(): Promise<OverviewRasterIndex> {
  if (!indexPromise) {
    indexPromise = fetch(`${import.meta.env.BASE_URL}data/grunnkart/2025/overview/index.json`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Kunne ikke hente register over oversiktsraster, HTTP ${response.status}`)
        }
        return parseOverviewIndex(await response.json())
      })
  }
  return indexPromise
}

async function fetchRaster(file: string): Promise<Blob> {
  const response = await fetch(
    `${import.meta.env.BASE_URL}data/grunnkart/2025/overview/${encodeURIComponent(file)}`,
  )
  if (!response.ok) {
    throw new Error(`Kunne ikke hente oversiktsraster, HTTP ${response.status}`)
  }
  const original = await response.blob()
  return recolorOverviewRaster(original)
}

function parseOverviewIndex(value: unknown): OverviewRasterIndex {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Registeret over oversiktsraster er ugyldig')
  }
  const root = value as Record<string, unknown>
  if (root.crs !== ACCOUNT_CRS || typeof root.municipalities !== 'object' || root.municipalities === null) {
    throw new Error('Registeret over oversiktsraster mangler forventet CRS eller kommuner')
  }

  const municipalities: Record<string, OverviewRasterEntry> = {}
  for (const [number, rawEntry] of Object.entries(root.municipalities as Record<string, unknown>)) {
    if (typeof rawEntry !== 'object' || rawEntry === null) continue
    const entry = rawEntry as Record<string, unknown>
    if (
      typeof entry.name !== 'string'
      || typeof entry.file !== 'string'
      || !Array.isArray(entry.extent)
      || entry.extent.length !== 4
      || !entry.extent.every((item) => typeof item === 'number')
      || typeof entry.width !== 'number'
      || typeof entry.height !== 'number'
      || typeof entry.resolutionMetersApprox !== 'number'
    ) continue

    municipalities[number] = {
      name: entry.name,
      file: entry.file,
      extent: entry.extent as [number, number, number, number],
      width: entry.width,
      height: entry.height,
      resolutionMetersApprox: entry.resolutionMetersApprox,
    }
  }

  return { crs: ACCOUNT_CRS, municipalities }
}

const LOOKUP_A = new Uint8Array(32768)
const LOOKUP_B = new Uint8Array(32768)
const LOOKUP_T = new Uint8Array(32768)

for (let q = 0; q < 32768; q += 1) {
  const point = [
    (q >> 10) * 255 / 31,
    ((q >> 5) & 31) * 255 / 31,
    (q & 31) * 255 / 31,
  ]
  let bestError = Number.POSITIVE_INFINITY

  for (let a = 0; a < DATA_COLORS.length; a += 1) {
    for (let b = a + 1; b < DATA_COLORS.length; b += 1) {
      let lineLengthSquared = 0
      let projection = 0
      for (let channel = 0; channel < 3; channel += 1) {
        const delta = DATA_COLORS[a][channel] - DATA_COLORS[b][channel]
        lineLengthSquared += delta * delta
        projection += (point[channel] - DATA_COLORS[b][channel]) * delta
      }

      const t = Math.max(0, Math.min(1, projection / lineLengthSquared))
      let error = 0
      for (let channel = 0; channel < 3; channel += 1) {
        const delta = point[channel]
          - DATA_COLORS[b][channel]
          - t * (DATA_COLORS[a][channel] - DATA_COLORS[b][channel])
        error += delta * delta
      }

      if (error < bestError) {
        bestError = error
        LOOKUP_A[q] = a
        LOOKUP_B[q] = b
        LOOKUP_T[q] = Math.round(t * 255)
      }
    }
  }
}

function lookupIndex(red: number, green: number, blue: number): number {
  return (red >> 3) << 10 | (green >> 3) << 5 | blue >> 3
}

async function recolorOverviewRaster(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Nettleseren kunne ikke opprette rasterkontekst')

    context.drawImage(bitmap, 0, 0)
    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = image.data

    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) continue

      const q = lookupIndex(pixels[i], pixels[i + 1], pixels[i + 2])
      const a = DISPLAY_COLORS[LOOKUP_A[q]]
      const b = DISPLAY_COLORS[LOOKUP_B[q]]
      const t = LOOKUP_T[q] / 255

      pixels[i] = Math.round(a[0] * t + b[0] * (1 - t))
      pixels[i + 1] = Math.round(a[1] * t + b[1] * (1 - t))
      pixels[i + 2] = Math.round(a[2] * t + b[2] * (1 - t))
    }

    context.putImageData(image, 0, 0)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result)
        else reject(new Error('Nettleseren kunne ikke lage fargelagt oversiktsraster'))
      }, 'image/png')
    })
  } finally {
    bitmap.close()
  }
}
