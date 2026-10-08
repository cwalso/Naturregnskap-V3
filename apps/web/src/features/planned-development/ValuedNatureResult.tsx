import type { PlannedCoverageGap } from '../../api/valuedNatureStatistics'
import { useEffect, useRef, useState } from 'react'
import type { PlannedValuedNatureAnalysis, ValuedNatureMapSelection } from '../../map/plannedValuedNature'
import { filterValuedLocalities } from '../../map/valuedNaturePresentation'

const number = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })
const whole = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })
const dekar = (km2: number) => {
  const area = km2 * 1000
  return `${area > 0 && area < .1 ? 'under 0,1' : (area < 100 ? number : whole).format(area)} dekar`
}

export function ValuedNatureResult({ analysis, visible, onVisibleChange, selection, onShowInMap, selectedId, onSelectLocality, coverage, coverageState }: {
  readonly coverage: PlannedCoverageGap | null
  readonly coverageState: 'idle' | 'loading' | 'error'
  readonly analysis: PlannedValuedNatureAnalysis
  readonly visible: boolean
  readonly onVisibleChange: (visible: boolean) => void
  readonly selection: ValuedNatureMapSelection
  readonly onShowInMap: (selection: ValuedNatureMapSelection) => void
  readonly selectedId: string | null
  readonly onSelectLocality: (id: string | null) => void
}) {
  const localities = filterValuedLocalities(analysis.localities, selection)
  const selected = localities.find((locality) => locality.id === selectedId)
  const filteredMetric = selection.kind === 'all' ? null : (selection.kind === 'value' ? analysis.valueMetrics : analysis.typeMetrics).find((metric) => metric.label === selection.label)
  const [limit, setLimit] = useState(20)
  const selectedRow = useRef<HTMLButtonElement>(null)
  const selectedIndex = localities.findIndex((locality) => locality.id === selectedId)
  const displayed = localities.slice(0, Math.max(limit, selectedIndex + 1))
  useEffect(() => {
    const row = selectedRow.current
    const list = row?.closest('.locality-list')
    if (!selectedId || !row || !list) return
    const bounds = row.getBoundingClientRect()
    const viewport = list.getBoundingClientRect()
    if (bounds.top < viewport.top) list.scrollTop += bounds.top - viewport.top
    else if (bounds.bottom > viewport.bottom) list.scrollTop += bounds.bottom - viewport.bottom
  }, [selectedId])

  return <div className="valued-nature-result locality-result">
    <div className="locality-result__totals">
      <div><strong>{analysis.affectedFeatureCount}</strong><span>Berørte lokaliteter</span></div>
      <div><strong>ca. {dekar(analysis.uniqueOverlapAreaKm2)}</strong><span>Unikt overlappsareal</span></div>
    </div>
    <div className="analysis-result__map-actions">
      <button type="button" className="analysis-result__primary-action" onClick={() => onShowInMap(selection)}>Zoom til treff</button>
      <label className="analysis-result__visibility"><input type="checkbox" checked={visible} onChange={(event) => onVisibleChange(event.target.checked)} />Vis resultatlaget</label>
    </div>
    <p className="locality-coverage"><strong>{coverageState === 'loading' ? 'Henter kartleggingsdekning…' : coverageState === 'error' ? 'Dekningsdata kunne ikke hentes. Registrert dekning er ukjent.' : coverage ? coverage.mappedPlannedAreaKm2 > 0 ? `Ca. ${number.format(coverage.mappedSharePercent)} % av analysemasken har registrert kartlegging.` : 'Ingen kartlegging registrert i dekningskilden for analysemasken.' : 'Registrert dekning: ukjent for analyseområdet.'}</strong>
      {coverage && <span>Ca. {dekar(coverage.unmappedPlannedAreaKm2)} uten registrert dekning. Dette er andel av hele den gyldige analysemasken, inkludert vann og bebygd areal, ikke kommunens kartleggingsgrad av landarealet. </span>} Datasettet er ikke heldekkende. Ingen registrerte treff betyr ikke fravær av naturverdi. Areal uten treff kan være ukartlagt.</p>
    {analysis.affectedFeatureCount > 0 && <>
      <div className="locality-filters" aria-label="Filtrer berørte lokaliteter">
        <div className="locality-filters__values">
          <button type="button" aria-pressed={selection.kind === 'all'} onClick={() => onShowInMap({ kind: 'all' })}>Vis alle</button>
          {analysis.valueMetrics.map((metric) => <button type="button" key={metric.label} aria-pressed={selection.kind === 'value' && selection.label === metric.label} onClick={() => onShowInMap({ kind: 'value', label: metric.label })}>
            <i style={{ background: metric.color }} aria-hidden="true" />{metric.label}<small>{metric.featureCount}</small>
          </button>)}
        </div>
        <label>Naturtype<select value={selection.kind === 'type' ? selection.label : ''} onChange={(event) => onShowInMap(event.target.value ? { kind: 'type', label: event.target.value } : { kind: 'all' })}>
          <option value="">Alle naturtyper</option>
          {analysis.typeMetrics.map((metric) => <option key={metric.label} value={metric.label}>{metric.label} ({metric.featureCount})</option>)}
        </select></label>
      </div>
      {selection.kind !== 'all' && <p className="analysis-result__active-filter">Kart og liste: <strong>{selection.label}</strong><br />
        Ca. {dekar(filteredMetric?.areaKm2 ?? 0)} {selection.kind === 'value' ? 'unikt areal med denne verdien' : 'registrert overlapp (kan dobbelttelle)'}.
      </p>}
      <div className="locality-list__heading"><strong>Lokaliteter</strong><small>{localities.length} av {analysis.affectedFeatureCount}</small></div>
      <ul className="locality-list" aria-label="Berørte lokaliteter">
        {displayed.map((locality) => <li key={locality.id}><button type="button" ref={selectedId === locality.id ? selectedRow : undefined} aria-pressed={selectedId === locality.id} onClick={() => onSelectLocality(locality.id)}>
          <i className="locality-list__swatch" style={{ background: locality.color }} aria-hidden="true" />
          <span><strong>{locality.name === 'Ikke oppgitt' ? `Lokalitet ${locality.id}` : locality.name}</strong><small>{locality.natureType}</small><small>{locality.value} · ca. {dekar(locality.overlapAreaKm2)} overlapp</small></span>
        </button></li>)}
      </ul>
      {localities.length > displayed.length && <button type="button" className="analysis-result__clear-filter" onClick={() => setLimit(limit + 20)}>Vis flere lokaliteter ({localities.length - displayed.length})</button>}
      {selected && <section className="locality-detail" aria-label="Valgt lokalitet">
        <div><strong>Valgt lokalitet</strong><button type="button" onClick={() => onSelectLocality(null)}>Fjern valg</button></div>
        <h4>{selected.name === 'Ikke oppgitt' ? `Lokalitet ${selected.id}` : selected.name}</h4>
        <p>{selected.natureType} · {selected.value}</p>
        <p>Ca. {dekar(selected.overlapAreaKm2)} registrert overlapp. Kan overlappe andre lokaliteter. Kilde-ID: {selected.id}.</p>
      </section>}
    </>}
    <details className="analysis-method"><summary>Metode og forbehold</summary>
      <p>Tallene er prototypebeslutningsstøtte på ca. 21,16 m analysegrid. Unikt areal teller hver rute én gang. Fire verdikategorier inngår: svært stor, stor, middels og noe verdi. Høyeste verdi vinner i overlappende ruter; verdifordelingen summerer til unikt areal. Registrert areal per lokalitet og naturtype kan overlappe og summerer derfor ikke nødvendigvis til unikt areal. Små treff uten et gyldig rutemidtpunkt telles ikke. UTM-arealer er målestokkskorrigert ved kommunemidtpunktet.</p>
      <p>Kartet viser kildepolygoner. Svake flater er hele berørte lokaliteter; sterkt fyll er avgrenset til den gyldige rastermasken, ikke en eksakt vektorinterseksjon. Ved verdifilter fylles bare ruter tilordnet denne verdien; lokalitetens øvrige geometri er svak kontekst. Høyeste verdi tegnes øverst når alle vises. Tegnet område beholdes som stiplet ramme.</p>
      <p>Registrert overlappsareal: ca. {dekar(analysis.registeredOverlapAreaKm2)}. {analysis.hasOverlappingRegistrations && 'Registreringene overlapper hverandre.'} Verdifordelingen nedenfor gjelder unikt areal med høyeste verdi; naturtypefordelingen gjelder registrert areal.</p>
      <dl className="locality-method-metrics">{analysis.valueMetrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{dekar(metric.areaKm2)} · {number.format(metric.sharePercent)} %</dd></div>)}</dl>
      <dl className="locality-method-metrics">{analysis.typeMetrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{dekar(metric.areaKm2)} registrert overlapp · {metric.featureCount} lokaliteter</dd></div>)}</dl>
      <p>Kilden er en løpende tjeneste. Supplerende temadata endrer ikke naturregnskapet. Dekning beregnes som union av kartleggingsflater på samme gyldige analysegrid. Areal uten dekning er ukjent; dekning betyr ikke at all naturverdi er registrert.</p>
    </details>
  </div>
}
