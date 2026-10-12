import { afterEach, describe, expect, it, vi } from 'vitest'
import type RenderEvent from 'ol/render/Event'
import { futureDevelopmentLegend, hatchFutureDevelopment } from '../src/map/futureDevelopmentSymbology'

function render(rows: number[][], width: number, ratio = 1) {
  const data = new Uint8ClampedArray(rows.flat())
  class Context {
    canvas = { width, height: rows.length / width }
    getImageData() { return { data } }
    putImageData = vi.fn()
  }
  vi.stubGlobal('CanvasRenderingContext2D', Context)
  const context = new Context()
  hatchFutureDevelopment({ context, frameState: { pixelRatio: ratio } } as unknown as RenderEvent)
  return Array.from({ length: rows.length }, (_, i) => [...data.slice(i * 4, i * 4 + 4)])
}
afterEach(() => vi.unstubAllGlobals())
describe('planlagets skravur er bare symbologi', () => {
  it('viser mørke linjer og transparent tint uten å farge tomme piksler eller øke dekning', () => {
    const result = render([[158, 204, 115, 255], [255, 209, 110, 89], [158, 204, 115, 255], [0, 0, 0, 0]], 4)
    expect(result).toEqual([[40, 100, 59, 255], [150, 112, 0, 89], [158, 204, 115, 61], [0, 0, 0, 0]])
  })
  it('holder linjebredden lik i CSS-piksler på en skjerm med dobbel pikselratio', () => {
    const mask = Array.from({ length: 16 }, () => [158, 204, 115, 255])
    const normal = render(mask.slice(0, 8), 8)
    const retina = render(mask, 16, 2)
    for (let i = 0; i < 8; i++) {
      expect(retina[i * 2]).toEqual(normal[i])
      expect(retina[i * 2 + 1]).toEqual(normal[i])
    }
  })
  it('har to ulike skravurfarger og retninger i legend', () => {
    expect(futureDevelopmentLegend.map((item) => item.color)).toEqual(['#28643B', '#967000'])
    expect(futureDevelopmentLegend[0].background).toContain('135deg')
    expect(futureDevelopmentLegend[1].background).toContain('45deg')
  })
})
