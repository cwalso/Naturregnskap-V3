import { localityDaa } from '../future-analysis/localityPresentation'
import type { Result, Selection } from '../future-analysis/model'
import { planDaa, type PlanAreaResult, type PlanAreaSelection } from '../plan-area/model'
import { ExploreMapIcon } from './ExploreMapIcon'

export type AnalysisViewMode = 'map' | 'split' | 'results'
interface Props {
  mode: 'area' | 'nature'
  viewMode: AnalysisViewMode
  area: PlanAreaResult | null
  nature: Result | null
  loading: boolean
  error: string | null
  areaSelection: PlanAreaSelection
  natureSelection: Selection
  onMode: (mode: 'area' | 'nature') => void
  onView: (mode: AnalysisViewMode) => void
  onArea: (selection: PlanAreaSelection) => void
  onNature: (selection: Selection) => void
  canFit: boolean
  onFit: () => void
  onLayers: () => void
  onDetails: () => void
  onEnd: () => void
  layersOpen: boolean
  panelId: string
}

/** Presentation of existing, municipality-owned results. No analysis is performed here. */
export function MobileAnalysisControls(props: Props) {
  const {mode,viewMode,area,nature,areaSelection,natureSelection}=props
  const areaResult=area?.status==='available'?area:null
  const natureResult=nature?.status==='available'?nature:null
  const result=mode==='area'?area:nature
  const locality=!props.loading&&!props.error&&mode==='nature'&&natureSelection.kind==='locality'?natureResult?.localities.find(l=>l.id===natureSelection.label):null
  let label='Alle arealer', value: number | undefined
  if(mode==='area'&&areaResult){
    const category=areaSelection.kind==='category'?areaResult.categories.find(c=>c.id===areaSelection.id):null
    label=category?.label??(areaSelection.kind==='nature'?'Natur':areaSelection.kind==='agriculture'?'Jordbruk':'Alle arealer')
    value=category?.areaDaa??(areaSelection.kind==='nature'?areaResult.natureDaa:areaSelection.kind==='agriculture'?areaResult.agricultureDaa:areaResult.totalDaa)
  }else if(mode==='nature'&&natureResult){
    const metric=natureSelection.kind==='value'?natureResult.values.find(m=>m.label===natureSelection.label):natureSelection.kind==='type'?natureResult.types.find(m=>m.label===natureSelection.label):null
    label=(locality?(locality.name.trim()||locality.id):metric?.label)??'Samlet resultat'
    value=locality?.overlapAreaDaa??metric?.areaDaa??natureResult.uniqueAreaDaa
  }
  const available=Boolean(mode==='area'?areaResult:natureResult)&&!props.loading&&!props.error
  const selected=mode==='area'?(areaSelection.kind==='category'?`category:${areaSelection.id}`:areaSelection.kind):(natureSelection.kind==='all'?'all':`${natureSelection.kind}:${natureSelection.label}`)
  function select(value:string){
    const colon=value.indexOf(':'),kind=colon<0?value:value.slice(0,colon),id=value.slice(colon+1)
    if(mode==='area')props.onArea(kind==='category'?{kind:'category',id}:{kind:kind as 'all'|'nature'|'agriculture'})
    else props.onNature(kind==='all'?{kind:'all'}:{kind:kind as 'value'|'type'|'locality',label:id})
  }
  const invalidLocality=mode==='nature'&&natureSelection.kind==='locality'&&natureResult&&!props.loading&&!props.error&&!locality
  const status=invalidLocality?'Lokalitetsutvalget finnes ikke i denne analysen.':props.error?'Analysen kunne ikke hentes – ikke null treff.':props.loading?'Laster analyse…':result?.status==='not_available'?'Analysegrunnlag mangler – ikke null treff.':!available?'Venter på analysegrunnlag…':null
  return <>
    <div className="mobile-analysis-toolbar">
      <label className="sr-only" htmlFor={`${props.panelId}-mode`}>Velg aktiv plananalyse</label>
      <select id={`${props.panelId}-mode`} value={mode} onChange={e=>props.onMode(e.target.value as 'area'|'nature')}><option value="area">Arealfordeling</option><option value="nature">Registrerte naturverdier</option></select>
      <button type="button" onClick={props.onLayers} aria-expanded={props.layersOpen}><ExploreMapIcon name="layers" />Kartlag</button>
      <button type="button" className="mobile-analysis-end" onClick={props.onEnd} aria-label="Avslutt aktiv analyse"><ExploreMapIcon name="close" /></button>
    </div>
    <div className="mobile-analysis-modes" role="group" aria-label="Visning av kart og resultater">
      {([['map','Mer kart'],['split','Delt'],['results','Mer resultat']] as const).map(([value,label])=><button type="button" key={value} aria-pressed={viewMode===value} aria-controls={props.panelId} onClick={()=>props.onView(value)}>{label}</button>)}
    </div>
    <section className="mobile-analysis-summary" aria-label="Aktiv analyse og kartutvalg">
      <div className="mobile-analysis-summary__value" role="status">{status?<span>{status}</span>:<><strong>{locality?localityDaa(value!):planDaa(value!)}{locality&&<small> overlapp</small>}</strong><span title={locality?`${locality.id} · ${locality.value||'KU-verdi ikke oppgitt'}`:label}>{locality?`${locality.id}${locality.value?` · ${locality.value}`:''}`:label}{mode==='nature'&&natureSelection.kind==='all'?` · ${natureResult?.localityCount} lokaliteter`:''}</span></>}</div>
      <div className="mobile-analysis-summary__actions">
        <label className="sr-only" htmlFor={`${props.panelId}-selection`}>Kartutvalg i analysen</label>
        <select id={`${props.panelId}-selection`} value={selected} disabled={!available} onChange={e=>select(e.target.value)}>
          <option value="all">{mode==='area'?'Alle arealer':'Samlet resultat'}</option>
          {mode==='area'?<><option value="nature">Natur</option><option value="agriculture">Jordbruk</option>{areaResult?.categories.filter(c=>c.group==='nature'&&(areaResult.classification.status!=='error'||c.id==='unclassified-nature')).map(c=><option key={c.id} value={`category:${c.id}`}>{c.label}</option>)}</>:<>
            <optgroup label="KU-verdi">{natureResult?.values.map(m=><option key={m.label} value={`value:${m.label}`}>{m.label}</option>)}</optgroup>
            <optgroup label="Naturtype">{natureResult?.types.map(m=><option key={m.label} value={`type:${m.label}`}>{m.label}</option>)}</optgroup>
            {natureSelection.kind==='locality'&&<option value={selected}>{label}</option>}
          </>}
        </select>
        {locality&&<button type="button" className="mobile-analysis-details" onClick={props.onDetails} aria-label={`Åpne lokalitetsdetaljer for ${label} (${locality.id})`}>Detaljer</button>}
        <button type="button" disabled={!available||!props.canFit} title={!props.canFit?'Utvalget mangler gyldig analysegeometri.':undefined} onClick={props.onFit} aria-label="Tilpass aktivt kartutvalg"><ExploreMapIcon name="pin" />Tilpass kart</button>
      </div>
    </section>
  </>
}
