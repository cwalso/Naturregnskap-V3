import 'ol/ol.css'
import { transform } from 'ol/proj'
import { createMunicipalityMap } from '../../src/map/municipalityMap.ts'
import { analysisColors, buildGrunnkartMapOverlay } from '../../src/map/analysisPresentation.ts'
import { buildValuedNatureMapOverlay, summarizeValuedNatureFeaturesForTest } from '../../src/map/plannedValuedNature.ts'

const api = createMunicipalityMap(document.querySelector('#map'))
const pixelMeters = 21.15625
const extent = [262000, 7038000, 262000 + 32 * pixelMeters, 7038000 + 32 * pixelMeters]
const analysisMask = new Uint8Array(32 * 32)
const cleaned = new Uint8Array(32 * 32)
for (let row = 5; row < 28; row++) for (let col = 8; col < 29; col++) {
  const index = row * 32 + col
  analysisMask[index] = 1
  cleaned[index] = col < 18 ? 1 : 2
}
const overlay = { kind: 'planned', zoom: 9, cx0: 0, cy0: 0, width: 32, height: 32, extent, analysisMask, cleaned }
function rectangle(x0, y0, x1, y1) {
  return [[x0, y0], [x0, y1], [x1, y1], [x1, y0], [x0, y0]]
}
const features = [
  { attributes: { OBJECTID: 1, Områdenavn: 'Kontrollskog', Verdikategori: 'Stor verdi', Naturtype: 'Skog' }, geometry: { rings: [rectangle(262040, 7038220, 262360, 7038630)] } },
  { attributes: { OBJECTID: 2, Områdenavn: 'Kontrolleng', Verdikategori: 'Middels verdi', Naturtype: 'Eng' }, geometry: { rings: [rectangle(262440, 7038110, 262650, 7038500)] } },
]
const result = summarizeValuedNatureFeaturesForTest(features, overlay)
const valueMetrics = [...result.byValue].map(([label, counter]) => ({ label, mapPixelIndices: Uint32Array.from(counter.pixelIndices) }))
const analysis = { allOverlapPixelIndices: result.uniquePixelIndices, valueMetrics, typeMetrics: [] }
// This calculation helper returns pixel counts and indices, independent of UI.
const boundaryRing = rectangle(261950, 7037940, 262740, 7038740).map((point) => transform(point, 'EPSG:25833', 'EPSG:4326'))
api.showBoundary({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [boundaryRing] }, properties: { number: '5001', name: 'Trondheim – kontrollfixture' } })
api.setAnalysisArea(overlay)
let theme = 'valued'
let selection = { kind: 'all' }
let selectedId = null
function update() {
  api.setAccountLayerVisible(false)
  api.setThematicLayerVisible('valued-nature', theme === 'valued')
  api.setAnalysisFocus(true)
  api.setValuedNaturePresentation(theme === 'valued' ? {
    municipalityNumber: '5001', analysisId: 'planned:5001', overlay,
    localities: result.localities, valueMetrics, selection, selectedId,
  } : null)
  const hit = theme === 'valued' ? buildValuedNatureMapOverlay(analysis, overlay, selection) : buildGrunnkartMapOverlay(overlay, 'all')
  api.setAnalysisHighlight(theme === 'valued' && hit ? { ...hit, fillColor: analysisColors.valued, strokeColor: '#3D1463' } : hit)
  if (window.renderFixture) window.renderFixture.selectedId = selectedId
  window.renderMap.renderSync()
}
api.setValuedNatureSelectionHandler((id) => { selectedId = id; update() })
document.querySelector('#valued').onclick = () => { theme = 'valued'; selection = { kind: 'all' }; selectedId = null; update() }
document.querySelector('#nature').onclick = () => { theme = 'nature'; selectedId = null; update() }
document.querySelector('#filter').onclick = () => { selection = { kind: 'value', label: 'Stor verdi' }; selectedId = null; update() }
document.querySelector('#all').onclick = () => { selection = { kind: 'all' }; update() }
document.querySelector('#select').onclick = () => { selectedId = '1'; update() }
window.renderFixture = { api, extent, analysisMask }
update()
