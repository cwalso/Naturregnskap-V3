import { planDaa, type PlanAreaResult, type PlanAreaSelection } from './model'
import './PlanArea.css'
const number = new Intl.NumberFormat('nb-NO',{maximumFractionDigits:2})
interface Props { result:PlanAreaResult|null;loading:boolean;error:string|null;selection:PlanAreaSelection;onSelect:(selection:PlanAreaSelection)=>void;onFit:()=>void;onShowMap:()=>void }
export function PlanAreaPanel({result,loading,error,selection,onSelect,onFit,onShowMap}:Props){
  if(loading)return <p role="status">Beregner natur og jordbruk innenfor planområdene…</p>
  if(error)return <p role="alert">{error} Planarealer er ikke beregnet; dette er ikke null treff.</p>
  if(result?.status==='not_available')return <p role="status">{result.reason}</p>
  if(!result)return <p role="status">Venter på kommunegrense og analysegrunnlag…</p>
  const selected=selection.kind==='category'?result.categories.find(c=>c.id===selection.id)?.label:selection.kind==='nature'?'Natur':selection.kind==='agriculture'?'Jordbruk':'Alle arealer'
  return <section className="plan-area-panel" aria-label="Arealfordeling i planområder">
    <p className="plan-area-source">Prototypeanalyse · reelle kartdata</p>
    <dl className="plan-area-totals"><div><dt>Natur</dt><dd>{planDaa(result.natureDaa)}</dd></div><div><dt>Jordbruk</dt><dd>{planDaa(result.agricultureDaa)}</dd></div><div><dt>Natur og jordbruk samlet</dt><dd>{planDaa(result.totalDaa)}</dd></div></dl>
    <p>Analysen viser natur og jordbruk innenfor arealer avsatt til framtidig utbygging i kommuneplanen. Arealene er ikke nødvendigvis bygget ut, og tallene viser ikke hvor mye natur som faktisk vil gå tapt.</p>
    <p className="plan-area-note">Fargelagte felt med mørk kontur viser det beregnede utvalget. Konturen gjør små felt synlige; den gir ikke mer presis arealavgrensning.</p>
    {result.totalDaa===0&&<p>Ingen natur- eller jordbruksruter treffer planavgrensningen i dette uttaket.</p>}
    <div className="plan-area-actions" role="group" aria-label="Velg arealer i kartet">{[['all','Alle arealer'],['nature','Natur'],['agriculture','Jordbruk']].map(([kind,label])=><button key={kind} type="button" aria-pressed={selection.kind===kind} onClick={()=>onSelect({kind:kind as 'all'|'nature'|'agriculture'})}>{label}</button>)}</div>
    <p role="status">Kartutvalg: {selected}. Kategoriutvalg beholder kartutsnittet.</p>
    <h3>Natur etter økosystemtype</h3>
    <p className="plan-area-note">Klikk en rad for å vise akkurat disse beregnede arealene i kartet.</p>
    {result.classification.status==='error'?<p role="alert">Økosystemkilden kunne ikke leses. Natur og jordbruk er beregnet, men naturfordelingen er utilgjengelig. Naturarealet vises ufordelt. {result.classification.reason}</p>:result.classification.status==='partial'&&<p className="plan-area-warning">Delvis fordeling: {planDaa(result.classification.unclassifiedDaa)} natur kan ikke sikkert klassifiseres. Kjente typer viser identifiserte delarealer. 0 daa er ikke dokumentert fravær av typen.</p>}
    <table className="plan-area-table" aria-label="Økosystemtyper innenfor planområder"><thead><tr><th scope="col">Kategori</th><th scope="col">Dekar</th></tr></thead><tbody>{result.categories.filter(c=>c.group==='nature'&&(result.classification.status!=='error'||c.id==='unclassified-nature')).map(c=><tr key={c.id}><th scope="row"><button type="button" aria-pressed={selection.kind==='category'&&selection.id===c.id} onClick={()=>onSelect({kind:'category',id:c.id})}><i style={{background:c.color}} aria-hidden="true"/>{c.label}</button></th><td>{number.format(c.areaDaa)}</td></tr>)}</tbody></table>
    <div className="plan-area-actions"><button type="button" onClick={()=>onSelect({kind:'all'})}>Nullstill utvalg</button><button type="button" onClick={onFit}>Tilpass kart til utvalget</button><button type="button" className="plan-area-show-map" onClick={onShowMap}>Vis kart</button></div>
    <details><summary>Metode, kilder og usikkerhet</summary>
      <p>DiBKs kommuneplandata med eksisterende filter for arealbruksstatus 2 og formål i 1000-/2000-serien. Dette er en prototypeforutsetning, ikke en ny juridisk vurdering av planstatus.</p>
      <p>Grunnkart {result.provenance.grunnkartVersion}. Raster fra {result.provenance.overviewRetrieved}. {result.provenance.classificationLevel} Jordbruk vises samlet; underkategorier er ikke beregnet.</p>
      <p>Planruter: {result.provenance.planCellMeters} m. Naturdetalj: {result.provenance.classificationCellMeters} m. Areal beregnes fra rutene i EPSG:25833, korrigert med kommunens UTM-faktor {result.provenance.areaFactor}. Kartet viser disse ruteflatene, ikke eksakte originale plan- eller økosystempolygoner.</p>
      <p>Ufordelt natur omfatter transparente, blandede og ukjente klassefarger. Disse fordeles ikke skjønnsmessig. Uttaket er hentet {result.provenance.retrievedAt}. Kildene er løpende og ikke låst til én felles versjon.</p>
      <p>Dette er heldekkende arealkontekst innenfor planmasken. Registrerte naturverdier analyseres separat og skal ikke summeres med disse arealene.</p>
      <p><a href={result.provenance.planSource} target="_blank" rel="noreferrer">Plankilde: DiBK</a> · <a href={result.provenance.classificationSource} target="_blank" rel="noreferrer">Grunnkart-kilde: NIBIO</a></p>
      <small>Metode: {result.methodVersion}. Analyse-ID: {result.analysisId}. Maske: {result.provenance.maskHash}. Klassifikasjon: {result.provenance.classificationHash}.</small>
    </details>
  </section>
}
