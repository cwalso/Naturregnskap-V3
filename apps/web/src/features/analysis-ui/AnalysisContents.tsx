import { useState } from 'react'
import { focusAnalysisSection } from './analysisContentNavigation'
import './AnalysisContents.css'

export function AnalysisContents({sections,onReset}:{sections:readonly (readonly [string,string])[];onReset?:()=>void}) {
  const [section,setSection]=useState('')
  return <form className="analysis-contents" onSubmit={event=>{
    event.preventDefault()
    const root=event.currentTarget.closest<HTMLElement>('[data-analysis-content]')
    if(root&&section&&focusAnalysisSection(root,section))setSection('')
  }}>
    <select aria-label="Gå til analyseinnhold" value={section} onChange={event=>setSection(event.target.value)}>
      <option value="" disabled>Gå til innhold…</option>
      {sections.map(([key,label])=><option key={key} value={key}>{label}</option>)}
    </select>
    <button type="submit" disabled={!section} aria-label="Gå til valgt analyseinnhold">Gå</button>
    {onReset&&<button type="button" onClick={event=>{onReset();const root=event.currentTarget.closest<HTMLElement>('[data-analysis-content]');if(root)focusAnalysisSection(root,'summary')}}>Nullstill utvalg</button>}
  </form>
}
