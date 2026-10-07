import GeoJSON from 'ol/format/GeoJSON'
import type ImageTile from 'ol/ImageTile'
import OlMap from 'ol/Map'
import ImageLayer from 'ol/layer/Image'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import type ImageSource from 'ol/source/Image'
import ImageWMS from 'ol/source/ImageWMS'
import ImageStatic from 'ol/source/ImageStatic'
import XYZ from 'ol/source/XYZ'
import VectorSource from 'ol/source/Vector'
import { Fill, Stroke, Style } from 'ol/style'
import View from 'ol/View'
import { fromLonLat } from 'ol/proj'
import { register } from 'ol/proj/proj4'
import proj4 from 'proj4'

import { buildForestTileUrl } from '../api/forestStatistics'
import type { MunicipalityBoundary } from '../api/municipalities'
import type { ChangeFeature } from '../features/changes/model'
import { nationalLandCover2025, thematicDatasets, type ThematicDatasetId } from '../datasets/registry'
import {
  ACCOUNT_CRS,
  ACCOUNT_DETAIL_MAX_RESOLUTION,
  ACCOUNT_RESOLUTIONS,
  accountTileGrid,
  buildAccountTileUrl,
  loadOverviewRaster,
} from './accountOverviewRaster'
import { defaultBasemap } from './basemaps'
import {
  createAnalysisRasterBlob,
  maskExtent,
  type AnalysisRasterOverlay,
} from './analysisRasterOverlay'
import {
  buildPlanTileUrl,
  buildSelectedNatureTypeTileUrl,
  planTileGrid,
  type PlannedDevelopmentOverlayGrid,
  type PlannedNatureTypeId,
} from './plannedDevelopment'
import {
  createPlannedDevelopmentOverviewBlob,
  loadPlannedDevelopmentDetailTile,
} from './plannedDevelopmentOverlay'

proj4.defs(ACCOUNT_CRS, '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs +type=crs')
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
  setForestLayerVisible(visible: boolean): void
  setEcosystemLayer(type: PlannedNatureTypeId | null): void
  setPlannedDevelopmentOverlay(overlay: PlannedDevelopmentOverlayGrid | null): void
  setPlannedDevelopmentVisible(visible: boolean): void
  fitToPlannedDevelopmentResult(): void
  setAnalysisHighlight(overlay: AnalysisRasterOverlay | null): void
  fitToAnalysisHighlight(): void
  setThematicLayerVisible(datasetId: ThematicDatasetId, visible: boolean): void
  setThematicLayerStatusHandler(handler: ThematicLayerStatusHandler | null): void
  setFeatureInfoHandler(handler: MapFeatureInfoHandler | null): void
  clearFeatureInfo(): void
  refreshSize(): void
  fitToBoundary(): void
  showChanges(features: readonly ChangeFeature[]): void
  clearChanges(): void
  destroy(): void
}

export type MunicipalityMapFactory = (target: HTMLElement) => MunicipalityMap

export const createMunicipalityMap: MunicipalityMapFactory = (target) => {
  const accountVisualSource = nationalLandCover2025.visualSource
  const accountOverviewLayer = new ImageLayer({
    visible: false,
    opacity: 0.86,
  })
  const accountDetailLayer = new TileLayer({
    source: new XYZ({
      projection: ACCOUNT_CRS,
      tileGrid: accountTileGrid,
      tilePixelRatio: 2,
      transition: 0,
      tileUrlFunction: (tileCoord) => buildAccountTileUrl(accountVisualSource.endpoint, tileCoord),
      attributions: 'Kilde: NIBIO, Grunnkart for arealanalyse',
    }),
    visible: true,
    opacity: 0.86,
  })
  const forestLayer = new TileLayer({
    source: new XYZ({
      projection: ACCOUNT_CRS,
      tileGrid: accountTileGrid,
      tilePixelRatio: 2,
      transition: 0,
      tileUrlFunction: (tileCoord) => buildForestTileUrl(tileCoord),
      attributions: 'Kilde: NIBIO, Grunnkart for arealanalyse 2025',
    }),
    visible: false,
    opacity: 0.9,
  })
  const ecosystemLayer = new TileLayer({
    visible: false,
    opacity: 0.9,
  })

  let accountVisible = true
  let accountOverviewRequest = 0
  let accountOverviewObjectUrl: string | null = null
  let accountOverviewResolution = 0

  accountOverviewLayer.on('prerender', (event) => {
    const context = event.context as CanvasRenderingContext2D
    const resolution = event.frameState?.viewState.resolution
    context.imageSmoothingEnabled = resolution === undefined || resolution >= accountOverviewResolution
  })
  accountOverviewLayer.on('postrender', (event) => {
    const context = event.context as CanvasRenderingContext2D
    context.imageSmoothingEnabled = true
  })

  function releaseAccountOverviewUrl() {
    if (!accountOverviewObjectUrl) return
    URL.revokeObjectURL(accountOverviewObjectUrl)
    accountOverviewObjectUrl = null
  }

  async function configureAccountOverview(municipalityNumber: string) {
    const request = ++accountOverviewRequest
    accountOverviewLayer.setVisible(false)
    accountOverviewLayer.setSource(null)
    releaseAccountOverviewUrl()
    accountOverviewResolution = 0
    accountDetailLayer.setMaxResolution(Number.POSITIVE_INFINITY)

    try {
      const raster = await loadOverviewRaster(municipalityNumber)
      if (request !== accountOverviewRequest || !raster) return

      const url = URL.createObjectURL(raster.blob)
      accountOverviewObjectUrl = url
      accountOverviewResolution = raster.resolutionMetersApprox
      accountOverviewLayer.setSource(new ImageStatic({
        url,
        imageExtent: [...raster.extent],
        projection: ACCOUNT_CRS,
      }))
      accountOverviewLayer.setVisible(accountVisible)
      accountDetailLayer.setMaxResolution(ACCOUNT_DETAIL_MAX_RESOLUTION)
    } catch {
      if (request === accountOverviewRequest) {
        accountDetailLayer.setMaxResolution(Number.POSITIVE_INFINITY)
      }
    }
  }

  const analysisHighlightLayer = new ImageLayer({
    visible: false,
    opacity: 1,
  })

  interface RasterLayerState {
    request: number
    objectUrl: string | null
    visible: boolean
    overlay: AnalysisRasterOverlay | null
  }

  const highlightState: RasterLayerState = {
    request: 0,
    objectUrl: null,
    visible: true,
    overlay: null,
  }

  function configureRasterOverlay(
    layer: ImageLayer<ImageSource>,
    state: RasterLayerState,
    overlay: AnalysisRasterOverlay | null,
  ) {
    state.request += 1
    const request = state.request
    state.overlay = overlay
    layer.setSource(null)
    layer.setVisible(false)

    if (state.objectUrl) {
      URL.revokeObjectURL(state.objectUrl)
      state.objectUrl = null
    }
    if (!overlay) return

    void createAnalysisRasterBlob(overlay)
      .then((blob) => {
        if (request !== state.request) return
        const url = URL.createObjectURL(blob)
        state.objectUrl = url
        layer.setSource(new ImageStatic({
          url,
          imageExtent: [...overlay.extent],
          projection: ACCOUNT_CRS,
        }))
        layer.setVisible(state.visible)
      })
      .catch(() => {
        if (request !== state.request) return
        layer.setSource(null)
        layer.setVisible(false)
      })
  }

  function releaseRasterOverlay(layer: ImageLayer<ImageSource>, state: RasterLayerState) {
    state.request += 1
    state.overlay = null
    layer.setSource(null)
    layer.setVisible(false)
    if (state.objectUrl) {
      URL.revokeObjectURL(state.objectUrl)
      state.objectUrl = null
    }
  }

  const plannedOverviewLayer = new ImageLayer({
    visible: false,
    opacity: 0.92,
    minResolution: ACCOUNT_DETAIL_MAX_RESOLUTION,
  })
  const plannedDetailLayer = new TileLayer({
    visible: false,
    opacity: 0.92,
    maxResolution: ACCOUNT_DETAIL_MAX_RESOLUTION,
  })
  let plannedVisible = true
  let currentPlannedOverlay: PlannedDevelopmentOverlayGrid | null = null
  let plannedOverlayRequest = 0
  let plannedOverviewObjectUrl: string | null = null

  function releasePlannedOverviewUrl() {
    if (!plannedOverviewObjectUrl) return
    URL.revokeObjectURL(plannedOverviewObjectUrl)
    plannedOverviewObjectUrl = null
  }

  function clearPlannedDevelopmentOverlay() {
    plannedOverlayRequest += 1
    currentPlannedOverlay = null
    plannedOverviewLayer.setSource(null)
    plannedOverviewLayer.setVisible(false)
    plannedDetailLayer.setSource(null)
    plannedDetailLayer.setVisible(false)
    releasePlannedOverviewUrl()
  }

  function configurePlannedDevelopmentOverlay(
    overlay: PlannedDevelopmentOverlayGrid | null,
  ) {
    clearPlannedDevelopmentOverlay()
    if (!overlay) return

    currentPlannedOverlay = overlay
    const request = plannedOverlayRequest
    plannedDetailLayer.setSource(new XYZ({
      projection: ACCOUNT_CRS,
      tileGrid: planTileGrid,
      tilePixelRatio: 2,
      transition: 0,
      tileUrlFunction: (tileCoord) => buildPlanTileUrl(tileCoord),
      tileLoadFunction: (tile, src) => {
        void loadPlannedDevelopmentDetailTile(
          tile as ImageTile,
          src,
          accountVisualSource.endpoint,
          overlay,
        )
      },
      attributions: 'Kilder: DiBK kommuneplaner og NIBIO Grunnkart for arealanalyse',
    }))
    plannedDetailLayer.setVisible(plannedVisible)

    void createPlannedDevelopmentOverviewBlob(overlay)
      .then((blob) => {
        if (request !== plannedOverlayRequest) return
        const url = URL.createObjectURL(blob)
        plannedOverviewObjectUrl = url
        plannedOverviewLayer.setSource(new ImageStatic({
          url,
          imageExtent: [...overlay.extent],
          projection: ACCOUNT_CRS,
        }))
        plannedOverviewLayer.setVisible(plannedVisible)
      })
      .catch(() => {
        if (request === plannedOverlayRequest) {
          plannedOverviewLayer.setSource(null)
          plannedOverviewLayer.setVisible(false)
        }
      })
  }

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

    function safeHttpUrl(value: string | null | undefined): string | undefined {
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
        const controller = new AbortController()
        const timeout = window.setTimeout(() => controller.abort(), 5000)
        let response: Response
        try {
          response = await fetch(url, { signal: controller.signal })
        } finally {
          window.clearTimeout(timeout)
        }
        if (!response.ok) throw new Error(`GetFeatureInfo feilet med HTTP ${response.status}`)
        const body = await response.text()
        if (/(serviceexception|exceptionreport|<ows:exception|<exception)/i.test(body)) {
          throw new Error('GetFeatureInfo returnerte en OGC-feilmelding')
        }
        const parsed = parseFeatureInfo(body, dataset.id)
        if (parsed) return parsed
        if (
          !body.trim()
          || /(no features?|no results?|ingen treff)/i.test(body)
          || (/getfeatureinfo results/i.test(body) && !/<table/i.test(body))
        ) return null
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
      })
      return
    }

    handler({ status: 'idle', results: [] })
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
  const view = new View({
    projection: ACCOUNT_CRS,
    center: fromLonLat([15, 65], ACCOUNT_CRS),
    resolutions: ACCOUNT_RESOLUTIONS.slice(2),
    resolution: ACCOUNT_RESOLUTIONS[4],
    enableRotation: false,
  })
  const map = new OlMap({
    target,
    view,
    layers: [
      new TileLayer({
        source: new XYZ({
          url: defaultBasemap.url,
          attributions: defaultBasemap.attribution,
          projection: defaultBasemap.projection,
        }),
      }),
      accountOverviewLayer,
      accountDetailLayer,
      forestLayer,
      ecosystemLayer,
      plannedOverviewLayer,
      plannedDetailLayer,
      analysisHighlightLayer,
      ...thematicDatasets.map((dataset) => thematicLayers.get(dataset.id)!),
      changesLayer,
      boundaryLayer,
    ],
  })


  function refreshMapSize() {
    map.updateSize()
    map.renderSync()
  }

  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(refreshMapSize)
    : null
  resizeObserver?.observe(target)

  const firstFrame = window.requestAnimationFrame(() => {
    refreshMapSize()
    window.requestAnimationFrame(refreshMapSize)
  })
  const delayedRefresh = window.setTimeout(refreshMapSize, 250)
  window.addEventListener('resize', refreshMapSize)
  window.visualViewport?.addEventListener('resize', refreshMapSize)

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
        featureProjection: ACCOUNT_CRS,
      })
      boundarySource.addFeatures(features)
      const extent = boundarySource.getExtent()
      if (extent) {
        accountDetailLayer.setExtent(extent)
        view.fit(extent, { padding: [48, 48, 48, 48], duration: 350, maxZoom: 12 })
      }
      void configureAccountOverview(boundary.properties.number)
    },
    clearBoundary() {
      boundarySource.clear()
      accountOverviewRequest += 1
      accountOverviewLayer.setSource(null)
      accountOverviewLayer.setVisible(false)
      releaseAccountOverviewUrl()
      accountDetailLayer.setExtent(undefined)
      accountDetailLayer.setMaxResolution(Number.POSITIVE_INFINITY)
      clearPlannedDevelopmentOverlay()
      releaseRasterOverlay(analysisHighlightLayer, highlightState)
    },
    setAccountLayerVisible(visible) {
      accountVisible = visible
      accountOverviewLayer.setVisible(visible && accountOverviewLayer.getSource() !== null)
      accountDetailLayer.setVisible(visible)
    },
    setForestLayerVisible(visible) {
      forestLayer.setVisible(visible)
    },
    setEcosystemLayer(type) {
      if (!type) {
        ecosystemLayer.setVisible(false)
        ecosystemLayer.setSource(null)
        return
      }
      ecosystemLayer.setSource(new XYZ({
        projection: ACCOUNT_CRS,
        tileGrid: planTileGrid,
        tilePixelRatio: 4,
        transition: 0,
        tileUrlFunction: (tileCoord) => buildSelectedNatureTypeTileUrl(tileCoord, type),
        attributions: 'Kilde: NIBIO, Grunnkart for arealanalyse 2025',
      }))
      ecosystemLayer.setVisible(true)
    },
    setPlannedDevelopmentOverlay(overlay) {
      configurePlannedDevelopmentOverlay(overlay)
    },
    setPlannedDevelopmentVisible(visible) {
      plannedVisible = visible
      plannedOverviewLayer.setVisible(visible && plannedOverviewLayer.getSource() !== null)
      plannedDetailLayer.setVisible(visible && plannedDetailLayer.getSource() !== null)
    },
    fitToPlannedDevelopmentResult() {
      if (!currentPlannedOverlay) return
      const extent = maskExtent({
        width: currentPlannedOverlay.width,
        height: currentPlannedOverlay.height,
        extent: currentPlannedOverlay.extent,
        mask: currentPlannedOverlay.cleaned,
      })
      if (!extent) return
      view.fit([...extent], {
        padding: [72, 72, 72, 72],
        duration: 350,
        maxZoom: 14,
      })
    },
    setAnalysisHighlight(overlay) {
      configureRasterOverlay(analysisHighlightLayer, highlightState, overlay)
    },
    fitToAnalysisHighlight() {
      if (!highlightState.overlay) return
      const extent = maskExtent(highlightState.overlay)
      if (!extent) return
      view.fit([...extent], {
        padding: [72, 72, 72, 72],
        duration: 350,
        maxZoom: 14,
      })
    },
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
    refreshSize() {
      refreshMapSize()
    },
    fitToBoundary() {
      if (boundarySource.getFeatures().length === 0) return
      const extent = boundarySource.getExtent()
      if (!extent) return
      view.fit(extent, { padding: [48, 48, 48, 48], duration: 350, maxZoom: 12 })
    },
    showChanges(features) {
      changesSource.clear()
      for (const feature of features) {
        changesSource.addFeatures(new GeoJSON().readFeatures({
          type: 'Feature',
          geometry: feature.geometry,
          properties: { changeId: feature.changeId },
        }, { dataProjection: feature.geometryCrs, featureProjection: ACCOUNT_CRS }))
      }
      if (features.length) {
        const extent = changesSource.getExtent()
        if (extent) view.fit(extent, { padding: [80, 80, 80, 80], duration: 350, maxZoom: 14 })
      }
    },
    clearChanges() { changesSource.clear() },
    destroy() {
      resizeObserver?.disconnect()
      window.cancelAnimationFrame(firstFrame)
      window.clearTimeout(delayedRefresh)
      window.removeEventListener('resize', refreshMapSize)
      window.visualViewport?.removeEventListener('resize', refreshMapSize)
      featureInfoRequest += 1
      accountOverviewRequest += 1
      accountOverviewLayer.setSource(null)
      releaseAccountOverviewUrl()
      clearPlannedDevelopmentOverlay()
      releaseRasterOverlay(analysisHighlightLayer, highlightState)
      featureInfoHandler = null
      thematicLayerStatusHandler = null
      map.setTarget(undefined)
    },
  }
}
