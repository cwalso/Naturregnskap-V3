import MultiPolygon from 'ol/geom/MultiPolygon'
import Polygon from 'ol/geom/Polygon'
import type { AnalysisRasterOverlay } from './analysisRasterOverlay'

// Trace only mask boundaries, never internal cell edges. Coordinates retain
// the existing grid: these are computed hit areas, not nature-type boundaries.
export function exploreOverlapGeometry({ mask, width, height, extent }: AnalysisRasterOverlay, value?: number) {
  const occupied = (i: number) => Boolean(mask[i]) && (value === undefined || mask[i] === value)
  const stride = width + 1
  const edges: { a: number; b: number; direction: number }[] = []
  const outgoing = new Map<number, number[]>()
  function edge(a: number, b: number, direction: number) {
    const list = outgoing.get(a) ?? []
    list.push(edges.length)
    outgoing.set(a, list)
    edges.push({ a, b, direction })
  }
  for (let i = 0; i < mask.length; i += 1) {
    if (!occupied(i)) continue
    const x = i % width
    const y = Math.floor(i / width)
    const n = y * stride + x
    if (y === 0 || !occupied(i - width)) edge(n, n + 1, 0)
    if (x === width - 1 || !occupied(i + 1)) edge(n + 1, n + 1 + stride, 1)
    if (y === height - 1 || !occupied(i + width)) edge(n + 1 + stride, n + stride, 2)
    if (x === 0 || !occupied(i - 1)) edge(n + stride, n, 3)
  }
  const used = new Set<number>()
  const rings: number[][][] = []
  const dx = (extent[2] - extent[0]) / width
  const dy = (extent[3] - extent[1]) / height
  const point = (n: number) => [extent[0] + n % stride * dx, extent[3] - Math.floor(n / stride) * dy]
  const turnPriority = [1, 0, 3, 2]
  for (let first = 0; first < edges.length; first += 1) {
    if (used.has(first)) continue
    const ring = [point(edges[first].a)]
    let current = first
    while (!used.has(current)) {
      used.add(current)
      const segment = edges[current]
      ring.push(point(segment.b))
      if (segment.b === edges[first].a) break
      const candidates = (outgoing.get(segment.b) ?? []).filter((index) => !used.has(index))
      candidates.sort((a, b) => turnPriority.indexOf((edges[a].direction - segment.direction + 4) % 4)
        - turnPriority.indexOf((edges[b].direction - segment.direction + 4) % 4))
      if (!candidates.length) throw new Error('Overlappsvisningen har en åpen maskekant')
      current = candidates[0]
    }
    rings.push(ring)
  }
  function signedArea(ring: number[][]) {
    let area = 0
    for (let i = 1; i < ring.length; i += 1) area += ring[i - 1][0] * ring[i][1] - ring[i][0] * ring[i - 1][1]
    // Clockwise exterior boundaries have positive area in the screen grid.
    return -area / 2
  }
  const polygons = rings.filter((ring) => signedArea(ring) > 0).map((ring) => [ring])
  for (const hole of rings.filter((ring) => signedArea(ring) < 0)) {
    const containing = polygons.filter((rings) => new Polygon([rings[0]]).intersectsCoordinate(hole[0]))
      .sort((a, b) => signedArea(a[0]) - signedArea(b[0]))[0]
    if (!containing) throw new Error('Overlappsvisningen har et hull uten ytterkant')
    containing.push(hole)
  }
  return new MultiPolygon(polygons)
}
