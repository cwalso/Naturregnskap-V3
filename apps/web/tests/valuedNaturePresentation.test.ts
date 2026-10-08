import { describe, expect, it } from 'vitest'
import { filterValuedLocalities, localityFeature } from '../src/map/valuedNaturePresentation'
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

  it('filters source objects without changing geometry and clears selection on theme reset', () => {
    const localities = summarizeValuedNatureFeaturesForTest(features, overlay).localities
    expect(filterValuedLocalities(localities, { kind: 'value', label: 'Stor verdi' }).map((l) => l.id)).toEqual(['1'])
    expect(filterValuedLocalities(localities, { kind: 'type', label: 'Eng' }).map((l) => l.id)).toEqual(['2'])
    expect(filterValuedLocalities(localities, { kind: 'all' })).toHaveLength(2)
    const layers = createValuedNatureLayers()
    const model = { municipalityNumber: '5001', analysisId: 'drawn:A', overlay, localities, valueMetrics: [], selectedId: '2', selection: { kind: 'all' as const } }
    layers.set(model)
    expect(layers.selectionLayer.getSource()!.getFeatures().map((feature) => feature.getId())).toEqual(['2'])
    const sourceFeatures = layers.contextLayer.getSource()!.getFeatures()
    layers.set({ ...model, selection: { kind: 'value', label: 'Stor verdi' }, selectedId: null })
    expect(layers.selectionLayer.getSource()!.getFeatures()).toHaveLength(0)
    expect(layers.contextLayer.getSource()!.getFeatures()).toEqual(sourceFeatures)
    const style = layers.contextLayer.getStyleFunction()!
    expect(style(sourceFeatures.find((f) => f.getId() === '2')!, 1)).toBeUndefined()
    expect(style(sourceFeatures.find((f) => f.getId() === '1')!, 1)).toBeDefined()
    layers.set(null)
    expect(layers.selectionLayer.getVisible()).toBe(false)
    expect(layers.contextLayer.getSource()!.getFeatures()).toHaveLength(0)
    expect(layers.contextLayer.getVisible()).toBe(false)
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

  it('renders context without canvas clipping and keeps selection above overlap', () => {
    const layers = createValuedNatureLayers()
    const localities = summarizeValuedNatureFeaturesForTest(features, overlay).localities
    layers.set({ municipalityNumber: '5001', analysisId: 'planned:5001', overlay, valueMetrics: [], localities, selectedId: '1', selection: { kind: 'all' } })
    expect(layers.contextLayer.hasListener('prerender')).toBe(false)
    expect(layers.contextLayer.hasListener('postrender')).toBe(false)
    expect(layers.selectionLayer.hasListener('prerender')).toBe(false)
    expect(layers.contextLayer.getSource()!.getFeatureById('1')!.getGeometry()!.getExtent()).toEqual([.1, .1, 2.9, 2.9])
    expect(layers.selectionLayer.getSource()!.getFeatureById('1')).not.toBeNull()
    layers.set(null)
    expect(layers.selectionLayer.getSource()!.getFeatures()).toHaveLength(0)
  })
})
