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
import type {
  PlannedValuedNatureAnalysis,
  ValuedNatureMapSelection,
} from '../../map/plannedValuedNature'

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
  readonly onFindGrunnkartResultInMap: () => void
  readonly natureBreakdown: PlannedNatureBreakdown | null
  readonly natureBreakdownState: 'idle' | 'loading' | 'error'
  readonly analysisTarget: PlannedDevelopmentAnalysisTarget
  readonly onAnalysisTargetChange: (target: PlannedDevelopmentAnalysisTarget) => void
  readonly valuedNatureAnalysis: PlannedValuedNatureAnalysis | null
  readonly valuedNatureAnalysisState: 'idle' | 'loading' | 'error'
  readonly valuedNatureResultVisible: boolean
  readonly onValuedNatureResultVisibleChange: (visible: boolean) => void
  readonly valuedNatureMapSelection: ValuedNatureMapSelection
  readonly onShowValuedNatureInMap: (selection: ValuedNatureMapSelection) => void
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
    status: 'ready',
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

const readyAnalysisTargets = analysisTargets.filter((target) => target.status === 'ready')
const plannedAnalysisTargets = analysisTargets.filter((target) => target.status === 'next')

function dekar(km2: number): string {
  return `${areaFormatter.format(km2 * 1000)} dekar`
}

function ValuedNatureResult({
  analysis,
  visible,
  onVisibleChange,
  selection,
  onShowInMap,
}: {
  readonly analysis: PlannedValuedNatureAnalysis
  readonly visible: boolean
  readonly onVisibleChange: (visible: boolean) => void
  readonly selection: ValuedNatureMapSelection
  readonly onShowInMap: (selection: ValuedNatureMapSelection) => void
}) {
  if (analysis.affectedFeatureCount === 0) {
    return (
      <div className="valued-nature-result">
        <div className="plan-analysis">
          <span>Registrerte verdsatte naturtypelokaliteter med beregnet overlapp</span>
          <strong>0</strong>
          <small>
            Datasettet er ikke heldekkende. Null treff skal derfor ikke tolkes som
            fravær av naturverdi.
          </small>
        </div>
        <p className="plan-nature-breakdown__note">
          Analysen er gjort mot registrerte lokaliteter i Miljødirektoratets
          løpende tjeneste, med samme ca. {Math.round(analysis.pixelMeters)} m
          planmaske som analyseområdet.
        </p>
      </div>
    )
  }

  const primaryTypes = analysis.typeMetrics.slice(0, 6)
  const remainingTypes = analysis.typeMetrics.slice(6)

  return (
    <div className="valued-nature-result">
      <div className="analysis-result__summary-grid">
        <div className="analysis-result__metric">
          <span>Berørte lokaliteter</span>
          <strong>{areaFormatter.format(analysis.affectedFeatureCount)}</strong>
          <small>
            av {areaFormatter.format(analysis.candidateFeatureCount)} registrerte
            lokaliteter i analyseutsnittet
          </small>
        </div>
        <div className="analysis-result__metric">
          <span>Unikt overlappsareal</span>
          <strong>ca. {dekar(analysis.uniqueOverlapAreaKm2)}</strong>
          <small>Fysisk areal uten dobbelttelling av overlappende registreringer</small>
        </div>
      </div>

      <div className="analysis-result__map-actions" aria-live="polite">
        <button
          type="button"
          className="analysis-result__primary-action"
          onClick={() => onShowInMap({ kind: 'all' })}
        >
          {selection.kind === 'all' ? 'Finn resultatet i kartet' : 'Vis alle og finn i kartet'}
          <span aria-hidden="true">→</span>
        </button>
        <label className="analysis-result__visibility">
          <input
            type="checkbox"
            checked={visible}
            onChange={(event) => onVisibleChange(event.target.checked)}
          />
          <span>Vis resultatlaget</span>
        </label>
      </div>

      {selection.kind !== 'all' && (
        <p className="analysis-result__active-filter">
          Kartet er filtrert til: <strong>{selection.label}</strong>
        </p>
      )}

      <div className="valued-nature-breakdown">
        <p className="map-sidebar__eyebrow">Fordelt på verdikategori</p>
        <div className="valued-nature-breakdown__list">
          {analysis.valueMetrics.map((metric) => (
            <ValuedNatureMetricRow
              metric={metric}
              key={metric.label}
              showColor
              selected={selection.kind === 'value' && selection.label === metric.label}
              onShowInMap={() => onShowInMap({ kind: 'value', label: metric.label })}
            />
          ))}
        </div>
      </div>

      <div className="valued-nature-breakdown">
        <p className="map-sidebar__eyebrow">Fordelt på naturtype</p>
        <div className="valued-nature-breakdown__list">
          {primaryTypes.map((metric) => (
            <ValuedNatureMetricRow
              metric={metric}
              key={metric.label}
              selected={selection.kind === 'type' && selection.label === metric.label}
              onShowInMap={() => onShowInMap({ kind: 'type', label: metric.label })}
            />
          ))}
        </div>

        {remainingTypes.length > 0 && (
          <details className="valued-nature-breakdown__more">
            <summary>Vis alle {analysis.typeMetrics.length} naturtyper</summary>
            <div className="valued-nature-breakdown__list">
              {remainingTypes.map((metric) => (
                <ValuedNatureMetricRow
                  metric={metric}
                  key={metric.label}
                  selected={selection.kind === 'type' && selection.label === metric.label}
                  onShowInMap={() => onShowInMap({ kind: 'type', label: metric.label })}
                />
              ))}
            </div>
          </details>
        )}
      </div>

      {analysis.hasOverlappingRegistrations && (
        <p className="plan-nature-breakdown__note">
          Enkelte registrerte lokaliteter overlapper hverandre. Fordelingene viser
          registrert overlappsareal per lokalitet og kan derfor summeres til mer enn
          det unike fysiske overlappsarealet.
        </p>
      )}

      <p className="plan-nature-breakdown__note">
        Verdsatte naturtyper er supplerende temadata og ikke heldekkende
        regnskapsgrunnlag. Arealene er prototypeanslag beregnet på ca.{' '}
        {Math.round(analysis.pixelMeters)} m rutenett mot framtidige
        utbyggingsområder.
      </p>
    </div>
  )
}

function ValuedNatureMetricRow({
  metric,
  showColor = false,
  selected = false,
  onShowInMap,
}: {
  readonly metric: PlannedValuedNatureAnalysis['valueMetrics'][number]
  readonly showColor?: boolean
  readonly selected?: boolean
  readonly onShowInMap: () => void
}) {
  return (
    <div className={selected ? 'valued-nature-metric valued-nature-metric--selected' : 'valued-nature-metric'}>
      <div className="valued-nature-metric__labels">
        <strong>
          {showColor && (
            <i
              className="valued-nature-metric__swatch"
              style={{ background: metric.color }}
              aria-hidden="true"
            />
          )}
          {metric.label}
        </strong>
        <span>{dekar(metric.areaKm2)}</span>
      </div>
      <small>
        {metric.featureCount} {metric.featureCount === 1 ? 'lokalitet' : 'lokaliteter'}
        {' · '}{percentFormatter.format(metric.sharePercent)} %
      </small>
      <div className="valued-nature-metric__bar" aria-hidden="true">
        <span
          style={{
            width: `${Math.max(1, metric.sharePercent)}%`,
            background: metric.color ?? 'var(--color-accent)',
          }}
        />
      </div>
      <button
        type="button"
        className="valued-nature-metric__map-action"
        aria-pressed={selected}
        onClick={onShowInMap}
      >
        {selected ? 'Funnet i kart' : 'Finn i kart'} <span aria-hidden="true">→</span>
      </button>
    </div>
  )
}

export function PlannedDevelopmentSummary({
  state,
  result,
  visible,
  onVisibleChange,
  onFindGrunnkartResultInMap,
  natureBreakdown,
  natureBreakdownState,
  analysisTarget,
  onAnalysisTargetChange,
  valuedNatureAnalysis,
  valuedNatureAnalysisState,
  valuedNatureResultVisible,
  onValuedNatureResultVisibleChange,
  valuedNatureMapSelection,
  onShowValuedNatureInMap,
}: PlannedDevelopmentSummaryProps) {
  const selectedTarget = analysisTargets.find((target) => target.id === analysisTarget)
    ?? analysisTargets[0]

  return (
    <section
      className="analysis-workbench"
      aria-labelledby="planned-development-title"
    >
      <header className="analysis-workbench__header">
        <div>
          <p className="map-sidebar__eyebrow">Overlayanalyse</p>
          <h3 id="planned-development-title">Hva blir berørt?</h3>
        </div>
        <span className="status-tag status-tag--muted">Prototype</span>
      </header>

      <div className="analysis-builder">
        <section className="analysis-builder__step" aria-labelledby="analysis-area-heading">
          <div className="analysis-builder__step-heading">
            <span className="analysis-step-label">
              <b aria-hidden="true">1</b>
              <span id="analysis-area-heading">Velg analyseområde</span>
            </span>
          </div>

          <div className="analysis-area-options">
            <button
              type="button"
              className="analysis-area-option analysis-area-option--selected"
              aria-pressed="true"
            >
              <span className="analysis-area-option__icon" aria-hidden="true">▧</span>
              <span>
                <strong>Framtidig utbygging</strong>
                <small>Områder satt av til framtidig utbygging i kommuneplanen</small>
              </span>
              <span className="analysis-area-option__state">Valgt</span>
            </button>

            <button
              type="button"
              className="analysis-area-option analysis-area-option--next"
              disabled
              aria-describedby="custom-area-coming"
            >
              <span className="analysis-area-option__icon" aria-hidden="true">✎</span>
              <span>
                <strong>Tegn eget område</strong>
                <small id="custom-area-coming">Tegn et polygon direkte i kartet</small>
              </span>
              <span className="analysis-area-option__state">Neste</span>
            </button>
          </div>
        </section>

        <section className="analysis-builder__step" aria-labelledby="analysis-source-heading">
          <div className="analysis-builder__step-heading">
            <span className="analysis-step-label">
              <b aria-hidden="true">2</b>
              <span id="analysis-source-heading">Kryss området med</span>
            </span>
          </div>

          <div className="analysis-target-list" role="radiogroup" aria-label="Analysegrunnlag">
            {readyAnalysisTargets.map((target) => (
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
                  <strong>
                    {target.id === 'grunnkart' ? 'Natur og jordbruk' : target.label}
                  </strong>
                  <small>{target.description}</small>
                </span>
              </button>
            ))}
          </div>

          <details className="analysis-upcoming">
            <summary>Flere datalag</summary>
            <div className="analysis-upcoming__list">
              {plannedAnalysisTargets.map((target) => (
                <div className="analysis-upcoming__item" key={target.id}>
                  <strong>{target.label}</strong>
                  <small>{target.description}</small>
                </div>
              ))}
            </div>
          </details>
        </section>
      </div>

      <section className="analysis-output" aria-labelledby="analysis-result-heading">
        <div className="analysis-output__heading">
          <span className="analysis-step-label">
            <b aria-hidden="true">3</b>
            <span id="analysis-result-heading">Resultat</span>
          </span>
          <strong>
            {analysisTarget === 'grunnkart' ? 'Natur og jordbruk' : selectedTarget.label}
          </strong>
        </div>

        {analysisTarget === 'valued-nature' ? (
          state === 'loading' || valuedNatureAnalysisState === 'loading' ? (
            <p className="plan-analysis__status" role="status">
              Beregner overlapp med verdsatte naturtyper…
            </p>
          ) : state === 'error' || valuedNatureAnalysisState === 'error' ? (
            <p className="plan-analysis__status plan-analysis__status--error" role="alert">
              Overlayanalysen mot verdsatte naturtyper kunne ikke beregnes nå.
              Dette skal ikke tolkes som manglende treff.
            </p>
          ) : valuedNatureAnalysis ? (
            <ValuedNatureResult
              analysis={valuedNatureAnalysis}
              visible={valuedNatureResultVisible}
              onVisibleChange={onValuedNatureResultVisibleChange}
              selection={valuedNatureMapSelection}
              onShowInMap={onShowValuedNatureInMap}
            />
          ) : result?.status === 'not_available' ? (
            <div className="analysis-result__empty">
              <strong>Analyseområdet er ikke klargjort</strong>
              <p>{result.reason}</p>
            </div>
          ) : null
        ) : analysisTarget !== 'grunnkart' ? (
          <div className="analysis-result__empty">
            <strong>{selectedTarget.label}</strong>
            <p>Denne overlayanalysen er ikke koblet til ennå.</p>
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
            <div className="analysis-result__summary-grid">
              <div className="analysis-result__metric analysis-result__metric--nature">
                <span>Natur som overlapper</span>
                <strong>ca. {dekar(result.natureKm2)}</strong>
                <small>
                  {result.natureSharePercent !== null
                    ? `${percentFormatter.format(result.natureSharePercent)} % av naturen i beregningsgrunnlaget`
                    : 'Andel kan ikke beregnes sikkert'}
                </small>
              </div>
              <div className="analysis-result__metric analysis-result__metric--agriculture">
                <span>Jordbruk som overlapper</span>
                <strong>ca. {dekar(result.agricultureKm2)}</strong>
                <small>Berørt jordbruksareal i analyseområdet</small>
              </div>
            </div>

            <div className="analysis-result__map-actions">
              <button
                type="button"
                className="analysis-result__primary-action"
                onClick={onFindGrunnkartResultInMap}
              >
                Finn resultatet i kartet <span aria-hidden="true">→</span>
              </button>
              <label className="analysis-result__visibility">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={(event) => onVisibleChange(event.target.checked)}
                />
                <span>Vis resultatlaget</span>
              </label>
            </div>

            <div className="plan-nature-breakdown analysis-result__breakdown">
              <div className="plan-nature-breakdown__header">
                <div>
                  <p className="map-sidebar__eyebrow">Fordeling på økosystemtype</p>
                  <h4>Hva slags natur blir berørt?</h4>
                </div>
              </div>

              {natureBreakdownState === 'loading' ? (
                <p className="plan-nature-breakdown__status" role="status">
                  Beregner fordeling…
                </p>
              ) : natureBreakdownState === 'error' ? (
                <p
                  className="plan-nature-breakdown__status plan-nature-breakdown__status--error"
                  role="alert"
                >
                  Fordelingen kunne ikke beregnes nå.
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
                      Ca. {dekar(natureBreakdown.unclassifiedAreaKm2)} kunne ikke
                      fordeles sikkert på økosystemtype.
                    </p>
                  )}
                </>
              ) : null}
            </div>

            <details className="analysis-method">
              <summary>Metode og forbehold</summary>
              <p>
                Framtidig arealbruk med arealbruksstatus 2 og arealformål i
                1000- og 2000-serien krysses med Grunnkartet i nettleseren.
                Beregningen bruker ca. {Math.round(result.pixelMeters)} m ruter.
              </p>
              <p>
                Smale striper filtreres bort. Med smale striper ville naturanslaget
                vært ca. {dekar(result.natureWithNarrowStripsKm2)}. Resultatet er
                et prototypeanslag, ikke offisiell statistikk.
              </p>
            </details>
          </>
        ) : result?.status === 'not_available' ? (
          <div className="analysis-result__empty">
            <strong>Analysen er ikke klargjort for denne kommunen</strong>
            <p>{result.reason}</p>
          </div>
        ) : (
          <p className="plan-analysis__status">
            Velg kommune for å starte analysen.
          </p>
        )}
      </section>

      <p className="analysis-workbench__footnote">
        Analyseområdet og datagrunnlaget holdes adskilt. Resultatet er
        beslutningsstøtte og endrer ikke selve naturregnskapet.
      </p>
    </section>
  )
}
