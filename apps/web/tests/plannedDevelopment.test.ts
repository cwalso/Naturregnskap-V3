import { describe, expect, it } from 'vitest'

import {
  PLAN_PIXEL_METERS,
  buildPlanTileUrl,
  getPlanTileCoordinates,
  removeNarrowPlanStrips,
} from '../src/map/plannedDevelopment'

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
})
