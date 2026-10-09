import { transform } from 'ol/proj'
import { createExploreAnalysisMap, type ExploreMapContext, type ExploreMapStatus } from '../../src/map/exploreAnalysisMap'
import type { PlannedDevelopmentAnalysis } from '../../src/map/plannedDevelopment'
import type { PlannedValuedNatureAnalysis } from '../../src/map/plannedValuedNature'
import 'ol/ol.css'

const boundary = {
  type: 'Feature' as const,
  properties: { number: '5001', name: 'Testkommune' },
  geometry: {
    type: 'Polygon' as const,
    coordinates: [
      [[266000, 7028000], [274000, 7028000], [274000, 7036000], [266000, 7036000], [266000, 7028000]],
      [[268000, 7030000], [268000, 7031000], [269000, 7031000], [269000, 7030000], [268000, 7030000]],
    ].map((ring) => ring.map((point) => transform(point, 'EPSG:25833', 'EPSG:4326'))),
  },
}
const mask = new Uint8Array(64)
for (let y = 2; y < 6; y += 1) for (let x = 4; x < 6; x += 1) mask[y * 8 + x] = 1
// Deliberately no Nature/Agri pixels: the whole valid analysis mask must show.
const plan: PlannedDevelopmentAnalysis = {
  municipalityNumber: '5001', analysisId: 'planned:5001', analysisAreaKind: 'planned',
  status: 'available', analysisAreaKm2: 8, natureKm2: 0, agricultureKm2: 0,
  natureWithNarrowStripsKm2: 0, agricultureWithNarrowStripsKm2: 0,
  natureSharePercent: null, agricultureSharePercent: null,
  natureShareOfAnalysisAreaPercent: 0, agricultureShareOfAnalysisAreaPercent: 0,
  tileCount: 1, pixelMeters: 21.15625, source: 'DiBK kommuneplaner', methodVersion: 'dibk-plan-raster-v2',
  overlay: { kind: 'planned', zoom: 9, cx0: 0, cy0: 0, width: 8, height: 8,
    extent: [266000, 7028000, 274000, 7036000], analysisMask: mask, cleaned: new Uint8Array(64) },
}
const statuses: ExploreMapStatus[] = []
const selections: (string | null)[] = []
const overlapIndices = new Uint32Array([20, 28])
const valued: PlannedValuedNatureAnalysis = {
  municipalityNumber: '5001', analysisId: 'planned:5001', status: 'available',
  source: 'Miljødirektoratet – naturtyper med KU-verdi', methodVersion: 'planned-valued-nature-v2', pixelMeters: 21.15625,
  candidateFeatureCount: 1, affectedFeatureCount: 1, uniqueOverlapAreaKm2: 2, registeredOverlapAreaKm2: 2, hasOverlappingRegistrations: false,
  allOverlapPixelIndices: overlapIndices,
  valueMetrics: [{ label: 'Stor verdi', color: '#FD7032', featureCount: 1, areaKm2: 2, sharePercent: 100, mapPixelIndices: overlapIndices }],
  typeMetrics: [],
  localities: [{ id: 'test-locality', name: 'Test', natureType: 'Testtype', value: 'Stor verdi', color: '#FD7032', overlapAreaKm2: 2,
    rings: [[[270000, 7031000], [270000, 7035000], [273000, 7035000], [273000, 7031000], [270000, 7031000]]] }],
}
const controller = createExploreAnalysisMap(document.querySelector<HTMLDivElement>('#map')!, (status) => statuses.push(status))
controller.setLocalitySelectionHandler((id) => selections.push(id))
let context: ExploreMapContext = { boundary, showValuedNature: true, plan: null }
controller.update(context)
declare global {
  interface Window {
    exploreRenderFixture: {
      set(changes: Partial<ExploreMapContext>): void
      plan: PlannedDevelopmentAnalysis
      valued: PlannedValuedNatureAnalysis
      boundary: typeof boundary
      statuses: ExploreMapStatus[]
      selections: (string | null)[]
      destroy(): void
    }
  }
}
window.exploreRenderFixture = {
  set(changes) { context = { ...context, ...changes }; controller.update(context) },
  plan, valued, boundary, statuses, selections, destroy: () => controller.destroy(),
}
