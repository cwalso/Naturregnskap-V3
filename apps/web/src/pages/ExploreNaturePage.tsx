import { EcosystemDistributionTable } from '../features/account-overview/EcosystemDistributionTable'
import type { EcosystemStatistics, EcosystemPageId } from '../api/ecosystemStatistics'
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
  readonly municipalityNumber?: string
  readonly statistics?: EcosystemStatistics | null
  readonly statisticsState?: 'idle' | 'loading' | 'error'
  readonly thematicCoverage?: ThematicCoverageResponse | null
  readonly thematicCoverageState?: 'idle' | 'loading' | 'error'
  readonly onOpenThemePage: (datasetId: ThematicDatasetId) => void
  readonly onOpenForestPage: () => void
  readonly onOpenEcosystemPage: (ecosystemId: EcosystemPageId) => void
  readonly onOpenUrbanNaturePage: () => void
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
  municipalityNumber,
  statistics,
  statisticsState = 'idle',
  thematicCoverage,
  thematicCoverageState = 'idle',
  onOpenThemePage,
  onOpenForestPage,
  onOpenEcosystemPage,
  onOpenUrbanNaturePage,
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

      <section className="content-page__section" aria-labelledby="current-ecosystems-title">
        <div className="section-heading">
          <span className="section-tag">Naturbeholdning</span>
          <h2 id="current-ecosystems-title">Fordeling av dagens natur etter økosystemtype</h2>
          <p>Landbasert natur i kommunen. Kilde: NIBIO, Grunnkart for arealanalyse – årsversjon 2025, økosystemtype nivå 1.</p>
        </div>
        <div className="thematic-nature-table-wrap" tabIndex={0} role="region" aria-label="Økosystemfordeling – rullbar tabell">
          <EcosystemDistributionTable statistics={statistics} state={statisticsState} municipalityNumber={municipalityNumber} />
        </div>
        <p>Dette er en foreløpig rasterbasert arealoversikt over dagens natur. Historisk nedbygging og planoverlapp vises separat. Skogsidens beholdningstall bruker arealdekke, som har en annen avgrensning enn økosystemtype.</p>
      </section>

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



      <section className="content-page__section account-themes" aria-labelledby="account-themes-title">
        <div className="section-heading">
          <span className="section-tag">Regnskapsgrunnlag</span>
          <h2 id="account-themes-title">Temasider fra regnskapsgrunnlaget</h2>
          <p>
            Skog og myr/våtmark viser naturbeholdning og utbredelse fra Grunnkart.
            Beholdningen beskriver dagens natur, adskilt fra historisk nedbygging og plananalyser.
          </p>
        </div>

        <ul className="theme-grid theme-grid--account" aria-label="Temasider i regnskapsgrunnlaget">
          <li><button
            type="button"
            className="theme-card theme-card--page theme-card--account"
            onClick={() => onOpenEcosystemPage('vatmark')}
          >
            <div className="theme-card__icon" aria-hidden="true">≈</div>
            <strong>Myr (våtmark)</strong>
            <span>Utbredelse og arealandel for våtmark basert på Grunnkart for arealanalyse.</span>
            <span className="theme-card__footer">
              <span className="status-tag">Grunnkart 2025</span>
              <span className="theme-card__open">Åpne temaside <span aria-hidden="true">→</span></span>
            </span>
          </button></li>

          <li><button
            type="button"
            className="theme-card theme-card--page theme-card--account"
            onClick={onOpenForestPage}
          >
            <div className="theme-card__icon" aria-hidden="true">♠</div>
            <strong>Skog</strong>
            <span>Skogareal, utbredelse og fordeling basert på Grunnkart for arealanalyse.</span>
            <span className="theme-card__footer">
              <span className="status-tag">Grunnkart 2025</span>
              <span className="theme-card__open">Åpne temaside <span aria-hidden="true">→</span></span>
            </span>
          </button></li>


        </ul>
      </section>

      <section className="content-page__section" aria-labelledby="themes-title">
        <div className="section-heading">
          <span className="section-tag">Supplerende innsikt</span>
          <h2 id="themes-title">Supplerende temadata</h2>
          <p>
            Hvert tema har en egen side. Der beskrives hva datasettet viser,
            geografisk dekning, status i kommunen, begrensninger og hvordan det
            kan brukes videre.
          </p>
        </div>

        <ul className="theme-grid theme-grid--pages" aria-label="Supplerende temadata">
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
              <li key={theme.id}><button
                type="button"
                className="theme-card theme-card--page"
                onClick={() => onOpenThemePage(dataset.id)}
              >
                <div className="theme-card__icon" aria-hidden="true">{theme.icon}</div>
                <strong>{dataset.title}</strong>
                <span>{theme.description}</span>
                <span className="theme-card__footer">
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
                </span>
              </button></li>
            )
          })}
        </ul>
      </section>

      <section className="content-page__section" aria-labelledby="support-themes-title">
        <div className="section-heading">
          <span className="section-tag">Analyse- og beslutningsstøtte</span>
          <h2 id="support-themes-title">Supplerende analyser og beslutningsstøtte</h2>
          <p>Bynatur og grå arealer gir supplerende innsikt om arealbruk og grønnstruktur. Kartvisningen er ikke en egen økosystemtype eller en del av det heldekkende naturregnskapet.</p>
          <p>Gråarealkartet er kartgrunnlag. Det er ikke beregnet tilgjengelige eller egnede utbyggingsarealer.</p>
        </div>
        <ul className="theme-grid" aria-label="Analyse- og beslutningsstøtte">
          <li><button
            type="button"
            className="theme-card theme-card--page theme-card--support"
            onClick={onOpenUrbanNaturePage}
          >
            <div className="theme-card__icon" aria-hidden="true">▦</div>
            <strong>Bynaturen (grå arealer)</strong>
            <span>Kartgrunnlag og supplerende innsikt om arealbruk og grønnstruktur.</span>
            <span className="theme-card__footer">
              <span className="status-tag">Analyse- og beslutningsstøtte</span>
              <span className="theme-card__open">Åpne temaside <span aria-hidden="true">→</span></span>
            </span>
          </button></li>
        </ul>
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
