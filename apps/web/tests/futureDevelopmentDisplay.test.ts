import { describe, expect, it } from 'vitest'
import { futureDevelopmentColor, intersectFutureDevelopmentPixels } from '../src/map/futureDevelopmentDisplay'
import { buildPlanTileUrl, buildRawAccountPlanTileUrl } from '../src/map/plannedDevelopment'

const rgba = (rows: number[][]) => new Uint8ClampedArray(rows.flat())
describe('framtidig utbygging: bare kartpresentasjon', () => {
  it('beholder natur/jordbruk og skjuler bebygd, alle vannklasser, ukjent og utenfor planen', () => {
    const account = rgba([[0, 0, 255, 255], [0, 255, 0, 255], [255, 0, 0, 255],
      [255, 128, 255, 255], [0, 128, 255, 255], [255, 128, 128, 255],
      [0, 0, 255, 0], [0, 255, 0, 99], [0, 0, 255, 255]])
    const plan = rgba(Array.from({ length: 9 }, (_, i) => [0, 0, 0, i === 8 ? 127 : 255]))
    expect([...intersectFutureDevelopmentPixels(account, plan)]).toEqual([1, 2, 0, 0, 0, 0, 0, 0, 0])
  })
  it('beholder et enkelt lite eller smalt treff og demper det i grovt utsnitt', () => {
    expect(futureDevelopmentColor(1, 0, 64)).toEqual([158, 204, 115, 89])
    expect(futureDevelopmentColor(0, 1, 64)).toEqual([255, 209, 110, 89])
    expect(futureDevelopmentColor(0, 0, 64)).toEqual([0, 0, 0, 0])
    expect(futureDevelopmentColor(1, 3, 4)).toEqual([255, 209, 110, 255])
  })
  it('henter plan og klassifisering med identisk EPSG:25833-bbox og pikselrutenett', () => {
    for (const zoom of [9, 10, 13]) {
      const plan = new URL(buildPlanTileUrl([zoom, 255, 180])).searchParams
      const account = new URL(buildRawAccountPlanTileUrl('https://wms.nibio.no/cgi-bin/grunnkart_arealanalyse', [zoom, 255, 180])).searchParams
      for (const key of ['crs', 'bbox', 'width', 'height']) expect(plan.get(key)).toBe(account.get(key))
      expect(plan.get('filter')).toContain('<Literal>2</Literal>')
      expect(plan.get('filter')).toContain('<Literal>1*</Literal>')
      expect(plan.get('filter')).toContain('<Literal>2*</Literal>')
    }
  })
})
