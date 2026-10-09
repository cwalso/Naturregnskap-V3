import ImageTile from 'ol/ImageTile'
import TileState from 'ol/TileState'
import XYZ from 'ol/source/XYZ'
import { getIntersection, isEmpty } from 'ol/extent'
import {
  ACCOUNT_CRS, buildRawAccountTileUrl, classifyAccountPixel,
  loadOverviewRaster, type LoadedOverviewRaster,
} from './accountOverviewRaster'
import { nationalLandCover2025 } from '../datasets/registry'
import { buildPlanTileUrl, loadPlanTileBlobByUrl, planTileGrid, PLAN_ANALYSIS_ZOOM, PLAN_TILE_PIXELS } from './plannedDevelopment'
import { loadSharedImageBlob } from './sharedImageRequests'

class DisplaySource extends XYZ {
  constructor(options: ConstructorParameters<typeof XYZ>[0], private readonly stop: () => void) { super(options) }
  protected override disposeInternal() { this.stop(); super.disposeInternal() }
}

const COLORS = [[158, 204, 115], [255, 209, 110]] as const
const SIZE = PLAN_TILE_PIXELS

// Presentation only: no area totals, analysis mask, stripe cleanup or result cache.
export function intersectFutureDevelopmentPixels(account: Uint8ClampedArray, plan: Uint8ClampedArray): Uint8Array {
  const classes = new Uint8Array(account.length / 4)
  for (let pixel = 0; pixel < classes.length; pixel++) {
    const i = pixel * 4
    if (account[i + 3] < 100 || plan[i + 3] < 128) continue
    const value = classifyAccountPixel(account[i], account[i + 1], account[i + 2])
    if (value === 2) classes[pixel] = 1
    else if (value === 1) classes[pixel] = 2
  }
  return classes
}

// Coarse pixels retain subpixel fields without expanding their geographic footprint.
export function futureDevelopmentColor(nature: number, agriculture: number, samples: number): readonly number[] {
  if (!nature && !agriculture) return [0, 0, 0, 0]
  return [...COLORS[agriculture > nature ? 1 : 0], Math.round(255 * Math.max(0.35, Math.sqrt((nature + agriculture) / samples)))]
}

function canvas() {
  const result = document.createElement('canvas')
  result.width = result.height = SIZE
  return result
}

async function pixels(blob: Blob) {
  const bitmap = await createImageBitmap(blob)
  try {
    const target = document.createElement('canvas')
    target.width = bitmap.width; target.height = bitmap.height
    const context = target.getContext('2d', { willReadFrequently: true })!
    context.drawImage(bitmap, 0, 0)
    return context.getImageData(0, 0, bitmap.width, bitmap.height).data
  } finally { bitmap.close() }
}

function sampleOverview(raster: LoadedOverviewRaster, data: Uint8ClampedArray, tileCoord: number[]) {
  const extent = planTileGrid.getTileCoordExtent(tileCoord)
  const output = new Uint8ClampedArray(SIZE * SIZE * 4)
  const dx = (extent[2] - extent[0]) / SIZE
  const dy = (extent[3] - extent[1]) / SIZE
  for (let y = 0; y < SIZE; y++) {
    const sy = Math.floor((raster.extent[3] - extent[3] + (y + 0.5) * dy) * raster.height / (raster.extent[3] - raster.extent[1]))
    if (sy < 0 || sy >= raster.height) continue
    for (let x = 0; x < SIZE; x++) {
      const sx = Math.floor((extent[0] - raster.extent[0] + (x + 0.5) * dx) * raster.width / (raster.extent[2] - raster.extent[0]))
      if (sx < 0 || sx >= raster.width) continue
      const from = (sy * raster.width + sx) * 4
      output.set(data.subarray(from, from + 4), (y * SIZE + x) * 4)
    }
  }
  return output
}

export function createFutureDevelopmentDisplaySource(number: string, municipalityExtent: number[]): XYZ {
  const abort = new AbortController()
  let overview: Promise<{ raster: LoadedOverviewRaster; data: Uint8ClampedArray }> | undefined
  function getOverview() {
    overview ??= loadOverviewRaster(number).then(async (raster) => {
      if (!raster) throw new Error('Kommuneoversikten for framtidig utbygging er ikke klargjort.')
      return { raster, data: await pixels(raster.rawBlob) }
    })
    return overview
  }
  async function intersect(tileCoord: number[]) {
    const planRequest = loadPlanTileBlobByUrl(buildPlanTileUrl(tileCoord), abort.signal).then(pixels)
    const accountRequest = tileCoord[0] > PLAN_ANALYSIS_ZOOM
      ? loadSharedImageBlob(buildRawAccountTileUrl(nationalLandCover2025.visualSource.endpoint, tileCoord), abort.signal).then(pixels)
      : getOverview().then(({ raster, data }) => sampleOverview(raster, data, tileCoord))
    const [account, plan] = await Promise.all([accountRequest, planRequest])
    abort.signal.throwIfAborted()
    return intersectFutureDevelopmentPixels(account, plan)
  }
  async function render(tileCoord: number[]) {
    const target = canvas(), context = target.getContext('2d')!
    const image = context.createImageData(SIZE, SIZE)
    if (tileCoord[0] >= PLAN_ANALYSIS_ZOOM) {
      const classes = await intersect(tileCoord)
      for (let i = 0; i < classes.length; i++) {
        if (classes[i]) image.data.set([...COLORS[classes[i] - 1], 255], i * 4)
      }
    } else {
      const extent = getIntersection(planTileGrid.getTileCoordExtent(tileCoord), municipalityExtent)
      const coordinates: number[][] = []
      if (!isEmpty(extent)) planTileGrid.forEachTileCoord(extent, PLAN_ANALYSIS_ZOOM, (tc) => coordinates.push(tc))
      const nature = new Uint32Array(SIZE * SIZE), agriculture = new Uint32Array(SIZE * SIZE)
      const factor = 2 ** (PLAN_ANALYSIS_ZOOM - tileCoord[0])
      let next = 0
      await Promise.all(Array.from({ length: Math.min(4, coordinates.length) }, async () => {
        while (next < coordinates.length) {
          const tc = coordinates[next++]
          const classes = await intersect(tc)
          for (let i = 0; i < classes.length; i++) {
            if (!classes[i]) continue
            const x = Math.floor(((tc[1] - tileCoord[1] * factor) * SIZE + i % SIZE) / factor)
            const y = Math.floor(((tc[2] - tileCoord[2] * factor) * SIZE + Math.floor(i / SIZE)) / factor)
            if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue
            const counts = classes[i] === 1 ? nature : agriculture
            counts[y * SIZE + x]++
          }
        }
      }))
      for (let i = 0; i < nature.length; i++) image.data.set(futureDevelopmentColor(nature[i], agriculture[i], factor * factor), i * 4)
    }
    context.putImageData(image, 0, 0)
    return new Promise<Blob>((resolve, reject) => target.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Kartflisen kunne ikke tegnes')), 'image/png'))
  }
  const source = new DisplaySource({ projection: ACCOUNT_CRS, tileGrid: planTileGrid, tilePixelRatio: 2,
    transition: 0, interpolate: false, attributions: 'Kilder: DiBK · kommuneplanens arealdel; NIBIO · Grunnkart 2025',
    tileUrlFunction: (tc) => `${number}/${tc.join('/')}`,
    tileLoadFunction: (tile) => {
      void render(tile.getTileCoord()).then((blob) => {
        if (abort.signal.aborted) return
        const url = URL.createObjectURL(blob), image = (tile as ImageTile).getImage() as HTMLImageElement
        const release = () => URL.revokeObjectURL(url)
        image.addEventListener('load', release, { once: true }); image.addEventListener('error', release, { once: true })
        image.src = url
      }).catch(() => { if (!abort.signal.aborted) tile.setState(TileState.ERROR) })
    },
  }, () => { abort.abort(); overview = undefined })
  return source
}
