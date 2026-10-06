import {
  accountCategoryIds,
  createUnavailableAccountOverview,
  type AccountOverviewData,
} from '../features/account-overview/model'

const ACCOUNT_PERIOD = '2025'
const ACCOUNT_DATA_BASE = `${import.meta.env.BASE_URL}data/account-overview/${ACCOUNT_PERIOD}`

interface AccountIndex {
  readonly period: '2025'
  readonly municipalities: readonly string[]
}

export async function getAccountOverview(
  number: string,
  name: string,
  signal?: AbortSignal,
): Promise<AccountOverviewData> {
  const indexResponse = await fetch(`${ACCOUNT_DATA_BASE}/index.json`, { signal })
  if (!indexResponse.ok) {
    throw new Error(`Kunne ikke lese publiseringsindeksen, HTTP ${indexResponse.status}`)
  }

  const index: unknown = await indexResponse.json()
  if (!isAccountIndex(index)) {
    throw new Error('Publiseringsindeksen for arealbalansen er ugyldig')
  }

  if (!index.municipalities.includes(number)) {
    return createUnavailableAccountOverview(number, name)
  }

  const response = await fetch(`${ACCOUNT_DATA_BASE}/${number}.json`, { signal })
  if (!response.ok) {
    throw new Error(`Forespørselen feilet med HTTP ${response.status}`)
  }

  const data: unknown = await response.json()
  if (!isAccountOverview(data) || data.municipalityNumber !== number) {
    throw new Error('Arealbalansen returnerte et ugyldig svar')
  }
  return data
}

function isAccountIndex(value: unknown): value is AccountIndex {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Record<string, unknown>
  return data.period === ACCOUNT_PERIOD
    && Array.isArray(data.municipalities)
    && data.municipalities.every((item) => typeof item === 'string')
}

function isAccountOverview(value: unknown): value is AccountOverviewData {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Record<string, unknown>
  return typeof data.municipalityNumber === 'string' && typeof data.municipalityName === 'string' &&
    data.period === ACCOUNT_PERIOD && (data.status === 'available' || data.status === 'not_available') &&
    Array.isArray(data.metrics) && data.metrics.length === 3 && data.metrics.every((metric) => {
      if (typeof metric !== 'object' || metric === null) return false
      const item = metric as Record<string, unknown>
      return accountCategoryIds.includes(item.id as typeof accountCategoryIds[number]) &&
        (typeof item.areaKm2 === 'number' || item.areaKm2 === null) && item.sharePercent === null
    })
}
