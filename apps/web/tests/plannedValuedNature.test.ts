import { describe, expect, it } from 'vitest'

import {
  buildValuedNatureQueryBody,
  summarizeValuedNatureFeaturesForTest,
} from '../src/map/plannedValuedNature'
import type { PlannedDevelopmentOverlayGrid } from '../src/map/plannedDevelopment'

describe('valued nature × future development', () => {
  it('queries the authoritative KU-value polygon layer in EPSG:25833', () => {
    const body = buildValuedNatureQueryBody([100, 200, 300, 400])

    expect(body.get('geometryType')).toBe('esriGeometryEnvelope')
    expect(body.get('inSR')).toBe('25833')
    expect(body.get('outSR')).toBe('25833')
    expect(body.get('spatialRel')).toBe('esriSpatialRelIntersects')
    expect(body.get('returnGeometry')).toBe('true')
    expect(body.get('outFields')).toContain('Verdikategori')
    expect(body.get('outFields')).toContain('Naturtype')

    const geometry = JSON.parse(body.get('geometry') ?? '{}')
    expect(geometry).toMatchObject({
      xmin: 100,
      ymin: 200,
      xmax: 300,
      ymax: 400,
      spatialReference: { wkid: 25833 },
    })
  })

  it('counts only valued-nature pixels inside the generic future-development mask', () => {
    const overlay: PlannedDevelopmentOverlayGrid = {
      zoom: 9,
      cx0: 0,
      cy0: 0,
      width: 4,
      height: 4,
      extent: [0, 0, 4, 4],
      cleaned: new Uint8Array(16),
      analysisMask: new Uint8Array(16).fill(1),
    }

    const summary = summarizeValuedNatureFeaturesForTest([
      {
        attributes: {
          OBJECTID: 1,
          Verdikategori: 'Svært stor verdi',
          Naturtype: 'Naturbeitemark',
        },
        geometry: {
          rings: [[
            [0, 0], [2, 0], [2, 2], [0, 2], [0, 0],
          ]],
        },
      },
      {
        attributes: {
          OBJECTID: 2,
          Verdikategori: 'Stor verdi',
          Naturtype: 'Rik edellauvskog',
        },
        geometry: {
          rings: [[
            [1, 1], [3, 1], [3, 3], [1, 3], [1, 1],
          ]],
        },
      },
    ], overlay)

    expect(summary.affectedFeatureCount).toBe(2)
    expect(summary.featurePixelTotal).toBe(8)
    expect(summary.uniquePixelCount).toBe(7)
    expect(summary.byValue.get('Svært stor verdi')).toMatchObject({
      featureCount: 1,
      pixelCount: 4,
    })
    expect(summary.byType.get('Rik edellauvskog')).toMatchObject({
      featureCount: 1,
      pixelCount: 4,
    })
    expect(summary.uniquePixelIndices).toHaveLength(7)
    expect(summary.byValue.get('Svært stor verdi')?.pixelIndices.size).toBe(4)
  })

  it('respects holes in polygon geometry', () => {
    const overlay: PlannedDevelopmentOverlayGrid = {
      zoom: 9,
      cx0: 0,
      cy0: 0,
      width: 4,
      height: 4,
      extent: [0, 0, 4, 4],
      cleaned: new Uint8Array(16),
      analysisMask: new Uint8Array(16).fill(1),
    }

    const summary = summarizeValuedNatureFeaturesForTest([
      {
        attributes: {
          Verdikategori: 'Middels verdi',
          Naturtype: 'Testnaturtype',
        },
        geometry: {
          rings: [
            [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]],
            [[1, 1], [1, 3], [3, 3], [3, 1], [1, 1]],
          ],
        },
      },
    ], overlay)

    expect(summary.featurePixelTotal).toBe(12)
    expect(summary.uniquePixelCount).toBe(12)
  })
})
