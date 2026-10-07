export interface WmsVisualSource {
  readonly type: 'wms'
  readonly endpoint: string
  readonly layer: string
  readonly title: string
  readonly version: '1.3.0'
  readonly supportedCrs: readonly string[]
  readonly legend: {
    readonly format: 'image/png'
    readonly sldVersion: '1.1.0'
  }
}

interface DatasetBase {
  readonly id: string
  readonly title: string
  readonly version: string
  readonly sourceDataCutoff: string
  readonly publisher: string
  readonly serviceProvider: string
  readonly metadataUrl: string
  readonly visualSource: WmsVisualSource
}

export type AccountDatasetId = 'national-land-cover-analysis-2025'

export interface AccountDatasetDefinition extends DatasetBase {
  readonly id: AccountDatasetId
  readonly category: 'account'
  readonly analysisSource: {
    readonly type: 'static-prepared-result'
    readonly period: '2025'
  }
}

export type ThematicDatasetId =
  | 'protected-areas'
  | 'wild-reindeer-areas'
  | 'valued-nature'
  | 'infrastructure-free-nature'

export type ThematicThemeId =
  | 'protected'
  | 'reindeer'
  | 'valued'
  | 'infrastructure-free'

export interface ThematicCoverage {
  readonly scope: 'nationwide' | 'regional' | 'partial'
  readonly label: string
  readonly municipalityEvaluation: 'spatial_query' | 'visual_only'
  readonly note: string
}

export interface ThematicDatasetDefinition extends DatasetBase {
  readonly id: ThematicDatasetId
  readonly category: 'thematic'
  readonly themeId: ThematicThemeId
  readonly sourceStatus: 'connected' | 'visual-only'
  readonly attribution: string
  readonly coverage: ThematicCoverage
  readonly analysisSource: {
    readonly type: 'arcgis-rest-query'
    readonly queryUrl: string
  } | null
}

export type DatasetId = AccountDatasetId | ThematicDatasetId
export type DatasetDefinition = AccountDatasetDefinition | ThematicDatasetDefinition

export const nationalLandCover2025 = {
  id: 'national-land-cover-analysis-2025',
  title: 'Nasjonalt grunnkart for arealanalyse – Årsversjon 2025',
  category: 'account',
  version: '2025',
  sourceDataCutoff: '2025-01-01',
  publisher: 'Norsk institutt for bioøkonomi (NIBIO)',
  serviceProvider: 'Norsk institutt for bioøkonomi (NIBIO)',
  metadataUrl: 'https://kartkatalog.geonorge.no/Metadata/c7dc425b-60cd-42f7-a84e-202c7d7b912a',
  visualSource: {
    type: 'wms',
    endpoint: 'https://wms.nibio.no/cgi-bin/grunnkart_arealanalyse',
    layer: 'arealdekkeniva1',
    title: 'Arealdekke nivå 1',
    version: '1.3.0',
    supportedCrs: [
      'EPSG:4258', 'EPSG:4326', 'EPSG:3035', 'EPSG:25832', 'EPSG:25833',
      'EPSG:25834', 'EPSG:25835', 'EPSG:25836', 'EPSG:32632', 'EPSG:32633',
      'EPSG:32634', 'EPSG:32635', 'EPSG:32636', 'EPSG:3857', 'EPSG:900913',
    ],
    legend: {
      format: 'image/png',
      sldVersion: '1.1.0',
    },
  },
  analysisSource: {
    type: 'static-prepared-result',
    period: '2025',
  },
} as const satisfies AccountDatasetDefinition

export const protectedAreas = {
  id: 'protected-areas',
  title: 'Verneområder',
  category: 'thematic',
  themeId: 'protected',
  version: 'løpende tjeneste',
  sourceDataCutoff: 'ikke låst i prototypen',
  publisher: 'Miljødirektoratet',
  serviceProvider: 'Miljødirektoratet',
  metadataUrl: 'https://kartkatalog.miljodirektoratet.no/Dataset/Details/0',
  sourceStatus: 'connected',
  attribution: 'Kilde: Miljødirektoratet',
  coverage: {
    scope: 'nationwide',
    label: 'Norge, Svalbard og Jan Mayen',
    municipalityEvaluation: 'spatial_query',
    note: 'Treff vurderes romlig mot valgt kommune via Miljødirektoratets feature-tjeneste. WMS brukes fortsatt bare til kartvisning.',
  },
  visualSource: {
    type: 'wms',
    endpoint: 'https://kart.miljodirektoratet.no/arcgis/services/vern/mapserver/WMSServer',
    layer: 'naturvern_omrade',
    title: 'Verneområder i Norge',
    version: '1.3.0',
    supportedCrs: ['EPSG:3857', 'EPSG:25833', 'EPSG:4326'],
    legend: {
      format: 'image/png',
      sldVersion: '1.1.0',
    },
  },
  analysisSource: {
    type: 'arcgis-rest-query',
    queryUrl: 'https://kart.miljodirektoratet.no/arcgis/rest/services/vern/MapServer/0/query',
  },
} as const satisfies ThematicDatasetDefinition

export const wildReindeerAreas = {
  id: 'wild-reindeer-areas',
  title: 'Villreinområder',
  category: 'thematic',
  themeId: 'reindeer',
  version: 'løpende tjeneste',
  sourceDataCutoff: 'ikke låst i prototypen',
  publisher: 'Miljødirektoratet',
  serviceProvider: 'Miljødirektoratet',
  metadataUrl: 'https://kartkatalog.miljodirektoratet.no/Dataset/Details/25',
  sourceStatus: 'connected',
  attribution: 'Kilde: Villreinbasen, Miljødirektoratet',
  coverage: {
    scope: 'regional',
    label: 'Sør-Norge',
    municipalityEvaluation: 'spatial_query',
    note: 'Treff vurderes romlig mot valgt kommune via Miljødirektoratets feature-tjeneste. Datasettet er regionalt, så null treff skal ikke tolkes som en generell vurdering av villreinrelevans.',
  },
  visualSource: {
    type: 'wms',
    endpoint: 'https://kart.miljodirektoratet.no/arcgis/services/villrein/MapServer/WMSServer',
    layer: 'villrein_leveomrade',
    title: 'Leveområde for villrein',
    version: '1.3.0',
    supportedCrs: ['EPSG:3857', 'EPSG:25833', 'EPSG:4326'],
    legend: {
      format: 'image/png',
      sldVersion: '1.1.0',
    },
  },
  analysisSource: {
    type: 'arcgis-rest-query',
    queryUrl: 'https://kart.miljodirektoratet.no/arcgis/rest/services/villrein/MapServer/1/query',
  },
} as const satisfies ThematicDatasetDefinition



export const valuedNature = {
  id: 'valued-nature',
  title: 'Verdsatte naturtyper',
  category: 'thematic',
  themeId: 'valued',
  version: 'løpende tjeneste',
  sourceDataCutoff: 'ikke låst i prototypen',
  publisher: 'Miljødirektoratet',
  serviceProvider: 'Miljødirektoratet',
  metadataUrl: 'https://kartkatalog.miljodirektoratet.no/MapService/Details/naturtyper_kuverdi',
  sourceStatus: 'connected',
  attribution: 'Kilde: Miljødirektoratet, naturtyper med KU-verdi',
  coverage: {
    scope: 'partial',
    label: 'Kartlagte lokaliteter · ikke heldekkende',
    municipalityEvaluation: 'spatial_query',
    note: 'Treff vurderes mot registrerte verdsatte naturtypelokaliteter. Manglende treff skal ikke tolkes som fravær av naturverdi fordi datasettet ikke er heldekkende.',
  },
  visualSource: {
    type: 'wms',
    endpoint: 'https://kart.miljodirektoratet.no/arcgis/services/naturtyper_kuverdi/MapServer/WMSServer',
    layer: 'kuverdi_naturtype_alle',
    title: 'Naturtyper – verdsatte',
    version: '1.3.0',
    supportedCrs: ['EPSG:3857', 'EPSG:25833', 'EPSG:4326'],
    legend: {
      format: 'image/png',
      sldVersion: '1.1.0',
    },
  },
  analysisSource: {
    type: 'arcgis-rest-query',
    queryUrl: 'https://kart.miljodirektoratet.no/arcgis/rest/services/naturtyper_kuverdi/MapServer/0/query',
  },
} as const satisfies ThematicDatasetDefinition

export const infrastructureFreeNature = {
  id: 'infrastructure-free-nature',
  title: 'Inngrepsfri natur',
  category: 'thematic',
  themeId: 'infrastructure-free',
  version: 'status 2023',
  sourceDataCutoff: '2023-01',
  publisher: 'Miljødirektoratet',
  serviceProvider: 'Miljødirektoratet',
  metadataUrl: 'https://kartkatalog.miljodirektoratet.no/MapService/Details/inngrepsfrinatur',
  sourceStatus: 'visual-only',
  attribution: 'Kilde: Miljødirektoratet – inngrepsfri natur 01.2023',
  coverage: {
    scope: 'nationwide',
    label: 'Fastlands-Norge · status 2023',
    municipalityEvaluation: 'visual_only',
    note: 'Kartlaget er koblet til som supplerende indikator. Kommuneareal og treffstatus beregnes ikke i denne sprinten.',
  },
  visualSource: {
    type: 'wms',
    endpoint: 'https://kart.miljodirektoratet.no/geoserver/inngrepsfrinatur/wms',
    layer: 'status',
    title: 'Status inngrepsfri natur 2023',
    version: '1.3.0',
    supportedCrs: ['EPSG:3857', 'EPSG:25833', 'EPSG:4326'],
    legend: {
      format: 'image/png',
      sldVersion: '1.1.0',
    },
  },
  analysisSource: null,
} as const satisfies ThematicDatasetDefinition

export const thematicDatasets = [
  valuedNature,
  protectedAreas,
  wildReindeerAreas,
  infrastructureFreeNature,
] as const

export const datasetRegistry: readonly DatasetDefinition[] = [
  nationalLandCover2025,
  ...thematicDatasets,
]
