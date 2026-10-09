import Feature from 'ol/Feature'
import GeoJSON from 'ol/format/GeoJSON'
import EsriJSON from 'ol/format/EsriJSON'
import Polygon from 'ol/geom/Polygon'
import MultiPolygon from 'ol/geom/MultiPolygon'
import OlMap from 'ol/Map'
import View from 'ol/View'
import ImageTile from 'ol/ImageTile'
import TileState from 'ol/TileState'
import { getCacheKey } from 'ol/tilecoord'
import ImageState from 'ol/ImageState'
import ImageLayer from 'ol/layer/Image'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import ImageWMS from 'ol/source/ImageWMS'
import ImageStatic from 'ol/source/ImageStatic'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import { Fill, Stroke, Style } from 'ol/style'
import proj4 from 'proj4'
import { register } from 'ol/proj/proj4'
import type { MunicipalityBoundary } from '../api/municipalities'
import { filterRegisteredNature, municipalValueLegend, type MunicipalNatureFilter, type MunicipalValuedNature } from '../api/municipalValuedNature'
import { nationalLandCover2025, valuedNature } from '../datasets/registry'
import { initialMapLayers, mapLayers, type MapLayerId, type MapLayerState } from '../features/explore-map/mapThemes'
import { getIntersection, isEmpty } from 'ol/extent'
import { ACCOUNT_CRS, ACCOUNT_DETAIL_MAX_RESOLUTION, accountTileGrid, buildRawAccountTileUrl, loadAccountDisplayTileBlob, loadOverviewRaster } from './accountOverviewRaster'
import { defaultBasemap } from './basemaps'
import { createFutureDevelopmentDisplaySource } from './futureDevelopmentDisplay'

proj4.defs(ACCOUNT_CRS, '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs +type=crs')
register(proj4)
export type LayerMapStatus = 'idle' | 'loading' | 'ready' | 'error'
export interface LayerMapContext {
  boundary: MunicipalityBoundary | null
  layers: MapLayerState
  data: MunicipalValuedNature | null
  filter: MunicipalNatureFilter
  selectedId: string | null
}
export interface LayerMapController {
  update(context: LayerMapContext): void
  fitToMunicipality(): void
  setSelectionHandler(handler: ((id: string | null) => void) | null): void
  destroy(): void
}

export function createExploreLayerMap(target: HTMLElement, onStatus: (layer: MapLayerId, status: LayerMapStatus, municipalityNumber: string | null) => void): LayerMapController {
  const accountSource = new XYZ({ projection: ACCOUNT_CRS, tileGrid: accountTileGrid, tilePixelRatio: 2, transition: 0,
    tileUrlFunction: (tileCoord) => buildRawAccountTileUrl(nationalLandCover2025.visualSource.endpoint, tileCoord),
    tileLoadFunction: (tile, url) => {
      const image = (tile as ImageTile).getImage() as HTMLImageElement
      void loadAccountDisplayTileBlob(url).then((blob) => {
        if (destroyed) return
        const objectUrl = URL.createObjectURL(blob)
        const release = () => URL.revokeObjectURL(objectUrl)
        image.addEventListener('load', release, { once: true }); image.addEventListener('error', release, { once: true })
        image.src = objectUrl
      }).catch(() => { if (!destroyed) tile.setState(TileState.ERROR) })
    }, attributions: 'Kilde: NIBIO, Grunnkart for arealanalyse 2025' })
  const overview = new ImageLayer<ImageStatic>({ visible: false, minResolution: ACCOUNT_DETAIL_MAX_RESOLUTION, className: 'explore-level0-overview' })
  const detail = new TileLayer({ source: accountSource, visible: false, className: 'explore-level0-detail' })
  const natureSource = new ImageWMS({ url: valuedNature.visualSource.endpoint, params: { LAYERS: [...municipalValueLegend].reverse().map((category) => category.wmsLayer).join(','), VERSION: '1.3.0', TRANSPARENT: true },
    projection: ACCOUNT_CRS, ratio: 1, crossOrigin: 'anonymous', attributions: valuedNature.attribution })
  const nature = new ImageLayer({ source: natureSource, visible: false, className: 'explore-registered-nature' })
  const plan = new TileLayer<XYZ>({ visible: false, className: 'explore-future-development' })
  const localitySource = new VectorSource()
  const styles = new Map<string, Style[]>()
  let selectedId: string | null = null
  let filtered = false
  const localities = new VectorLayer({ source: localitySource, visible: false, className: 'explore-registered-localities', style: (feature) => {
    const selected = String(feature.getId()) === selectedId
    if (!filtered && !selected) return undefined
    const key = `${feature.get('color')}:${selected}`
    let result = styles.get(key)
    if (!result) {
      result = [new Style({ fill: filtered ? new Fill({ color: feature.get('color') }) : undefined,
        stroke: new Stroke({ color: '#733F16', width: 1 }), zIndex: feature.get('priority') })]
      if (selected) result.push(new Style({ stroke: new Stroke({ color: 'white', width: 7 }), zIndex: 10 }), new Style({ stroke: new Stroke({ color: '#222', width: 3 }), zIndex: 11 }))
      styles.set(key, result)
    }
    return result
  } })
  const borderSource = new VectorSource()
  const maskSource = new VectorSource()
  const mask = new VectorLayer({ source: maskSource, className: 'explore-theme-mask', style: new Style({ fill: new Fill({ color: '#F7F9F8' }) }) })
  const border = new VectorLayer({ source: borderSource, style: new Style({ stroke: new Stroke({ color: '#005B42', width: 2 }) }) })
  const view = new View({ projection: ACCOUNT_CRS, center: [270000, 7040000], resolution: 100, enableRotation: false })
  const map = new OlMap({ target, view, layers: [new TileLayer({ source: new XYZ({ ...defaultBasemap, url: defaultBasemap.url, attributions: defaultBasemap.attribution, crossOrigin: 'anonymous' }) }), overview, detail, plan, nature, localities, mask, border] })
  let destroyed = false
  let boundary: MunicipalityBoundary | null = null
  let activeLayers = initialMapLayers()
  let pendingFit = false
  let overviewRequest = 0
  let overviewUrl: string | null = null
  let overviewReady = false
  let overviewFailed = false
  let previousData: MunicipalValuedNature | null = null
  let previousFilter = ''
  let selectionHandler: ((id: string | null) => void) | null = null
  const physicalLayers = {
    level0: [overview, detail],
    'future-development': [plan],
    'valued-nature': [nature, localities],
  }
  for (const definition of mapLayers) {
    physicalLayers[definition.id].forEach((layer, index) => {
      layer.set('mapLayerId', definition.id)
      layer.setZIndex(definition.zIndex + (definition.id === 'valued-nature' ? index : 0))
    })
  }
  mask.setZIndex(1000); border.setZIndex(1001)
  const listeners = (['imageloadstart', 'imageloadend', 'imageloaderror'] as const).map((event) => natureSource.on(event, (e) => {
    if (destroyed || !nature.getVisible() || !boundary) return
    const size = map.getSize(), resolution = view.getResolution()
    const current = size && resolution ? natureSource.getImage(view.calculateExtent(size), resolution, window.devicePixelRatio || 1, view.getProjection()) : null
    if (e.image === current) syncStatus()
  }))
  const tileListeners = (['tileloadstart', 'tileloadend', 'tileloaderror'] as const).map((event) => accountSource.on(event, () => {
    if (!destroyed && boundary && activeLayers.level0.visible) syncStatus()
  }))
  function fit() {
    if (!borderSource.getFeatures().length) return
    const size = map.getSize()
    if (!size?.[0] || !size[1]) { pendingFit = true; return }
    const extent = borderSource.getExtent()
    if (extent) view.fit(extent, { padding: [32, 32, 32, 32], duration: 0 })
    pendingFit = false
  }
  function resize() { if (!destroyed) { map.updateSize(); if (pendingFit) fit() } }
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
  observer?.observe(target)
  window.addEventListener('resize', resize)
  map.on('singleclick', (event) => {
    if ((!activeLayers['valued-nature'].visible || activeLayers['valued-nature'].opacity === 0) || !borderSource.getFeatures()[0]?.getGeometry()?.intersectsCoordinate(event.coordinate)) return
    const hits = localitySource.getFeatures().filter((feature) => feature.getGeometry()?.intersectsCoordinate(event.coordinate))
      .sort((a, b) => b.get('priority') - a.get('priority'))
    selectionHandler?.(hits[0] ? String(hits[0].getId()) : null)
  })
  // Only current viewport tiles affect status; late errors from a former view/municipality are ignored.
  function tileStatus(layer: TileLayer<XYZ>): LayerMapStatus {
    const source = layer.getSource()
    const size = map.getSize(), resolution = view.getResolution()
    const extent = borderSource.getExtent()
    if (!source || !size || !resolution || !extent) return 'loading'
    const visibleExtent = getIntersection(view.calculateExtent(size), extent)
    if (isEmpty(visibleExtent)) return 'ready'
    const grid = source.getTileGrid()!
    const zoom = grid.getZForResolution(resolution, source.zDirection)
    const cache = layer.getRenderer()?.getTileCache()
    if (!cache) return 'loading'
    let loading = false, error = false
    grid.forEachTileCoord(visibleExtent, zoom, (tc) => {
      // OpenLayers 10 owns rendered tiles in the layer renderer. Reading the source
      // directly would create a new IDLE tile and report permanent loading.
      const key = getCacheKey(source, source.getKey(), tc[0], tc[1], tc[2])
      const state = cache.containsKey(key) ? (cache.peek(key) as ImageTile).getState() : TileState.IDLE
      if (state === TileState.ERROR) error = true
      if (state === TileState.IDLE || state === TileState.LOADING) loading = true
    })
    return error ? 'error' : loading ? 'loading' : 'ready'
  }
  function syncStatus() {
    for (const definition of mapLayers) {
      const { visible, opacity } = activeLayers[definition.id]
      let status: LayerMapStatus = 'idle'
      if (boundary && visible) {
        if (opacity === 0) status = 'ready'
        else if (definition.id === 'level0') {
          const coarse = view.getResolution()! >= detail.getMaxResolution()
          status = coarse ? overviewFailed ? 'error' : overviewReady ? 'ready' : 'loading' : tileStatus(detail)
        } else if (definition.id === 'future-development') status = tileStatus(plan)
        else if (filtered) status = 'ready'
        else {
          const size = map.getSize(), resolution = view.getResolution()
          const image = size && resolution ? natureSource.getImage(view.calculateExtent(size), resolution, window.devicePixelRatio || 1, view.getProjection()) : null
          status = image?.getState() === ImageState.LOADED ? 'ready' : image?.getState() === ImageState.ERROR ? 'error' : 'loading'
        }
      }
      onStatus(definition.id, status, boundary?.properties.number ?? null)
    }
  }
  map.on('moveend', syncStatus)
  map.on('rendercomplete', syncStatus)
  async function configureOverview(number: string) {
    const request = ++overviewRequest
    try {
      const raster = await loadOverviewRaster(number)
      if (destroyed || request !== overviewRequest) return
      if (!raster) { overviewFailed = true; syncStatus(); return }
      overviewUrl = URL.createObjectURL(raster.blob)
      const source = new ImageStatic({ url: overviewUrl, imageExtent: [...raster.extent], projection: ACCOUNT_CRS, interpolate: false })
      source.on('imageloadend', () => { if (!destroyed && request === overviewRequest) { overviewReady = true; syncStatus() } })
      source.on('imageloaderror', () => { if (!destroyed && request === overviewRequest) { overviewFailed = true; syncStatus() } })
      overview.setSource(source); overview.setVisible(activeLayers.level0.visible)
    } catch { if (!destroyed && request === overviewRequest) { overviewFailed = true; syncStatus() } }
  }
  return {
    update(next) {
      if (destroyed) return
      activeLayers = next.layers
      if (boundary !== next.boundary) {
        const changed = boundary?.properties.number !== next.boundary?.properties.number
        boundary = next.boundary
        borderSource.clear(); maskSource.clear(); localitySource.clear()
        plan.getSource()?.dispose(); plan.setSource(null)
        overviewRequest++; overviewReady = false; overviewFailed = false
        overview.getSource()?.dispose(); overview.setSource(null); overview.setVisible(false)
        if (overviewUrl) URL.revokeObjectURL(overviewUrl)
        overviewUrl = null
        previousData = null
        for (const layer of [overview, detail, nature, plan, localities]) layer.setExtent(undefined)
        if (boundary) {
          const feature = new GeoJSON().readFeatures(boundary, { dataProjection: 'EPSG:4326', featureProjection: ACCOUNT_CRS })[0]
          borderSource.addFeature(feature)
          const geometry = feature.getGeometry()
          if (geometry instanceof Polygon || geometry instanceof MultiPolygon) {
            const polygons = geometry instanceof Polygon ? [geometry.getCoordinates()] : geometry.getCoordinates()
            const world = [[-4000000, -1000000], [5000000, -1000000], [5000000, 12000000], [-4000000, 12000000], [-4000000, -1000000]]
            maskSource.addFeature(new Feature(new MultiPolygon([[world, ...polygons.map((rings) => [...rings[0]].reverse())], ...polygons.flatMap((rings) => rings.slice(1).map((hole) => [hole]))])))
            for (const layer of [overview, detail, nature, plan, localities]) layer.setExtent(geometry.getExtent())
          }
          const source = createFutureDevelopmentDisplaySource(boundary.properties.number, borderSource.getExtent()!)
          plan.setSource(source)
          for (const event of ['tileloadstart', 'tileloadend', 'tileloaderror'] as const) {
            source.on(event, () => {
              if (!destroyed && plan.getSource() === source && activeLayers['future-development'].visible) syncStatus()
            })
          }
          if (changed) pendingFit = true
          void configureOverview(boundary.properties.number)
        } else pendingFit = false
      }
      const data = activeLayers['valued-nature'].visible && next.data?.municipalityNumber === boundary?.properties.number ? next.data : null
      const key = JSON.stringify(next.filter)
      filtered = data !== null && (!!next.filter.natureType || !!next.filter.value)
      if (previousData !== data || previousFilter !== key) {
        previousData = data; previousFilter = key; localitySource.clear()
        if (data) for (const item of filterRegisteredNature(data, next.filter)) {
          const feature = new EsriJSON().readFeatures({ features: [{ geometry: { rings: item.rings, spatialReference: { wkid: 25833 } }, attributes: { color: item.color, priority: 4 - municipalValueLegend.findIndex((value) => value.label === item.value) } }] }, { dataProjection: ACCOUNT_CRS, featureProjection: ACCOUNT_CRS })[0]
          feature.setId(item.id); localitySource.addFeature(feature)
        }
      }
      selectedId = next.selectedId && localitySource.getFeatureById(next.selectedId) ? next.selectedId : null
      localities.changed()
      detail.setMaxResolution(ACCOUNT_DETAIL_MAX_RESOLUTION)
      overview.setVisible(boundary !== null && activeLayers.level0.visible && overview.getSource() !== null)
      detail.setVisible(boundary !== null && activeLayers.level0.visible)
      nature.setVisible(boundary !== null && activeLayers['valued-nature'].visible && !filtered)
      localities.setVisible(boundary !== null && activeLayers['valued-nature'].visible && data !== null)
      plan.setVisible(boundary !== null && activeLayers['future-development'].visible)
      for (const definition of mapLayers) {
        for (const layer of physicalLayers[definition.id]) layer.setOpacity(activeLayers[definition.id].opacity)
      }
      mask.setVisible(boundary !== null && mapLayers.some((item) => activeLayers[item.id].visible && activeLayers[item.id].opacity > 0))
      resize(); syncStatus()
    },
    fitToMunicipality() { if (!destroyed) fit() },
    setSelectionHandler(handler) { selectionHandler = handler },
    destroy() {
      if (destroyed) return
      destroyed = true; overviewRequest++; observer?.disconnect(); window.removeEventListener('resize', resize)
      for (const listener of [...listeners, ...tileListeners]) listener.target?.removeEventListener(listener.type, listener.listener)
      if (overviewUrl) URL.revokeObjectURL(overviewUrl)
      overview.getSource()?.dispose(); plan.getSource()?.dispose()
      for (const source of [accountSource, natureSource, localitySource, maskSource, borderSource]) source.dispose()
      selectionHandler = null; map.dispose()
    },
  }
}
