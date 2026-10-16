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
import { buildValuedNatureMapOverlay, type PlannedValuedNatureAnalysis, type ValuedNatureMapSelection } from './plannedValuedNature'
import { exploreOverlapGeometry } from './exploreOverlapGeometry'
import { filterValuedLocalities, localityFeature } from './valuedNaturePresentation'

proj4.defs(ACCOUNT_CRS, '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs +type=crs')
register(proj4)

export type ExploreMapStatus = 'idle' | 'loading' | 'ready' | 'error'
export interface ExploreMapContext {
  readonly boundary: MunicipalityBoundary | null
  readonly showValuedNature: boolean
  readonly plan: PlannedDevelopmentAnalysis | null
  readonly valued?: PlannedValuedNatureAnalysis | null
  readonly selection?: ValuedNatureMapSelection
  readonly showNatureAgriculture?: boolean
  readonly selectedLocalityId?: string | null
}
export interface ExploreMapController {
  update(context: ExploreMapContext): void
  setLocalitySelectionHandler(handler: ((id: string | null) => void) | null): void
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
  const planOutline = new ImageLayer({ visible: false, className: 'explore-plan-outline' })
  const overlapSource = new VectorSource()
  const overlapLayer = new VectorLayer({ source: overlapSource, visible: false, className: 'explore-overlap',
    style: [
      new Style({ stroke: new Stroke({ color: '#FFFFFF', width: 6 }) }),
      new Style({ fill: new Fill({ color: '#8B008B' }), stroke: new Stroke({ color: '#580058', width: 3 }) }),
    ],
  })
  const natureSource = new VectorSource()
  const natureLayer = new VectorLayer({ source: natureSource, visible: false, className: 'explore-nature-agriculture', style: (feature) => {
    const color = feature.get('kind') === 1 ? '#2D7D46' : '#C48A00'
    return [new Style({ stroke: new Stroke({ color: '#FFFFFF', width: 6 }) }), new Style({ fill: new Fill({ color }), stroke: new Stroke({ color, width: 3 }) })]
  } })
  const localitySource = new VectorSource()
  let selectedLocalityId: string | null = null
  let selectionHandler: ((id: string | null) => void) | null = null
  const localityLayer = new VectorLayer({ source: localitySource, className: 'explore-selected-locality', style: (feature) => feature.getId() === selectedLocalityId
    ? [new Style({ stroke: new Stroke({ color: '#FFFFFF', width: 7 }) }), new Style({ stroke: new Stroke({ color: '#151515', width: 3 }) })] : undefined })
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
      planLayer, theme, planOutline, natureLayer, overlapLayer, localityLayer, mask, border,
    ],
  })
  let destroyed = false
  let boundary: MunicipalityBoundary | null = null
  let pendingFit = false
  let plan: PlannedDevelopmentAnalysis | null = null
  let overlayKey = ''
  let overlayResult: PlannedValuedNatureAnalysis | null = null
  let overlayPlan: PlannedDevelopmentAnalysis | null = null
  let naturePlan: PlannedDevelopmentAnalysis | null = null
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
  map.on('singleclick', (event) => {
    if (!theme.getVisible()) return
    const feature = localitySource.getFeatures().find((feature) => feature.getGeometry()?.intersectsCoordinate(event.coordinate))
    selectionHandler?.(feature ? String(feature.getId()) : null)
  })

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
        const previousOutline = planOutline.getSource()
        plan = nextPlan
        planLayer.setSource(plan ? planAreaSource(plan) : null)
        planLayer.setVisible(plan !== null)
        planOutline.setSource(plan ? planAreaSource(plan, true) : null)
        planOutline.setVisible(plan !== null)
        previousSource?.dispose()
        previousOutline?.dispose()
      }
      theme.setVisible(visible)
      planLayer.setOpacity(visible || next.showNatureAgriculture ? .5 : 1)
      const valued = visible && plan && next.valued?.municipalityNumber === plan.municipalityNumber
        && next.valued.analysisId === plan.analysisId ? next.valued : null
      const selection = next.selection ?? { kind: 'all' }
      const key = JSON.stringify(selection)
      if (overlayResult !== valued || overlayPlan !== plan || overlayKey !== key) {
        overlayResult = valued
        overlayPlan = plan
        overlayKey = key
        const overlay = valued && plan ? buildValuedNatureMapOverlay(valued, plan.overlay, selection) : null
        overlapSource.clear()
        localitySource.clear()
        if (overlay) overlapSource.addFeature(new Feature(exploreOverlapGeometry(overlay)))
        if (valued) localitySource.addFeatures(filterValuedLocalities(valued.localities, selection).map(localityFeature))
        overlapLayer.setVisible(overlay !== null)
      }
      selectedLocalityId = next.selectedLocalityId && localitySource.getFeatureById(next.selectedLocalityId) ? next.selectedLocalityId : null
      localityLayer.changed()
      const nextNaturePlan = !visible && next.showNatureAgriculture ? plan : null
      if (naturePlan !== nextNaturePlan) {
        naturePlan = nextNaturePlan
        natureSource.clear()
        if (naturePlan) {
          for (const kind of [1, 2]) {
            const geometry = exploreOverlapGeometry({ ...naturePlan.overlay, mask: naturePlan.overlay.cleaned, fillColor: '#000000' }, kind)
            if (geometry.getCoordinates().length) natureSource.addFeature(new Feature({ geometry, kind }))
          }
        }
        natureLayer.setVisible(naturePlan !== null)
      }
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
      planOutline.getSource()?.dispose()
      overlapSource.dispose()
      natureSource.dispose()
      localitySource.dispose()
      boundarySource.dispose()
      maskSource.dispose()
      selectionHandler = null
      map.dispose()
    },
    setLocalitySelectionHandler(handler: ((id: string | null) => void) | null) { selectionHandler = handler },
  }
}
