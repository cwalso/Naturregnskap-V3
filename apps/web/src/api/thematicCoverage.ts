import {
  thematicDatasets,
  type ThematicDatasetDefinition,
  type ThematicDatasetId,
} from '../datasets/registry'
import type { MunicipalityBoundary } from './municipalities'

export type ThematicEvaluationStatus = 'hit' | 'no_hit' | 'unavailable'

export interface ThematicDatasetEvaluation {
  readonly datasetId: ThematicDatasetId
  readonly status: ThematicEvaluationStatus
  readonly featureCount: number | null
  readonly note: string
}

export interface ThematicCoverageResponse {
  readonly municipalityNumber: string
  readonly municipalityName: string
  readonly methodVersion: 'thematic-intersection-v1'
  readonly warnings: readonly string[]
  readonly results: readonly ThematicDatasetEvaluation[]
}

export async function getThematicCoverage(
  boundary: MunicipalityBoundary,
  signal?: AbortSignal,
): Promise<ThematicCoverageResponse> {
  const requests: Promise<ThematicDatasetEvaluation>[] = []

  for (const dataset of thematicDatasets) {
    if (dataset.analysisSource !== null) {
      requests.push(evaluateDataset(dataset, boundary, signal))
    }
  }

  return {
    municipalityNumber: boundary.properties.number,
    municipalityName: boundary.properties.name,
    methodVersion: 'thematic-intersection-v1',
    warnings: [
      'Treffstatus er beregnet mot løpende kildetjenester som ikke er låst til en dataversjon i prototypen.',
    ],
    results: await Promise.all(requests),
  }
}

async function evaluateDataset(
  dataset: ThematicDatasetDefinition,
  boundary: MunicipalityBoundary,
  signal?: AbortSignal,
): Promise<ThematicDatasetEvaluation> {
  const source = dataset.analysisSource
  if (source === null) {
    throw new Error('Datasettet har ikke analysegrunnlag')
  }

  try {
    const featureCount = await countIntersections(source.queryUrl, boundary, signal)
    if (featureCount > 0) {
      return {
        datasetId: dataset.id,
        status: 'hit',
        featureCount,
        note: 'Ett eller flere registrerte objekter i kilden krysser kommunegrensen.',
      }
    }

    return {
      datasetId: dataset.id,
      status: 'no_hit',
      featureCount: 0,
      note: noHitNote(dataset),
    }
  } catch {
    return {
      datasetId: dataset.id,
      status: 'unavailable',
      featureCount: null,
      note: 'Temadatatjenesten kunne ikke evalueres nå. Dette skal ikke tolkes som manglende treff.',
    }
  }
}

async function countIntersections(
  queryUrl: string,
  boundary: MunicipalityBoundary,
  signal?: AbortSignal,
): Promise<number> {
  const body = new URLSearchParams({
    f: 'json',
    where: '1=1',
    geometry: JSON.stringify(toEsriPolygon(boundary.geometry)),
    geometryType: 'esriGeometryPolygon',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    returnCountOnly: 'true',
  })

  const response = await fetch(queryUrl, {
    method: 'POST',
    body,
    signal,
  })
  if (!response.ok) {
    throw new Error(`Temadatatjenesten feilet med HTTP ${response.status}`)
  }

  const data: unknown = await response.json()
  if (typeof data !== 'object' || data === null || !('count' in data)) {
    throw new Error('Temadatatjenesten returnerte et ugyldig svar')
  }

  const count = Number(data.count)
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('Temadatatjenesten returnerte et ugyldig antall')
  }
  return count
}

function noHitNote(dataset: ThematicDatasetDefinition): string {
  if (dataset.coverage.scope === 'regional') {
    return 'Spørringen fant ingen registrerte objekter som krysser kommunegrensen. Datasettet har regional dekning, så statusen skal ikke tolkes som en generell vurdering av temaet.'
  }
  if (dataset.coverage.scope === 'partial') {
    return 'Spørringen fant ingen registrerte lokaliteter som krysser kommunegrensen. Datasettet er ikke heldekkende, så dette skal ikke tolkes som fravær av naturverdi.'
  }
  return 'Spørringen fant ingen registrerte objekter i kilden som krysser kommunegrensen.'
}

function toEsriPolygon(
  geometry: MunicipalityBoundary['geometry'],
): { rings: number[][][]; spatialReference: { wkid: 4326 } } {
  const polygons = geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.coordinates

  const rings: number[][][] = []
  for (const polygon of polygons) {
    if (!Array.isArray(polygon)) {
      throw new Error('Kommunegeometrien inneholder ugyldige polygoner')
    }

    polygon.forEach((ring, index) => {
      rings.push(normalizeRing(ring, index === 0))
    })
  }

  if (rings.length === 0) {
    throw new Error('Kommunegeometrien mangler ringer')
  }

  return {
    rings,
    spatialReference: { wkid: 4326 },
  }
}

function normalizeRing(value: unknown, clockwise: boolean): number[][] {
  if (!Array.isArray(value)) {
    throw new Error('Ugyldig ring i kommunegeometrien')
  }

  const points = value.map((point) => {
    if (
      !Array.isArray(point)
      || point.length < 2
      || typeof point[0] !== 'number'
      || typeof point[1] !== 'number'
    ) {
      throw new Error('Ugyldig punkt i kommunegeometrien')
    }
    return [point[0], point[1]]
  })

  if (points.length < 3) {
    throw new Error('For få punkter i kommunegeometrien')
  }
  if (points[0][0] !== points.at(-1)?.[0] || points[0][1] !== points.at(-1)?.[1]) {
    points.push([...points[0]])
  }

  const signedArea = points.slice(0, -1).reduce((area, point, index) => {
    const next = points[index + 1]
    return area + point[0] * next[1] - next[0] * point[1]
  }, 0) / 2

  if ((signedArea < 0) !== clockwise) {
    points.reverse()
  }
  return points
}
