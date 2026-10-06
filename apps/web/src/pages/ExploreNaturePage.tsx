import type {
  ThematicCoverageResponse,
  ThematicDatasetEvaluation,
} from '../api/thematicCoverage'
import {
  thematicDatasets,
  type ThematicDatasetId,
} from '../datasets/registry'
import { thematicPageContent } from './thematicContent'

interface ExploreNaturePageProps {
  readonly municipalityName?: string
  readonly thematicCoverage?: ThematicCoverageResponse | null
  readonly thematicCoverageState?: 'idle' | 'loading' | 'error'
  readonly onOpenThemePage: (datasetId: ThematicDatasetId) => void
}

function evaluationLabel(
  evaluation: ThematicDatasetEvaluation | undefined,
  state: 'idle' | 'loading' | 'error',
): string {
  if (state === 'loading') return 'Vurderer…'
  if (state === 'error') return 'Kunne ikke vurderes'
  if (!evaluation) return 'Koblet til'
  if (evaluation.status === 'hit') return 'Treff i kommunen'
  if (evaluation.status === 'no_hit') return 'Ingen registrerte treff'
  return 'Kunne ikke vurderes'
}

export function ExploreNaturePage({
  municipalityName,
  thematicCoverage,
  thematicCoverageState = 'idle',
  onOpenThemePage,
}: ExploreNaturePageProps) {
  const place = municipalityName ? ` i ${municipalityName}` : ''

  return (
    <section className="content-page" aria-labelledby="explore-nature-title">
      <header className="content-page__intro">
        <p className="content-page__eyebrow">Naturregnskap / Dagens natur</p>
        <h1 id="explore-nature-title">Hva slags natur har vi{place}?</h1>
        <p>
          Start med det heldekkende regnskapsgrunnlaget. Gå deretter inn på egne
          temasider for supplerende naturdata, dekning, kilde og bruk i analyser.
        </p>
      </header>

      <section className="nature-basis" aria-labelledby="account-basis-title">
        <div className="nature-basis__main">
          <span className="section-tag">Regnskapsgrunnlag</span>
          <h2 id="account-basis-title">Heldekkende informasjon om dagens natur</h2>
          <p>
            Første versjon bygger på et felles, heldekkende og etterprøvbart
            arealgrunnlag. Supplerende temadata holdes adskilt fra dette grunnlaget.
          </p>
        </div>
        <aside className="nature-basis__status">
          <span className="status-tag">Grunnkart</span>
          <strong>Felles arealgrunnlag</strong>
          <p>
            Grunnkart for arealanalyse er det sentrale heldekkende grunnlaget i
            første versjon.
          </p>
        </aside>
      </section>

      <section className="content-page__section" aria-labelledby="themes-title">
        <div className="section-heading">
          <span className="section-tag">Supplerende innsikt</span>
          <h2 id="themes-title">Naturtema</h2>
          <p>
            Hvert tema har en egen side. Der beskrives hva datasettet viser,
            geografisk dekning, status i kommunen, begrensninger og hvordan det
            kan brukes videre.
          </p>
        </div>

        <div className="theme-grid theme-grid--pages" role="list" aria-label="Naturtema">
          {thematicPageContent.map((theme) => {
            const dataset = thematicDatasets.find((item) => item.id === theme.datasetId)
            if (!dataset) return null
            const evaluation = thematicCoverage?.results.find(
              (item) => item.datasetId === dataset.id,
            )
            const statusLabel = dataset.sourceStatus === 'visual-only'
              ? 'Kartlag tilgjengelig'
              : evaluationLabel(
                  evaluation,
                  municipalityName ? thematicCoverageState : 'idle',
                )

            return (
              <button
                type="button"
                className="theme-card theme-card--page"
                key={theme.id}
                onClick={() => onOpenThemePage(dataset.id)}
              >
                <div className="theme-card__icon" aria-hidden="true">{theme.icon}</div>
                <strong>{dataset.title}</strong>
                <span>{theme.description}</span>
                <span
                  className={
                    evaluation?.status === 'hit'
                      ? 'status-tag'
                      : 'status-tag status-tag--muted'
                  }
                >
                  {statusLabel}
                </span>
                <span className="theme-card__open">
                  Åpne temaside <span aria-hidden="true">→</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="classification-note" aria-labelledby="classification-title">
        <div>
          <p className="classification-note__label">Metodisk kobling</p>
          <h2 id="classification-title">Grunnkart og temadata har ulike roller</h2>
        </div>
        <p>
          Supplerende temadata kan gi viktig innsikt og brukes i analyser, men
          bør ikke blandes sammen med selve regnskapsgrunnlaget uten metodisk
          avklaring. Dekning, versjon og usikkerhet må være synlig.
        </p>
      </section>
    </section>
  )
}
