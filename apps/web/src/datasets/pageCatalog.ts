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
    status: 'connected',
    note: 'Verdsatte naturtyper er koblet til kart og kommunespesifikk treffvurdering. Dekningsgrad må presenteres sammen med treff.',
  },
  {
    datasetId: 'infrastructure-free-nature',
    pages: ['nature', 'map'],
    role: 'supplementary',
    status: 'connected',
    note: 'INON er koblet til som kartlag og tematisk indikator. Kommuneanalyse kommer senere og er ikke en regnskapskategori.',
  },
] as const

export function datasetsForPage(page: V3PageId): readonly PageDatasetUsage[] {
  return pageDatasetUsage.filter((usage) => usage.pages.includes(page))
}
