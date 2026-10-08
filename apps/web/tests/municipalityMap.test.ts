import Feature from 'ol/Feature'
import Polygon from 'ol/geom/Polygon'
import type BaseLayer from 'ol/layer/Base'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import type View from 'ol/View'
import TileImage from 'ol/source/TileImage'
import TileState from 'ol/TileState'
import ImageTile from 'ol/ImageTile'
import { DrawEvent, type default as Draw } from 'ol/interaction/Draw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMunicipalityMap } from '../src/map/municipalityMap'
import type { DrawnAnalysisArea } from '../src/map/drawnAnalysis'
import * as rasterOverlay from '../src/map/analysisRasterOverlay'
import * as imageRequests from '../src/map/sharedImageRequests'

const mapInstances = vi.hoisted(() => [] as {
  interactions: Draw[]; layers: BaseLayer[]; view: View;
  handlers: Record<string, (event: { pixel: number[]; coordinate: number[] }) => void>;
  picked: Feature | null;
}[])
vi.mock('ol/Map', () => ({
  default: class {
    interactions: Draw[] = []
    layers: BaseLayer[]
    view: View
    handlers: Record<string, (event: { pixel: number[]; coordinate: number[] }) => void> = {}
    picked: Feature | null = null
    constructor(options: { layers: BaseLayer[]; view: View }) {
      this.layers = options.layers
      this.view = options.view
      mapInstances.push(this)
    }
    addInteraction(interaction: Draw) { this.interactions.push(interaction) }
    removeInteraction(interaction: Draw) {
      this.interactions = this.interactions.filter((item) => item !== interaction)
    }
    updateSize() {}
    getSize() { return [390, 320] }
    renderSync() {}
    on(type: string, handler: (event: { pixel: number[]; coordinate: number[] }) => void) { this.handlers[type] = handler }
    forEachFeatureAtPixel(_pixel: number[], callback: (feature: Feature) => string) { return this.picked ? callback(this.picked) : undefined }
    setTarget() {}
  },
}))

beforeEach(() => { vi.useFakeTimers(); mapInstances.length = 0 })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function endDrawing(instance: number, offset = 0) {
  const feature = new Feature(new Polygon([[
    [offset, 0], [offset + 100, 0], [offset + 100, 100], [offset, 0],
  ]]))
  mapInstances[instance].interactions[0].dispatchEvent(new DrawEvent('drawend', feature))
}

describe('drawn analysis identity and map lifecycle', () => {
  it('assigns distinct UUID identities to two polygons and after recreating the map', () => {
    const handler = vi.fn<(area: DrawnAnalysisArea) => void>()
    const map = createMunicipalityMap(document.createElement('div'))
    map.startDrawnAnalysisArea(handler)
    endDrawing(0)
    vi.runOnlyPendingTimers()
    map.startDrawnAnalysisArea(handler)
    endDrawing(0, 200)
    vi.runOnlyPendingTimers()
    map.destroy()

    const recreated = createMunicipalityMap(document.createElement('div'))
    recreated.startDrawnAnalysisArea(handler)
    endDrawing(1, 400)
    vi.runOnlyPendingTimers()
    const ids = handler.mock.calls.map(([area]) => area.id)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
    ids.forEach((id) => expect(id).toMatch(/^drawn:[0-9a-f-]{36}$/))
    recreated.destroy()
  })

  it.each(['cancel', 'destroy', 'new drawing'] as const)('does not publish a deferred area after %s', (action) => {
    const map = createMunicipalityMap(document.createElement('div'))
    const oldHandler = vi.fn()
    map.startDrawnAnalysisArea(oldHandler)
    endDrawing(0)
    if (action === 'cancel') map.cancelDrawnAnalysisArea()
    if (action === 'destroy') map.destroy()
    if (action === 'new drawing') map.startDrawnAnalysisArea(vi.fn())
    vi.runOnlyPendingTimers()
    expect(oldHandler).not.toHaveBeenCalled()
    if (action !== 'destroy') map.destroy()
  })
})

describe('active result map layers', () => {
  it('selects the source object from map clicks and gives drawing precedence', () => {
    const map = createMunicipalityMap(document.createElement('div'))
    const selected = vi.fn()
    map.setValuedNatureSelectionHandler(selected)
    map.setValuedNaturePresentation({
      municipalityNumber: '5001', analysisId: 'drawn:click-test', selectedId: null, selection: { kind: 'all' }, valueMetrics: [],
      overlay: { kind: 'drawn', zoom: 9, cx0: 0, cy0: 0, width: 1, height: 1, extent: [0, 0, 10, 10], analysisMask: Uint8Array.of(1), cleaned: Uint8Array.of(1) },
      localities: [{ id: 'source:42', name: 'Skogen', natureType: 'Skog', value: 'Stor verdi', color: '#FD7032', overlapAreaKm2: .001, rings: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]] }],
    })
    const instance = mapInstances[0]
    const picked = new Feature(new Polygon([[[0, 0], [10, 10], [0, 0]]]))
    picked.setId('source:42')
    instance.picked = picked
    instance.handlers.singleclick({ pixel: [1, 1], coordinate: [1, 1] })
    expect(selected).toHaveBeenLastCalledWith('source:42')
    map.startDrawnAnalysisArea(vi.fn())
    instance.handlers.singleclick({ pixel: [1, 1], coordinate: [1, 1] })
    expect(selected).toHaveBeenCalledOnce()
    map.cancelDrawnAnalysisArea()
    instance.picked = null
    instance.handlers.singleclick({ pixel: [1, 1], coordinate: [1, 1] })
    expect(selected).toHaveBeenLastCalledWith(null)
    map.destroy()
  })

  it('ignores late network tiles after their image has been disposed', async () => {
    let finish: (blob: Blob) => void = () => {}
    vi.spyOn(imageRequests, 'loadSharedImageBlob').mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const map = createMunicipalityMap(document.createElement('div'))
    const account = mapInstances[0].layers[2] as TileLayer
    const accountSource = account.getSource()!
    const tile = accountSource.getTile(10, 506, 368, 1, accountSource.getProjection()!)
    if (!(tile instanceof ImageTile)) throw new Error('Expected an account image tile')
    tile.load()
    expect(imageRequests.loadSharedImageBlob).toHaveBeenCalledOnce()
    tile.dispose()
    expect(tile.getImage()).toBeNull()
    finish(new Blob(['late tile']))
    await Promise.resolve()
    await Promise.resolve()
    map.destroy()
  })

  const overlay: rasterOverlay.AnalysisRasterOverlay = {
    width: 3, height: 2, extent: [0, 0, 30, 20],
    mask: Uint8Array.from([1, 0, 0, 0, 0, 1]), fillColor: '#006B57',
  }

  it('fits the active mask including dispersed hits and ignores an empty result', () => {
    vi.spyOn(rasterOverlay, 'createAnalysisRasterCanvas').mockReturnValue(document.createElement('canvas'))
    const map = createMunicipalityMap(document.createElement('div'))
    const fit = vi.spyOn(mapInstances[0].view, 'fit').mockImplementation(() => {})
    map.setAnalysisHighlight(overlay)
    map.fitToAnalysisHighlight()
    expect(fit).toHaveBeenCalledWith([0, 0, 30, 20], expect.objectContaining({ padding: [23.4, 23.4, 23.4, 23.4], maxZoom: 14 }))
    fit.mockClear()
    map.setAnalysisHighlight(null)
    map.fitToAnalysisHighlight()
    map.setAnalysisHighlight({ ...overlay, mask: new Uint8Array(6) })
    map.fitToAnalysisHighlight()
    expect(fit).not.toHaveBeenCalled()
    map.destroy()
  })

  it('restores a persisted polygon with its outline above the result layer and clears it explicitly', () => {
    const area: DrawnAnalysisArea = { id: 'drawn:persisted', areaKm2: .01, extent: [0, 0, 100, 100], rings: [[[0, 0], [100, 0], [100, 100], [0, 0]]] }
    const map = createMunicipalityMap(document.createElement('div'))
    map.setDrawnAnalysisArea(area)
    map.destroy()
    const recreated = createMunicipalityMap(document.createElement('div'))
    recreated.setDrawnAnalysisArea(area)
    recreated.setDrawnAnalysisAreaVisible(true)
    const layers = mapInstances[1].layers
    const drawnIndex = layers.findIndex((layer) => layer instanceof VectorLayer && layer.getSource()?.getFeatures().length === 1)
    const drawn = layers[drawnIndex] as VectorLayer
    expect(drawn.getSource()!.getFeatures()[0].getGeometry()!.getExtent()).toEqual([...area.extent])
    expect(drawn.getVisible()).toBe(true)
    expect(layers[drawnIndex - 1].getClassName()).toBe('valued-localities-hits')
    recreated.setDrawnAnalysisArea(null)
    expect(drawn.getSource()!.getFeatures()).toHaveLength(0)
    recreated.destroy()
  })

  function activeSource() {
    return (mapInstances[0].layers.find((layer) => layer instanceof TileLayer && layer.getSource()?.getKey().startsWith('analysis:')) as TileLayer<TileImage>).getSource()!
  }
  function getTile(source: TileImage, x = 0) {
    return source.getTile(0, x, 0, 1, source.getProjection()!)
  }

  it('draws only requested 256 px tiles without waiting for the network queue', async () => {
    const draw = vi.spyOn(rasterOverlay, 'createAnalysisRasterCanvas').mockReturnValue(document.createElement('canvas'))
    const map = createMunicipalityMap(document.createElement('div'))
    const status = vi.fn()
    map.setAnalysisLayerStatusHandler(status)
    const large = { ...overlay, width: 2048, height: 2048, extent: [0, 0, 20480, 20480] as const, mask: new Uint8Array(2048 * 2048) }
    map.setAnalysisHighlight(large)
    expect(draw).not.toHaveBeenCalled()
    const tile = getTile(activeSource(), 3)
    expect(tile.getState()).toBe(TileState.LOADED)
    expect(tile.getImage()).toBeInstanceOf(HTMLCanvasElement)
    expect(draw).toHaveBeenCalledExactlyOnceWith(large, { x: 768, y: 0, width: 256, height: 256 })
    await Promise.resolve()
    expect(status).toHaveBeenLastCalledWith('ready')
    map.destroy()
  })

  it('ignores queued render status and tile requests from an old selection or destroyed map', async () => {
    const draw = vi.spyOn(rasterOverlay, 'createAnalysisRasterCanvas').mockReturnValue(document.createElement('canvas'))
    const map = createMunicipalityMap(document.createElement('div'))
    const status = vi.fn()
    map.setAnalysisLayerStatusHandler(status)
    map.setAnalysisHighlight(overlay)
    const oldSource = activeSource()
    const oldTile = getTile(oldSource)
    const layer = mapInstances[0].layers.find((item) => item instanceof TileLayer && item.getSource() === oldSource) as TileLayer<TileImage>
    const cache = layer.getRenderer()!.getTileCache()
    cache.set('old', oldTile)
    map.setAnalysisHighlight({ ...overlay, fillColor: '#B85A0D' })
    await Promise.resolve()
    expect(status).toHaveBeenLastCalledWith('loading')
    expect(cache.getCount()).toBe(0)
    expect(oldTile.getImage()).toBeNull()
    expect(getTile(oldSource).getState()).toBe(TileState.EMPTY)
    expect(draw).toHaveBeenCalledTimes(1)
    const source = activeSource()
    getTile(source)
    map.destroy()
    status.mockClear()
    await Promise.resolve()
    expect(status).not.toHaveBeenCalled()
    expect(getTile(source).getState()).toBe(TileState.EMPTY)
    expect(draw).toHaveBeenCalledTimes(2)
  })

  it('uses distinct tile queue keys for the area and hit layers', () => {
    vi.spyOn(rasterOverlay, 'createAnalysisRasterCanvas').mockReturnValue(document.createElement('canvas'))
    const map = createMunicipalityMap(document.createElement('div'))
    map.setAnalysisArea({ kind: 'planned', zoom: 9, cx0: 0, cy0: 0, ...overlay, cleaned: overlay.mask, analysisMask: overlay.mask })
    map.setAnalysisHighlight(overlay)
    const sources = mapInstances[0].layers.filter((layer) => layer instanceof TileLayer && layer.getSource()?.getKey().startsWith('analysis:'))
      .map((layer) => (layer as TileLayer<TileImage>).getSource()!)
    expect(sources).toHaveLength(2)
    expect(new Set(sources.map((source) => source.getTile(0, 0, 0, 1, source.getProjection()!).getKey())).size).toBe(2)
    map.destroy()
  })

  it('reports a local rendering failure and resets it after replacing the result', async () => {
    vi.spyOn(rasterOverlay, 'createAnalysisRasterCanvas')
      .mockImplementationOnce(() => { throw new Error('Canvas failed') })
      .mockReturnValue(document.createElement('canvas'))
    const map = createMunicipalityMap(document.createElement('div'))
    const status = vi.fn()
    map.setAnalysisLayerStatusHandler(status)
    map.setAnalysisHighlight(overlay)
    expect(getTile(activeSource()).getState()).toBe(TileState.ERROR)
    await Promise.resolve()
    expect(status).toHaveBeenLastCalledWith('error')
    map.setAnalysisHighlight(overlay)
    getTile(activeSource())
    await Promise.resolve()
    expect(status).toHaveBeenLastCalledWith('ready')
    map.setAnalysisHighlight(null)
    expect(status).toHaveBeenLastCalledWith('idle')
    map.destroy()
  })
})
