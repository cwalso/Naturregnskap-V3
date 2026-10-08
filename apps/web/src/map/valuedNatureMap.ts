import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Fill, Stroke, Style } from 'ol/style'
import { filterValuedLocalities, localityFeature, type ValuedNaturePresentation } from './valuedNaturePresentation'

// Source geometries provide context and object selection. The computed overlap
// is rendered separately by the ordinary analysis raster pipeline.
export function createValuedNatureLayers() {
  const source = new VectorSource()
  const selectionSource = new VectorSource()
  let model: ValuedNaturePresentation | null = null
  let visibleIds = new Set<string>()
  const styleCache = new Map<string, Style>()
  const contextLayer = new VectorLayer({
    source, visible: false, className: 'valued-localities-context',
    style: (feature) => {
      if (!visibleIds.has(String(feature.getId()))) return undefined
      const color: string = feature.get('color')
      let style = styleCache.get(color)
      if (!style) {
        style = new Style({
          fill: new Fill({ color: `${color}70` }),
          stroke: new Stroke({ color, width: 1.5 }),
          zIndex: feature.get('priority'),
        })
        styleCache.set(color, style)
      }
      return style
    },
  })
  const selectionLayer = new VectorLayer({
    source: selectionSource, visible: false, className: 'valued-localities-selection',
    style: [
      new Style({ stroke: new Stroke({ color: '#FFFFFF', width: 7 }) }),
      new Style({ stroke: new Stroke({ color: '#303F37', width: 3 }) }),
    ],
  })
  function set(next: ValuedNaturePresentation | null) {
    if (next?.localities !== model?.localities) {
      source.clear()
      if (next) source.addFeatures(next.localities.map(localityFeature))
    }
    model = next
    visibleIds = new Set(next ? filterValuedLocalities(next.localities, next.selection).map((locality) => locality.id) : [])
    selectionSource.clear()
    if (next?.selectedId && visibleIds.has(next.selectedId)) {
      const selected = source.getFeatureById(next.selectedId)
      if (selected) selectionSource.addFeature(selected)
    }
    contextLayer.setVisible(next !== null && visibleIds.size > 0)
    selectionLayer.setVisible(selectionSource.getFeatures().length > 0)
    contextLayer.changed()
  }
  return { contextLayer, selectionLayer, set, active: () => model !== null }
}
