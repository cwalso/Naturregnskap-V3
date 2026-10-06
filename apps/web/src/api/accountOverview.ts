import { accountCategoryIds, type AccountOverviewData } from '../features/account-overview/model'
import { buildApiUrl } from './url'

export async function getAccountOverview(number: string, signal?: AbortSignal): Promise<AccountOverviewData> {
  const response = await fetch(buildApiUrl(`/api/municipalities/${number}/account-overview`), { signal })
  if (!response.ok) throw new Error(`Forespørselen feilet med HTTP ${response.status}`)
  const data: unknown = await response.json()
  if (!isAccountOverview(data)) throw new Error('Arealbalansen returnerte et ugyldig svar')
  return data
}

function isAccountOverview(value: unknown): value is AccountOverviewData {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Record<string, unknown>
  return typeof data.municipalityNumber === 'string' && typeof data.municipalityName === 'string' &&
    data.period === '2025' && (data.status === 'available' || data.status === 'not_available') &&
    Array.isArray(data.metrics) && data.metrics.length === 3 && data.metrics.every((metric) => {
      if (typeof metric !== 'object' || metric === null) return false
      const item = metric as Record<string, unknown>
      return accountCategoryIds.includes(item.id as typeof accountCategoryIds[number]) &&
        (typeof item.areaKm2 === 'number' || item.areaKm2 === null) && item.sharePercent === null
    })
}
