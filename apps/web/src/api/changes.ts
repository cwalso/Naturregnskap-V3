import { accountCategoryIds } from '../features/account-overview/model'
import type { ChangesData } from '../features/changes/model'

export async function getChanges(number: string, signal?: AbortSignal): Promise<ChangesData> {
  const response = await fetch(`/api/municipalities/${number}/changes`, { signal })
  if (!response.ok) throw new Error(`Forespørselen feilet med HTTP ${response.status}`)
  const data: unknown = await response.json()
  if (!isChangesData(data)) throw new Error('Endringsdata returnerte et ugyldig svar')
  return data
}

function isLevel0(value: unknown): boolean {
  return accountCategoryIds.includes(value as typeof accountCategoryIds[number])
}

function isChangesData(value: unknown): value is ChangesData {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Record<string, unknown>
  if (typeof data.municipalityNumber !== 'string' || typeof data.municipalityName !== 'string' ||
    (data.status !== 'available' && data.status !== 'not_available') || !Array.isArray(data.transitions) ||
    !Array.isArray(data.features)) return false
  return data.transitions.every((transition) => {
    if (typeof transition !== 'object' || transition === null) return false
    const item = transition as Record<string, unknown>
    return isLevel0(item.fromLevel0) && isLevel0(item.toLevel0) && typeof item.areaM2 === 'number'
  }) && data.features.every((feature) => {
    if (typeof feature !== 'object' || feature === null) return false
    const item = feature as Record<string, unknown>
    return typeof item.changeId === 'string' && typeof item.areaM2 === 'number' &&
      typeof item.geometryCrs === 'string' && typeof item.geometry === 'object'
  })
}
