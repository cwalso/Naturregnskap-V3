import type { AnalysisPresentation } from '../../map/analysisPresentation'

export function AnalysisResultNotice({ presentation }: { readonly presentation: AnalysisPresentation }) {
  return (
    <div className={`analysis-result-notice analysis-result-notice--${presentation.kind}`} role={presentation.kind === 'error' ? 'alert' : 'status'}>
      <strong>{presentation.title}</strong>
      <p>{presentation.detail}</p>
    </div>
  )
}
