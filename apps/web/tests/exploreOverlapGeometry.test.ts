import { describe, expect, it } from 'vitest'
import { exploreOverlapGeometry } from '../src/map/exploreOverlapGeometry'

describe('grid-derived hit boundary', () => {
  it('keeps class boundaries separate without adding area', () => {
    const overlay = { width: 3, height: 2, extent: [0, 0, 30, 20] as const, mask: Uint8Array.from([1, 2, 0, 2, 1, 2]), fillColor: '#000000' }
    for (const kind of [1, 2]) {
      const geometry = exploreOverlapGeometry(overlay, kind)
      expect(geometry.getArea()).toBe(overlay.mask.filter((cell) => cell === kind).length * 100)
      overlay.mask.forEach((cell, i) => expect(geometry.intersectsCoordinate([(i % 3 + .5) * 10, (2 - Math.floor(i / 3) - .5) * 10])).toBe(cell === kind))
    }
    expect(exploreOverlapGeometry(overlay, 3).getCoordinates()).toEqual([])
  })
  it.each([
    [3, 3, [1, 1, 1, 1, 0, 1, 1, 1, 1]], // Hole must remain empty.
    [2, 2, [1, 0, 0, 1]], // Diagonal cells remain separate.
    [4, 2, [1, 1, 0, 1, 1, 0, 0, 1]], // Disconnected, concave regions.
  ])('preserves every valid cell, hole and total area (%i × %i)', (width, height, cells) => {
    const geometry = exploreOverlapGeometry({ width, height, extent: [0, 0, width * 10, height * 10], mask: Uint8Array.from(cells), fillColor: '#000000' })
    expect(geometry.getArea()).toBe(cells.filter(Boolean).length * 100)
    cells.forEach((cell, index) => {
      expect(geometry.intersectsCoordinate([(index % width + .5) * 10, (height - Math.floor(index / width) - .5) * 10])).toBe(Boolean(cell))
    })
  })
})
