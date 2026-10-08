import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Fill, Stroke, Style } from 'ol/style'
import { getRenderPixel } from 'ol/render'
import { createEmpty, extend, isEmpty } from 'ol/extent'
import {
  analysisMaskRectangles, filterValuedLocalities, localityFeature,
  type ValuedNaturePresentation,
} from './valuedNaturePresentation'

export function createValuedNatureLayers(pixelForCoordinate: (coordinate: number[]) => number[]) {
  const source = new VectorSource()
  let model: ValuedNaturePresentation | null = null
  let mask: Uint8Array | null = null
  let maskFilter = ''
  let rectangles: ReturnType<typeof analysisMaskRectangles> = []
  let visibleIds = new Set<string>()
  const styleCache = new Map<string, Style[]>()

  function styles(color: string, selected: boolean, context: boolean, priority: number) {
    const key = `${color}:${selected}:${context}:${priority}`
    const cached = styleCache.get(key)
    if (cached) return cached
    const styles = [new Style({
      fill: new Fill({ color: context ? `${color}18` : color }),
      stroke: new Stroke({ color: context ? `${color}70` : '#303F37', width: selected ? 3 : 1.25, lineDash: context ? [4, 4] : undefined }),
      zIndex: priority,
    })]
    if (selected) styles.push(new Style({ stroke: new Stroke({ color: '#FFFFFF', width: 7 }), zIndex: 100 }), new Style({ stroke: new Stroke({ color: '#303F37', width: 3 }), zIndex: 101 }))
    styleCache.set(key, styles)
    return styles
  }
  const contextLayer = new VectorLayer({
    source, visible: false, className: 'valued-localities-context',
    style: (feature) => visibleIds.has(String(feature.getId()))
      ? styles(feature.get('color'), feature.getId() === model?.selectedId, true, feature.get('priority')) : undefined,
  })
  const hitLayer = new VectorLayer({
    source, visible: false, className: 'valued-localities-hits',
    style: (feature) => visibleIds.has(String(feature.getId()))
      ? styles(feature.get('color'), feature.getId() === model?.selectedId, false, feature.get('priority')) : undefined,
  })
  // Own canvas: clipping must never affect basemap, drawing or other thematic layers.
  hitLayer.on('prerender', (event) => {
    const context = event.context
    if (!(context instanceof CanvasRenderingContext2D)) return
    context.save()
    context.beginPath()
    for (const [minX, minY, maxX, maxY] of rectangles) {
      const points = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]]
        .map((coordinate) => getRenderPixel(event, pixelForCoordinate(coordinate)))
      context.moveTo(points[0][0], points[0][1])
      points.slice(1).forEach((point) => context.lineTo(point[0], point[1]))
      context.closePath()
    }
    context.clip()
  })
  hitLayer.on('postrender', (event) => {
    if (event.context instanceof CanvasRenderingContext2D) event.context.restore()
  })

  function set(next: ValuedNaturePresentation | null) {
    if (next?.localities !== model?.localities) {
      source.clear()
      if (next) source.addFeatures(next.localities.map(localityFeature))
    }
    const filter = next?.selection.kind === 'value' ? next.selection.label : ''
    if (next?.overlay.analysisMask !== mask || filter !== maskFilter) {
      if (next && filter) {
        const categoryMask = new Uint8Array(next.overlay.analysisMask.length)
        next.valueMetrics.find((metric) => metric.label === filter)?.mapPixelIndices.forEach((index) => { categoryMask[index] = 1 })
        rectangles = analysisMaskRectangles({ ...next.overlay, analysisMask: categoryMask })
      } else rectangles = next ? analysisMaskRectangles(next.overlay) : []
      mask = next?.overlay.analysisMask ?? null
      maskFilter = filter
    }
    model = next
    visibleIds = new Set(next ? filterValuedLocalities(next.localities, next.selection).map((locality) => locality.id) : [])
    contextLayer.setVisible(next !== null && visibleIds.size > 0)
    hitLayer.setVisible(next !== null && visibleIds.size > 0)
    contextLayer.changed()
    hitLayer.changed()
  }
  function extent(selectedOnly = false) {
    const extent = createEmpty()
    for (const feature of source.getFeatures()) {
      if (visibleIds.has(String(feature.getId())) && (!selectedOnly || feature.getId() === model?.selectedId)) {
        const geometry = feature.getGeometry()
        if (geometry) extend(extent, geometry.getExtent())
      }
    }
    return isEmpty(extent) ? null : extent
  }
  return { contextLayer, hitLayer, set, extent, active: () => model !== null }
}
