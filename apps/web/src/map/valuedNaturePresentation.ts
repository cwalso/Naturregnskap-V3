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
