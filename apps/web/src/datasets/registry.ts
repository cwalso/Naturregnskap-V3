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

export interface AccountDatasetDefinition extends DatasetBase {
  readonly category: 'account'
  readonly analysisSource: {
    readonly type: 'account-overview-api'
    readonly period: '2025'
  }
}

export type ThematicDatasetId = 'protected-areas' | 'wild-reindeer-areas'
export type ThematicThemeId = 'protected' | 'reindeer'

export interface ThematicCoverage {
  readonly scope: 'nationwide' | 'regional'
  readonly label: string
  readonly municipalityEvaluation: 'spatial_query'
  readonly note: string
}

export interface ThematicDatasetDefinition extends DatasetBase {
  readonly id: ThematicDatasetId
  readonly category: 'thematic'
  readonly themeId: ThematicThemeId
  readonly sourceStatus: 'connected'
  readonly attribution: string
  readonly coverage: ThematicCoverage
  readonly analysisSource: {
    readonly type: 'municipality-thematic-coverage-api'
    readonly datasetId: ThematicDatasetId
  }
}

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
    type: 'account-overview-api',
    period: '2025',
  },
} as const satisfies AccountDatasetDefinition

export const protectedAreas = {
  id: 'protected-areas',
  title: 'Naturvernområder',
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
    type: 'municipality-thematic-coverage-api',
    datasetId: 'protected-areas',
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
    type: 'municipality-thematic-coverage-api',
    datasetId: 'wild-reindeer-areas',
  },
} as const satisfies ThematicDatasetDefinition

export const thematicDatasets = [protectedAreas, wildReindeerAreas] as const

export const datasetRegistry: readonly DatasetDefinition[] = [
  nationalLandCover2025,
  ...thematicDatasets,
]
