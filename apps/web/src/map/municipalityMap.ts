import GeoJSON from 'ol/format/GeoJSON'
import OlMap from 'ol/Map'
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
import { nationalLandCover2025, thematicDatasets, type ThematicDatasetId } from '../datasets/registry'
import { defaultBasemap } from './basemaps'

proj4.defs('EPSG:25833', '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs +type=crs')
register(proj4)

export interface MapFeatureInfoField {
  readonly label: string
  readonly value: string
}

export interface MapFeatureInfoResult {
  readonly datasetId: ThematicDatasetId
  readonly datasetTitle: string
  readonly fields: readonly MapFeatureInfoField[]
}

export type MapFeatureInfoState =
  | { readonly status: 'idle'; readonly results: readonly MapFeatureInfoResult[] }
  | { readonly status: 'loading'; readonly results: readonly MapFeatureInfoResult[] }
  | { readonly status: 'ready'; readonly results: readonly MapFeatureInfoResult[] }
  | { readonly status: 'error'; readonly results: readonly MapFeatureInfoResult[]; readonly message: string }

export type MapFeatureInfoHandler = (state: MapFeatureInfoState) => void
export type ThematicLayerLoadStatus = 'idle' | 'loading' | 'ready' | 'error'
export type ThematicLayerStatusHandler = (
  datasetId: ThematicDatasetId,
  status: ThematicLayerLoadStatus,
) => void

export interface MunicipalityMap {
  showBoundary(boundary: MunicipalityBoundary): void
  clearBoundary(): void
  setAccountLayerVisible(visible: boolean): void
  setThematicLayerVisible(datasetId: ThematicDatasetId, visible: boolean): void
  setThematicLayerStatusHandler(handler: ThematicLayerStatusHandler | null): void
  setFeatureInfoHandler(handler: MapFeatureInfoHandler | null): void
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
  const thematicLayers = new Map<ThematicDatasetId, ImageLayer<ImageWMS>>(
    thematicDatasets.map((dataset) => [
      dataset.id,
      new ImageLayer({
        source: new ImageWMS({
          url: dataset.visualSource.endpoint,
          params: {
            LAYERS: dataset.visualSource.layer,
            VERSION: dataset.visualSource.version,
            TRANSPARENT: true,
          },
          ratio: 1,
          attributions: dataset.attribution,
        }),
        visible: false,
      }),
    ]),
  )

  let featureInfoHandler: MapFeatureInfoHandler | null = null
  let thematicLayerStatusHandler: ThematicLayerStatusHandler | null = null
  let featureInfoRequest = 0
  const thematicLayerStatuses = Object.fromEntries(
    thematicDatasets.map((dataset) => [dataset.id, 'idle']),
  ) as Record<ThematicDatasetId, ThematicLayerLoadStatus>

  function setThematicLayerStatus(datasetId: ThematicDatasetId, status: ThematicLayerLoadStatus) {
    thematicLayerStatuses[datasetId] = status
    thematicLayerStatusHandler?.(datasetId, status)
  }

  for (const dataset of thematicDatasets) {
    const source = thematicLayers.get(dataset.id)?.getSource()
    source?.on('imageloadstart', () => setThematicLayerStatus(dataset.id, 'loading'))
    source?.on('imageloadend', () => setThematicLayerStatus(dataset.id, 'ready'))
    source?.on('imageloaderror', () => setThematicLayerStatus(dataset.id, 'error'))
  }

  function parseFeatureInfo(html: string, datasetId: ThematicDatasetId): MapFeatureInfoResult | null {
    const dataset = thematicDatasets.find((item) => item.id === datasetId)
    if (!dataset) return null

    const document = new DOMParser().parseFromString(html, 'text/html')
    const ignoredFields = /^(shape|shape_|objectid|fid|geometry|st_area|st_length)/i
    const fields: MapFeatureInfoField[] = []

    function addField(label: string, value: string) {
      if (fields.length >= 8 || !label || !value || ignoredFields.test(label)) return
      if (fields.some((field) => field.label === label && field.value === value)) return
      fields.push({ label, value })
    }

    for (const table of Array.from(document.querySelectorAll('table'))) {
      const rows = Array.from(table.querySelectorAll('tr')).map((row) => (
        Array.from(row.querySelectorAll('th, td'))
          .map((cell) => cell.textContent?.trim() ?? '')
          .filter(Boolean)
      ))

      if (rows.length >= 2 && rows[0].length > 2 && rows[0].length === rows[1].length) {
        rows[0].forEach((label, index) => addField(label, rows[1][index] ?? ''))
      } else {
        rows.forEach((cells) => {
          if (cells.length >= 2) addField(cells[0], cells[1])
        })
      }

      if (fields.length >= 8) break
    }

    if (fields.length === 0) return null
    return {
      datasetId,
      datasetTitle: dataset.title,
      fields,
    }
  }

  async function identifyThematicFeatures(coordinate: number[], resolution: number) {
    const handler = featureInfoHandler
    if (!handler) return

    const activeDatasets = thematicDatasets.filter(
      (dataset) => thematicLayers.get(dataset.id)?.getVisible(),
    )

    if (activeDatasets.length === 0) {
      handler({ status: 'ready', results: [] })
      return
    }

    const requestId = ++featureInfoRequest
    handler({ status: 'loading', results: [] })

    const responses = await Promise.allSettled(
      activeDatasets.map(async (dataset) => {
        const source = thematicLayers.get(dataset.id)?.getSource()
        const url = source?.getFeatureInfoUrl(
          coordinate,
          resolution,
          view.getProjection(),
          { INFO_FORMAT: 'text/html', FEATURE_COUNT: 5 },
        )
        if (!url) return null
        const response = await fetch(url)
        if (!response.ok) throw new Error(`GetFeatureInfo feilet med HTTP ${response.status}`)
        return parseFeatureInfo(await response.text(), dataset.id)
      }),
    )

    if (requestId !== featureInfoRequest || handler !== featureInfoHandler) return

    const results = responses
      .filter((result): result is PromiseFulfilledResult<MapFeatureInfoResult | null> => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter((result): result is MapFeatureInfoResult => result !== null)

    if (results.length > 0) {
      handler({ status: 'ready', results })
      return
    }

    const hasError = responses.some((result) => result.status === 'rejected')
    if (hasError) {
      handler({
        status: 'error',
        results: [],
        message: 'Kunne ikke hente objektinformasjon fra ett eller flere aktive kartlag.',
      })
      return
    }

    handler({ status: 'ready', results: [] })
  }

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
  const map = new OlMap({
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
      ...thematicDatasets.map((dataset) => thematicLayers.get(dataset.id)!),
      changesLayer,
      boundaryLayer,
    ],
  })

  map.on('singleclick', (event) => {
    const resolution = view.getResolution()
    if (resolution === undefined) return
    void identifyThematicFeatures(event.coordinate, resolution)
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
    setThematicLayerVisible(datasetId, visible) {
      thematicLayers.get(datasetId)?.setVisible(visible)
      if (!visible) setThematicLayerStatus(datasetId, 'idle')
      featureInfoHandler?.({ status: 'idle', results: [] })
    },
    setThematicLayerStatusHandler(handler) {
      thematicLayerStatusHandler = handler
      if (handler) {
        for (const dataset of thematicDatasets) {
          handler(dataset.id, thematicLayerStatuses[dataset.id])
        }
      }
    },
    setFeatureInfoHandler(handler) {
      featureInfoHandler = handler
      handler?.({ status: 'idle', results: [] })
    },
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
    destroy() {
      featureInfoRequest += 1
      featureInfoHandler = null
      thematicLayerStatusHandler = null
      map.setTarget(undefined)
    },
  }
}
