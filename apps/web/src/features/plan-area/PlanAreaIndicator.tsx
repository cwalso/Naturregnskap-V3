import { planDaa, type PlanAreaResult } from './model'

export interface PlanAreaIndicatorProps {
  municipalityNumber: string
  result: PlanAreaResult | null
  state: 'idle' | 'loading' | 'error'
  categoryId: string
  label: string
  onOpenMap: () => void
}

/** Presentation of the existing plan result, never a fallback to another analysis. */
export function PlanAreaIndicator({ municipalityNumber, result, state, categoryId, label, onOpenMap }: PlanAreaIndicatorProps) {
  const active = result?.municipalityNumber === municipalityNumber ? result : null
  const category = active?.status === 'available' ? active.categories.find(item => item.id === categoryId) : null
  return <article className="plan-area-indicator" data-analysis-id={active?.status === 'available' ? active.analysisId : undefined}>
    <strong>Identifisert {label} i områder avsatt til framtidig utbygging</strong>
    {state === 'loading' ? <p role="status">Henter arealfordeling i planområdene…</p>
      : state === 'error' ? <p role="alert">Planarealene kunne ikke beregnes. Dette betyr ikke null treff.</p>
      : !active || active.status === 'not_available' ? <p role="status">{active?.status === 'not_available' ? active.reason : 'Analysegrunnlaget er ikke tilgjengelig for kommunen. Dette betyr ikke null treff.'}</p>
      : active.classification.status === 'error' ? <p role="alert">Økosystemfordelingen er utilgjengelig på grunn av kildefeil. Dette betyr ikke null identifisert areal.</p>
      : category ? <>
        <span className="thematic-plan-cards__value">{planDaa(category.areaDaa)}</span>
        {category.areaDaa === 0 && <p>Ingen delceller er identifisert som {label}. Dette dokumenterer ikke fravær av typen.</p>}
        {active.classification.status === 'partial' && <p>Delvis fordeling: {planDaa(active.classification.unclassifiedDaa)} natur er ufordelt.</p>}
      </> : <p role="status">Økosystemtypen er ikke tilgjengelig i analysegrunnlaget.</p>}
    <p>Tallene bygger på en foreløpig kartanalyse. Deler av naturarealet kan være ufordelt på økosystemtype. Arealene er avsatt til framtidig utbygging, men er ikke nødvendigvis bygget ut. Planavsetninger er ikke forventet naturtap.</p>
    <button type="button" onClick={onOpenMap}>Vis {label} i plananalysen <span aria-hidden="true">→</span></button>
  </article>
}
