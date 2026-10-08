import Feature from 'ol/Feature'
import GeoJSON from 'ol/format/GeoJSON'
import Polygon from 'ol/geom/Polygon'
import MultiPolygon from 'ol/geom/MultiPolygon'
import OlMap from 'ol/Map'
import View from 'ol/View'
import ImageLayer from 'ol/layer/Image'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import ImageWMS from 'ol/source/ImageWMS'
import type ImageWrapper from 'ol/Image'
import ImageState from 'ol/ImageState'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import { Fill, Stroke, Style } from 'ol/style'
import proj4 from 'proj4'
import { register } from 'ol/proj/proj4'
import type { MunicipalityBoundary } from '../api/municipalities'
import { valuedNature } from '../datasets/registry'
import { ACCOUNT_CRS } from './accountOverviewRaster'
import { defaultBasemap } from './basemaps'
import { createPlanAreaLayer, planAreaSource } from './explorePlanArea'
import type { PlannedDevelopmentAnalysis } from './plannedDevelopment'

proj4.defs(ACCOUNT_CRS, '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs +type=crs')
register(proj4)

export type ExploreMapStatus = 'idle' | 'loading' | 'ready' | 'error'
export interface ExploreMapContext {
  readonly boundary: MunicipalityBoundary | null
  readonly showValuedNature: boolean
  readonly plan: PlannedDevelopmentAnalysis | null
}
export interface ExploreMapController {
  update(context: ExploreMapContext): void
  fitToMunicipality(): void
  destroy(): void
}

// This map has no analysis engine, drawing tools or general layer catalogue.
// Source themes are displayed independently of analysis results.
export function createExploreAnalysisMap(
  target: HTMLElement,
  onStatus: (status: ExploreMapStatus) => void,
): ExploreMapController {
  const visual = valuedNature.visualSource
  const themeSource = new ImageWMS({
    url: visual.endpoint,
    params: { LAYERS: visual.layer, VERSION: visual.version, TRANSPARENT: true },
    projection: ACCOUNT_CRS,
    ratio: 1,
    crossOrigin: 'anonymous',
    attributions: valuedNature.attribution,
  })
  const theme = new ImageLayer({ source: themeSource, visible: false, className: 'explore-valued-nature' })
  const planLayer = createPlanAreaLayer()
  const boundarySource = new VectorSource()
  const maskSource = new VectorSource()
  const mask = new VectorLayer({
    source: maskSource,
    className: 'explore-municipality-mask',
    style: new Style({ fill: new Fill({ color: '#F7F9F8' }) }),
  })
  const border = new VectorLayer({
    source: boundarySource,
    style: new Style({ stroke: new Stroke({ color: '#005B42', width: 2 }) }),
  })
  const view = new View({ projection: ACCOUNT_CRS, center: [270000, 7040000], resolution: 100, enableRotation: false })
  const map = new OlMap({
    target, view,
    layers: [
      new TileLayer({ source: new XYZ({ url: defaultBasemap.url, attributions: defaultBasemap.attribution, projection: defaultBasemap.projection, crossOrigin: 'anonymous' }) }),
      theme, planLayer, mask, border,
    ],
  })
  let destroyed = false
  let boundary: MunicipalityBoundary | null = null
  let pendingFit = false
  let plan: PlannedDevelopmentAnalysis | null = null
  let activeImage: ImageWrapper | null = null
  const imageListeners = [
    themeSource.on('imageloadstart', (event) => {
      activeImage = event.image
      if (!destroyed && theme.getVisible()) onStatus('loading')
    }),
    themeSource.on('imageloadend', (event) => {
      if (!destroyed && theme.getVisible() && activeImage === event.image) onStatus('ready')
    }),
    themeSource.on('imageloaderror', (event) => {
      if (!destroyed && theme.getVisible() && activeImage === event.image) onStatus('error')
    }),
  ]

  function fit() {
    if (!boundarySource.getFeatures().length) return
    const size = map.getSize()
    if (!size || size[0] <= 0 || size[1] <= 0) { pendingFit = true; return }
    const extent = boundarySource.getExtent()
    if (extent) view.fit(extent, { padding: [32, 32, 32, 32], duration: 0 })
    pendingFit = false
  }
  function resize() {
    if (destroyed) return
    map.updateSize()
    if (pendingFit) fit()
  }
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
  observer?.observe(target)
  const frame = requestAnimationFrame(resize)
  window.addEventListener('resize', resize)

  return {
    update(next) {
      if (destroyed) return
      if (boundary !== next.boundary) {
        const municipalityChanged = boundary?.properties.number !== next.boundary?.properties.number
        boundary = next.boundary
        activeImage = null
        boundarySource.clear()
        maskSource.clear()
        theme.setExtent(undefined)
        if (boundary) {
          const feature = new GeoJSON().readFeatures(boundary, { dataProjection: 'EPSG:4326', featureProjection: ACCOUNT_CRS })[0]
          boundarySource.addFeature(feature)
          const geometry = feature.getGeometry()
          if (geometry instanceof Polygon || geometry instanceof MultiPolygon) {
            const polygons = geometry instanceof Polygon ? [geometry.getCoordinates()] : geometry.getCoordinates()
            // A normal inverse polygon masks outside the municipality and its
            // interior holes. No canvas clipping or render-pixel transforms.
            const world = [[-4000000, -1000000], [5000000, -1000000], [5000000, 12000000], [-4000000, 12000000], [-4000000, -1000000]]
            const inverse = new MultiPolygon([
              [world, ...polygons.map((rings) => [...rings[0]].reverse())],
              ...polygons.flatMap((rings) => rings.slice(1).map((hole) => [hole])),
            ])
            maskSource.addFeature(new Feature(inverse))
            theme.setExtent(geometry.getExtent())
          }
          if (municipalityChanged) pendingFit = true
        } else pendingFit = false
      }
      const visible = next.showValuedNature && boundary !== null
      const nextPlan = next.plan && next.plan.municipalityNumber === boundary?.properties.number
        && next.plan.analysisId === `planned:${boundary?.properties.number}`
        && next.plan.analysisAreaKind === 'planned' ? next.plan : null
      if (plan !== nextPlan) {
        const previousSource = planLayer.getSource()
        plan = nextPlan
        planLayer.setSource(plan ? planAreaSource(plan) : null)
        planLayer.setVisible(plan !== null)
        previousSource?.dispose()
      }
      theme.setVisible(visible)
      resize()
      if (visible) {
        // A cached WMS image emits no new load event when restored. Derive
        // status from the current viewport image rather than waiting forever.
        const size = map.getSize()
        const resolution = view.getResolution()
        activeImage = size && resolution
          ? themeSource.getImage(view.calculateExtent(size), resolution, window.devicePixelRatio || 1, view.getProjection())
          : null
        onStatus(activeImage?.getState() === ImageState.LOADED ? 'ready'
          : activeImage?.getState() === ImageState.ERROR ? 'error' : 'loading')
      } else onStatus('idle')
    },
    fitToMunicipality() { if (!destroyed) fit() },
    destroy() {
      if (destroyed) return
      destroyed = true
      observer?.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      for (const listener of imageListeners) themeSource.removeEventListener(listener.type, listener.listener)
      themeSource.dispose()
      planLayer.getSource()?.dispose()
      map.dispose()
    },
  }
}
