import { municipalValueLegend } from '../../api/municipalValuedNature'
import { futureDevelopmentLegend } from '../../map/futureDevelopmentSymbology'
import { protectedAreas, infrastructureFreeNature, wildReindeerAreas, type WmsVisualSource } from '../../datasets/registry'

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
  legend: readonly { label: string; color: string; background?: string }[]
  defaultVisible: boolean
  defaultOpacity: number
  zIndex: number
  filter: 'none' | 'registered-nature'
  maxResolution?: number
  visualSource?: WmsVisualSource
  reference?: string
  metadataUrl?: string
  legendImage?: { url: string; description: string }
}

function serviceLegend(source: WmsVisualSource, description: string) {
  const query = new URLSearchParams({ SERVICE: 'WMS', REQUEST: 'GetLegendGraphic', VERSION: '1.3.0', FORMAT: 'image/png', SLD_VERSION: source.legend.sldVersion, LAYER: source.layer })
  return { url: `${source.endpoint}?${query}`, description }
}
export const greyAreaSource: WmsVisualSource = {
  type: 'wms', endpoint: 'https://wms.nibio.no/cgi-bin/graastruktur', layer: 'graa_arealer',
  title: 'Kart over grå arealer – testversjon 1', version: '1.3.0',
  supportedCrs: ['EPSG:25833', 'EPSG:3857', 'EPSG:4258'], legend: { format: 'image/png', sldVersion: '1.1.0' },
}
export const greyPresentations = [
  { layer: 'graa_arealer', label: 'Grå arealer', description: 'Kildens avgrensning av grå arealer.', legendImage: serviceLegend(greyAreaSource, 'Grå arealer: kildens grå flate.') },
  { layer: 'andel_uten_vegetasjon', label: 'Andel uten vegetasjon', description: 'Kildens estimerte andel uten vegetasjon innenfor hvert gråarealobjekt, i prosent.', legendImage: serviceLegend({ ...greyAreaSource, layer: 'andel_uten_vegetasjon' }, 'Andel uten vegetasjon: kildens prosentklasser.') },
  { layer: 'andel_med_vegetasjon', label: 'Andel med vegetasjon', description: 'Kildens estimerte andel med vegetasjon innenfor hvert gråarealobjekt, i prosent.', legendImage: serviceLegend({ ...greyAreaSource, layer: 'andel_med_vegetasjon' }, 'Andel med vegetasjon: kildens prosentklasser.') },
] as const
export type GreyPresentation = typeof greyPresentations[number]['layer']

const inonSource = { ...infrastructureFreeNature.visualSource, supportedCrs: ['EPSG:25833', 'CRS:84'] } as const
const protectedSource = { ...protectedAreas.visualSource, layer: 'naturvern_klasser_omrade', title: 'Klasseinndelte, vedtatte verneområder' }
export const supplementalMapLayers = [
  {
    id: 'grey-areas', name: 'Grå arealer', role: 'Supplerende temadata',
    source: 'Miljødirektoratet, Kartverket, NIBIO og SSB · karttjeneste: NIBIO',
    visualSource: greyAreaSource, maxResolution: 70,
    description: 'Det offisielle kartproduktets grå arealer: utbygde eller sterkt påvirkede områder, inkludert tilhørende arealer. Velg avgrensning eller kildens vegetasjonsandeler.',
    note: 'Testversjon 1 bygger på en testutgave av Grunnkart fra 2025 og supplerende kilder med ulik alder. Grå arealer er ikke identisk med Bebygd i nivå 0 og betyr ikke ledig areal eller fortettingspotensial. Vegetasjonsandeler er kildeestimater per objekt, ikke kommunale andeler eller egne beregninger. Visning ved 1:250 000 eller nærmere; manglende flate kan skyldes kartgrunnlaget.',
    reference: 'Kartprodukt: versjon 1 · WMS: testversjon 1 · sammensatt kildegrunnlag',
    metadataUrl: 'https://data.norge.no/nb/data-services/f241d863-8e66-3b23-b740-bfe6f1a5af80/kart-over-gra-arealer-wms-testversjon-1',
    legend: [], legendImage: greyPresentations[0].legendImage,
    defaultVisible: false, defaultOpacity: 0.75, zIndex: 11, filter: 'none',
  },
  {
    id: 'intact-nature', name: 'Inngrepsfri natur (INON)', role: 'Supplerende temadata', source: infrastructureFreeNature.attribution,
    description: 'Områder minst 1 km i luftlinje fra tyngre tekniske inngrep, fordelt på 1–3 km, 3–5 km og villmarkspreget natur (minst 5 km).',
    note: 'Statusgrunnlaget er januar 2023, ikke dagens situasjon i 2026. Avstand til inngrep er en supplerende indikator, ikke økosystemtype eller mål på naturtilstand. Ingen endringsanalyse eller arealberegning utføres.',
    reference: 'Status: januar 2023', metadataUrl: infrastructureFreeNature.metadataUrl,
    visualSource: inonSource, legend: [],
    legendImage: serviceLegend(inonSource, 'INON: minst 5 km (villmarkspreget natur), 3–5 km (sone 1), 1–3 km (sone 2) fra inngrep.'),
    defaultVisible: false, defaultOpacity: 0.65, zIndex: 12, filter: 'none',
  },
  {
    id: 'wild-reindeer', name: 'Villrein', role: 'Supplerende temadata', source: wildReindeerAreas.attribution,
    description: 'Registrerte biologiske leveområder for villrein fra Villreinbasen.',
    note: 'Regional kartlegging i Sør-Norge. Leveområder betyr ikke at villrein oppholder seg overalt til enhver tid. Grensene er ikke regionale planers sonegrenser. Null registreringer er ikke en generell vurdering av naturkvalitet.',
    reference: 'Løpende kildetjeneste · ingen felles referansedato', metadataUrl: 'https://kartkatalog.miljodirektoratet.no/MapService/Details/villrein',
    visualSource: wildReindeerAreas.visualSource, legend: [],
    legendImage: serviceLegend(wildReindeerAreas.visualSource, 'Villrein leveområde: blå prikket flate med blå grense.'),
    defaultVisible: false, defaultOpacity: 1, zIndex: 15, filter: 'none',
  },
  {
    id: 'protected-areas', name: 'Verneområder', role: 'Supplerende temadata', source: protectedAreas.attribution,
    description: 'Vedtatte verneområder med kildens klasseinndeling: nasjonalpark, naturreservat, landskapsvernområde, marint verneområde og annen fredning.',
    note: 'Foreslåtte verneområder vises ikke. Formelt vern er supplerende temadata og dokumenterer ikke alene naturtilstand. Dataene er ikke låst til en årsversjon.',
    reference: 'Løpende vernedata · vedtatt vern', metadataUrl: 'https://kartkatalog.miljodirektoratet.no/MapService/Details/vern',
    visualSource: protectedSource, legend: [],
    legendImage: serviceLegend(protectedSource, 'Verneform: annen fredning, landskapsvernområde, marint verneområde, nasjonalpark og naturreservat, med kildens farger og skravur.'),
    defaultVisible: false, defaultOpacity: 1, zIndex: 40, filter: 'none',
  },
] as const satisfies readonly MapLayerDefinition[]
export type SupplementalMapLayerId = typeof supplementalMapLayers[number]['id']

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
    note: 'Mørk grønn og gul skravur markerer planlaget over en delvis transparent bakgrunn. Bebygd areal, vann og ukjente piksler skjules. Kartet viser dagens arealdekke innenfor planavsetninger, ikke bokført naturtap eller en prognose for faktisk framtidig naturtap.',
    legend: futureDevelopmentLegend,
  },
  ...supplementalMapLayers,
] as const satisfies readonly MapLayerDefinition[]
export type MapLayerId = typeof mapLayers[number]['id']
export interface MapLayerSettings { readonly visible: boolean; readonly opacity: number }
export type MapLayerState = Readonly<Record<MapLayerId, MapLayerSettings>>
export function initialMapLayers(): MapLayerState {
  return Object.fromEntries(mapLayers.map((layer) => [layer.id, { visible: layer.defaultVisible, opacity: layer.defaultOpacity }])) as unknown as MapLayerState
}
