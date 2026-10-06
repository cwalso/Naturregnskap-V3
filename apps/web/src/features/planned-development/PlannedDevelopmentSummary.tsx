import type {
  PlannedDevelopmentResult,
  PlannedNatureBreakdown,
} from '../../map/plannedDevelopment'
import {
  PLANNED_AGRICULTURE_COLOR,
  PLANNED_NATURE_COLOR,
} from '../../map/plannedDevelopmentOverlay'

interface PlannedDevelopmentSummaryProps {
  readonly state: 'idle' | 'loading' | 'error'
  readonly result: PlannedDevelopmentResult | null
  readonly visible: boolean
  readonly onVisibleChange: (visible: boolean) => void
  readonly natureBreakdown: PlannedNatureBreakdown | null
  readonly natureBreakdownState: 'idle' | 'loading' | 'error'
}

const areaFormatter = new Intl.NumberFormat('nb-NO', {
  maximumFractionDigits: 0,
})

const percentFormatter = new Intl.NumberFormat('nb-NO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

function dekar(km2: number): string {
  return `${areaFormatter.format(km2 * 1000)} dekar`
}

export function PlannedDevelopmentSummary({
  state,
  result,
  visible,
  onVisibleChange,
  natureBreakdown,
  natureBreakdownState,
}: PlannedDevelopmentSummaryProps) {
  return (
    <section
      className="map-sidebar__section map-sidebar__section--analysis"
      aria-labelledby="planned-development-title"
    >
      <div className="map-sidebar__section-heading">
        <div>
          <p className="map-sidebar__eyebrow">Analyse · kommuneplan</p>
          <h3 id="planned-development-title">Framtidig utbygging</h3>
        </div>
        <span className="status-tag status-tag--muted">Anslag</span>
      </div>

      {state === 'loading' ? (
        <p className="plan-analysis__status" role="status">
          Beregner kryss mellom Grunnkart og kommuneplan…
        </p>
      ) : state === 'error' ? (
        <p className="plan-analysis__status plan-analysis__status--error" role="alert">
          Analysen kunne ikke beregnes nå. Dette skal ikke tolkes som 0.
        </p>
      ) : result?.status === 'available' ? (
        <>
          <div className="plan-analysis">
            <span>Natur som kommuneplanen setter av til framtidig utbygging</span>
            <strong>ca. {dekar(result.natureKm2)}</strong>
            {result.natureSharePercent !== null && (
              <small>
                {percentFormatter.format(result.natureSharePercent)} % av naturen i
                beregningsgrunnlaget
              </small>
            )}
          </div>

          <p className="plan-analysis__secondary">
            Jordbruk satt av til framtidig utbygging: <strong>ca. {dekar(result.agricultureKm2)}</strong>
          </p>

          <label className="plan-layer-toggle">
            <input
              type="checkbox"
              checked={visible}
              onChange={(event) => onVisibleChange(event.target.checked)}
            />
            <span>
              <strong>Vis framtidig utbygging i kartet</strong>
              <small>
                Kartlaget viser bare natur og jordbruk som overlapper framtidige
                utbyggingsområder.
              </small>
            </span>
          </label>

          <div className="plan-layer-legend" aria-label="Tegnforklaring for framtidig utbygging">
            <div>
              <i style={{ background: PLANNED_NATURE_COLOR }} aria-hidden="true" />
              <span>Natur satt av til framtidig utbygging</span>
            </div>
            <div>
              <i style={{ background: PLANNED_AGRICULTURE_COLOR }} aria-hidden="true" />
              <span>Jordbruk satt av til framtidig utbygging</span>
            </div>
          </div>

          <div className="plan-nature-breakdown">
            <div className="plan-nature-breakdown__header">
              <div>
                <p className="map-sidebar__eyebrow">Grunnkart · økosystemtype nivå 1</p>
                <h4>Hva slags natur ligger i utbyggingsområdene?</h4>
              </div>
            </div>

            {natureBreakdownState === 'loading' ? (
              <p className="plan-nature-breakdown__status" role="status">
                Beregner fordeling på økosystemtype…
              </p>
            ) : natureBreakdownState === 'error' ? (
              <p className="plan-nature-breakdown__status plan-nature-breakdown__status--error" role="alert">
                Fordelingen på økosystemtype kunne ikke beregnes nå.
              </p>
            ) : natureBreakdown ? (
              <>
                <div className="plan-nature-breakdown__list">
                  {natureBreakdown.metrics.map((metric) => (
                    <div className="plan-nature-breakdown__row" key={metric.id}>
                      <div className="plan-nature-breakdown__labels">
                        <strong>{metric.label}</strong>
                        <span>
                          {dekar(metric.areaKm2)} · {percentFormatter.format(metric.sharePercent)} %
                        </span>
                      </div>
                      <div className="plan-nature-breakdown__bar" aria-hidden="true">
                        <span style={{ width: `${Math.max(1, metric.sharePercent)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {natureBreakdown.unclassifiedAreaKm2 > 0.001 && (
                  <p className="plan-nature-breakdown__note">
                    Ca. {dekar(natureBreakdown.unclassifiedAreaKm2)} av det planlagte naturarealet
                    kunne ikke fordeles sikkert på økosystemtype i denne rasterberegningen.
                  </p>
                )}

                <p className="plan-nature-breakdown__note">
                  Fordelingen bruker den samme ca. {Math.round(natureBreakdown.pixelMeters)} m-planmasken
                  som hovedanslaget. Økosystemtype leses fra NIBIO med ca.{' '}
                  {Math.round(natureBreakdown.classificationPixelMeters)} m oppløsning,
                  og bare naturareal som er beholdt etter filtrering av smale striper inngår.
                </p>
              </>
            ) : null}
          </div>

          <details className="plan-analysis__details">
            <summary>Om beregningen</summary>
            <p>
              Kilde: DiBK kommuneplaner. Framtidig arealbruk med arealbruksstatus 2
              og arealformål i 1000- og 2000-serien er krysset med dagens
              Grunnkart-klasser i nettleseren.
            </p>
            <p>
              Regnet ut fra {result.tileCount} kartfliser med piksler på{' '}
              {Math.round(result.pixelMeters)} meter. Smale striper er felt som
              ikke er bredere enn rundt 40 meter noe sted, ofte langs eksisterende
              bebyggelse. Smale deler av et større felt regnes med.
            </p>
            <p>
              Med smale striper ville naturanslaget vært ca.{' '}
              {dekar(result.natureWithNarrowStripsKm2)}. Smale striper vises ikke
              i kartet. Dette er et anslag til illustrasjon, ikke offisiell
              statistikk.
            </p>
          </details>

          <p className="map-sidebar__explanation">
            Dette er analyse- og beslutningsstøtte basert på regnskapsgrunnlag og
            plandata. Det inngår ikke som en egen regnskapskategori.
          </p>
        </>
      ) : result?.status === 'not_available' ? (
        <>
          <p className="plan-analysis__status">
            Analysen er ikke klargjort for denne kommunen i prototypen.
          </p>
          <p className="map-sidebar__explanation">{result.reason}</p>
        </>
      ) : (
        <p className="plan-analysis__status">
          Velg kommune for å beregne framtidig utbygging.
        </p>
      )}
    </section>
  )
}
