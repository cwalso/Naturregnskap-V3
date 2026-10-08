import { useEffect, useState } from 'react'
import { ValuedNatureResult } from './ValuedNatureResult'
import type { PlannedCoverageGap } from '../../api/valuedNatureStatistics'

import {
  protectedAreas,
  valuedNature,
  wildReindeerAreas,
} from '../../datasets/registry'
import type { DrawnAnalysisArea } from '../../map/drawnAnalysis'
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

export type AnalysisAreaMode = 'planned' | 'drawn'

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
  readonly grunnkartMapSelection: GrunnkartMapSelection
  readonly onSelectGrunnkartInMap: (selection: GrunnkartMapSelection) => void
  readonly presentation: AnalysisPresentation
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
  readonly coverage: PlannedCoverageGap | null
  readonly coverageState: 'idle' | 'loading' | 'error'
  readonly selectedLocalityId: string | null
  readonly onSelectLocality: (id: string | null) => void
  readonly analysisAreaMode: AnalysisAreaMode
  readonly drawnArea: DrawnAnalysisArea | null
  readonly drawing: boolean
  readonly onUsePlannedArea: () => void
  readonly onUseDrawnArea: () => void
  readonly onStartDrawing: () => void
  readonly onFinishDrawing: () => void
  readonly onUndoDrawing: () => void
  readonly onCancelDrawing: () => void
  readonly onClearDrawnArea: () => void
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
  const area = km2 * 1000
  return `${area > 0 && area < .1 ? 'under 0,1' : area < 100 ? new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 }).format(area) : areaFormatter.format(area)} dekar`
}

export function PlannedDevelopmentSummary({
  state,
  result,
  visible,
  onVisibleChange,
  onFindGrunnkartResultInMap,
  grunnkartMapSelection,
  onSelectGrunnkartInMap,
  presentation,
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
  coverage,
  coverageState,
  selectedLocalityId,
  onSelectLocality,
  analysisAreaMode,
  drawnArea,
  drawing,
  onUsePlannedArea,
  onUseDrawnArea,
  onStartDrawing,
  onFinishDrawing,
  onUndoDrawing,
  onCancelDrawing,
  onClearDrawnArea,
}: PlannedDevelopmentSummaryProps) {
  const selectedTarget = analysisTargets.find((target) => target.id === analysisTarget)
    ?? analysisTargets[0]
  const areaLabel = analysisAreaMode === 'drawn' ? 'Eget tegnet område' : 'Framtidig utbygging'
  const drawnAreaDekar = drawnArea ? dekar(drawnArea.areaKm2) : null
  const [setupOpen, setSetupOpen] = useState(false)
  useEffect(() => {
    if (result?.status === 'available' && !drawing) setSetupOpen(false)
  }, [result, drawing, analysisTarget])

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

      <details className="analysis-setup" open={setupOpen || !result || drawing || result.status !== 'available'} onToggle={(event) => setSetupOpen(event.currentTarget.open)}>
        <summary>{areaLabel} · {analysisTarget === 'grunnkart' ? 'Natur og jordbruk' : selectedTarget.label} <span>Endre</span></summary>
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
              className={
                analysisAreaMode === 'planned'
                  ? 'analysis-area-option analysis-area-option--selected'
                  : 'analysis-area-option'
              }
              aria-pressed={analysisAreaMode === 'planned'}
              onClick={onUsePlannedArea}
            >
              <span className="analysis-area-option__icon" aria-hidden="true">▧</span>
              <span>
                <strong>Framtidig utbygging</strong>
                <small>Områder satt av til framtidig utbygging i kommuneplanen</small>
              </span>
              <span className="analysis-area-option__state">
                {analysisAreaMode === 'planned' ? 'Valgt' : 'Velg'}
              </span>
            </button>

            <button
              type="button"
              className={
                analysisAreaMode === 'drawn' || drawing
                  ? 'analysis-area-option analysis-area-option--selected'
                  : 'analysis-area-option'
              }
              aria-pressed={analysisAreaMode === 'drawn'}
              onClick={drawnArea ? onUseDrawnArea : onStartDrawing}
            >
              <span className="analysis-area-option__icon" aria-hidden="true">✎</span>
              <span>
                <strong>{drawing ? 'Tegner område…' : 'Eget område'}</strong>
                <small>
                  {drawnArea
                    ? `Tegnet polygon · ca. ${drawnAreaDekar}`
                    : 'Tegn et polygon direkte i kartet'}
                </small>
              </span>
              <span className="analysis-area-option__state">
                {drawing ? 'Aktiv' : analysisAreaMode === 'drawn' ? 'Valgt' : 'Tegn'}
              </span>
            </button>
          </div>

          {drawing && (
            <div className="analysis-draw-controls" role="status">
              <p>
                Trykk i kartet for hvert hjørne. Avslutt på første punkt eller bruk
                «Ferdig» når polygonet har minst tre punkter.
              </p>
              <div>
                <button type="button" onClick={onUndoDrawing}>Angre punkt</button>
                <button type="button" onClick={onFinishDrawing}>Ferdig</button>
                <button type="button" onClick={onCancelDrawing}>Avbryt</button>
              </div>
            </div>
          )}


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

      </details>
      {drawnArea && !drawing && <div className="analysis-drawn-actions analysis-drawn-actions--persistent">
        <button type="button" onClick={onStartDrawing}>Tegn på nytt</button>
        <button type="button" onClick={onClearDrawnArea}>Fjern område</button>
      </div>}
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

        <AnalysisResultNotice presentation={presentation} />
        {analysisTarget === 'valued-nature' ? (
          state !== 'idle' || valuedNatureAnalysisState !== 'idle' ? null : valuedNatureAnalysis ? (
            <ValuedNatureResult
              analysis={valuedNatureAnalysis}
              visible={valuedNatureResultVisible}
              key={valuedNatureAnalysis.analysisId}
              coverage={coverage}
              coverageState={coverageState}
              selectedId={selectedLocalityId}
              onSelectLocality={onSelectLocality}
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
                <em>{grunnkartMapSelection === 'nature' ? 'Valgt i kartet' : 'Vis i kartet →'}</em>
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
                <em>{grunnkartMapSelection === 'agriculture' ? 'Valgt i kartet' : 'Vis i kartet →'}</em>
              </button>
            </div>

            <div className="analysis-result__map-actions">
              <button
                type="button"
                className="analysis-result__primary-action"
                onClick={onFindGrunnkartResultInMap}
              >
                Zoom til treff
              </button>
              <label className="analysis-result__visibility">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={(event) => onVisibleChange(event.target.checked)}
                />
                <span>Vis resultatlaget</span>
              </label>
              {grunnkartMapSelection !== 'all' && <button type="button" className="analysis-result__clear-filter" onClick={() => onSelectGrunnkartInMap('all')}>Vis alle treff</button>}
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
