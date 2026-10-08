import { describe, expect, it } from 'vitest'

import {
  buildValuedNatureMapOverlay,
  buildValuedNatureQueryBody,
  summarizeValuedNatureFeaturesForTest,
  type PlannedValuedNatureAnalysis,
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
    expect(body.get('where')).toBe("Verdikategori IN ('Svært stor verdi','Stor verdi','Middels verdi','Noe verdi')")

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
      kind: 'planned',
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
    expect(summary.byValue.get('Stor verdi')?.pixelIndices.size).toBe(3)
    expect(summary.byValue.get('Stor verdi')?.pixelCount).toBe(3)
  })

  it('excludes other categories and unknown values and gives the highest value every overlapping cell', () => {
    const overlay: PlannedDevelopmentOverlayGrid = { kind: 'drawn', zoom: 9, cx0: 0, cy0: 0, width: 2, height: 2, extent: [0, 0, 2, 2], cleaned: new Uint8Array(4), analysisMask: new Uint8Array(4).fill(1) }
    const geometry = { rings: [[[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]] as [number, number][][] }
    const summary = summarizeValuedNatureFeaturesForTest(['Noe verdi', 'Ikke gitt verdi', 'Stor verdi', 'Svært stor verdi', 'Middels verdi', 'Vurderes per lokalitet'].map((value, id) => ({ attributes: { OBJECTID: id, Verdikategori: value, Naturtype: 'Samme type' }, geometry })), overlay)
    expect(summary.affectedFeatureCount).toBe(4)
    expect(summary.uniquePixelCount).toBe(4)
    expect(summary.featurePixelTotal).toBe(16)
    expect(summary.byValue.get('Svært stor verdi')?.pixelCount).toBe(4)
    for (const category of ['Stor verdi', 'Middels verdi', 'Noe verdi']) {
      expect(summary.byValue.get(category)).toMatchObject({ pixelCount: 0, featureCount: 1 })
    }
    expect([...summary.byValue.values()].reduce((sum, metric) => sum + metric.pixelCount, 0)).toBe(summary.uniquePixelCount)
    expect(summary.byType.get('Samme type')?.pixelCount).toBe(16)
    expect(summary.localities).toHaveLength(4)
  })

  it('respects holes in polygon geometry', () => {
    const overlay: PlannedDevelopmentOverlayGrid = {
      kind: 'planned',
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
  it('builds a filtered map mask for a selected value category', () => {
    const overlay: PlannedDevelopmentOverlayGrid = {
      kind: 'planned',
      zoom: 9,
      cx0: 0,
      cy0: 0,
      width: 4,
      height: 4,
      extent: [0, 0, 4, 4],
      cleaned: new Uint8Array(16),
      analysisMask: new Uint8Array(16).fill(1),
    }

    const analysis = {
      municipalityNumber: '5001',
      analysisId: 'planned:5001',
      status: 'available',
      source: 'Miljødirektoratet – naturtyper med KU-verdi',
      methodVersion: 'planned-valued-nature-v2',
      pixelMeters: 21,
      candidateFeatureCount: 2,
      affectedFeatureCount: 2,
      uniqueOverlapAreaKm2: 0.01,
      registeredOverlapAreaKm2: 0.01,
      hasOverlappingRegistrations: false,
      allOverlapPixelIndices: Uint32Array.from([1, 2, 5, 6]),
      valueMetrics: [{
        label: 'Svært stor verdi',
        color: '#AF0C0C',
        featureCount: 1,
        areaKm2: 0.005,
        sharePercent: 50,
        mapPixelIndices: Uint32Array.from([1, 5]),
      }],
      typeMetrics: [], localities: [],
    } satisfies PlannedValuedNatureAnalysis

    const result = buildValuedNatureMapOverlay(
      analysis,
      overlay,
      { kind: 'value', label: 'Svært stor verdi' },
    )

    expect(result?.fillColor).toBe('#AF0C0C')
    expect(result?.mask[1]).toBe(1)
    expect(result?.mask[5]).toBe(1)
    expect(result?.mask[2]).toBe(0)
  })

})
