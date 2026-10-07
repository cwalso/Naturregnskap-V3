import type { ReactNode } from 'react'

import type {
  ThematicCoverageResponse,
  ThematicDatasetEvaluation,
} from '../api/thematicCoverage'
import type {
  PlannedCoverageGap,
  ValuedNatureStatistics,
} from '../api/valuedNatureStatistics'
import type { PlannedValuedNatureAnalysis } from '../map/plannedValuedNature'
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
  readonly valuedNatureStatistics?: ValuedNatureStatistics | null
  readonly valuedNatureStatisticsState?: 'idle' | 'loading' | 'error'
  readonly plannedValuedNature?: PlannedValuedNatureAnalysis | null
  readonly plannedValuedNatureState?: 'idle' | 'loading' | 'error'
  readonly plannedCoverageGap?: PlannedCoverageGap | null
  readonly plannedCoverageGapState?: 'idle' | 'loading' | 'error'
  readonly onBack: () => void
  readonly onOpenFutureDevelopmentAnalysis?: () => void
  readonly mapContent?: ReactNode
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

const areaFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })
const percentFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })

function dekar(areaKm2: number): string {
  return `${areaFormatter.format(areaKm2 * 1000)} dekar`
}

function percent(value: number): string {
  return `${percentFormatter.format(value)} %`
}

function loadingValue(state: 'idle' | 'loading' | 'error', fallback = '–'): string {
  if (state === 'loading') return '…'
  if (state === 'error') return 'Ikke tilgjengelig'
  return fallback
}

function TreeIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 6v34M24 12 15 21h6l-9 9h9l-7 8h20l-7-8h9l-9-9h6Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ValuedNaturePage({
  municipalityName,
  evaluation,
  statistics,
  statisticsState,
  plannedValuedNature,
  plannedValuedNatureState,
  plannedCoverageGap,
  plannedCoverageGapState,
  onBack,
  onOpenFutureDevelopmentAnalysis,
  mapContent,
}: {
  readonly municipalityName?: string
  readonly evaluation?: ThematicDatasetEvaluation
  readonly statistics?: ValuedNatureStatistics | null
  readonly statisticsState: 'idle' | 'loading' | 'error'
  readonly plannedValuedNature?: PlannedValuedNatureAnalysis | null
  readonly plannedValuedNatureState: 'idle' | 'loading' | 'error'
  readonly plannedCoverageGap?: PlannedCoverageGap | null
  readonly plannedCoverageGapState: 'idle' | 'loading' | 'error'
  readonly onBack: () => void
  readonly onOpenFutureDevelopmentAnalysis?: () => void
  readonly mapContent?: ReactNode
}) {
  const featureCount = statistics?.featureCount
    ?? (evaluation?.status === 'hit' ? evaluation.featureCount : null)
  const municipality = municipalityName ?? 'kommunen'
  const topNatureTypes = statistics?.typeMetrics.slice(0, 12) ?? []

  return (
    <section className="content-page thematic-page thematic-page--editorial" aria-labelledby="thematic-page-title">
      <nav className="thematic-breadcrumb" aria-label="Brødsmuler">
        <button type="button" onClick={onBack}>Kommuneoversikt</button>
        <span aria-hidden="true">›</span>
        <span>Verdsatte naturtyper</span>
      </nav>

      <header className="thematic-hero">
        <div className="thematic-hero__content">
          <div className="thematic-hero__title-row">
            <span className="thematic-hero__icon"><TreeIcon /></span>
            <h1 id="thematic-page-title">Verdsatte naturtyper</h1>
          </div>
          <p className="thematic-hero__lead">
            Verdsatte naturtyper er registrerte naturtypelokaliteter som er kartlagt
            og vurdert etter Miljødirektoratets instruks. De kan gi viktig kunnskap
            om naturverdier i konkrete områder.
          </p>

          <div className="thematic-questions">
            <details>
              <summary>Hvilke naturtyper er verdsatte?</summary>
              <p>
                Datasettet viser registrerte naturtypelokaliteter som er gitt en
                KU-verdi. Verdisettingen brukes som supplerende innsikt og er ikke
                et heldekkende naturregnskap.
              </p>
            </details>
            <details>
              <summary>Hvordan kartlegges naturtypene?</summary>
              <p>
                Lokalitetene kommer fra Miljødirektoratets løpende karttjeneste.
                Metode, registreringsår og dekning kan variere mellom områder.
              </p>
            </details>
            <details>
              <summary>Datagrunnlaget bak verdsatte naturtyper</summary>
              <p>
                Kilden er Miljødirektoratets datasett for naturtyper med KU-verdi.
                Manglende registrering betyr ikke nødvendigvis at naturverdier mangler.
              </p>
            </details>
          </div>
        </div>

        <div className="thematic-hero__image thematic-hero__image--valued" role="img" aria-label="Illustrasjon av kyst- og lyngnatur">
          <span aria-hidden="true" />
        </div>
      </header>

      <section className="thematic-kpis" aria-label="Nøkkeltall for verdsatte naturtyper">
        <article>
          <span>Andel av kommunen kartlagt</span>
          <strong>
            {statistics
              ? percent(statistics.mappedCoveragePercent)
              : loadingValue(statisticsState)}
          </strong>
          <small>
            {statistics
              ? `Omtrent ${dekar(statistics.mappedCoverageKm2)} kartlagt etter Miljødirektoratets instruks`
              : 'Beregnes fra dekningskartet for naturtypekartlegging.'}
          </small>
        </article>
        <article>
          <span>Kartlagte verdsatte naturtyper</span>
          <strong>
            {statistics
              ? dekar(statistics.registeredAreaKm2)
              : loadingValue(statisticsState)}
          </strong>
          <small>
            {featureCount === null || featureCount === undefined
              ? 'Antall lokaliteter er ikke tilgjengelig.'
              : `${areaFormatter.format(featureCount)} registrerte lokaliteter`}
          </small>
        </article>
      </section>

      <section className="thematic-plan-cards" aria-label="Framtidig utbygging">
        <article>
          <strong>Verdsatte naturtyper i områder satt av til framtidig utbygging</strong>
          <span className="thematic-plan-cards__value">
            {plannedValuedNature
              ? dekar(plannedValuedNature.uniqueOverlapAreaKm2)
              : loadingValue(plannedValuedNatureState)}
          </span>
          <span>
            {plannedValuedNature
              ? `${areaFormatter.format(plannedValuedNature.affectedFeatureCount)} registrerte lokaliteter berøres i prototypeanalysen.`
              : 'Overlapp beregnes mot arealer satt av til framtidig utbygging.'}
          </span>
          {onOpenFutureDevelopmentAnalysis && municipalityName && (
            <button type="button" onClick={onOpenFutureDevelopmentAnalysis}>
              Åpne analyse i kart <span aria-hidden="true">→</span>
            </button>
          )}
        </article>
        <article>
          <strong>Ikke-kartlagte områder som er satt av til framtidig utbygging</strong>
          <span className="thematic-plan-cards__value">
            {plannedCoverageGap
              ? dekar(plannedCoverageGap.unmappedPlannedAreaKm2)
              : loadingValue(plannedCoverageGapState)}
          </span>
          <span>
            {plannedCoverageGap
              ? `${percent(plannedCoverageGap.mappedSharePercent)} av utbyggingsarealet ligger innenfor dekningskartet.`
              : 'Beregnes mot dekningskartet for naturtypekartlegging.'}
          </span>
        </article>
      </section>

      <details className="thematic-source-accordion">
        <summary>Hvor er tallene hentet fra?</summary>
        <p>
          Statistikken hentes fra Miljødirektoratets løpende tjenester for
          Naturtyper – verdsatte og dekningskartet for naturtyper etter
          Miljødirektoratets instruks. Datasettet er ikke heldekkende.
        </p>
      </details>

      <aside className="thematic-warning">
        <span className="thematic-warning__icon" aria-hidden="true">△</span>
        <div>
          <strong>Datasettet er ikke heldekkende</strong>
          <p>
            Kartleggingen kan være mangelfull i {municipality}. Tomme områder i
            kartet betyr derfor ikke nødvendigvis at det ikke finnes verdifull natur
            der, men kan bety at området ikke er kartlagt.
          </p>
          <p>
            Dette må tas med i vurderingen når dataene brukes i arealplanlegging.
          </p>
        </div>
      </aside>

      {mapContent && (
        <section className="thematic-map-section" aria-labelledby="valued-map-title">
          <div className="thematic-section-heading">
            <h2 id="valued-map-title">Verdsatte naturtyper i {municipality}</h2>
            <p>Se registrerte lokaliteter og verdikategorier geografisk.</p>
          </div>
          {mapContent}
        </section>
      )}

      <section className="thematic-insight-row" aria-labelledby="value-distribution-title">
        <div className="thematic-insight-row__text">
          <h2 id="value-distribution-title">Fordeling av verdiene</h2>
          <p>
            Figuren viser registrert areal fordelt på verdikategori for lokaliteter
            som krysser kommunegrensen. Summen er basert på lokalitetenes geometri,
            og overlappende lokaliteter kan derfor telles mer enn én gang.
          </p>
          <p className="thematic-insight-row__source">
            Kilde: Miljødirektoratet, naturtyper med KU-verdi
          </p>
        </div>
        <div className="thematic-value-chart" aria-label="Fordeling av verdikategorier">
          {statisticsState === 'loading' && <p role="status">Laster verdifordeling…</p>}
          {statisticsState === 'error' && <p role="alert">Verdifordelingen kunne ikke hentes.</p>}
          {statistics && statistics.valueMetrics.length === 0 && <p>Ingen registrerte lokaliteter.</p>}
          {statistics?.valueMetrics.map((metric) => (
            <div className="thematic-value-chart__row" key={metric.label}>
              <span className="thematic-value-chart__label">{metric.label}</span>
              <span className="thematic-value-chart__track" aria-hidden="true">
                <span
                  className="thematic-value-chart__bar"
                  style={{
                    width: `${Math.max(2, metric.sharePercent)}%`,
                    backgroundColor: metric.color,
                  }}
                />
              </span>
              <strong>{dekar(metric.areaKm2)}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="thematic-questions thematic-questions--wide">
        <details>
          <summary>Hva betyr verdiene?</summary>
          <p>
            Verdikategoriene beskriver egenskaper ved registrerte lokaliteter.
            De må tolkes sammen med metode, dekning og øvrig planfaglig kunnskap.
          </p>
        </details>
        <details>
          <summary>Hvor er tallene fra?</summary>
          <p>
            Dataene kommer fra Miljødirektoratets løpende tjeneste for naturtyper
            med KU-verdi.
          </p>
        </details>
      </div>

      <section className="thematic-insight-row" aria-labelledby="nature-types-title">
        <div className="thematic-insight-row__text">
          <h2 id="nature-types-title">Naturtyper etter størrelse</h2>
          <p>
            Tabellen rangerer registrerte naturtyper etter samlet areal for
            lokaliteter som krysser kommunegrensen. Den viser også antall lokaliteter.
          </p>
          <p className="thematic-insight-row__source">
            Kilde: Miljødirektoratet, naturtyper med KU-verdi
          </p>
        </div>
        <div className="thematic-nature-table-wrap">
          {statisticsState === 'loading' && <p role="status">Laster naturtyper…</p>}
          {statisticsState === 'error' && <p role="alert">Naturtypetabellen kunne ikke hentes.</p>}
          {statistics && (
            <table className="thematic-nature-table">
              <thead>
                <tr>
                  <th>Naturtype</th>
                  <th>Registrert areal</th>
                  <th>Lokaliteter</th>
                </tr>
              </thead>
              <tbody>
                {topNatureTypes.map((metric) => (
                  <tr key={metric.label}>
                    <td>{metric.label}</td>
                    <td>{dekar(metric.areaKm2)}</td>
                    <td>{areaFormatter.format(metric.featureCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {statistics && statistics.typeMetrics.length > topNatureTypes.length && (
            <p className="thematic-nature-table__note">
              Viser de 12 naturtypene med størst registrert areal i kommunen.
            </p>
          )}
        </div>
      </section>

      <div className="thematic-questions thematic-questions--wide">
        <details>
          <summary>Hvorfor passe på sjeldne naturtyper i kommunen?</summary>
          <p>
            Sjeldne eller sårbare naturtyper kan være viktige i konkrete
            arealvurderinger. Temadataene bør brukes sammen med øvrig kunnskapsgrunnlag.
          </p>
        </details>
        <details>
          <summary>Hvor er tallene fra?</summary>
          <p>Se metadata og metode hos Miljødirektoratet.</p>
        </details>
      </div>

      <section className="thematic-faq" aria-labelledby="valued-faq-title">
        <h2 id="valued-faq-title">Ofte stilte spørsmål</h2>
        <details>
          <summary>Hva er naturtyper?</summary>
          <p>
            Naturtyper beskriver områder med bestemte naturforhold og artssammensetning.
          </p>
        </details>
        <details>
          <summary>Betyr et tomt kartområde at naturen ikke er verdifull?</summary>
          <p>
            Nei. Datasettet er ikke heldekkende, og tomme områder kan være områder
            som ikke er kartlagt.
          </p>
        </details>
      </section>
    </section>
  )
}

export function ThematicDataPage({
  datasetId,
  municipalityName,
  thematicCoverage,
  thematicCoverageState = 'idle',
  valuedNatureStatistics,
  valuedNatureStatisticsState = 'idle',
  plannedValuedNature,
  plannedValuedNatureState = 'idle',
  plannedCoverageGap,
  plannedCoverageGapState = 'idle',
  onBack,
  onOpenFutureDevelopmentAnalysis,
  mapContent,
}: ThematicDataPageProps) {
  const dataset = thematicDatasets.find((item) => item.id === datasetId)
  if (!dataset) return null

  const content = getThematicPageContent(datasetId)
  const evaluation = thematicCoverage?.results.find((item) => item.datasetId === dataset.id)

  if (dataset.id === 'valued-nature') {
    return (
      <ValuedNaturePage
        municipalityName={municipalityName}
        evaluation={evaluation}
        statistics={valuedNatureStatistics}
        statisticsState={valuedNatureStatisticsState}
        plannedValuedNature={plannedValuedNature}
        plannedValuedNatureState={plannedValuedNatureState}
        plannedCoverageGap={plannedCoverageGap}
        plannedCoverageGapState={plannedCoverageGapState}
        onBack={onBack}
        onOpenFutureDevelopmentAnalysis={onOpenFutureDevelopmentAnalysis}
        mapContent={mapContent}
      />
    )
  }

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
