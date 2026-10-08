import { ValuedNatureResult } from './ValuedNatureResult'
import type { PlannedCoverageGap } from '../../api/valuedNatureStatistics'

import type { AnalysisPresentation, GrunnkartMapSelection } from '../../map/analysisPresentation'
import { AnalysisResultNotice } from './AnalysisResultNotice'
import type {
  PlannedDevelopmentResult,
  PlannedNatureBreakdown,
} from '../../map/plannedDevelopment'
import type {
  PlannedValuedNatureAnalysis,
  ValuedNatureMapSelection,
} from '../../map/plannedValuedNature'

export type PlannedDevelopmentAnalysisTarget = 'grunnkart' | 'valued-nature'

interface PlannedDevelopmentSummaryProps {
  readonly state: 'idle' | 'loading' | 'error'
  readonly result: PlannedDevelopmentResult | null
  readonly grunnkartMapSelection: GrunnkartMapSelection
  readonly onSelectGrunnkartInMap: (selection: GrunnkartMapSelection) => void
  readonly presentation: AnalysisPresentation
  readonly natureBreakdown: PlannedNatureBreakdown | null
  readonly natureBreakdownState: 'idle' | 'loading' | 'error'
  readonly analysisTarget: PlannedDevelopmentAnalysisTarget
  readonly onAnalysisTargetChange: (target: PlannedDevelopmentAnalysisTarget) => void
  readonly valuedNatureAnalysis: PlannedValuedNatureAnalysis | null
  readonly valuedNatureAnalysisState: 'idle' | 'loading' | 'error'
  readonly valuedNatureMapSelection: ValuedNatureMapSelection
  readonly onShowValuedNatureInMap: (selection: ValuedNatureMapSelection) => void
  readonly coverage: PlannedCoverageGap | null
  readonly coverageState: 'idle' | 'loading' | 'error'
  readonly selectedLocalityId: string | null
  readonly onSelectLocality: (id: string | null) => void
}

const areaFormatter = new Intl.NumberFormat('nb-NO', {
  maximumFractionDigits: 0,
})

const percentFormatter = new Intl.NumberFormat('nb-NO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const analysisTargets = [
  { id: 'grunnkart', label: 'Natur og jordbruk' },
  { id: 'valued-nature', label: 'Verdsatte naturtyper' },
] as const

function dekar(km2: number): string {
  const area = km2 * 1000
  return `${area > 0 && area < .1 ? 'under 0,1' : area < 100 ? new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 }).format(area) : areaFormatter.format(area)} dekar`
}

export function PlannedDevelopmentSummary({
  state,
  result,
  grunnkartMapSelection,
  onSelectGrunnkartInMap,
  presentation,
  natureBreakdown,
  natureBreakdownState,
  analysisTarget,
  onAnalysisTargetChange,
  valuedNatureAnalysis,
  valuedNatureAnalysisState,
  valuedNatureMapSelection,
  onShowValuedNatureInMap,
  coverage,
  coverageState,
  selectedLocalityId,
  onSelectLocality,
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

      <p className="analysis-fixed-area">Framtidig utbygging · områder satt av i kommuneplanen</p>
      <fieldset className="analysis-theme-choice">
        <legend>Analysetema</legend>
        <div className="analysis-target-list">
          {analysisTargets.map((target) => <label className={`analysis-target ${target.id === analysisTarget ? 'analysis-target--selected' : ''}`} key={target.id}>
            <input type="radio" name="analysis-theme" value={target.id} checked={target.id === analysisTarget} onChange={() => onAnalysisTargetChange(target.id)} />
            <strong>{target.label}</strong>
          </label>)}
        </div>
      </fieldset>
      <section className="analysis-output" aria-labelledby="analysis-result-heading">
        <div className="analysis-output__heading">
          <span className="analysis-step-label">
            <span id="analysis-result-heading">Resultat</span>
          </span>
          <strong>
            {analysisTarget === 'grunnkart' ? 'Natur og jordbruk' : selectedTarget.label}
          </strong>
        </div>

        {presentation.kind !== 'hits' && <AnalysisResultNotice presentation={presentation} />}
        {analysisTarget === 'valued-nature' ? (
          state !== 'idle' || valuedNatureAnalysisState !== 'idle' ? null : valuedNatureAnalysis ? (
            <ValuedNatureResult
              analysis={valuedNatureAnalysis}
              key={valuedNatureAnalysis.analysisId}
              coverage={coverage}
              coverageState={coverageState}
              selectedId={selectedLocalityId}
              onSelectLocality={onSelectLocality}
              selection={valuedNatureMapSelection}
              onShowInMap={onShowValuedNatureInMap}
            />
          ) : null
        ) : state !== 'idle' ? null : result?.status === 'available' ? (
          <>
            <div className="analysis-result__summary-grid">
              <button type="button"
                className={`analysis-result__metric analysis-result__metric--nature ${grunnkartMapSelection === 'nature' ? 'analysis-result__metric--selected' : ''}`}
                aria-label="Vis Natur i kartet"
                aria-describedby="nature-overlap-area nature-overlap-share"
                aria-pressed={grunnkartMapSelection === 'nature'}
                onClick={() => onSelectGrunnkartInMap('nature')}
              >
                <span>Natur som overlapper</span>
                <strong id="nature-overlap-area">ca. {dekar(result.natureKm2)}</strong>
                <small id="nature-overlap-share">
                  {result.natureShareOfAnalysisAreaPercent !== null
                    ? `${percentFormatter.format(result.natureShareOfAnalysisAreaPercent)} % av analyseområdet`
                    : 'Andel kan ikke beregnes sikkert'}
                </small>
                <em>{grunnkartMapSelection === 'nature' ? 'Valgt i kartet' : 'Fremhev i kartet'}</em>
              </button>
              <button type="button"
                className={`analysis-result__metric analysis-result__metric--agriculture ${grunnkartMapSelection === 'agriculture' ? 'analysis-result__metric--selected' : ''}`}
                aria-label="Vis Jordbruk i kartet"
                aria-describedby="agriculture-overlap-area agriculture-overlap-share"
                aria-pressed={grunnkartMapSelection === 'agriculture'}
                onClick={() => onSelectGrunnkartInMap('agriculture')}
              >
                <span>Jordbruk som overlapper</span>
                <strong id="agriculture-overlap-area">ca. {dekar(result.agricultureKm2)}</strong>
                <small id="agriculture-overlap-share">
                  {result.agricultureShareOfAnalysisAreaPercent !== null
                    ? `${percentFormatter.format(result.agricultureShareOfAnalysisAreaPercent)} % av analyseområdet`
                    : 'Berørt jordbruksareal i analyseområdet'}
                </small>
                <em>{grunnkartMapSelection === 'agriculture' ? 'Valgt i kartet' : 'Fremhev i kartet'}</em>
              </button>
            </div>

            {grunnkartMapSelection !== 'all' && <button type="button" className="analysis-result__clear-filter" onClick={() => onSelectGrunnkartInMap('all')}>Vis alle treff</button>}

            <details className="plan-nature-breakdown analysis-result__breakdown">
              <summary>Fordeling på økosystemtype</summary>

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
            </details>

            <details className="analysis-method">
              <summary>Metode og forbehold</summary>
              {result.analysisAreaKind === 'planned' ? (
                <>
                  <p>
                    Framtidig arealbruk med arealbruksstatus 2 og arealformål i
                    1000- og 2000-serien krysses med Grunnkartet i nettleseren.
                    Beregningen bruker ca. {Math.round(result.pixelMeters)} m ruter.
                  </p>
                  <p>
                    Smale striper filtreres bort. Med smale striper ville naturanslaget
                    vært ca. {dekar(result.natureWithNarrowStripsKm2)}.
                  </p>
                </>
              ) : (
                <p>
                  Det tegnede polygonet rasteriseres på samme ca.{' '}
                  {Math.round(result.pixelMeters)} m rutenett og avgrenses av gyldige piksler i kommunerasteret før det krysses med Grunnkartet.
                </p>
              )}
              <p>Resultatet er et prototypeanslag, ikke offisiell statistikk.</p>
            </details>
          </>
        ) : null}
      </section>

      <p className="analysis-workbench__footnote">
        Analyseområdet og datagrunnlaget holdes adskilt. Resultatet er
        beslutningsstøtte og endrer ikke selve naturregnskapet.
      </p>
    </section>
  )
}
