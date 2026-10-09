import type { ReactNode } from 'react'

import type { ForestStatistics } from '../api/forestStatistics'
import type { PlannedNatureBreakdown } from '../map/plannedDevelopment'

interface ForestPageProps {
  readonly municipalityName: string
  readonly statistics?: ForestStatistics | null
  readonly statisticsState?: 'idle' | 'loading' | 'error'
  readonly plannedNatureBreakdown?: PlannedNatureBreakdown | null
  readonly plannedNatureBreakdownState?: 'idle' | 'loading' | 'error'
  readonly onBack: () => void
  readonly onOpenMap: () => void
  readonly mapContent?: ReactNode
}

const areaFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })
const percentFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })

function dekar(areaKm2: number): string {
  return `${areaFormatter.format(areaKm2 * 1000)} dekar`
}

function percent(value: number | null): string {
  return value === null ? '–' : `${percentFormatter.format(value)} %`
}

function TreeIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 5v38M24 9 14 20h7L11 31h10l-8 9h22l-8-9h10L27 20h7Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ForestPage({
  municipalityName,
  statistics,
  statisticsState = 'idle',
  plannedNatureBreakdown,
  plannedNatureBreakdownState = 'idle',
  onBack,
  onOpenMap,
  mapContent,
}: ForestPageProps) {
  const available = statistics?.status === 'available' ? statistics : null
  const plannedForest = plannedNatureBreakdown?.metrics.find((metric) => metric.id === 'skog')

  return (
    <section className="content-page thematic-page thematic-page--editorial forest-page" aria-labelledby="forest-page-title">
      <nav className="thematic-breadcrumb" aria-label="Brødsmuler">
        <button type="button" onClick={onBack}>Kommuneoversikt</button>
        <span aria-hidden="true">›</span>
        <span>Skog</span>
      </nav>

      <header className="thematic-hero">
        <div className="thematic-hero__content">
          <div className="thematic-hero__title-row">
            <span className="thematic-hero__icon"><TreeIcon /></span>
            <h1 id="forest-page-title">Skog</h1>
          </div>
          <p className="thematic-hero__lead">
            Her vises skog i Grunnkart for arealanalyse. Hovedtallet og
            fordelingen på skogtyper bygger på arealdekke, mens analysen mot
            framtidig utbygging fortsatt bruker økosystemtype skog.
          </p>

          <div className="thematic-questions">
            <details>
              <summary>Hva regnes som skog?</summary>
              <p>
                Hovedtallet på denne siden følger skog i arealdekke i Grunnkart
                for arealanalyse. Dette er et heldekkende grunnlag.
              </p>
            </details>
            <details>
              <summary>Hvordan er skogen delt inn?</summary>
              <p>
                Arealdekke nivå 2 gir en mer detaljert inndeling i granskog,
                furuskog, barblandingsskog, blandingsskog og lauvskog.
              </p>
            </details>
            <details>
              <summary>Datagrunnlaget bak skog</summary>
              <p>
                Tall og kart bygger på Nasjonalt grunnkart for arealanalyse,
                årsversjon 2025. Grunnkartet er sammenstilt fra nasjonale
                arealressurs- og arealbruksdata.
              </p>
            </details>
          </div>
        </div>

        <div className="thematic-hero__image forest-hero__image" role="img" aria-label="Illustrasjon av skog" />
      </header>

      <section className="thematic-kpis" aria-label="Nøkkeltall for skog">
        <article>
          <span>Skogareal i {municipalityName}</span>
          <strong>
            {statisticsState === 'loading'
              ? '…'
              : statisticsState === 'error'
                ? 'Ikke tilgjengelig'
                : available
                  ? dekar(available.forestAreaKm2)
                  : 'Ikke tilgjengelig'}
          </strong>
          <small>Arealdekke · Grunnkart 2025</small>
        </article>
        <article>
          <span>Andel av kartlagt kommuneareal</span>
          <strong>
            {available ? percent(available.forestSharePercent) : statisticsState === 'loading' ? '…' : '–'}
          </strong>
          <small>
            {available?.forestShareOfNaturePercent !== null && available
              ? `${percent(available.forestShareOfNaturePercent)} av landbasert natur i prototypegrunnlaget`
              : 'Beregnes fra samme heldekkende grunnlag.'}
          </small>
        </article>
      </section>

      <section className="thematic-plan-cards" aria-label="Framtidig utbygging og skog">
        <article>
          <strong>Skog i områder satt av til framtidig utbygging</strong>
          <span className="thematic-plan-cards__value">
            {plannedNatureBreakdownState === 'loading'
              ? '…'
              : plannedNatureBreakdownState === 'error'
                ? 'Ikke tilgjengelig'
                : plannedForest
                  ? dekar(plannedForest.areaKm2)
                  : '–'}
          </span>
          <span>
            Beregnes som overlapp mellom framtidige utbyggingsområder og
            økosystemtype skog i Grunnkartet.
          </span>
          <button type="button" onClick={onOpenMap}>
            Åpne Utforsk i kart <span aria-hidden="true">→</span>
          </button>
        </article>
        <article>
          <strong>Andel av kommunens skog i framtidige utbyggingsområder</strong>
          <span className="thematic-plan-cards__value">–</span>
          <span>
            Ikke beregnet her, fordi overlappsanalysen bruker økosystemtype skog,
            mens hovedtallet på siden bruker arealdekke. Disse skal ikke blandes
            uten en metodisk avklaring.
          </span>
        </article>
      </section>

      <details className="thematic-source-accordion">
        <summary>Hvor er tallene hentet fra?</summary>
        <p>
          Hovedtallene bygger på NIBIOs WMS for Nasjonalt grunnkart for
          arealanalyse – årsversjon 2025. Skogarealet og fordelingen på
          skogtyper beregnes fra arealdekke nivå 2.
        </p>
      </details>

      <aside className="forest-account-note">
        <span aria-hidden="true">✓</span>
        <div>
          <strong>Skog er del av det heldekkende regnskapsgrunnlaget</strong>
          <p>
            Dette skiller siden fra temasiden for Verdsatte naturtyper.
            Skogarealet er hentet fra Grunnkart for arealanalyse og inngår i det
            felles arealbaserte naturregnskapet.
          </p>
        </div>
      </aside>

      {statistics?.status === 'not_available' && (
        <aside className="thematic-warning">
          <span className="thematic-warning__icon" aria-hidden="true">△</span>
          <div>
            <strong>Skogstatistikk er ikke klargjort for denne kommunen i prototypen</strong>
            <p>{statistics.reason}</p>
          </div>
        </aside>
      )}

      {mapContent && (
        <section className="thematic-map-section" aria-labelledby="forest-map-title">
          <div className="thematic-section-heading">
            <h2 id="forest-map-title">Skog i {municipalityName}</h2>
            <p>
              Kartet og hovedtallet bruker samme rutevise Grunnkart-kilde for
              skogtypene i arealdekke nivå 2.
            </p>
          </div>
          {mapContent}
        </section>
      )}

      <section className="thematic-insight-row" aria-labelledby="forest-types-title">
        <div className="thematic-insight-row__text">
          <h2 id="forest-types-title">Fordeling på skogtype</h2>
          <p>
            Arealdekke nivå 2 gir en finere beskrivelse av skogarealet etter
            dominerende treslag og blanding. Dette er en egenskap ved Grunnkartet,
            men er ikke en egen økosystemklassifikasjon.
          </p>
          <p className="thematic-insight-row__source">
            Kilde: NIBIO, Grunnkart for arealanalyse 2025
          </p>
        </div>

        <div className="thematic-value-chart forest-type-chart" aria-label="Fordeling på skogtype">
          {statisticsState === 'loading' && <p role="status">Laster skogfordeling…</p>}
          {statisticsState === 'error' && <p role="alert">Skogfordelingen kunne ikke hentes.</p>}
          {available?.typeMetrics.map((metric) => (
            <div className="thematic-value-chart__row" key={metric.id}>
              <span className="thematic-value-chart__label">{metric.label}</span>
              <span className="thematic-value-chart__track" aria-hidden="true">
                <span
                  className="thematic-value-chart__bar"
                  style={{ width: `${Math.max(2, metric.sharePercent)}%`, backgroundColor: metric.color }}
                />
              </span>
              <strong>{dekar(metric.areaKm2)}</strong>
            </div>
          ))}
          {available && available.typeMetrics.length === 0 && (
            <p>Ingen skogtyper kunne beregnes fra arealdekke nivå 2.</p>
          )}
        </div>
      </section>

      <div className="thematic-questions thematic-questions--wide">
        <details>
          <summary>Hva betyr skogtypene?</summary>
          <p>
            Granskog, furuskog og lauvskog beskriver dominerende treslag.
            Barblandingsskog og blandingsskog brukes der flere treslag inngår.
          </p>
        </details>
        <details>
          <summary>Hvorfor kan summen av skogtypene avvike fra hovedtallet?</summary>
          <p>
            Hovedtallet følger økosystemtype nivå 1, mens skogtypene følger
            arealdekke nivå 2. De beskriver ulike egenskaper i Grunnkartet og skal
            derfor ikke forventes å være helt identiske.
          </p>
        </details>
      </div>

      <section className="thematic-insight-row" aria-labelledby="forest-table-title">
        <div className="thematic-insight-row__text">
          <h2 id="forest-table-title">Skogtyper etter størrelse</h2>
          <p>
            Tabellen rangerer skogtypene etter beregnet areal i kommunen.
            Tallene er prototypeanslag fra samme rasterberegning som diagrammet.
          </p>
          <p className="thematic-insight-row__source">
            Kilde: NIBIO, Grunnkart for arealanalyse 2025
          </p>
        </div>

        <div className="thematic-nature-table-wrap">
          {available && (
            <table className="thematic-nature-table">
              <thead>
                <tr>
                  <th>Skogtype</th>
                  <th>Areal</th>
                  <th>Andel</th>
                </tr>
              </thead>
              <tbody>
                {available.typeMetrics.map((metric) => (
                  <tr key={metric.id}>
                    <td>{metric.label}</td>
                    <td>{dekar(metric.areaKm2)}</td>
                    <td>{percent(metric.sharePercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {statisticsState === 'loading' && <p role="status">Laster tabell…</p>}
          {statisticsState === 'error' && <p role="alert">Tabellen kunne ikke hentes.</p>}
        </div>
      </section>

      <section className="thematic-faq" aria-labelledby="forest-faq-title">
        <h2 id="forest-faq-title">Ofte stilte spørsmål</h2>
        <details>
          <summary>Er dette en kartlegging av naturverdi eller naturskog?</summary>
          <p>
            Nei. Grunnkartet gir en standardisert areal- og økosysteminndeling.
            Det gir ikke i seg selv detaljert informasjon om naturskog,
            naturverdi eller tilstand.
          </p>
        </details>
        <details>
          <summary>Kan skogdataene brukes i arealplanlegging?</summary>
          <p>
            Ja, som heldekkende kunnskapsgrunnlag for areal og økosystemtype.
            Ved konkrete naturfaglige vurderinger må grunnlaget suppleres med
            relevante temadata og annen lokal kunnskap.
          </p>
        </details>
      </section>

      {available && (
        <p className="forest-page__method">
          Beregningen er et prototypeanslag på ca. {Math.round(available.pixelMetersApprox)} meters
          rasteroppløsning. Resultatet skal kvalitetssikres mot endelig dataleveranse og metode.
        </p>
      )}
    </section>
  )
}
