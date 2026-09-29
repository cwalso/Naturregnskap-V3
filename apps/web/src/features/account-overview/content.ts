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
    label: 'Dyrket mark',
    description: 'Areal som i det overordnede regnskapsgrunnlaget er klassifisert som dyrket mark.',
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
