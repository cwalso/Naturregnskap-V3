import type { ThematicDatasetId } from './registry'

export type V3PageId =
  | 'overview'
  | 'nature-loss'
  | 'nature'
  | 'map'

export type DatasetRole =
  | 'account-basis'
  | 'supplementary'
  | 'change-context'
  | 'visualization'

export interface PageDatasetUsage {
  readonly datasetId: string
  readonly pages: readonly V3PageId[]
  readonly role: DatasetRole
  readonly status: 'connected' | 'planned' | 'method-pending'
  readonly note: string
}

export const pageDatasetUsage: readonly PageDatasetUsage[] = [
  {
    datasetId: 'national-land-cover-analysis-2025',
    pages: ['overview', 'nature', 'map'],
    role: 'account-basis',
    status: 'connected',
    note: 'Heldekkende grunnlag. WMS brukes til kart; regnskapstall kommer fra versjonert analysegrunnlag.',
  },
  {
    datasetId: 'protected-areas' satisfies ThematicDatasetId,
    pages: ['nature', 'map'],
    role: 'supplementary',
    status: 'connected',
    note: 'Formelt vern som supplerende temadata.',
  },
  {
    datasetId: 'wild-reindeer-areas' satisfies ThematicDatasetId,
    pages: ['nature', 'map'],
    role: 'supplementary',
    status: 'connected',
    note: 'Regionalt datasett. Null treff er ikke en generell vurdering av villreinrelevans.',
  },
  {
    datasetId: 'valued-nature',
    pages: ['nature', 'map'],
    role: 'supplementary',
    status: 'planned',
    note: 'Verdsatte naturtyper kan gi viktig innsikt, men dekningsgrad må presenteres sammen med treff.',
  },
  {
    datasetId: 'infrastructure-free-nature',
    pages: ['nature', 'map'],
    role: 'supplementary',
    status: 'planned',
    note: 'INON er en tematisk indikator og ikke en egen regnskapskategori.',
  },
  {
    datasetId: 'ssb-area-use-09594',
    pages: ['overview', 'nature-loss'],
    role: 'change-context',
    status: 'method-pending',
    note: 'Kan brukes som referanse eller statistisk kontekst, men er ikke automatisk samme regnskapsgrunnlag som Grunnkart.',
  },
] as const

export function datasetsForPage(page: V3PageId): readonly PageDatasetUsage[] {
  return pageDatasetUsage.filter((usage) => usage.pages.includes(page))
}
