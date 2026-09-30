import type { AccountCategoryId } from './model'
import type { AccountOverviewData } from './model'

interface AccountCategoryContent {
  readonly label: string
  readonly description: string
}

export const accountCategoryContent: Record<AccountCategoryId, AccountCategoryContent> = {
  nature: {
    label: 'Natur',
    description: 'Skog, myr, ferskvann og annen natur i det overordnede regnskapsgrunnlaget.',
  },
  built: {
    label: 'Bebygd',
    description: 'Bebygd og opparbeidet areal i det overordnede regnskapsgrunnlaget.',
  },
  agriculture: {
    label: 'Jordbruk',
    description: 'Dyrket mark og grasmark i det overordnede regnskapsgrunnlaget.',
  },
}

export interface AccountProvenanceContent {
  readonly sourceName: string
  readonly referenceVersion: string
  readonly methodVersion?: string
  readonly sourceSha256?: string
  readonly sourceFormat?: string
  readonly sourceFeatureCount?: number
  readonly areaMethod?: string
  readonly classifiedAreaKm2?: number
  readonly excludedAreaKm2?: number
  readonly warnings: readonly string[]
}

export function getAccountProvenanceContent(data: AccountOverviewData): AccountProvenanceContent {
  return {
    sourceName: 'Grunnkart for arealanalyse',
    referenceVersion: data.sourceVersions?.[0] ?? data.period,
    methodVersion: data.methodVersion ?? undefined,
    sourceSha256: data.sourceSha256 ?? undefined,
    sourceFormat: data.sourceFormat ?? undefined,
    sourceFeatureCount: data.sourceFeatureCount ?? undefined,
    areaMethod: data.areaMethod ?? undefined,
    classifiedAreaKm2: data.classifiedAreaKm2 ?? undefined,
    excludedAreaKm2: data.excludedAreaKm2 ?? undefined,
    warnings: data.warnings ?? [],
  }
}
