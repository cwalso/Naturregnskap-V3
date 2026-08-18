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

import type { MunicipalityBoundary } from '../api/municipalities'
import { nationalLandCover2025 } from '../datasets/registry'

export interface MunicipalityMap {
  showBoundary(boundary: MunicipalityBoundary): void
  clearBoundary(): void
  setAccountLayerVisible(visible: boolean): void
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
  const view = new View({ center: [1_050_000, 9_100_000], zoom: 4, projection: 'EPSG:3857' })
  const map = new Map({
    target,
    view,
    layers: [
      new TileLayer({
        source: new XYZ({
          url: 'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',
          attributions: '© Kartverket',
        }),
      }),
      accountLayer,
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
    destroy() { map.setTarget(undefined) },
  }
}
