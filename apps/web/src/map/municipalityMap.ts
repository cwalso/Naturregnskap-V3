import GeoJSON from 'ol/format/GeoJSON'
import Map from 'ol/Map'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import XYZ from 'ol/source/XYZ'
import VectorSource from 'ol/source/Vector'
import { Fill, Stroke, Style } from 'ol/style'
import View from 'ol/View'

import type { MunicipalityBoundary } from '../api/municipalities'

export interface MunicipalityMap {
  showBoundary(boundary: MunicipalityBoundary): void
  clearBoundary(): void
  destroy(): void
}

export type MunicipalityMapFactory = (target: HTMLElement) => MunicipalityMap

export const createMunicipalityMap: MunicipalityMapFactory = (target) => {
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
    destroy() { map.setTarget(undefined) },
  }
}
