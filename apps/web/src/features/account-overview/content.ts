import type { AccountCategoryId } from './model'

interface AccountCategoryContent {
  readonly label: string
  readonly description: string
}

export const accountCategoryContent: Record<AccountCategoryId, AccountCategoryContent> = {
  nature: {
    label: 'Natur',
    description: 'Areal som inngår i den overordnede kategorien natur.',
  },
  built: {
    label: 'Bebygd',
    description: 'Areal som inngår i den overordnede kategorien bebygd.',
  },
  agriculture: {
    label: 'Jordbruk',
    description: 'Areal som inngår i den overordnede kategorien jordbruk.',
  },
}
