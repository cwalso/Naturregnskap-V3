import type { ThematicDatasetId, ThematicThemeId } from '../datasets/registry'

export interface ThematicPageContent {
  readonly id: ThematicThemeId
  readonly datasetId: ThematicDatasetId
  readonly icon: string
  readonly description: string
  readonly use: string
  readonly limitation: string
  readonly role: string
}

export const thematicPageContent: readonly ThematicPageContent[] = [
  {
    id: 'valued',
    datasetId: 'valued-nature',
    icon: '◫',
    description: 'Kartlagte og verdsatte naturtyper som supplerende innsikt.',
    use: 'Kan gi mer detaljert kunnskap om registrerte naturverdier i konkrete områder og støtte videre planfaglige vurderinger.',
    limitation: 'Datasettet er ikke heldekkende. Manglende registrering skal derfor ikke tolkes som fravær av naturverdi.',
    role: 'Supplerende temadata og analysegrunnlag. Det inngår ikke som selve regnskapsgrunnlaget uten særskilt metodisk avklaring.',
  },
  {
    id: 'protected',
    datasetId: 'protected-areas',
    icon: '◆',
    description: 'Verneområder og relevante avgrensninger.',
    use: 'Kan synliggjøre områder med formelt vern og gi viktig kontekst i arealplanlegging.',
    limitation: 'Beskriver ikke naturen utenfor verneområdene og er et tematisk supplement til naturregnskapet.',
    role: 'Supplerende temadata. Kan brukes i analyser mot arealplaner, men skal holdes adskilt fra selve regnskapsgrunnlaget.',
  },
  {
    id: 'reindeer',
    datasetId: 'wild-reindeer-areas',
    icon: '⌁',
    description: 'Villreinområder og relevante temadata.',
    use: 'Kan gi relevant arealkontekst der kommunen berører villreinområder eller funksjonsområder.',
    limitation: 'Datasettet er geografisk relevant bare for deler av landet. Null treff er ikke en generell vurdering av villreinrelevans.',
    role: 'Supplerende temadata og mulig analysegrunnlag der datasettet er geografisk relevant.',
  },
  {
    id: 'infrastructure-free',
    datasetId: 'infrastructure-free-nature',
    icon: '◎',
    description: 'Inngrepsfri natur og utvikling i relevante soner.',
    use: 'Kan gi innsikt i avstand til tyngre tekniske inngrep og utvikling i inngrepsfrie soner.',
    limitation: 'Dette er en tematisk indikator og må ikke blandes sammen med økosystemtype eller naturtilstand.',
    role: 'Supplerende temadata. Datasettet er foreløpig koblet som visualisering, ikke som beregningsgrunnlag.',
  },
]

export function getThematicPageContent(datasetId: ThematicDatasetId): ThematicPageContent {
  return thematicPageContent.find((item) => item.datasetId === datasetId) ?? thematicPageContent[0]
}
