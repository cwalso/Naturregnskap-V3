import { loadOverviewRaster } from '../../map/accountOverviewRaster'
import { buildPlanTileUrl, getPlanTileCoordinates, loadPlanTileBlobByUrl, planTileGrid, PLAN_TILE_PIXELS, type PlannedDevelopmentOverlayGrid } from '../../map/plannedDevelopment'
import { futureDevelopmentPixels, intersectFutureDevelopmentPixels, sampleFutureDevelopmentOverview } from '../../map/futureDevelopmentDisplay'

/** Exactly the level-9 support of the independent plan display, including narrow components. */
export async function loadFutureNatureMask(number: string, signal?: AbortSignal): Promise<PlannedDevelopmentOverlayGrid | null> {
  const raster = await loadOverviewRaster(number)
  signal?.throwIfAborted()
  if (!raster) return null
  const raw = await futureDevelopmentPixels(raster.rawBlob)
  const coords = getPlanTileCoordinates(raster.extent)
  if (!coords.length) throw new Error('Analysegrunnlaget mangler rasterceller.')
  const minX = Math.min(...coords.map((tc) => tc[1])), maxX = Math.max(...coords.map((tc) => tc[1]))
  const minY = Math.min(...coords.map((tc) => tc[2])), maxY = Math.max(...coords.map((tc) => tc[2]))
  const width = (maxX - minX + 1) * PLAN_TILE_PIXELS, height = (maxY - minY + 1) * PLAN_TILE_PIXELS
  const mask = new Uint8Array(width * height)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(4, coords.length) }, async () => {
    while (next < coords.length) {
      signal?.throwIfAborted()
      const tc = coords[next++]
      const plan = await futureDevelopmentPixels(await loadPlanTileBlobByUrl(buildPlanTileUrl(tc), signal))
      const classes = intersectFutureDevelopmentPixels(sampleFutureDevelopmentOverview(raster, raw, tc), plan)
      const x = (tc[1] - minX) * PLAN_TILE_PIXELS, y = (tc[2] - minY) * PLAN_TILE_PIXELS
      for (let row = 0; row < PLAN_TILE_PIXELS; row++) mask.set(classes.subarray(row * PLAN_TILE_PIXELS, (row + 1) * PLAN_TILE_PIXELS), (y + row) * width + x)
    }
  }))
  const top = planTileGrid.getTileCoordExtent([9, minX, minY]), bottom = planTileGrid.getTileCoordExtent([9, maxX, maxY])
  signal?.throwIfAborted()
  return { kind: 'planned', zoom: 9, cx0: minX * PLAN_TILE_PIXELS, cy0: minY * PLAN_TILE_PIXELS, width, height,
    extent: [top[0], bottom[1], bottom[2], top[3]], cleaned: mask, analysisMask: mask }
}
