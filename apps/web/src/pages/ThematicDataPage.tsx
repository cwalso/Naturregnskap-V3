import type {
  ThematicCoverageResponse,
  ThematicDatasetEvaluation,
} from '../api/thematicCoverage'
import {
  thematicDatasets,
  type ThematicDatasetId,
} from '../datasets/registry'
import { getThematicPageContent } from './thematicContent'

interface ThematicDataPageProps {
  readonly datasetId: ThematicDatasetId
  readonly municipalityName?: string
  readonly thematicCoverage?: ThematicCoverageResponse | null
  readonly thematicCoverageState?: 'idle' | 'loading' | 'error'
  readonly onBack: () => void
  readonly onOpenFutureDevelopmentAnalysis?: () => void
}

function evaluationText(
  evaluation: ThematicDatasetEvaluation | undefined,
  state: 'idle' | 'loading' | 'error',
  municipalityName?: string,
): string {
  if (!municipalityName) return 'Velg kommune for å vurdere registrerte treff.'
  if (state === 'loading') return 'Vurderer registrerte treff mot kommunegrensen…'
  if (state === 'error') return 'Treffstatus kunne ikke hentes nå. Dette skal ikke tolkes som at kommunen mangler registrerte objekter.'
  if (!evaluation) return 'Treffstatus er foreløpig ikke tilgjengelig.'
  if (evaluation.status === 'hit') {
    const count = evaluation.featureCount
    return count === 1
      ? `1 registrert lokalitet i ${municipalityName}. ${evaluation.note}`
      : `${count ?? 'Flere'} registrerte objekter i ${municipalityName}. ${evaluation.note}`
  }
  if (evaluation.status === 'no_hit') {
    return `Ingen registrerte treff i ${municipalityName}. ${evaluation.note}`
  }
  return `Treffstatus kunne ikke vurderes nå. ${evaluation.note}`
}

export function ThematicDataPage({
  datasetId,
  municipalityName,
  thematicCoverage,
  thematicCoverageState = 'idle',
  onBack,
  onOpenFutureDevelopmentAnalysis,
}: ThematicDataPageProps) {
  const dataset = thematicDatasets.find((item) => item.id === datasetId)
  if (!dataset) return null

  const content = getThematicPageContent(datasetId)
  const evaluation = thematicCoverage?.results.find((item) => item.datasetId === dataset.id)
  const status = dataset.sourceStatus === 'visual-only'
    ? 'Kartlaget er koblet som visualisering. Kommunevis treffstatus beregnes ikke i denne versjonen.'
    : evaluationText(evaluation, thematicCoverageState, municipalityName)

  return (
    <section className="content-page thematic-page" aria-labelledby="thematic-page-title">
      <button type="button" className="thematic-page__back" onClick={onBack}>
        <span aria-hidden="true">←</span> Tilbake til naturtema
      </button>

      <header className="content-page__intro thematic-page__intro">
        <p className="content-page__eyebrow">Supplerende temadata</p>
        <div className="thematic-page__title-row">
          <span className="theme-card__icon" aria-hidden="true">{content.icon}</span>
          <h1 id="thematic-page-title">{dataset.title}</h1>
        </div>
        <p>{content.description}</p>
      </header>

      <div className="thematic-page__grid">
        <section className="thematic-page__main" aria-labelledby="thematic-use-title">
          <span className="section-tag">Bruk og rolle</span>
          <h2 id="thematic-use-title">Hva kan dette bidra med?</h2>
          <p>{content.use}</p>

          <div className="thematic-page__notice">
            <strong>Viktig avgrensning</strong>
            <p>{content.limitation}</p>
          </div>

          <h2>Rolle i kommunalt naturregnskap</h2>
          <p>{content.role}</p>
        </section>

        <aside className="thematic-page__status" aria-labelledby="thematic-status-title">
          <p className="map-sidebar__eyebrow">Status i kommunen</p>
          <h2 id="thematic-status-title">
            {municipalityName ? dataset.title + ' i ' + municipalityName : dataset.title}
          </h2>
          <p>{status}</p>
          <dl>
            <div>
              <dt>Dekning</dt>
              <dd>{dataset.coverage.label}</dd>
            </div>
            <div>
              <dt>Versjon</dt>
              <dd>{dataset.version}</dd>
            </div>
            <div>
              <dt>Utgiver</dt>
              <dd>{dataset.publisher}</dd>
            </div>
          </dl>
        </aside>
      </div>

      {dataset.id === 'valued-nature' && onOpenFutureDevelopmentAnalysis && municipalityName && (
        <section className="thematic-page__analysis" aria-labelledby="thematic-analysis-title">
          <p className="content-page__eyebrow">Analyse</p>
          <h2 id="thematic-analysis-title">Hva overlapper framtidige utbyggingsområder?</h2>
          <p>
            Kryss registrerte verdsatte naturtyper mot kommuneplanområder satt av til
            framtidig utbygging. Resultatet viser berørte lokaliteter, areal,
            verdikategori og naturtype.
          </p>
          <button type="button" onClick={onOpenFutureDevelopmentAnalysis}>
            Åpne analyse <span aria-hidden="true">→</span>
          </button>
        </section>
      )}

      <section className="thematic-page__source" aria-labelledby="thematic-source-title">
        <h2 id="thematic-source-title">Kilde og metadata</h2>
        <p>
          {dataset.attribution}. {dataset.coverage.note}
        </p>
        <a href={dataset.metadataUrl} target="_blank" rel="noreferrer">
          Se metadata hos Miljødirektoratet
        </a>
      </section>
    </section>
  )
}
