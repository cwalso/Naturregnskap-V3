import BaseEvent from 'ol/events/Event'
import { describe, expect, it, vi } from 'vitest'
import { analysisMaskRectangles, filterValuedLocalities, localityFeature } from '../src/map/valuedNaturePresentation'
import { createValuedNatureLayers } from '../src/map/valuedNatureMap'
import { summarizeValuedNatureFeaturesForTest } from '../src/map/plannedValuedNature'
import type { PlannedDevelopmentOverlayGrid } from '../src/map/plannedDevelopment'

const overlay: PlannedDevelopmentOverlayGrid = {
  kind: 'drawn', zoom: 9, cx0: 0, cy0: 0, width: 4, height: 4, extent: [0, 0, 4, 4],
  analysisMask: new Uint8Array(16).fill(1), cleaned: new Uint8Array(16),
}
const features = [
  { attributes: { OBJECTID: 1, Områdenavn: 'Skogen', Verdikategori: 'Stor verdi', Naturtype: 'Skog' },
    geometry: { rings: [[[.1, .1], [.1, 2.9], [2.9, 2.9], [2.9, .1], [.1, .1]]] as [number, number][][] } },
  { attributes: { OBJECTID: 2, Områdenavn: 'Enga', Verdikategori: 'Svært stor verdi', Naturtype: 'Eng' },
    geometry: { rings: [[[1.1, 1.1], [1.1, 3.9], [3.9, 3.9], [3.9, 1.1], [1.1, 1.1]]] as [number, number][][] } },
]

describe('source locality presentation independent of area calculations', () => {
  it('retains subpixel source vertices and colors without changing overlap bookkeeping', () => {
    const summary = summarizeValuedNatureFeaturesForTest(features, overlay)
    expect(summary.featurePixelTotal).toBe(18)
    expect(summary.uniquePixelCount).toBe(14)
    expect(summary.affectedFeatureCount).toBe(2)
    expect(summary.localities[0]).toMatchObject({ id: '1', name: 'Skogen', color: '#FD7032', value: 'Stor verdi', natureType: 'Skog' })
    expect(summary.localities[1].color).toBe('#AF0C0C')
    expect(summary.localities[0].rings).toEqual(features[0].geometry.rings)
    expect(localityFeature(summary.localities[0]).getGeometry()!.getExtent()).toEqual([.1, .1, 2.9, 2.9])
    expect(summary.localities[0].overlapAreaKm2).toBeCloseTo(9 * 21.15625 ** 2 / 1e6)
  })

  it('filters the same source objects by value/type/all and fits one or dispersed objects', () => {
    const localities = summarizeValuedNatureFeaturesForTest(features, overlay).localities
    expect(filterValuedLocalities(localities, { kind: 'value', label: 'Stor verdi' }).map((l) => l.id)).toEqual(['1'])
    expect(filterValuedLocalities(localities, { kind: 'type', label: 'Eng' }).map((l) => l.id)).toEqual(['2'])
    expect(filterValuedLocalities(localities, { kind: 'all' })).toHaveLength(2)
    const layers = createValuedNatureLayers((coordinate) => coordinate)
    const model = { municipalityNumber: '5001', analysisId: 'drawn:A', overlay, localities, valueMetrics: [], selectedId: '2', selection: { kind: 'all' as const } }
    layers.set(model)
    expect(layers.extent()).toEqual([.1, .1, 3.9, 3.9])
    expect(layers.extent(true)).toEqual([1.1, 1.1, 3.9, 3.9])
    const sourceFeatures = layers.hitLayer.getSource()!.getFeatures()
    layers.set({ ...model, selection: { kind: 'value', label: 'Stor verdi' }, selectedId: null })
    expect(layers.extent()).toEqual([.1, .1, 2.9, 2.9])
    expect(layers.hitLayer.getSource()!.getFeatures()).toEqual(sourceFeatures)
    const style = layers.hitLayer.getStyleFunction()!
    expect(style(sourceFeatures.find((f) => f.getId() === '2')!, 1)).toBeUndefined()
    expect(style(sourceFeatures.find((f) => f.getId() === '1')!, 1)).toBeDefined()
    layers.set(null)
    expect(layers.extent()).toBeNull()
    expect(layers.hitLayer.getSource()!.getFeatures()).toHaveLength(0)
    expect(layers.hitLayer.getVisible()).toBe(false)
  })

  it('preserves source holes and disjoint polygons rather than tracing raster cells', () => {
    const rings: [number, number][][] = [
      [[0, 0], [0, 4], [4, 4], [4, 0], [0, 0]],
      [[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]],
      [[10, 10], [10, 11], [11, 11], [11, 10], [10, 10]],
    ]
    const locality = summarizeValuedNatureFeaturesForTest([{ ...features[0], geometry: { rings } }], overlay).localities[0]
    const geometry = localityFeature(locality).getGeometry()!
    expect(geometry.getType()).toBe('MultiPolygon')
    expect(geometry.intersectsCoordinate([.5, .5])).toBe(true)
    expect(geometry.intersectsCoordinate([2, 2])).toBe(false)
    expect(geometry.intersectsCoordinate([10.5, 10.5])).toBe(true)
  })

  it('clips only its own source-geometry canvas to valid mask cells, including holes', () => {
    const masked = { ...overlay, analysisMask: Uint8Array.from([1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1]) }
    expect(analysisMaskRectangles(masked)).toEqual([[0, 2, 2, 4], [3, 2, 4, 4], [0, 0, 1, 1], [2, 0, 4, 1]])
    const layers = createValuedNatureLayers((coordinate) => coordinate)
    const model = { municipalityNumber: '5001', analysisId: 'drawn:A', overlay: masked, valueMetrics: [], localities: summarizeValuedNatureFeaturesForTest(features, masked).localities, selectedId: null, selection: { kind: 'all' as const } }
    layers.set(model)
    class Context { save = vi.fn(); beginPath = vi.fn(); moveTo = vi.fn(); lineTo = vi.fn(); closePath = vi.fn(); clip = vi.fn(); restore = vi.fn() }
    vi.stubGlobal('CanvasRenderingContext2D', Context)
    try {
      const context = new Context()
      const event = Object.assign(new BaseEvent('prerender'), { context, inversePixelTransform: [1, 0, 0, 1, 0, 0] })
      layers.contextLayer.dispatchEvent(event)
      expect(context.clip).not.toHaveBeenCalled()
      layers.hitLayer.dispatchEvent(event)
      expect(context.moveTo).toHaveBeenCalledTimes(4)
      expect(context.clip).toHaveBeenCalledOnce()
      layers.hitLayer.dispatchEvent(Object.assign(new BaseEvent('postrender'), { context }))
      expect(context.restore).toHaveBeenCalledOnce()
    } finally { vi.unstubAllGlobals() }
  })
})
