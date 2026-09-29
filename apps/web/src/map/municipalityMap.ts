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
  readonly url?: string
}

export interface MapFeatureInfoResult {
  readonly datasetId: ThematicDatasetId
  readonly datasetTitle: string
  readonly objectLabel: string
  readonly fields: readonly MapFeatureInfoField[]
}

export type MapFeatureInfoState =
  | { readonly status: 'idle'; readonly results: readonly MapFeatureInfoResult[] }
  | { readonly status: 'loading'; readonly results: readonly MapFeatureInfoResult[] }
  | { readonly status: 'ready'; readonly results: readonly MapFeatureInfoResult[] }
  | {
      readonly status: 'partial'
      readonly results: readonly MapFeatureInfoResult[]
      readonly message: string
    }
  | {
      readonly status: 'error'
      readonly results: readonly MapFeatureInfoResult[]
      readonly message: string
    }

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
  clearFeatureInfo(): void
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

    function safeHttpUrl(value: string | null): string | undefined {
      if (!value) return undefined
      try {
        const parsed = new URL(value)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : undefined
      } catch {
        return undefined
      }
    }

    function addField(label: string, value: string, href?: string) {
      if (fields.length >= 8 || !label || !value || ignoredFields.test(label)) return
      if (fields.some((field) => field.label === label && field.value === value)) return
      fields.push({
        label,
        value,
        url: safeHttpUrl(href) ?? safeHttpUrl(value),
      })
    }

    for (const table of Array.from(document.querySelectorAll('table'))) {
      const rows = Array.from(table.querySelectorAll('tr')).map((row) => (
        Array.from(row.querySelectorAll('th, td'))
      ))

      if (rows.length >= 2 && rows[0].length > 2 && rows[0].length === rows[1].length) {
        rows[0].forEach((headerCell, index) => {
          const valueCell = rows[1][index]
          addField(
            headerCell.textContent?.trim() ?? '',
            valueCell?.textContent?.trim() ?? '',
            valueCell?.querySelector('a[href]')?.getAttribute('href') ?? undefined,
          )
        })
      } else {
        rows.forEach((cells) => {
          if (cells.length < 2) return
          addField(
            cells[0].textContent?.trim() ?? '',
            cells[1].textContent?.trim() ?? '',
            cells[1].querySelector('a[href]')?.getAttribute('href') ?? undefined,
          )
        })
      }

      if (fields.length >= 8) break
    }

    if (fields.length === 0) return null
    const labelField = fields.find((field) => /(navn|name|område|omrade|lokalitet)/i.test(field.label))
    return {
      datasetId,
      datasetTitle: dataset.title,
      objectLabel: labelField?.value ?? fields[0]?.value ?? dataset.title,
      fields,
    }
  }

  async function identifyThematicFeatures(
    coordinate: number[],
    resolution: number,
  ) {
    const handler = featureInfoHandler
    if (!handler) return

    const activeDatasets = thematicDatasets.filter(
      (dataset) => thematicLayers.get(dataset.id)?.getVisible(),
    )

    if (activeDatasets.length === 0) {
      handler({ status: 'idle', results: [] })
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
          { INFO_FORMAT: 'text/html', FEATURE_COUNT: 1 },
        )
        if (!url) return null
        const response = await fetch(url)
        if (!response.ok) throw new Error(`GetFeatureInfo feilet med HTTP ${response.status}`)
        const body = await response.text()
        if (/(serviceexception|exceptionreport|<ows:exception|<exception)/i.test(body)) {
          throw new Error('GetFeatureInfo returnerte en OGC-feilmelding')
        }
        const parsed = parseFeatureInfo(body, dataset.id)
        if (parsed) return parsed
        if (!body.trim() || /(no features?|no results?|ingen treff)/i.test(body)) return null
        throw new Error('GetFeatureInfo returnerte et ukjent svarformat')
      }),
    )

    if (requestId !== featureInfoRequest || handler !== featureInfoHandler) return

    const results = responses
      .filter((result): result is PromiseFulfilledResult<MapFeatureInfoResult | null> => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter((result): result is MapFeatureInfoResult => result !== null)

    const hasError = responses.some((result) => result.status === 'rejected')
    if (results.length > 0 && hasError) {
      handler({
        status: 'partial',
        results,
        message: 'Noe objektinformasjon kunne ikke hentes fra ett eller flere aktive kartlag.',
      })
      return
    }

    if (results.length > 0) {
      handler({ status: 'ready', results })
      return
    }

    if (hasError) {
      handler({
        status: 'error',
        results: [],
        message: 'Kunne ikke hente objektinformasjon fra ett eller flere aktive kartlag.',
        point,
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

  map.on('movestart', () => {
    featureInfoRequest += 1
    featureInfoHandler?.({ status: 'idle', results: [] })
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
      featureInfoRequest += 1
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
    clearFeatureInfo() {
      featureInfoRequest += 1
      featureInfoHandler?.({ status: 'idle', results: [] })
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
