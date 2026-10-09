import { transform } from 'ol/proj'
import { createExploreLayerMap, type LayerMapContext, type LayerMapStatus } from '../../src/map/exploreThemeMap'
import { initialMapLayers, type MapLayerId } from '../../src/features/explore-map/mapThemes'
import type { MunicipalValuedNature } from '../../src/api/municipalValuedNature'
import 'ol/ol.css'

const boundary = {
  type: 'Feature' as const, properties: { number: '5001', name: 'Testkommune' },
  geometry: { type: 'Polygon' as const, coordinates: [
    [[266000, 7028000], [274000, 7028000], [274000, 7036000], [266000, 7036000], [266000, 7028000]],
    [[268000, 7030000], [268000, 7031000], [269000, 7031000], [269000, 7030000], [268000, 7030000]],
  ].map((ring) => ring.map((point) => transform(point, 'EPSG:25833', 'EPSG:4326'))) },
}
const rectangle = (minX: number, minY: number, maxX: number, maxY: number) => [[[minX, minY], [minX, maxY], [maxX, maxY], [maxX, minY], [minX, minY]]]
const data: MunicipalValuedNature = { municipalityNumber: '5001', natureTypes: ['Testtype'], localities: [
  { id: 'inside', sourceId: '1', name: 'Innenfor', natureType: 'Testtype', value: 'Svært stor verdi', color: '#AF0C0C', rings: rectangle(267000, 7032000, 269000, 7034000) },
  { id: 'outside', sourceId: '2', name: 'Utenfor', natureType: 'Testtype', value: 'Svært stor verdi', color: '#AF0C0C', rings: rectangle(264000, 7032000, 265500, 7034000) },
] }
const statuses: Partial<Record<MapLayerId, LayerMapStatus>> = {}
const selections: (string | null)[] = []
const controller = createExploreLayerMap(document.querySelector<HTMLDivElement>('#map')!, (id, status) => { statuses[id] = status })
let context: LayerMapContext = { boundary, layers: initialMapLayers(), data, filter: { natureType: null, value: null }, selectedId: null }
controller.setSelectionHandler((id) => selections.push(id))
controller.update(context)
const fixture = {
  statuses, selections,
  set(changes: Partial<LayerMapContext>) { context = { ...context, ...changes }; controller.update(context) },
  layer(id: MapLayerId, visible: boolean, opacity = context.layers[id].opacity) {
    context = { ...context, layers: { ...context.layers, [id]: { visible, opacity } } }; controller.update(context)
  },
  destroy: () => controller.destroy(),
}
declare global { interface Window { layersRenderFixture: typeof fixture } }
window.layersRenderFixture = fixture
