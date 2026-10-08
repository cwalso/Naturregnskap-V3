import { transform } from 'ol/proj'
import { createExploreAnalysisMap, type ExploreMapContext, type ExploreMapStatus } from '../../src/map/exploreAnalysisMap'
import type { PlannedDevelopmentAnalysis } from '../../src/map/plannedDevelopment'
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
const controller = createExploreAnalysisMap(document.querySelector<HTMLDivElement>('#map')!, (status) => statuses.push(status))
let context: ExploreMapContext = { boundary, showValuedNature: true, plan: null }
controller.update(context)
declare global {
  interface Window {
    exploreRenderFixture: {
      set(changes: Partial<ExploreMapContext>): void
      plan: PlannedDevelopmentAnalysis
      boundary: typeof boundary
      statuses: ExploreMapStatus[]
      destroy(): void
    }
  }
}
window.exploreRenderFixture = {
  set(changes) { context = { ...context, ...changes }; controller.update(context) },
  plan, boundary, statuses, destroy: () => controller.destroy(),
}
