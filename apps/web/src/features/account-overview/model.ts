export const accountCategoryIds = ['nature', 'agriculture', 'built'] as const

export type AccountCategoryId = typeof accountCategoryIds[number]

export interface AccountMetricData {
  readonly id: AccountCategoryId
  readonly areaKm2: number | null
  readonly sharePercent: number | null
}

export interface AccountOverviewData {
  readonly municipalityNumber: string
  readonly municipalityName: string
  readonly period: '2025'
  readonly status: 'available' | 'not_available'
  readonly metrics: readonly AccountMetricData[]
  readonly methodVersion?: string | null
  readonly methodStatus?: string | null
  readonly sourceVersions?: readonly string[]
  readonly warnings?: readonly string[]
}

export function createUnavailableAccountOverview(
  municipalityNumber: string,
  municipalityName: string,
): AccountOverviewData {
  return {
    municipalityNumber,
    municipalityName,
    period: '2025',
    status: 'not_available',
    metrics: accountCategoryIds.map((id) => ({
      id,
      areaKm2: null,
      sharePercent: null,
    })),
  }
}
