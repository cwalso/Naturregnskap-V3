import { ACCOUNT_CRS, accountTileGrid } from '../map/accountOverviewRaster'

const ENDPOINT = 'https://wms.nibio.no/cgi-bin/grunnkart_arealanalyse'
const TILE_PIXELS = 512
const COLOR = '#8f8f8f'

const STYLE =
  '<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>okosystemtype</Name><UserStyle><FeatureTypeStyle>'
  + '<Rule><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>okosystemtypeniva1</ogc:PropertyName><ogc:Literal>bebygdOpparbeidetAreal</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>'
  + '<PolygonSymbolizer><Fill><CssParameter name="fill">' + COLOR + '</CssParameter></Fill></PolygonSymbolizer></Rule>'
  + '</FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>'

export function buildUrbanBuiltTileUrl(tileCoord: number[]): string {
  return ENDPOINT + '?' + new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: 'okosystemtype',
    styles: '',
    crs: ACCOUNT_CRS,
    bbox: accountTileGrid.getTileCoordExtent(tileCoord).map((value) => value.toFixed(2)).join(','),
    width: String(TILE_PIXELS),
    height: String(TILE_PIXELS),
    format: 'image/png; mode=8bit',
    transparent: 'true',
    sld_body: STYLE,
  })
}

export const urbanBuiltColor = COLOR
