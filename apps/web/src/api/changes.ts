import { accountCategoryIds } from '../features/account-overview/model'
import type { ChangeFeaturesData, ChangesData } from '../features/changes/model'
import { buildApiUrl } from './url'

export async function getChanges(number: string, signal?: AbortSignal): Promise<ChangesData> {
  const response = await fetch(buildApiUrl(`/api/municipalities/${number}/changes`), { signal })
  if (!response.ok) throw new Error(`Forespørselen feilet med HTTP ${response.status}`)
  const data: unknown = await response.json()
  if (!isChangesData(data)) throw new Error('Endringsdata returnerte et ugyldig svar')
  return data
}

export async function getChangeFeatures(number: string, signal?: AbortSignal): Promise<ChangeFeaturesData> {
  const response = await fetch(buildApiUrl(`/api/municipalities/${number}/changes/features`), { signal })
  if (!response.ok) throw new Error(`Forespørselen feilet med HTTP ${response.status}`)
  const data: unknown = await response.json()
  if (!isChangeFeaturesData(data)) throw new Error('Endringspolygoner returnerte et ugyldig svar')
  return data
}

function isLevel0(value: unknown): boolean {
  return accountCategoryIds.includes(value as typeof accountCategoryIds[number])
}

function isStatus(value: unknown): value is 'available' | 'not_available' {
  return value === 'available' || value === 'not_available'
}

function isGenerationId(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isChangesData(value: unknown): value is ChangesData {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Record<string, unknown>

  if (
    typeof data.municipalityNumber !== 'string' ||
    typeof data.municipalityName !== 'string' ||
    !isStatus(data.status) ||
    !isGenerationId(data.generationId) ||
    !Array.isArray(data.transitions)
  ) return false

  return data.transitions.every((transition) => {
    if (typeof transition !== 'object' || transition === null) return false
    const item = transition as Record<string, unknown>
    return isLevel0(item.fromLevel0) &&
      isLevel0(item.toLevel0) &&
      typeof item.areaM2 === 'number'
  })
}

function isChangeFeaturesData(value: unknown): value is ChangeFeaturesData {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Record<string, unknown>

  if (
    typeof data.municipalityNumber !== 'string' ||
    !isStatus(data.status) ||
    !isGenerationId(data.generationId) ||
    !Array.isArray(data.features)
  ) return false

  return data.features.every((feature) => {
    if (typeof feature !== 'object' || feature === null) return false
    const item = feature as Record<string, unknown>
    return typeof item.changeId === 'string' &&
      typeof item.municipalityNumber === 'string' &&
      typeof item.areaM2 === 'number' &&
      typeof item.geometryCrs === 'string' &&
      typeof item.geometry === 'object'
  })
}
