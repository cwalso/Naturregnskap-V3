export interface WmsVisualSource {
  readonly type: 'wms'
  readonly endpoint: string
  readonly layer: string
  readonly title: string
  readonly version: '1.3.0'
  readonly supportedCrs: readonly string[]
}

export interface DatasetDefinition {
  readonly id: string
  readonly title: string
  readonly category: 'account'
  readonly version: string
  readonly sourceDataCutoff: string
  readonly datasetOwner: string
  readonly serviceProvider: string
  readonly metadataUrl: string
  readonly visualSource: WmsVisualSource
  readonly analysisSource: null
}

export const nationalLandCover2025 = {
  id: 'national-land-cover-analysis-2025',
  title: 'Nasjonalt grunnkart for arealanalyse – Årsversjon 2025',
  category: 'account',
  version: '2025',
  sourceDataCutoff: '2025-01-01',
  datasetOwner: 'Norsk institutt for bioøkonomi (NIBIO)',
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
  },
  analysisSource: null,
} as const satisfies DatasetDefinition

export const datasetRegistry = [nationalLandCover2025] as const
