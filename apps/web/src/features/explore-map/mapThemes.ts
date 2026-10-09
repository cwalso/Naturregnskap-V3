import { municipalValueLegend } from '../../api/municipalValuedNature'

// Reserved identities are internal; only implemented layers appear in the picker.
export type MapLayerIdentity = 'level0' | 'future-development' | 'valued-nature'
  | 'wild-reindeer' | 'protected-areas' | 'intact-nature' | 'grey-areas' | 'green-structure'
export const mapLayerRoles = ['Regnskapsgrunnlag', 'Plandata', 'Supplerende temadata'] as const
export interface MapLayerDefinition {
  id: MapLayerIdentity
  name: string
  role: typeof mapLayerRoles[number]
  source: string
  description: string
  note: string
  legend: readonly { label: string; color: string }[]
  defaultVisible: boolean
  defaultOpacity: number
  zIndex: number
  filter: 'none' | 'registered-nature'
}

export const mapLayers = [
  {
    id: 'level0', defaultVisible: true, defaultOpacity: 0.7, zIndex: 10, filter: 'none', name: 'Grunnkart nivå 0', role: 'Regnskapsgrunnlag', source: 'NIBIO · Grunnkart for arealanalyse 2025',
    description: 'Heldekkende inndeling i Natur, Jordbruk og Bebygd innenfor kommunen.',
    note: 'Eksisterende nivå-0-klassifisering og farger. Vann vises med egen blå symbolikk som kontekst.',
    legend: [{ label: 'Natur', color: '#9ECC73' }, { label: 'Jordbruk', color: '#FFD16E' }, { label: 'Bebygd', color: '#E86474' }, { label: 'Vann (kontekst)', color: '#6BAED6' }],
  },
  {
    id: 'valued-nature', defaultVisible: false, defaultOpacity: 1, zIndex: 30, filter: 'registered-nature', name: 'Verdsatte naturtyper', role: 'Supplerende temadata', source: 'Miljødirektoratet · naturtyper med KU-verdi',
    description: 'Registrerte naturtypelokaliteter i kommunen, uavhengig av framtidig utbygging.',
    note: 'Datasettet er ikke heldekkende. Manglende registrering betyr ikke fravær av naturverdi.', legend: municipalValueLegend,
  },
  {
    id: 'future-development', defaultVisible: false, defaultOpacity: 1, zIndex: 20, filter: 'none', name: 'Framtidig utbygging', role: 'Plandata', source: 'DiBK · kommuneplanens arealdel',
    description: 'Natur og jordbruk innenfor områder avsatt til framtidige utbyggingsformål i kommuneplanen.',
    note: 'Bebygd areal, vann og ukjente piksler skjules. Kartet viser dagens arealdekke innenfor planavsetninger, ikke bokført naturtap eller en prognose for faktisk framtidig naturtap.',
    legend: [{ label: 'Natur', color: '#9ECC73' }, { label: 'Jordbruk', color: '#FFD16E' }],
  },
] as const satisfies readonly MapLayerDefinition[]
export type MapLayerId = typeof mapLayers[number]['id']
export interface MapLayerSettings { readonly visible: boolean; readonly opacity: number }
export type MapLayerState = Readonly<Record<MapLayerId, MapLayerSettings>>
export function initialMapLayers(): MapLayerState {
  return Object.fromEntries(mapLayers.map((layer) => [layer.id, { visible: layer.defaultVisible, opacity: layer.defaultOpacity }])) as unknown as MapLayerState
}
