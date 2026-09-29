import type { ThematicDatasetId } from '../datasets/registry'

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
  municipalityNumber: string,
  signal?: AbortSignal,
): Promise<ThematicCoverageResponse> {
  const response = await fetch(
    `/api/municipalities/${municipalityNumber}/thematic-coverage`,
    { signal },
  )
  if (!response.ok) {
    throw new Error(`Temadatavurderingen feilet med HTTP ${response.status}`)
  }

  const data: unknown = await response.json()
  if (!isCoverageResponse(data)) {
    throw new Error('Temadatavurderingen returnerte et ugyldig svar')
  }
  return data
}

function isCoverageResponse(value: unknown): value is ThematicCoverageResponse {
  if (typeof value !== 'object' || value === null) return false
  if (
    !('municipalityNumber' in value)
    || typeof value.municipalityNumber !== 'string'
    || !('municipalityName' in value)
    || typeof value.municipalityName !== 'string'
    || !('methodVersion' in value)
    || value.methodVersion !== 'thematic-intersection-v1'
    || !('warnings' in value)
    || !Array.isArray(value.warnings)
    || !value.warnings.every((item) => typeof item === 'string')
    || !('results' in value)
    || !Array.isArray(value.results)
  ) return false

  return value.results.every(isEvaluation)
}

function isEvaluation(value: unknown): value is ThematicDatasetEvaluation {
  if (typeof value !== 'object' || value === null) return false
  if (
    !('datasetId' in value)
    || (value.datasetId !== 'protected-areas' && value.datasetId !== 'wild-reindeer-areas')
    || !('status' in value)
    || !['hit', 'no_hit', 'unavailable'].includes(String(value.status))
    || !('featureCount' in value)
    || !(value.featureCount === null || (typeof value.featureCount === 'number' && value.featureCount >= 0))
    || !('note' in value)
    || typeof value.note !== 'string'
  ) return false
  return true
}
