import {
  nationalLandCover2025,
  protectedAreas,
  valuedNature,
  wildReindeerAreas,
} from '../../datasets/registry'
import type {
  PlannedDevelopmentResult,
  PlannedNatureBreakdown,
} from '../../map/plannedDevelopment'
import {
  PLANNED_AGRICULTURE_COLOR,
  PLANNED_NATURE_COLOR,
} from '../../map/plannedDevelopmentOverlay'

export type PlannedDevelopmentAnalysisTarget =
  | 'grunnkart'
  | 'valued-nature'
  | 'protected-areas'
  | 'wild-reindeer-areas'

interface PlannedDevelopmentSummaryProps {
  readonly state: 'idle' | 'loading' | 'error'
  readonly result: PlannedDevelopmentResult | null
  readonly visible: boolean
  readonly onVisibleChange: (visible: boolean) => void
  readonly natureBreakdown: PlannedNatureBreakdown | null
  readonly natureBreakdownState: 'idle' | 'loading' | 'error'
  readonly analysisTarget: PlannedDevelopmentAnalysisTarget
  readonly onAnalysisTargetChange: (target: PlannedDevelopmentAnalysisTarget) => void
}

const areaFormatter = new Intl.NumberFormat('nb-NO', {
  maximumFractionDigits: 0,
})

const percentFormatter = new Intl.NumberFormat('nb-NO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const analysisTargets: readonly {
  id: PlannedDevelopmentAnalysisTarget
  label: string
  description: string
  status: 'ready' | 'next'
  futureResult: string
}[] = [
  {
    id: 'grunnkart',
    label: 'Grunnkart for arealanalyse',
    description: 'Areal og økosystemtype nivå 1 · heldekkende',
    status: 'ready',
    futureResult: '',
  },
  {
    id: 'valued-nature',
    label: valuedNature.title,
    description: 'Verdi og naturtype · ikke heldekkende',
    status: 'next',
    futureResult: 'berørt areal og antall lokaliteter, fordelt på verdi og naturtype',
  },
  {
    id: 'protected-areas',
    label: protectedAreas.title,
    description: 'Verneform og berørt areal',
    status: 'next',
    futureResult: 'berørt areal og antall områder, fordelt på verneform',
  },
  {
    id: 'wild-reindeer-areas',
    label: wildReindeerAreas.title,
    description: 'Leveområde og berørt areal · regional dekning',
    status: 'next',
    futureResult: 'berørt areal og hvilke villreinområder som overlapper',
  },
]

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
  analysisTarget,
  onAnalysisTargetChange,
}: PlannedDevelopmentSummaryProps) {
  const selectedTarget = analysisTargets.find((target) => target.id === analysisTarget)
    ?? analysisTargets[0]

  return (
    <section
      className="map-sidebar__section map-sidebar__section--analysis analysis-workspace"
      aria-labelledby="planned-development-title"
    >
      <div className="map-sidebar__section-heading analysis-workspace__heading">
        <div>
          <p className="map-sidebar__eyebrow">Analyse</p>
          <h3 id="planned-development-title">Framtidig utbygging</h3>
        </div>
        <span className="status-tag status-tag--muted">Anslag</span>
      </div>

      <div className="analysis-area-card">
        <span className="analysis-workspace__label">Analyseområde</span>
        <strong>Områder satt av til framtidig utbygging</strong>
        <p>
          Kommuneplanområder med framtidig arealbruk som inngår i
          prototypeberegningen.
        </p>
        <small>Kilde: DiBK kommuneplaner</small>
      </div>

      <div className="analysis-target-picker">
        <div className="analysis-target-picker__heading">
          <span className="analysis-workspace__label">Analyser mot</span>
          <small>Ett analysegrunnlag om gangen</small>
        </div>

        <div className="analysis-target-list" role="radiogroup" aria-label="Analysegrunnlag">
          {analysisTargets.map((target) => (
            <button
              type="button"
              className={
                target.id === analysisTarget
                  ? 'analysis-target analysis-target--selected'
                  : 'analysis-target'
              }
              role="radio"
              aria-checked={target.id === analysisTarget}
              key={target.id}
              onClick={() => onAnalysisTargetChange(target.id)}
            >
              <span className="analysis-target__radio" aria-hidden="true" />
              <span className="analysis-target__content">
                <strong>{target.label}</strong>
                <small>{target.description}</small>
              </span>
              <span className={
                target.status === 'ready'
                  ? 'analysis-target__status analysis-target__status--ready'
                  : 'analysis-target__status'
              }>
                {target.status === 'ready' ? 'Klar' : 'Neste steg'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="analysis-result">
        <div className="analysis-result__heading">
          <span className="analysis-workspace__label">Resultat</span>
          <strong>{selectedTarget.label}</strong>
        </div>

        {analysisTarget !== 'grunnkart' ? (
          <div className="analysis-result__pending">
            <strong>{selectedTarget.label} × framtidig utbygging</strong>
            <p>
              Denne overlayanalysen er ikke koblet til ennå. Når den bygges ut,
              skal resultatet vise {selectedTarget.futureResult}.
            </p>
            <small>
              Kartlaget kan fortsatt slås av og på separat under Kartlag. Synlighet
              i kartet betyr ikke at laget inngår i analysen.
            </small>
          </div>
        ) : state === 'loading' ? (
          <p className="plan-analysis__status" role="status">
            Beregner kryss mellom {nationalLandCover2025.title} og kommuneplan…
          </p>
        ) : state === 'error' ? (
          <p className="plan-analysis__status plan-analysis__status--error" role="alert">
            Analysen kunne ikke beregnes nå. Dette skal ikke tolkes som 0.
          </p>
        ) : result?.status === 'available' ? (
          <>
            <div className="plan-analysis">
              <span>Natur i områder satt av til framtidig utbygging</span>
              <strong>ca. {dekar(result.natureKm2)}</strong>
              {result.natureSharePercent !== null && (
                <small>
                  {percentFormatter.format(result.natureSharePercent)} % av naturen i
                  beregningsgrunnlaget
                </small>
              )}
            </div>

            <p className="plan-analysis__secondary">
              Jordbruk i områdene: <strong>ca. {dekar(result.agricultureKm2)}</strong>
            </p>

            <label className="plan-layer-toggle">
              <input
                type="checkbox"
                checked={visible}
                onChange={(event) => onVisibleChange(event.target.checked)}
              />
              <span>
                <strong>Vis analyseresultatet i kartet</strong>
                <small>
                  Kartlaget viser natur og jordbruk som overlapper framtidige
                  utbyggingsområder.
                </small>
              </span>
            </label>

            <div className="plan-layer-legend" aria-label="Tegnforklaring for analyseresultatet">
              <div>
                <i style={{ background: PLANNED_NATURE_COLOR }} aria-hidden="true" />
                <span>Natur i framtidige utbyggingsområder</span>
              </div>
              <div>
                <i style={{ background: PLANNED_AGRICULTURE_COLOR }} aria-hidden="true" />
                <span>Jordbruk i framtidige utbyggingsområder</span>
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
                          <strong>
                            <i
                              className="plan-nature-breakdown__swatch"
                              style={{ background: metric.color }}
                              aria-hidden="true"
                            />
                            {metric.label}
                          </strong>
                          <span>
                            {dekar(metric.areaKm2)} · {percentFormatter.format(metric.sharePercent)} %
                          </span>
                        </div>
                        <div className="plan-nature-breakdown__bar" aria-hidden="true">
                          <span
                            style={{
                              width: `${Math.max(1, metric.sharePercent)}%`,
                              background: metric.color,
                            }}
                          />
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
      </div>

      <p className="map-sidebar__explanation analysis-workspace__footnote">
        Framtidig utbygging er analyseområdet. Valgt analysegrunnlag bestemmer
        hvilke natur- eller arealverdier som undersøkes. Resultatene er
        analyse- og beslutningsstøtte og inngår ikke som egne regnskapskategorier.
      </p>
    </section>
  )
}
