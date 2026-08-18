import type { AccountCategoryId } from './model'

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
