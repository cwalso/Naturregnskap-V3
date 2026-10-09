import Feature from 'ol/Feature'
import GeoJSON from 'ol/format/GeoJSON'
import EsriJSON from 'ol/format/EsriJSON'
import Polygon from 'ol/geom/Polygon'
import MultiPolygon from 'ol/geom/MultiPolygon'
import OlMap from 'ol/Map'
import View from 'ol/View'
import ImageTile from 'ol/ImageTile'
import TileState from 'ol/TileState'
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
import type { MapThemeId } from '../features/explore-map/mapThemes'
import { ACCOUNT_CRS, ACCOUNT_DETAIL_MAX_RESOLUTION, accountTileGrid, buildRawAccountTileUrl, loadAccountDisplayTileBlob, loadOverviewRaster } from './accountOverviewRaster'
import { defaultBasemap } from './basemaps'
import { createFutureDevelopmentDisplaySource } from './futureDevelopmentDisplay'

proj4.defs(ACCOUNT_CRS, '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs +type=crs')
register(proj4)
export type ThemeMapStatus = 'idle' | 'loading' | 'ready' | 'error'
export interface ThemeMapContext {
  boundary: MunicipalityBoundary | null
  theme: MapThemeId
  data: MunicipalValuedNature | null
  filter: MunicipalNatureFilter
  selectedId: string | null
}
export interface ThemeMapController {
  update(context: ThemeMapContext): void
  fitToMunicipality(): void
  setSelectionHandler(handler: ((id: string | null) => void) | null): void
  destroy(): void
}

export function createExploreThemeMap(target: HTMLElement, onStatus: (theme: MapThemeId, status: ThemeMapStatus) => void): ThemeMapController {
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
  const map = new OlMap({ target, view, layers: [new TileLayer({ source: new XYZ({ ...defaultBasemap, url: defaultBasemap.url, attributions: defaultBasemap.attribution, crossOrigin: 'anonymous' }) }), overview, detail, nature, plan, localities, mask, border] })
  let destroyed = false
  let boundary: MunicipalityBoundary | null = null
  let activeTheme: MapThemeId = 'level0'
  let pendingFit = false
  let overviewRequest = 0
  let overviewUrl: string | null = null
  let overviewReady = false
  let overviewFailed = false
  let previousData: MunicipalValuedNature | null = null
  let previousFilter = ''
  let selectionHandler: ((id: string | null) => void) | null = null
  const listeners = [natureSource].flatMap((source) => {
    const layer = nature
    const theme: MapThemeId = 'valued-nature'
    return (['imageloadstart', 'imageloadend', 'imageloaderror'] as const).map((event) => source.on(event, (e) => {
      if (destroyed || !layer.getVisible() || activeTheme !== theme || !boundary) return
      const size = map.getSize(), resolution = view.getResolution()
      const current = size && resolution ? source.getImage(view.calculateExtent(size), resolution, window.devicePixelRatio || 1, view.getProjection()) : null
      if (e.image !== current) return
      onStatus(theme, event === 'imageloadstart' ? 'loading' : event === 'imageloadend' ? 'ready' : 'error')
    }))
  })
  let planLoading = 0
  let planError = false
  let tilesLoading = 0
  let tileError = false
  const tileListeners = (['tileloadstart', 'tileloadend', 'tileloaderror'] as const).map((event) => accountSource.on(event, () => {
    tilesLoading = Math.max(0, tilesLoading + (event === 'tileloadstart' ? 1 : -1))
    if (event === 'tileloaderror') tileError = true
    if (!destroyed && boundary && activeTheme === 'level0' && view.getResolution()! < detail.getMaxResolution()) {
      onStatus('level0', tileError ? 'error' : tilesLoading ? 'loading' : 'ready')
    }
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
    if (activeTheme !== 'valued-nature' || !borderSource.getFeatures()[0]?.getGeometry()?.intersectsCoordinate(event.coordinate)) return
    const hits = localitySource.getFeatures().filter((feature) => feature.getGeometry()?.intersectsCoordinate(event.coordinate))
      .sort((a, b) => b.get('priority') - a.get('priority'))
    selectionHandler?.(hits[0] ? String(hits[0].getId()) : null)
  })
  function syncStatus() {
    if (!boundary) { onStatus(activeTheme, 'idle'); return }
    if (activeTheme === 'level0') {
      const coarse = view.getResolution()! >= detail.getMaxResolution()
      onStatus(activeTheme, coarse ? overviewFailed ? 'error' : overviewReady ? 'ready' : 'loading' : tileError ? 'error' : tilesLoading ? 'loading' : 'ready')
    } else if (activeTheme === 'future-development') {
      onStatus(activeTheme, planError ? 'error' : planLoading ? 'loading' : 'ready')
    } else if (activeTheme === 'valued-nature' && filtered) onStatus(activeTheme, 'ready')
    else {
      const source = natureSource
      const size = map.getSize(), resolution = view.getResolution()
      const image = size && resolution ? source.getImage(view.calculateExtent(size), resolution, window.devicePixelRatio || 1, view.getProjection()) : null
      onStatus(activeTheme, image?.getState() === ImageState.LOADED ? 'ready' : image?.getState() === ImageState.ERROR ? 'error' : 'loading')
    }
  }
  map.on('moveend', syncStatus)
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
      overview.setSource(source); overview.setVisible(activeTheme === 'level0')
    } catch { if (!destroyed && request === overviewRequest) { overviewFailed = true; syncStatus() } }
  }
  return {
    update(next) {
      if (destroyed) return
      activeTheme = next.theme
      if (boundary !== next.boundary) {
        const changed = boundary?.properties.number !== next.boundary?.properties.number
        boundary = next.boundary
        borderSource.clear(); maskSource.clear(); localitySource.clear()
        plan.getSource()?.dispose(); plan.setSource(null); planLoading = 0; planError = false
        overviewRequest++; overviewReady = false; overviewFailed = false; tileError = false
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
              if (destroyed || plan.getSource() !== source) return
              planLoading = Math.max(0, planLoading + (event === 'tileloadstart' ? 1 : -1))
              if (event === 'tileloaderror') planError = true
              if (activeTheme === 'future-development') syncStatus()
            })
          }
          if (changed) pendingFit = true
          void configureOverview(boundary.properties.number)
        } else pendingFit = false
      }
      const data = activeTheme === 'valued-nature' && next.data?.municipalityNumber === boundary?.properties.number ? next.data : null
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
      overview.setVisible(boundary !== null && activeTheme === 'level0' && overview.getSource() !== null)
      detail.setVisible(boundary !== null && activeTheme === 'level0')
      nature.setVisible(boundary !== null && activeTheme === 'valued-nature' && !filtered)
      localities.setVisible(boundary !== null && activeTheme === 'valued-nature' && data !== null)
      plan.setVisible(boundary !== null && activeTheme === 'future-development')
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
