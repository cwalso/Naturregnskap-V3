import type { AccountCategoryId } from './model'
import type { AccountOverviewData } from './model'

interface AccountCategoryContent {
  readonly label: string
  readonly description: string
}

export const accountCategoryContent: Record<AccountCategoryId, AccountCategoryContent> = {
  nature: {
    label: 'Natur',
    description: 'Skog, myr og andre natur- og utmarksarealer i den overordnede grupperingen.',
  },
  built: {
    label: 'Bebygd og opparbeidet areal',
    description: 'Bebygd og opparbeidet areal i den overordnede grupperingen.',
  },
  agriculture: {
    label: 'Fulldyrka jord',
    description: 'Dyrket mark og grasmark i den overordnede grupperingen.',
  },
}

export interface AccountProvenanceContent {
  readonly sourceName: string
  readonly referenceVersion: string
  readonly methodVersion?: string
  readonly methodDescription: string
  readonly coverageDescription: string
  readonly limitations: string
}

export function getAccountProvenanceContent(data: AccountOverviewData): AccountProvenanceContent {
  if (data.sourceKind === 'ssb-prototype') {
    return {
      sourceName: data.sourceName ?? 'SSB tabell 09594',
      referenceVersion: data.sourceVersions?.[0] ?? data.period,
      methodVersion: data.methodVersion ?? undefined,
      methodDescription: 'SSBs arealklasser er gruppert i Natur, Dyrket mark og Bebygd etter samme prototypegruppering som brukes i den tekniske demonstratoren.',
      coverageDescription: 'Tallene er aggregert kommunestatistikk fra SSB og brukes her for å gjøre brukerflaten testbar med reelle tall.',
      limitations: 'Ferskvann er holdt utenfor de tre hovedkategoriene i denne grupperingen. Tallene er ikke det endelige Grunnkart-baserte regnskapsgrunnlaget.',
    }
  }

  return {
    sourceName: data.sourceName ?? 'Grunnkart for arealanalyse',
    referenceVersion: data.sourceVersions?.[0] ?? data.period,
    methodVersion: data.methodVersion ?? undefined,
    methodDescription: 'Arealene er klassifisert etter metoden som brukes i kommunale naturregnskap.',
    coverageDescription: 'Regnskapsgrunnlaget er heldekkende innenfor den geografiske avgrensningen som inngår i beregningen.',
    limitations: 'Regnskapet viser arealutbredelse på et overordnet nivå. Det beskriver ikke i seg selv naturtilstand eller alle naturverdier.',
  }
}
