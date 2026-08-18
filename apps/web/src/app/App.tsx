import { useEffect, useRef, useState } from 'react'

import { getMunicipalities, getMunicipalityBoundary, type Municipality } from '../api/municipalities'
import { nationalLandCover2025 } from '../datasets/registry'
import { createMunicipalityMap, type MunicipalityMap, type MunicipalityMapFactory } from '../map/municipalityMap'

interface AppProps { createMap?: MunicipalityMapFactory }

export function App({ createMap = createMunicipalityMap }: AppProps) {
  const mapElement = useRef<HTMLDivElement>(null)
  const map = useRef<MunicipalityMap | null>(null)
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [boundaryState, setBoundaryState] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    if (mapElement.current) map.current = createMap(mapElement.current)
    return () => { map.current?.destroy(); map.current = null }
  }, [createMap])

  useEffect(() => {
    const controller = new AbortController()
    getMunicipalities(controller.signal)
      .then((items) => { setMunicipalities(items); setListState('ready') })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setListState('error')
      })
    return () => controller.abort()
  }, [])

  async function selectMunicipality(number: string) {
    map.current?.clearBoundary()
    if (!number) { setBoundaryState('idle'); return }
    setBoundaryState('loading')
    try {
      const boundary = await getMunicipalityBoundary(number)
      map.current?.showBoundary(boundary)
      setBoundaryState('idle')
    } catch {
      setBoundaryState('error')
    }
  }

  return (
    <main className="app-shell">
      <header><h1>Kommunale naturregnskap V3</h1></header>
      <section className="controls" aria-label="Kommunevalg">
        <label htmlFor="municipality">Velg kommune</label>
        <select id="municipality" disabled={listState !== 'ready'} onChange={(event) => void selectMunicipality(event.target.value)}>
          <option value="">{listState === 'loading' ? 'Laster kommuner…' : 'Velg en kommune'}</option>
          {municipalities.map((item) => <option key={item.number} value={item.number}>{item.name}</option>)}
        </select>
        {listState === 'error' && <p role="alert">Kunne ikke hente kommunelisten. Prøv igjen senere.</p>}
        {boundaryState === 'loading' && <p role="status">Laster kommunegrense…</p>}
        {boundaryState === 'error' && <p role="alert">Kunne ikke hente kommunegrensen. Prøv igjen senere.</p>}
      </section>
      <section className="layer-control" aria-label="Kartlag">
        <label>
          <input
            type="checkbox"
            defaultChecked
            onChange={(event) => map.current?.setAccountLayerVisible(event.target.checked)}
          />
          {nationalLandCover2025.visualSource.title} ({nationalLandCover2025.version})
        </label>
      </section>
      <div ref={mapElement} className="map" aria-label="Kart over Norge" />
    </main>
  )
}
