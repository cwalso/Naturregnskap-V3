import type { ReactNode } from 'react'

import type {
  EcosystemPageId,
  EcosystemStatistics,
} from '../api/ecosystemStatistics'
import type { PlannedNatureBreakdown } from '../map/plannedDevelopment'

interface EcosystemPageProps {
  readonly ecosystemId: EcosystemPageId
  readonly municipalityName: string
  readonly statistics?: EcosystemStatistics | null
  readonly statisticsState?: 'idle' | 'loading' | 'error'
  readonly plannedNatureBreakdown?: PlannedNatureBreakdown | null
  readonly plannedNatureBreakdownState?: 'idle' | 'loading' | 'error'
  readonly onBack: () => void
  readonly onOpenMap: () => void
  readonly mapContent?: ReactNode
}

interface EcosystemPageConfig {
  readonly title: string
  readonly intro: string
  readonly whatIs: string
  readonly whyUseful: string
  readonly heroClass: string
  readonly icon: string
}

export const ecosystemPageConfig: Readonly<Record<EcosystemPageId, EcosystemPageConfig>> = {
  vatmark: {
    title: 'Myr (våtmark)',
    intro: 'Myr og annen våtmark vises her med utgangspunkt i våtmark som hovedøkosystemtype i Grunnkart for arealanalyse. Siden viser areal, utbredelse og hvordan våtmark inngår i kommunens samlede naturareal.',
    whatIs: 'I regnskapsgrunnlaget følger siden våtmark som økosystemtype nivå 1 i Grunnkart for arealanalyse. Begrepet «Myr (våtmark)» brukes som inngang i temasiden.',
    whyUseful: 'Et heldekkende grunnlag gjør det mulig å se hvor mye våtmark kommunen har, hvor den ligger og hvor den overlapper arealer satt av til framtidig utbygging.',
    heroClass: 'ecosystem-hero__image--wetland',
    icon: '≈',
  },
}

const areaFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })
const percentFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })

function dekar(areaKm2: number): string {
  return `${areaFormatter.format(areaKm2 * 1000)} dekar`
}

function percent(value: number | null): string {
  return value === null ? '–' : `${percentFormatter.format(value)} %`
}

export function EcosystemPage({
  ecosystemId,
  municipalityName,
  statistics,
  statisticsState = 'idle',
  plannedNatureBreakdown,
  plannedNatureBreakdownState = 'idle',
  onBack,
  onOpenMap,
  mapContent,
}: EcosystemPageProps) {
  const config = ecosystemPageConfig[ecosystemId]
  const available = statistics?.status === 'available' ? statistics : null
  const metric = available?.metrics.find((item) => item.id === ecosystemId)
  const plannedMetric = plannedNatureBreakdown?.metrics.find((item) => item.id === ecosystemId)
  const plannedShare = metric && plannedMetric && metric.areaKm2 > 0
    ? plannedMetric.areaKm2 / metric.areaKm2 * 100
    : null

  return (
    <section className="content-page thematic-page thematic-page--editorial ecosystem-page" aria-labelledby="ecosystem-page-title">
      <nav className="thematic-breadcrumb" aria-label="Brødsmuler">
        <button type="button" onClick={onBack}>Kommuneoversikt</button>
        <span aria-hidden="true">›</span>
        <span>{config.title}</span>
      </nav>

      <header className="thematic-hero">
        <div className="thematic-hero__content">
          <div className="thematic-hero__title-row">
            <span className="thematic-hero__icon ecosystem-hero__icon" aria-hidden="true">
              {config.icon}
            </span>
            <h1 id="ecosystem-page-title">{config.title}</h1>
          </div>
          <p className="thematic-hero__lead">{config.intro}</p>

          <div className="thematic-questions">
            <details>
              <summary>Hva viser denne siden?</summary>
              <p>{config.whatIs}</p>
            </details>
            <details>
              <summary>Hvordan kan dataene brukes?</summary>
              <p>{config.whyUseful}</p>
            </details>
            <details>
              <summary>Datagrunnlaget</summary>
              <p>
                Kart og tall bygger på Nasjonalt grunnkart for arealanalyse,
                årsversjon 2025. Siden viser utbredelse, ikke naturtilstand.
              </p>
            </details>
          </div>
        </div>

        <div
          className={`thematic-hero__image ecosystem-hero__image ${config.heroClass}`}
          role="img"
          aria-label={`Illustrasjon av ${config.title.toLowerCase()}`}
        />
      </header>

      <section className="thematic-kpis" aria-label={`Nøkkeltall for ${config.title.toLowerCase()}`}>
        <article>
          <span>{config.title} i {municipalityName}</span>
          <strong>
            {statisticsState === 'loading'
              ? '…'
              : statisticsState === 'error'
                ? 'Ikke tilgjengelig'
                : metric
                  ? dekar(metric.areaKm2)
                  : '–'}
          </strong>
          <small>Økosystemtype nivå 1 · Grunnkart 2025</small>
        </article>
        <article>
          <span>Andel av landbasert natur</span>
          <strong>
            {metric ? percent(metric.shareOfNaturePercent) : statisticsState === 'loading' ? '…' : '–'}
          </strong>
          <small>
            {metric
              ? `${percent(metric.shareOfMappedMunicipalityPercent)} av kartlagt kommuneareal`
              : 'Beregnes fra samme heldekkende grunnlag.'}
          </small>
        </article>
      </section>

      <section className="thematic-plan-cards" aria-label={`Framtidig utbygging og ${config.title.toLowerCase()}`}>
        <article>
          <strong>{config.title} i områder satt av til framtidig utbygging</strong>
          <span className="thematic-plan-cards__value">
            {plannedNatureBreakdownState === 'loading'
              ? '…'
              : plannedNatureBreakdownState === 'error'
                ? 'Ikke tilgjengelig'
                : plannedMetric
                  ? dekar(plannedMetric.areaKm2)
                  : '–'}
          </span>
          <span>
            Beregnes som overlapp mellom framtidige utbyggingsområder og
            økosystemtypen i Grunnkartet.
          </span>
          <button type="button" onClick={onOpenMap}>
            Åpne Utforsk i kart <span aria-hidden="true">→</span>
          </button>
        </article>
        <article>
          <strong>Andel av kommunens {config.title.toLowerCase()} i framtidige utbyggingsområder</strong>
          <span className="thematic-plan-cards__value">
            {plannedShare === null ? '–' : percent(plannedShare)}
          </span>
          <span>
            Sammenligner overlappsarealet med samlet areal for samme
            økosystemtype i kommunen.
          </span>
        </article>
      </section>

      <details className="thematic-source-accordion">
        <summary>Hvor er tallene hentet fra?</summary>
        <p>
          Tallene beregnes fra økosystemtype nivå 1 i Nasjonalt grunnkart for
          arealanalyse, årsversjon 2025. Kart og statistikk bruker samme rutevise
          datakilde.
        </p>
      </details>

      <aside className="forest-account-note ecosystem-account-note">
        <span aria-hidden="true">✓</span>
        <div>
          <strong>{config.title} er del av det heldekkende regnskapsgrunnlaget</strong>
          <p>
            Dette er ikke et supplerende temalag. Arealet inngår i Grunnkart for
            arealanalyse og kan følges etter en felles klassifikasjon.
          </p>
        </div>
      </aside>

      {statistics?.status === 'not_available' && (
        <aside className="thematic-warning">
          <span className="thematic-warning__icon" aria-hidden="true">△</span>
          <div>
            <strong>Data er ikke klargjort for denne kommunen i prototypen</strong>
            <p>{statistics.reason}</p>
          </div>
        </aside>
      )}

      {mapContent && (
        <section className="thematic-map-section" aria-labelledby="ecosystem-map-title">
          <div className="thematic-section-heading">
            <h2 id="ecosystem-map-title">{config.title} i {municipalityName}</h2>
            <p>Viser økosystemtypen fra Grunnkart for arealanalyse.</p>
          </div>
          {mapContent}
        </section>
      )}

      <section className="thematic-insight-row" aria-labelledby="ecosystem-distribution-title">
        <div className="thematic-insight-row__text">
          <h2 id="ecosystem-distribution-title">Fordeling av landbasert natur</h2>
          <p>
            Figuren setter {config.title.toLowerCase()} inn i sammenheng med de
            øvrige landbaserte økosystemtypene i Grunnkartet.
          </p>
          <p className="thematic-insight-row__source">
            Kilde: NIBIO, Grunnkart for arealanalyse 2025
          </p>
        </div>

        <div className="thematic-value-chart ecosystem-distribution-chart">
          {statisticsState === 'loading' && <p role="status">Laster arealfordeling…</p>}
          {statisticsState === 'error' && <p role="alert">Arealfordelingen kunne ikke hentes.</p>}
          {available?.metrics
            .filter((item) => item.areaKm2 > 0)
            .sort((a, b) => b.areaKm2 - a.areaKm2)
            .map((item) => (
              <div
                className={`thematic-value-chart__row ${item.id === ecosystemId ? 'is-active' : ''}`}
                key={item.id}
              >
                <span className="thematic-value-chart__label">{item.label}</span>
                <span className="thematic-value-chart__track" aria-hidden="true">
                  <span
                    className="thematic-value-chart__bar"
                    style={{
                      width: `${Math.max(2, item.shareOfNaturePercent)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </span>
                <strong>{percent(item.shareOfNaturePercent)}</strong>
              </div>
            ))}
        </div>
      </section>

      <div className="thematic-questions thematic-questions--wide">
        <details>
          <summary>Hva betyr andelen?</summary>
          <p>
            Andelen viser hvor stor del av landbasert natur i prototypegrunnlaget
            som er klassifisert som {config.title.toLowerCase()}.
          </p>
        </details>
        <details>
          <summary>Hva sier dette ikke noe om?</summary>
          <p>
            Utbredelsen sier ikke i seg selv noe om økologisk tilstand,
            naturverdi eller kvalitet. Slike vurderinger krever supplerende data.
          </p>
        </details>
      </div>

      <section className="thematic-insight-row" aria-labelledby="ecosystem-table-title">
        <div className="thematic-insight-row__text">
          <h2 id="ecosystem-table-title">Økosystemtypene i kommunen</h2>
          <p>
            Tabellen viser areal og andel av landbasert natur for de samme
            økosystemtypene som brukes i regnskapsgrunnlaget.
          </p>
          <p className="thematic-insight-row__source">
            Kilde: NIBIO, Grunnkart for arealanalyse 2025
          </p>
        </div>

        <div className="thematic-nature-table-wrap">
          {available && (
            <table className="thematic-nature-table ecosystem-type-table">
              <thead>
                <tr>
                  <th>Økosystemtype</th>
                  <th>Areal</th>
                  <th>Andel av natur</th>
                </tr>
              </thead>
              <tbody>
                {available.metrics
                  .filter((item) => item.areaKm2 > 0)
                  .sort((a, b) => b.areaKm2 - a.areaKm2)
                  .map((item) => (
                    <tr key={item.id} className={item.id === ecosystemId ? 'is-active' : undefined}>
                      <td>{item.label}</td>
                      <td>{dekar(item.areaKm2)}</td>
                      <td>{percent(item.shareOfNaturePercent)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
          {statisticsState === 'loading' && <p role="status">Laster tabell…</p>}
          {statisticsState === 'error' && <p role="alert">Tabellen kunne ikke hentes.</p>}
        </div>
      </section>

      <section className="thematic-faq" aria-labelledby="ecosystem-faq-title">
        <h2 id="ecosystem-faq-title">Ofte stilte spørsmål</h2>
        <details>
          <summary>Er dette en vurdering av naturverdi?</summary>
          <p>
            Nei. Siden viser utbredelse i et heldekkende arealgrunnlag. Naturverdi
            og andre fagtema må vurderes med supplerende kunnskapsgrunnlag.
          </p>
        </details>
        <details>
          <summary>Kan dataene brukes i arealplanlegging?</summary>
          <p>
            Ja, som et sammenlignbart grunnlag for utbredelse og arealfordeling.
            I konkrete saker bør det kombineres med relevante temadata og lokal kunnskap.
          </p>
        </details>
      </section>

      {available && (
        <p className="forest-page__method">
          Prototypeberegning med ca. {Math.round(available.pixelMeters)} meters
          klassifikasjonsoppløsning. Resultatet skal kvalitetssikres mot endelig
          dataleveranse og metode.
        </p>
      )}
    </section>
  )
}
