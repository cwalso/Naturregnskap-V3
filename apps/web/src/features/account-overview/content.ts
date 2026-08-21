import type { AccountCategoryId } from './model'
import type { AccountOverviewData } from './model'

interface AccountCategoryContent {
  readonly label: string
  readonly description: string
}

export const accountCategoryContent: Record<AccountCategoryId, AccountCategoryContent> = {
  nature: {
    label: 'Natur',
    description: 'Areal som i regnskapsgrunnlaget er klassifisert som natur.',
  },
  built: {
    label: 'Bebygd',
    description: 'Areal som i regnskapsgrunnlaget er klassifisert som bebygd og opparbeidet.',
  },
  agriculture: {
    label: 'Jordbruk',
    description: 'Areal som i regnskapsgrunnlaget er klassifisert som jordbruk.',
  },
}

export interface AccountProvenanceContent {
  readonly sourceName: string
  readonly referenceVersion: string
  readonly methodVersion?: string
}

export function getAccountProvenanceContent(data: AccountOverviewData): AccountProvenanceContent {
  return {
    sourceName: 'Grunnkart for arealanalyse',
    referenceVersion: data.sourceVersions?.[0] ?? data.period,
    methodVersion: data.methodVersion ?? undefined,
  }
}
