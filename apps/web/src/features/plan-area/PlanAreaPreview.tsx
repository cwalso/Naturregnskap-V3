import { planDaa, type PlanAreaResult } from './model'
import './PlanArea.css'
export function PlanAreaPreview({result,state,municipalityNumber}:{readonly result:PlanAreaResult|null;readonly state:'idle'|'loading'|'error';readonly municipalityNumber:string}){
  const active=result?.municipalityNumber===municipalityNumber?result:null
  if(state==='loading')return <p role="status">Henter arealfordeling i planområdene…</p>
  if(state==='error')return <p role="alert">Planarealene kunne ikke beregnes. Dette betyr ikke null treff.</p>
  if(!active||active.status==='not_available')return <p className="plan-area-note">{active?.status==='not_available'?active.reason:'Tilgjengelig analysegrunnlag vises i kartanalysen.'}</p>
  const forest=active.categories.find(c=>c.id==='skog')
  return <div className="plan-area-preview" aria-label="Oppsummering av arealer i planområder">
    <p className="plan-area-source">Prototypeanalyse · reelle kartdata · Grunnkart og kommuneplan</p>
    <dl className="plan-area-preview__metrics"><div><dt>Natur innenfor planområdene</dt><dd>{planDaa(active.natureDaa)}</dd></div><div><dt>Jordbruk innenfor planområdene</dt><dd>{planDaa(active.agricultureDaa)}</dd></div>{active.classification.status!=='error'&&forest&&<div><dt>Identifisert skog, del av natur</dt><dd>{planDaa(forest.areaDaa)}</dd></div>}</dl>
    {active.classification.status==='partial'&&<p className="plan-area-note">Delvis økosystemfordeling: {planDaa(active.classification.unclassifiedDaa)} natur er ufordelt. Ingen ukjente arealer er fordelt på typer.</p>}
    {active.classification.status==='error'&&<p role="alert">Økosystemfordeling er utilgjengelig på grunn av kildefeil. Hovedarealene er beregnet.</p>}
  </div>
}
