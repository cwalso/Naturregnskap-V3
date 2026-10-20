import { useMemo, useState } from 'react'
import type { Analysis, Result, Selection } from './model'
const format = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 })
const daa = (area: number) => `${format.format(area)} daa`
const colors = ['#AF0C0C', '#FD7032', '#FEC02D', '#FFFE37']
type Sort = 'name' | 'area' | 'count' | 'share' | 'value' | 'type'
interface Props { result: Result | null; loading: boolean; error: string | null; selection: Selection; onSelect: (selection: Selection) => void; onFit?:()=>void; canFit?:boolean }
export function AnalysisPanel({ result, loading, error, selection, onSelect, onFit, canFit=true }: Props) {
  const [search, setSearch] = useState(''), [typeSort, setTypeSort] = useState<Sort>('area'), [localitySort, setLocalitySort] = useState<Sort>('area')
  const analysis = result?.status === 'available' ? result : null
  const types = useMemo(() => [...(analysis?.types ?? [])].sort((a, b) => typeSort === 'area' ? b.areaDaa - a.areaDaa : typeSort === 'count' ? b.count - a.count : typeSort === 'value' ? a.values.join().localeCompare(b.values.join(), 'nb') : a.label.localeCompare(b.label, 'nb')), [analysis, typeSort])
  const localities = useMemo(() => (analysis?.localities ?? []).filter((l) => `${l.name} ${l.natureType} ${l.id} ${l.value}`.toLocaleLowerCase('nb').includes(search.toLocaleLowerCase('nb'))).slice().sort((a, b) => localitySort === 'area' ? b.overlapAreaDaa - a.overlapAreaDaa : localitySort === 'share' ? b.overlapSharePercent - a.overlapSharePercent : localitySort === 'value' ? a.value.localeCompare(b.value, 'nb') : localitySort === 'type' ? a.natureType.localeCompare(b.natureType, 'nb') : a.name.localeCompare(b.name, 'nb')), [analysis, search, localitySort])
  if (loading) return <p role="status">Henter kildegeometrier og beregner geometrisk overlapp…</p>
  if (error) return <p role="alert">{error} Analysen er utilgjengelig; dette er ikke null treff.</p>
  if (result?.status === 'not_available') return <p role="status">{result.reason}</p>
  if (!analysis) return <p role="status">Venter på analysegrunnlaget…</p>
  const selected = selection.kind === 'locality' ? analysis.localities.find((l) => l.id === selection.label) : null
  return <div className="future-nature-analysis">
    <p className="future-nature-analysis__intro">Analysen viser registrerte naturtypelokaliteter som geografisk overlapper områder avsatt til framtidig utbygging. Overlapp betyr ikke at området er bygget ut eller at naturverdiene nødvendigvis vil gå tapt.</p>
    <div className="future-nature-analysis__summary">
      <div><strong>{daa(analysis.uniqueAreaDaa)}</strong><span>Unikt overlappsareal</span></div>
      <div><strong>{analysis.localityCount}</strong><span>Berørte lokaliteter</span></div>
      <div><strong>{daa(analysis.values[0].areaDaa)}</strong><span>Svært stor verdi</span></div>
      <div><strong>{daa(analysis.values[1].areaDaa)}</strong><span>Stor verdi</span></div>
      <div><strong>{daa(analysis.highestAreaDaa)}</strong><span>De to høyeste samlet · {analysis.highestCount} lokaliteter</span></div>
    </div>
    <p role="status">{selection.kind === 'all' ? 'Kartet viser hele analysen.' : `Kartutvalg: ${selection.label}`}</p>
    <button type="button" onClick={() => onSelect({ kind: 'all' })}>Vis hele analysen</button>
    {onFit&&<button type="button" onClick={onFit} disabled={!canFit} title={!canFit?'Utvalget mangler gyldig analysegeometri.':undefined}>Tilpass kart til utvalget</button>}
    <p className="future-nature-analysis__legend"><span>▧</span> Hele lokaliteten · <b>■</b> faktisk overlapp mot rasteravgrensningen</p>
    <h3>Fordeling etter KU-verdi</h3>
    <div className="future-nature-analysis__values">{analysis.values.map((m, i) => <button type="button" key={m.label} aria-pressed={selection.kind === 'value' && selection.label === m.label} onClick={() => onSelect({ kind: 'value', label: m.label })}>
      <span>{m.label}</span><span className="future-nature-analysis__bar"><i style={{ width: `${m.sharePercent}%`, background: colors[i] }} /></span>
      <strong>{daa(m.areaDaa)}</strong><small>{m.count} lokaliteter · {format.format(m.sharePercent)} % av unikt areal</small>
    </button>)}</div>
    <h3>Fordeling etter naturtype</h3>
    <p>Hver naturtype viser unikt areal innen typen. Ulike naturtyper kan overlappe; radene skal ikke summeres til totalarealet.</p>
    <label>Sorter naturtyper <select value={typeSort} onChange={(e) => setTypeSort(e.target.value as Sort)}><option value="area">Overlappsareal, størst først</option><option value="name">Naturtype, alfabetisk</option><option value="count">Antall lokaliteter, flest først</option><option value="value">KU-verdier</option></select></label>
    <div className="future-nature-analysis__table" tabIndex={0} role="region" aria-label="Rullbar naturtypeoversikt"><table><caption>Naturtyper med overlapp</caption><thead><tr><th>Naturtype</th><th>Areal</th><th>Antall</th><th>KU-verdier</th></tr></thead><tbody>{types.map((m) => <tr key={m.label}><td><button type="button" aria-pressed={selection.kind === 'type' && selection.label === m.label} onClick={() => onSelect({ kind: 'type', label: m.label })}>{m.label}</button></td><td>{daa(m.areaDaa)}</td><td>{m.count}</td><td>{m.values.join(', ')}</td></tr>)}</tbody></table></div>
    <h3>Berørte lokaliteter</h3>
    <label>Søk etter lokalitet <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
    <label>Sorter lokaliteter <select value={localitySort} onChange={(e) => setLocalitySort(e.target.value as Sort)}><option value="area">Overlappsareal, størst først</option><option value="share">Overlappsandel, størst først</option><option value="name">Lokalitet, alfabetisk</option><option value="type">Naturtype, alfabetisk</option><option value="value">KU-verdi</option></select></label>
    <div className="future-nature-analysis__table" tabIndex={0} role="region" aria-label="Rullbar lokalitetsoversikt"><table><caption>{localities.length} av {analysis.localityCount} lokaliteter</caption><thead><tr><th>Lokalitet / naturtype</th><th>KU-verdi</th><th>Overlapp</th><th>Andel</th></tr></thead><tbody>{localities.map((l) => <tr key={l.id}><td><button type="button" aria-pressed={selection.kind === 'locality' && selection.label === l.id} onClick={() => onSelect({ kind: 'locality', label: l.id })}>{l.name}<small>{l.natureType} · {l.id}</small></button></td><td>{l.value}</td><td>{daa(l.overlapAreaDaa)}</td><td>{format.format(l.overlapSharePercent)} %</td></tr>)}</tbody></table></div>
    {selected && <section aria-label="Valgt lokalitet"><h3>{selected.name}</h3><p>{selected.natureType} · {selected.value}</p><p>Hele lokaliteten: {daa(selected.totalAreaDaa)}. Overlapp: {daa(selected.overlapAreaDaa)} ({format.format(selected.overlapSharePercent)} %).</p><small>Faglig ID: {selected.id}. KU-ID: {selected.kuIds.join(', ')}. Kildeobjekter: {selected.objectIds.join(', ')}.</small></section>}
    <Method analysis={analysis} />
  </div>
}
function Method({ analysis }: { analysis: Analysis }) {
  const excluded = Object.entries(analysis.quality.excludedCategories)
  return <details><summary>Metode, kilder og datakvalitet</summary>
    <p>Geometrisk overlapp mot rasterbasert analyseavgrensning. DiBK kommuneplaner: arealbruksstatus 2 og arealformål som starter med 1 eller 2, begrenset til Natur og Jordbruk i Grunnkart nivå 0. Planstatus er ikke ytterligere juridisk verifisert.</p>
    <p>Rasterceller på {format.format(analysis.provenance.gridMeters)} m i EPSG:25833. Smale komponenter beholdes. Kildepolygoner skjæres mot celleflatene; delceller beregnes geometrisk. Dette er ikke eksakt skjæring mot opprinnelige planpolygoner. Felles UTM-målestokkskorreksjon ved kommunemidtpunktet: {analysis.provenance.areaFactor.toFixed(8)}.</p>
    <p>Høyeste registrerte KU-verdi får fellesareal som analysekonvensjon. KU-arealene summerer til unik union, med toleranse 0,01 m² før arealkorreksjon. Lokalitetstall følger faktisk kategori. Hele lokalitetsgeometrien, også utenfor kommunen, er nevner for overlappsandel.</p>
    <p>Registrerte naturtyper er ikke heldekkende kunnskap om naturverdier. Manglende treff betyr ikke manglende naturverdi. Analysen er prototypebeslutningsstøtte, ikke naturtapsregnskap eller konsekvensutredning.</p>
    <p>{analysis.quality.sourceObjectCount} kildeobjekter kontrollert. {excluded.length ? excluded.map(([category, count]) => `${count} med «${category}»`).join('; ') + ' er utelatt fra hovedberegningen.' : 'Ingen andre eller manglende KU-kategorier i uttrekket.'} Ugyldig eller ufullstendig geometri stopper beregningen.</p>
    <p>Grunnkart {analysis.provenance.grunnkartVersion}. {analysis.provenance.sourceVersion}. Hentet {analysis.provenance.retrievedAt}. Beregningstid: {format.format(analysis.provenance.computationMs / 1000)} s.</p>
    <small>Metode: {analysis.methodVersion}. Analyse-ID: {analysis.analysisId}. Kilde: {analysis.provenance.source}.</small>
  </details>
}
