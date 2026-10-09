import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import { calculatePlannedDevelopment, type PlannedDevelopmentAnalysis } from '../../src/map/plannedDevelopment'
import { calculatePlannedValuedNatureAnalysis, type PlannedValuedNatureAnalysis } from '../../src/map/plannedValuedNature'
import { getMunicipalityBoundary } from '../../src/api/municipalities'
import { ExploreAnalysisMap } from '../../src/features/explore-map/ExploreAnalysisMap'
import '../../src/styles/global.css'
import 'ol/ol.css'

const boundary = await getMunicipalityBoundary('5001')
const initialStage = new URLSearchParams(location.search).get('stage') ?? 'A'

export function Harness() {
  const [stage, setStage] = useState(initialStage)
  const [plan, setPlan] = useState<PlannedDevelopmentAnalysis | null>(null)
  const [valued, setValued] = useState<PlannedValuedNatureAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(stage !== 'A')
  useEffect(() => {
    if (stage === 'A') { setLoading(false); return }
    setLoading(true)
    setError(null)
    const controller = new AbortController()
    calculatePlannedDevelopment('5001', controller.signal).then(async (result) => {
      if (controller.signal.aborted) return
      if (result.status === 'available') {
        setPlan(result)
        if (stage === 'D') {
          const resultValued = await calculatePlannedValuedNatureAnalysis(result, controller.signal)
          if (!controller.signal.aborted) setValued(resultValued)
        }
      }
      else setError(result.reason)
    }).catch((error) => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Plangrunnlaget kunne ikke hentes')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [stage])
  return <main style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 1rem' }}>
    <h1>{stage === 'E' ? 'Trinn E – framtidig utbygging × Natur/Jordbruk' : stage === 'D' ? 'Trinn D – plan, naturtyper og beregnet overlapp' : stage === 'C' ? 'Trinn C – plan og naturtyper, uten overlapp' : stage === 'B' ? 'Trinn B – framtidig utbygging alene' : 'Trinn A – Verdsatte naturtyper alene'}</h1>
    <p>Separat kontrollflate; ikke koblet til den offentlige brukerflaten.</p>
    <nav aria-label="Visuelle kontrolltrinn">{['A', 'B', 'C', 'D', 'E'].map((value) => <button key={value} onClick={() => setStage(value)} type="button">Trinn {value}</button>)}</nav>
    {loading && <p role="status">Henter eksisterende plananalyse…</p>}
    {error && <p role="alert">Planområdet kunne ikke hentes: {error}. Dette er ikke null treff.</p>}
    <ExploreAnalysisMap boundary={boundary} showValuedNature={stage !== 'B' && stage !== 'E'} plan={stage === 'A' ? null : plan} valued={stage === 'D' ? valued : null} showNatureAgriculture={stage === 'E'} />
    {stage === 'D' && valued && <p>{valued.affectedFeatureCount} berørte lokaliteter; {valued.uniqueOverlapAreaKm2.toFixed(3)} km² unikt overlappsareal.</p>}
  </main>
}
createRoot(document.querySelector('#root')!).render(<Harness />)
