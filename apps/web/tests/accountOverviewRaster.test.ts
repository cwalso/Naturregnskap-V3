import { describe, expect, it } from 'vitest'

import {
  ACCOUNT_CRS,
  ACCOUNT_DETAIL_MAX_RESOLUTION,
  buildAccountTileUrl,
} from '../src/map/accountOverviewRaster'

describe('Publicdemorepo-style account map', () => {
  it('requests detailed Grunnkart tiles in UTM33 with the grouped ecosystem style', () => {
    const url = new URL(buildAccountTileUrl(
      'https://wms.nibio.no/cgi-bin/grunnkart_arealanalyse',
      [10, 260, 188],
    ))

    expect(url.searchParams.get('layers')).toBe('okosystemtype')
    expect(url.searchParams.get('crs')).toBe(ACCOUNT_CRS)
    expect(url.searchParams.get('width')).toBe('512')
    expect(url.searchParams.get('height')).toBe('512')
    expect(url.searchParams.get('sld_body')).toContain('okosystemtypeniva1')
    expect(url.searchParams.get('sld_body')).toContain('#9ECC73')
  })

  it('uses the same 30 metre detail threshold as the public demonstrator', () => {
    expect(ACCOUNT_DETAIL_MAX_RESOLUTION).toBe(30)
  })
})
