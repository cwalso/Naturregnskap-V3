import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import { calculatePlannedDevelopment, type PlannedDevelopmentAnalysis } from '../../src/map/plannedDevelopment'
import { getMunicipalityBoundary } from '../../src/api/municipalities'
import { ExploreAnalysisMap } from '../../src/features/explore-map/ExploreAnalysisMap'
import '../../src/styles/global.css'
import 'ol/ol.css'

const boundary = await getMunicipalityBoundary('5001')
const stage = new URLSearchParams(location.search).get('stage') ?? 'A'

export function Harness() {
  const [plan, setPlan] = useState<PlannedDevelopmentAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(stage === 'B')
  useEffect(() => {
    if (stage !== 'B') return
    const controller = new AbortController()
    calculatePlannedDevelopment('5001', controller.signal).then((result) => {
      if (controller.signal.aborted) return
      if (result.status === 'available') setPlan(result)
      else setError(result.reason)
    }).catch((error) => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Plangrunnlaget kunne ikke hentes')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  return <main style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 1rem' }}>
    <h1>{stage === 'B' ? 'Trinn B – framtidig utbygging alene' : 'Trinn A – Verdsatte naturtyper alene'}</h1>
    <p>Separat kontrollflate; ikke koblet til den offentlige brukerflaten.</p>
    {loading && <p role="status">Henter eksisterende plananalyse…</p>}
    {error && <p role="alert">Planområdet kunne ikke hentes: {error}. Dette er ikke null treff.</p>}
    <ExploreAnalysisMap boundary={boundary} showValuedNature={stage === 'A'} plan={plan} />
  </main>
}
createRoot(document.querySelector('#root')!).render(<Harness />)
