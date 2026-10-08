import Feature from 'ol/Feature'
import Polygon from 'ol/geom/Polygon'
import type BaseLayer from 'ol/layer/Base'
import ImageLayer from 'ol/layer/Image'
import VectorLayer from 'ol/layer/Vector'
import type View from 'ol/View'
import ImageStatic from 'ol/source/ImageStatic'
import { DrawEvent, type default as Draw } from 'ol/interaction/Draw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMunicipalityMap } from '../src/map/municipalityMap'
import type { DrawnAnalysisArea } from '../src/map/drawnAnalysis'
import * as rasterOverlay from '../src/map/analysisRasterOverlay'

const mapInstances = vi.hoisted(() => [] as { interactions: Draw[]; layers: BaseLayer[]; view: View }[])
vi.mock('ol/Map', () => ({
  default: class {
    interactions: Draw[] = []
    layers: BaseLayer[]
    view: View
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
    on() {}
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
  const overlay: rasterOverlay.AnalysisRasterOverlay = {
    width: 3, height: 2, extent: [0, 0, 30, 20],
    mask: Uint8Array.from([1, 0, 0, 0, 0, 1]), fillColor: '#006B57',
  }

  it('fits the active mask including dispersed hits and ignores an empty result', () => {
    vi.spyOn(rasterOverlay, 'createAnalysisRasterBlob').mockImplementation(() => new Promise(() => {}))
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
    expect(layers[drawnIndex - 1]).toBeInstanceOf(ImageLayer)
    recreated.setDrawnAnalysisArea(null)
    expect(drawn.getSource()!.getFeatures()).toHaveLength(0)
    recreated.destroy()
  })

  it('ignores a late raster failure after replacing its result', async () => {
    let rejectOld: (error: Error) => void = () => {}
    vi.spyOn(rasterOverlay, 'createAnalysisRasterBlob')
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject }))
      .mockImplementation(() => new Promise(() => {}))
    const map = createMunicipalityMap(document.createElement('div'))
    const status = vi.fn()
    map.setAnalysisLayerStatusHandler(status)
    map.setAnalysisHighlight(overlay)
    map.setAnalysisHighlight({ ...overlay, fillColor: '#B85A0D' })
    rejectOld(new Error('Old rendering failed'))
    await Promise.resolve()
    await Promise.resolve()
    expect(status).toHaveBeenLastCalledWith('loading')
    expect(status).not.toHaveBeenCalledWith('error')
    map.setAnalysisHighlight(null)
    expect(status).toHaveBeenLastCalledWith('idle')
    map.destroy()
  })

  it('releases result URLs and ignores image events belonging to an old result', async () => {
    let nextUrl = 0
    const revoke = vi.fn()
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL() { return `blob:result-${++nextUrl}` }
      static revokeObjectURL = revoke
    })
    vi.spyOn(rasterOverlay, 'createAnalysisRasterBlob').mockResolvedValue(new Blob())
    const map = createMunicipalityMap(document.createElement('div'))
    const status = vi.fn()
    map.setAnalysisLayerStatusHandler(status)
    map.setAnalysisHighlight(overlay)
    await Promise.resolve()
    const layer = mapInstances[0].layers.find((candidate) => candidate instanceof ImageLayer && candidate.getSource() instanceof ImageStatic) as ImageLayer<ImageStatic>
    const oldSource = layer.getSource()!
    oldSource.dispatchEvent('imageloadend')
    expect(status).toHaveBeenLastCalledWith('ready')
    map.setAnalysisHighlight({ ...overlay, fillColor: '#B85A0D' })
    await Promise.resolve()
    expect(revoke).toHaveBeenCalledWith('blob:result-1')
    oldSource.dispatchEvent('imageloaderror')
    expect(status).toHaveBeenLastCalledWith('loading')
    layer.getSource()!.dispatchEvent('imageloadend')
    expect(status).toHaveBeenLastCalledWith('ready')
    map.destroy()
    expect(revoke).toHaveBeenCalledWith('blob:result-2')
  })
})
