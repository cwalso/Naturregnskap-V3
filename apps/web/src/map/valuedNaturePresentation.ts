import ESRIJSON from 'ol/format/EsriJSON'
import type { PlannedDevelopmentOverlayGrid } from './plannedDevelopment'
import type { ValuedNatureBreakdownMetric, ValuedNatureLocality, ValuedNatureMapSelection } from './plannedValuedNature'
import { valuedAnalysisCategories } from './plannedValuedNature'

export interface ValuedNaturePresentation {
  readonly municipalityNumber: string
  readonly analysisId: string
  readonly overlay: PlannedDevelopmentOverlayGrid
  readonly localities: readonly ValuedNatureLocality[]
  readonly selection: ValuedNatureMapSelection
  readonly selectedId: string | null
  readonly valueMetrics: readonly ValuedNatureBreakdownMetric[]
}

export function filterValuedLocalities(localities: readonly ValuedNatureLocality[], selection: ValuedNatureMapSelection) {
  return localities.filter((locality) => selection.kind === 'all'
    || (selection.kind === 'value' ? locality.value : locality.natureType) === selection.label)
}

export function localityFeature(locality: ValuedNatureLocality) {
  const feature = new ESRIJSON().readFeatures({
    features: [{
      geometry: { rings: locality.rings, spatialReference: { wkid: 25833 } },
      attributes: { localityId: locality.id, color: locality.color, priority: 4 - valuedAnalysisCategories.indexOf(locality.value as typeof valuedAnalysisCategories[number]) },
    }],
  }, { dataProjection: 'EPSG:25833', featureProjection: 'EPSG:25833' })[0]
  feature.setId(locality.id)
  return feature
}

// Rectangles describe the existing valid mask, not locality shapes or new area calculations.
export function analysisMaskRectangles(overlay: PlannedDevelopmentOverlayGrid): readonly (readonly [number, number, number, number])[] {
  const rectangles: [number, number, number, number][] = []
  const [minX, , maxX, maxY] = overlay.extent
  const dx = (maxX - minX) / overlay.width
  const dy = (maxY - overlay.extent[1]) / overlay.height
  let previous = new Map<string, [number, number, number, number]>()
  for (let row = 0; row < overlay.height; row += 1) {
    const next = new Map<string, [number, number, number, number]>()
    for (let col = 0; col < overlay.width;) {
      if (!overlay.analysisMask[row * overlay.width + col]) { col += 1; continue }
      const start = col
      while (col < overlay.width && overlay.analysisMask[row * overlay.width + col]) col += 1
      const key = `${start}:${col}`
      const rectangle = previous.get(key) ?? [minX + start * dx, maxY - (row + 1) * dy, minX + col * dx, maxY - row * dy]
      if (previous.has(key)) rectangle[1] = maxY - (row + 1) * dy
      else rectangles.push(rectangle)
      next.set(key, rectangle)
    }
    previous = next
  }
  return rectangles
}
