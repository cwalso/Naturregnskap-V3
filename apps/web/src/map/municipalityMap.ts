import GeoJSON from 'ol/format/GeoJSON'
import Map from 'ol/Map'
import ImageLayer from 'ol/layer/Image'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import ImageWMS from 'ol/source/ImageWMS'
import XYZ from 'ol/source/XYZ'
import VectorSource from 'ol/source/Vector'
import { Fill, Stroke, Style } from 'ol/style'
import View from 'ol/View'
import { register } from 'ol/proj/proj4'
import proj4 from 'proj4'

import type { MunicipalityBoundary } from '../api/municipalities'
import type { ChangeFeature } from '../features/changes/model'
import { nationalLandCover2025 } from '../datasets/registry'
import { defaultBasemap } from './basemaps'

proj4.defs('EPSG:25833', '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs +type=crs')
register(proj4)

export interface MunicipalityMap {
  showBoundary(boundary: MunicipalityBoundary): void
  clearBoundary(): void
  setAccountLayerVisible(visible: boolean): void
  fitToBoundary(): void
  showChanges(features: readonly ChangeFeature[]): void
  clearChanges(): void
  destroy(): void
}

export type MunicipalityMapFactory = (target: HTMLElement) => MunicipalityMap

export const createMunicipalityMap: MunicipalityMapFactory = (target) => {
  const accountVisualSource = nationalLandCover2025.visualSource
  const accountLayer = new ImageLayer({
    source: new ImageWMS({
      url: accountVisualSource.endpoint,
      params: {
        LAYERS: accountVisualSource.layer,
        VERSION: accountVisualSource.version,
        TRANSPARENT: true,
      },
      ratio: 1,
    }),
    visible: true,
  })
  const boundarySource = new VectorSource()
  const boundaryLayer = new VectorLayer({
    source: boundarySource,
    style: new Style({
      stroke: new Stroke({ color: '#005b42', width: 3 }),
      fill: new Fill({ color: 'rgba(0, 91, 66, 0.08)' }),
    }),
  })
  const changesSource = new VectorSource()
  const changesLayer = new VectorLayer({
    source: changesSource,
    style: new Style({
      stroke: new Stroke({ color: '#9b2c2c', width: 2 }),
      fill: new Fill({ color: 'rgba(155, 44, 44, 0.35)' }),
    }),
  })
  const view = new View({ center: [1_050_000, 9_100_000], zoom: 4, projection: defaultBasemap.projection })
  const map = new Map({
    target,
    view,
    layers: [
      new TileLayer({
        source: new XYZ({
          url: defaultBasemap.url,
          attributions: defaultBasemap.attribution,
        }),
      }),
      accountLayer,
      changesLayer,
      boundaryLayer,
    ],
  })

  return {
    showBoundary(boundary) {
      boundarySource.clear()
      const features = new GeoJSON().readFeatures(JSON.stringify(boundary), {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      })
      boundarySource.addFeatures(features)
      const extent = boundarySource.getExtent()
      if (extent) view.fit(extent, { padding: [48, 48, 48, 48], duration: 350, maxZoom: 12 })
    },
    clearBoundary() { boundarySource.clear() },
    setAccountLayerVisible(visible) { accountLayer.setVisible(visible) },
    fitToBoundary() {
      if (boundarySource.getFeatures().length === 0) return
      view.fit(boundarySource.getExtent(), { padding: [48, 48, 48, 48], duration: 350, maxZoom: 12 })
    },
    showChanges(features) {
      changesSource.clear()
      for (const feature of features) {
        changesSource.addFeatures(new GeoJSON().readFeatures({
          type: 'Feature',
          geometry: feature.geometry,
          properties: { changeId: feature.changeId },
        }, { dataProjection: feature.geometryCrs, featureProjection: 'EPSG:3857' }))
      }
      if (features.length) {
        const extent = changesSource.getExtent()
        if (extent) view.fit(extent, { padding: [80, 80, 80, 80], duration: 350, maxZoom: 14 })
      }
    },
    clearChanges() { changesSource.clear() },
    destroy() { map.setTarget(undefined) },
  }
}
