import { useEffect, useState } from 'react'
import type { Municipality, MunicipalityBoundary } from '../../api/municipalities'
import type { PlannedCoverageGap } from '../../api/valuedNatureStatistics'
import type { PlannedDevelopmentResult } from '../../map/plannedDevelopment'
import type { PlannedValuedNatureAnalysis, ValuedNatureMapSelection } from '../../map/plannedValuedNature'
import { filterValuedLocalities } from '../../map/valuedNaturePresentation'
import { ExploreAnalysisMap } from './ExploreAnalysisMap'

type LoadState = 'idle' | 'loading' | 'error'
const number = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })
const area = (km2: number) => `${number.format(km2 * 1000)} dekar`
const share = (percent: number | null) => percent === null ? 'Andel kan ikke beregnes uten gyldig analyseareal' : `${number.format(percent)} % av gyldig analyseareal`
interface Props {
  readonly municipality: Municipality
  readonly boundary: MunicipalityBoundary | null
  readonly result: PlannedDevelopmentResult | null
  readonly state: LoadState
  readonly target: 'grunnkart' | 'valued-nature'
  readonly onTargetChange: (target: 'grunnkart' | 'valued-nature') => void
  readonly valued: PlannedValuedNatureAnalysis | null
  readonly valuedState: LoadState
  readonly coverage: PlannedCoverageGap | null
  readonly coverageState: LoadState
}

export function ExploreAnalysisWorkspace({ municipality, boundary, result, state, target, onTargetChange, valued, valuedState, coverage, coverageState }: Props) {
  const plan = result?.status === 'available' && result.municipalityNumber === municipality.number
    && result.analysisId === `planned:${municipality.number}` && result.analysisAreaKind === 'planned' ? result : null
  const activeValued = plan && target === 'valued-nature' && valued?.municipalityNumber === plan.municipalityNumber && valued.analysisId === plan.analysisId ? valued : null
  const activeCoverage = plan && coverage?.municipalityNumber === plan.municipalityNumber && coverage.analysisId === plan.analysisId ? coverage : null
  const owner = `${municipality.number}:${plan?.analysisId ?? ''}:${target}`
  const [choice, setChoice] = useState<{ owner: string; selection: ValuedNatureMapSelection; id: string | null }>({ owner, selection: { kind: 'all' }, id: null })
  useEffect(() => { setChoice({ owner, selection: { kind: 'all' }, id: null }) }, [owner])
  const selection: ValuedNatureMapSelection = choice.owner === owner ? choice.selection : { kind: 'all' }
  const localities = activeValued ? filterValuedLocalities(activeValued.localities, selection) : []
  const selectedMetric = activeValued && selection.kind !== 'all'
    ? (selection.kind === 'value' ? activeValued.valueMetrics : activeValued.typeMetrics).find((metric) => metric.label === selection.label) : null
  const selected = choice.owner === owner ? localities.find((item) => item.id === choice.id) : undefined
  const choose = (selection: ValuedNatureMapSelection) => setChoice({ owner, selection, id: null })
  const selectLocality = (id: string | null) => setChoice({ owner, selection, id: id && localities.some((item) => item.id === id) ? id : null })
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return <section className="explore-workspace" aria-label="Analyseverksted">
    <div className="explore-workspace__setup">
      <p><strong>Analyseområde:</strong> Framtidig utbygging fra kommuneplanen</p>
      <fieldset><legend>Kryss området med</legend>
        <label><input type="radio" name="explore-basis" checked={target === 'grunnkart'} onChange={() => onTargetChange('grunnkart')} />Natur og jordbruk</label>
        <label><input type="radio" name="explore-basis" checked={target === 'valued-nature'} onChange={() => onTargetChange('valued-nature')} />Verdsatte naturtyper</label>
      </fieldset>
    </div>
    <nav className="explore-workspace__mobile" aria-label="Hurtignavigasjon i kartvisningen">
      <button type="button" onClick={() => jump('explore-map')}>Kart</button>
      <button type="button" onClick={() => jump('explore-result')}>Resultat</button>
    </nav>
    <div className="explore-workspace__body">
      <div id="explore-map"><ExploreAnalysisMap
        boundary={boundary?.properties.number === municipality.number ? boundary : null}
        showValuedNature={target === 'valued-nature'} showNatureAgriculture={target === 'grunnkart'}
        plan={plan} valued={activeValued} selection={selection} selectedLocalityId={selected?.id ?? null} onSelectLocality={selectLocality}
      /></div>
      <aside id="explore-result" className="explore-workspace__result" aria-label="Analyseresultat">
        <h2>Hva blir berørt?</h2>
        {state === 'loading' && <p role="status">Beregner framtidig utbygging…</p>}
        {state === 'error' && <p role="alert">Teknisk feil: plananalysen kunne ikke beregnes. Dette er ikke null treff.</p>}
        {result?.municipalityNumber === municipality.number && result.status === 'not_available' && <p>{result.reason}</p>}
        {plan && target === 'grunnkart' && <>
          <dl className="explore-workspace__totals">
            <div><dt>Natur</dt><dd>{area(plan.natureKm2)}<small>{share(plan.natureShareOfAnalysisAreaPercent)}</small></dd></div>
            <div><dt>Jordbruk</dt><dd>{area(plan.agricultureKm2)}<small>{share(plan.agricultureShareOfAnalysisAreaPercent)}</small></dd></div>
          </dl>
          {plan.natureKm2 === 0 && plan.agricultureKm2 === 0 && <p>Ingen Natur/Jordbruk-treff i det gyldige analyseområdet.</p>}
        </>}
        {plan && target === 'valued-nature' && <>
          {valuedState === 'loading' && <p role="status">Beregner berørte naturtypelokaliteter…</p>}
          {valuedState === 'error' && <p role="alert">Teknisk feil: naturtypeanalysen kunne ikke hentes. Temakartet kan fortsatt vises; dette er ikke null treff.</p>}
          {activeValued && <>
            <dl className="explore-workspace__totals"><div><dt>Berørte lokaliteter</dt><dd>{activeValued.affectedFeatureCount}</dd></div><div><dt>Unikt overlappsareal</dt><dd>{area(activeValued.uniqueOverlapAreaKm2)}</dd></div></dl>
            {!activeValued.affectedFeatureCount && <p>Ingen registrerte treff. Datasettet er ikke heldekkende; dette betyr ikke fravær av naturverdi.</p>}
            <h3>Verdifordeling</h3>
            <div className="explore-workspace__values">
              <button type="button" aria-pressed={selection.kind === 'all'} onClick={() => choose({ kind: 'all' })}>Vis alle</button>
              {activeValued.valueMetrics.map((metric) => <button key={metric.label} type="button" aria-pressed={selection.kind === 'value' && selection.label === metric.label} onClick={() => choose({ kind: 'value', label: metric.label })}><i style={{ background: metric.color }} />{metric.label}<small>{area(metric.areaKm2)} · {number.format(metric.sharePercent)} %</small></button>)}
            </div>
            <label className="explore-workspace__type">Naturtype<select value={selection.kind === 'type' ? selection.label : ''} onChange={(event) => choose(event.target.value ? { kind: 'type', label: event.target.value } : { kind: 'all' })}><option value="">Alle naturtyper</option>{activeValued.typeMetrics.map((metric) => <option key={metric.label} value={metric.label}>{metric.label}</option>)}</select></label>
            {selection.kind !== 'all' && <p>Kart og liste: {selection.label}, {localities.length} lokaliteter og {area(selectedMetric?.areaKm2 ?? 0)} {selection.kind === 'value' ? 'unikt areal med denne verdien' : 'registrert overlapp (kan dobbelttelle)'}. Hovedtallene gjelder hele analysen.</p>}
            <details open><summary>Lokaliteter ({localities.length})</summary>
              <ul className="explore-workspace__localities" aria-label="Berørte lokaliteter">{localities.map((locality) => <li key={locality.id}><button type="button" aria-pressed={selected?.id === locality.id} onClick={() => selectLocality(locality.id)}><strong>{locality.name === 'Ikke oppgitt' ? `Lokalitet ${locality.id}` : locality.name}</strong><small>{locality.natureType} · {locality.value}</small></button></li>)}</ul>
            </details>
            {selected && <section aria-label="Valgt lokalitet"><h3>{selected.name}</h3><p>{selected.natureType} · {selected.value}</p><p>{area(selected.overlapAreaKm2)} registrert overlapp · kilde-ID {selected.id}</p><button type="button" onClick={() => selectLocality(null)}>Fjern valg</button></section>}
          </>}
        </>}
        <details className="explore-workspace__method"><summary>Dekning, metode og forbehold</summary>
          {target === 'valued-nature' && <p>{coverageState === 'error' ? 'Kartleggingsdekningen er ukjent på grunn av teknisk feil.' : coverageState === 'loading' ? 'Henter kartleggingsdekning…' : activeCoverage ? activeCoverage.mappedPlannedAreaKm2 === 0 ? 'Ingen kartlegging registrert i dekningskilden for analysemasken.' : `${number.format(activeCoverage.mappedSharePercent)} % av gyldig analyseområde har registrert kartleggingsdekning.` : 'Kartleggingsdekningen er ikke tilgjengelig.'} Dekning er ikke en garanti for at all naturverdi er registrert.</p>}
          <p>Prototypebeslutningsstøtte, ikke autoritative regnskapstall. Plananalysen er foreløpig klargjort for Trondheim.</p>
          {plan && <p>Gyldig analyseareal: {area(plan.analysisAreaKm2 ?? 0)}. Natur/Jordbruk-andeler bruker hele den gyldige masken, også gyldige Bebygd-/vannpiksler, som nevner.</p>}
          <p>Analysegrid ca. 21,16 m. Kommuneavgrensningen i beregningen følger gyldige rasterpiksler; kartmaskeringen er visuell. UTM-arealer er målestokkskorrigert.</p>
          {target === 'valued-nature' && <p>Supplerende temadata endrer ikke naturregnskapet. Unik overlapp teller hver rute én gang, med høyeste verdi blant fire verdikategorier. Registrert areal per lokalitet/naturtype kan dobbelttelle. Små treff uten gyldig rutemidtpunkt kan overses. Naturtype-WMS viser kildegrenser; lilla treff følger beregningsgridet.</p>}
        </details>
      </aside>
    </div>
  </section>
}
