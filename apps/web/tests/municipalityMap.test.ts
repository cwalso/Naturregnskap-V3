import Feature from 'ol/Feature'
import Polygon from 'ol/geom/Polygon'
import { DrawEvent, type default as Draw } from 'ol/interaction/Draw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMunicipalityMap } from '../src/map/municipalityMap'
import type { DrawnAnalysisArea } from '../src/map/drawnAnalysis'

const mapInstances = vi.hoisted(() => [] as { interactions: Draw[] }[])
vi.mock('ol/Map', () => ({
  default: class {
    interactions: Draw[] = []
    constructor() { mapInstances.push(this) }
    addInteraction(interaction: Draw) { this.interactions.push(interaction) }
    removeInteraction(interaction: Draw) {
      this.interactions = this.interactions.filter((item) => item !== interaction)
    }
    updateSize() {}
    getSize() { return undefined }
    renderSync() {}
    on() {}
    setTarget() {}
  },
}))

beforeEach(() => { vi.useFakeTimers(); mapInstances.length = 0 })
afterEach(() => { vi.useRealTimers() })

function endDrawing(instance: number, offset = 0) {
  const feature = new Feature(new Polygon([[
    [offset, 0], [offset + 100, 0], [offset + 100, 100], [offset, 0],
  ]]))
  mapInstances[instance].interactions[0].dispatchEvent(new DrawEvent('drawend', feature))
}

describe('drawn analysis identity and map lifecycle', () => {
  it('assigns distinct UUID identities to two polygons and after recreating the map', () => {
    const handler = vi.fn<(area: DrawnAnalysisArea) => void>()
    const map = createMunicipalityMap(document.createElement('div'))
    map.startDrawnAnalysisArea(handler)
    endDrawing(0)
    vi.runOnlyPendingTimers()
    map.startDrawnAnalysisArea(handler)
    endDrawing(0, 200)
    vi.runOnlyPendingTimers()
    map.destroy()

    const recreated = createMunicipalityMap(document.createElement('div'))
    recreated.startDrawnAnalysisArea(handler)
    endDrawing(1, 400)
    vi.runOnlyPendingTimers()
    const ids = handler.mock.calls.map(([area]) => area.id)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
    ids.forEach((id) => expect(id).toMatch(/^drawn:[0-9a-f-]{36}$/))
    recreated.destroy()
  })

  it.each(['cancel', 'destroy', 'new drawing'] as const)('does not publish a deferred area after %s', (action) => {
    const map = createMunicipalityMap(document.createElement('div'))
    const oldHandler = vi.fn()
    map.startDrawnAnalysisArea(oldHandler)
    endDrawing(0)
    if (action === 'cancel') map.cancelDrawnAnalysisArea()
    if (action === 'destroy') map.destroy()
    if (action === 'new drawing') map.startDrawnAnalysisArea(vi.fn())
    vi.runOnlyPendingTimers()
    expect(oldHandler).not.toHaveBeenCalled()
    if (action !== 'destroy') map.destroy()
  })
})
