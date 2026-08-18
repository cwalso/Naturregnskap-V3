export const accountCategoryIds = ['nature', 'built', 'agriculture'] as const

export type AccountCategoryId = typeof accountCategoryIds[number]

export interface AccountMetricData {
  readonly id: AccountCategoryId
  readonly areaKm2: number | null
  readonly sharePercent: number | null
  readonly status: 'available' | 'not-calculated'
}

export interface AccountOverviewData {
  readonly municipalityNumber: string
  readonly municipalityName: string
  readonly metrics: readonly AccountMetricData[]
}

export function createUncalculatedAccountOverview(
  municipalityNumber: string,
  municipalityName: string,
): AccountOverviewData {
  return {
    municipalityNumber,
    municipalityName,
    metrics: accountCategoryIds.map((id) => ({
      id,
      areaKm2: null,
      sharePercent: null,
      status: 'not-calculated',
    })),
  }
}
