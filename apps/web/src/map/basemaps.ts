export interface BasemapDefinition {
  readonly id: string
  readonly title: string
  readonly url: string
  readonly attribution: string
  readonly projection: 'EPSG:3857'
}

export const defaultBasemap = {
  id: 'kartverket-topograatone',
  title: 'Kartverket gråtonekart',
  url: 'https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png',
  attribution: '© Kartverket',
  projection: 'EPSG:3857',
} as const satisfies BasemapDefinition
