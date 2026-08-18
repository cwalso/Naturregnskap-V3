import type { WmsVisualSource } from '../datasets/registry'

export function buildWmsLegendUrl(source: WmsVisualSource): string {
  const parameters = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetLegendGraphic',
    VERSION: source.version,
    FORMAT: source.legend.format,
    LAYER: source.layer,
    SLD_VERSION: source.legend.sldVersion,
  })

  return `${source.endpoint}?${parameters.toString()}`
}
