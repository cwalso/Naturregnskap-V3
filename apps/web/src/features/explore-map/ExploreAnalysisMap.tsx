import { useEffect, useRef, useState } from 'react'
import type { MunicipalityBoundary } from '../../api/municipalities'
import type { PlannedDevelopmentAnalysis } from '../../map/plannedDevelopment'
import { createExploreAnalysisMap, type ExploreMapController, type ExploreMapStatus } from '../../map/exploreAnalysisMap'
import './ExploreAnalysisMap.css'

export interface ExploreAnalysisMapProps {
  readonly boundary: MunicipalityBoundary | null
  readonly showValuedNature: boolean
  readonly plan?: PlannedDevelopmentAnalysis | null
}

export function ExploreAnalysisMap({ boundary, showValuedNature, plan = null }: ExploreAnalysisMapProps) {
  const element = useRef<HTMLDivElement>(null)
  const controller = useRef<ExploreMapController | null>(null)
  const [status, setStatus] = useState<ExploreMapStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!element.current) return
    try { controller.current = createExploreAnalysisMap(element.current, setStatus) }
    catch (error) { setError(error instanceof Error ? error.message : 'Kartet kunne ikke opprettes') }
    return () => { controller.current?.destroy(); controller.current = null }
  }, [])
  useEffect(() => { controller.current?.update({ boundary, showValuedNature, plan }) }, [boundary, showValuedNature, plan])

  return <section className="explore-analysis-map" aria-label="Analyse i kart">
    <header className="explore-analysis-map__header">
      <strong>{showValuedNature ? 'Verdsatte naturtyper' : 'Kart'}{boundary ? ` – ${boundary.properties.name}` : ''}</strong>
      <button type="button" onClick={() => controller.current?.fitToMunicipality()} disabled={!boundary}>Vis hele kommunen</button>
    </header>
    <div ref={element} className="explore-analysis-map__canvas" role="region" tabIndex={0} aria-label={`Interaktivt analysekart${boundary ? ` over ${boundary.properties.name}` : ''}`} />
    {status === 'loading' && <p role="status">Laster naturtypelokaliteter…</p>}
    {(error || status === 'error') && <p role="alert">{error ?? 'Temakartet kunne ikke hentes. Dette er ikke null treff.'}</p>}
    {showValuedNature && <p className="explore-analysis-map__note">Kartlagte naturtypelokaliteter med KU-verdi. Datasettet er ikke heldekkende; ingen registrering betyr ikke fravær av naturverdi.</p>}
  </section>
}
