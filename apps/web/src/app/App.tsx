import { useEffect, useRef, useState } from 'react'

import { getMunicipalities, getMunicipalityBoundary, type Municipality } from '../api/municipalities'
import { MunicipalityCombobox } from '../components/MunicipalityCombobox'
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

  async function selectMunicipality(municipality: Municipality | null) {
    map.current?.clearBoundary()
    if (!municipality) { setBoundaryState('idle'); return }
    setBoundaryState('loading')
    try {
      const boundary = await getMunicipalityBoundary(municipality.number)
      map.current?.showBoundary(boundary)
      setBoundaryState('idle')
    } catch {
      setBoundaryState('error')
    }
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="site-header__agency">Miljødirektoratet</div>
        <h1>Kommunale naturregnskap</h1>
        <span className="site-header__version">V3</span>
      </header>
      <section className="controls" aria-label="Kommunevalg">
        <MunicipalityCombobox
          municipalities={municipalities}
          disabled={listState !== 'ready'}
          placeholder={listState === 'loading' ? 'Laster kommuner…' : 'Søk etter kommune'}
          onSelect={(municipality) => void selectMunicipality(municipality)}
        />
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
