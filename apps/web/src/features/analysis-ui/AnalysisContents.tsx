import { focusAnalysisSection } from './analysisContentNavigation'
import './AnalysisContents.css'

export function AnalysisContents({sections,onReset}:{sections:readonly (readonly [string,string])[];onReset?:()=>void}) {
  return <div className="analysis-contents">
    <select aria-label="Gå til analyseinnhold" value="" onChange={event=>{
      const root=event.currentTarget.closest<HTMLElement>('[data-analysis-content]')
      if(root)focusAnalysisSection(root,event.currentTarget.value)
    }}>
      <option value="" disabled>Gå til innhold…</option>
      {sections.map(([key,label])=><option key={key} value={key}>{label}</option>)}
    </select>
    {onReset&&<button type="button" onClick={event=>{onReset();const root=event.currentTarget.closest<HTMLElement>('[data-analysis-content]');if(root)focusAnalysisSection(root,'summary')}}>Nullstill utvalg</button>}
  </div>
}
