import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  PLAN_PIXEL_METERS,
  buildNatureTypeTileUrl,
  buildPlanTileUrl,
  classifyNatureTypePixel,
  getPlanTileCoordinates,
  loadPlanTileBlobByUrl,
  removeNarrowPlanStrips,
} from '../src/map/plannedDevelopment'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DiBK planned development prototype', () => {
  it('uses the same DiBK WMS filter as Publicdemorepo', () => {
    const url = new URL(buildPlanTileUrl([9, 253, 184]))

    expect(url.origin + url.pathname).toBe(
      'https://nap.ft.dibk.no/services/wms/kommuneplaner/',
    )
    expect(url.searchParams.get('layers')).toBe('kparealformalomrade')
    expect(url.searchParams.get('crs')).toBe('EPSG:25833')
    expect(url.searchParams.get('width')).toBe('512')
    expect(url.searchParams.get('height')).toBe('512')

    const filter = url.searchParams.get('filter') ?? ''
    expect(filter).toContain('<PropertyName>arealbruksstatus</PropertyName>')
    expect(filter).toContain('<Literal>2</Literal>')
    expect(filter).toContain('<PropertyName>arealformål</PropertyName>')
    expect(filter).toContain('<Literal>1*</Literal>')
    expect(filter).toContain('<Literal>2*</Literal>')
  })

  it('covers the stored Trondheim overview with 20 level-9 plan tiles', () => {
    const tiles = getPlanTileCoordinates([
      250339.8,
      7010675.6,
      285872.9,
      7051059.4,
    ])

    expect(tiles).toHaveLength(20)
    expect(Math.round(PLAN_PIXEL_METERS)).toBe(21)
  })

  it('removes isolated narrow strips but keeps narrow parts connected to a wider field', () => {
    const width = 8
    const planned = new Uint8Array(width * 6)
    const set = (x: number, y: number, value = 1) => {
      planned[y * width + x] = value
    }

    for (let y = 1; y <= 3; y += 1) {
      for (let x = 1; x <= 3; x += 1) set(x, y)
    }
    set(4, 2)
    set(5, 2)

    for (let y = 1; y <= 4; y += 1) set(7, y)

    const result = removeNarrowPlanStrips(planned, width)

    expect(result.nature).toBe(11)
    expect(result.agriculture).toBe(0)
    expect(result.cleaned[2 * width + 5]).toBe(1)
    expect(result.cleaned[2 * width + 7]).toBe(0)
  })

  it('requests separate Grunnkart ecosystem types for the planned-nature breakdown', () => {
    const url = new URL(buildNatureTypeTileUrl([9, 253, 184]))
    const style = url.searchParams.get('sld_body') ?? ''

    expect(url.origin + url.pathname).toBe(
      'https://wms.nibio.no/cgi-bin/grunnkart_arealanalyse',
    )
    expect(url.searchParams.get('layers')).toBe('okosystemtype')
    expect(style).toContain('<ogc:Literal>skog</ogc:Literal>')
    expect(style).toContain('<ogc:Literal>heiBuskmark</ogc:Literal>')
    expect(style).toContain('<ogc:Literal>liteVegetertMark</ogc:Literal>')
    expect(style).toContain('<ogc:Literal>vatmark</ogc:Literal>')
    expect(style).toContain('<ogc:Literal>kyststrenderSvabergDyner</ogc:Literal>')
  })

  it('classifies the five pure ecosystem colors deterministically', () => {
    expect(classifyNatureTypePixel(255, 0, 0)).toBe(0)
    expect(classifyNatureTypePixel(0, 255, 0)).toBe(1)
    expect(classifyNatureTypePixel(0, 0, 255)).toBe(2)
    expect(classifyNatureTypePixel(255, 0, 255)).toBe(3)
    expect(classifyNatureTypePixel(0, 255, 255)).toBe(4)
  })

  it('reuses identical DiBK image requests within the browser session', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob(['plan'], { type: 'image/png' }), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    )
    const url = 'https://nap.ft.dibk.no/services/wms/kommuneplaner/?cache-test=5001'

    await loadPlanTileBlobByUrl(url)
    await loadPlanTileBlobByUrl(url)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })


})
