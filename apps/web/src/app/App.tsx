import { useEffect, useRef, useState } from 'react'

import { getMunicipalities, getMunicipalityBoundary, type Municipality } from '../api/municipalities'
import agencyLogo from '../assets/miljodirektoratet-logo-primary.svg'
import { MapLegend } from '../components/MapLegend'
import { MunicipalityCombobox } from '../components/MunicipalityCombobox'
import { nationalLandCover2025 } from '../datasets/registry'
import { AccountOverview } from '../features/account-overview/AccountOverview'
import { createUncalculatedAccountOverview } from '../features/account-overview/model'
import { createMunicipalityMap, type MunicipalityMap, type MunicipalityMapFactory } from '../map/municipalityMap'
import { buildWmsLegendUrl } from '../map/wmsLegend'

interface AppProps { createMap?: MunicipalityMapFactory }

export function App({ createMap = createMunicipalityMap }: AppProps) {
  const mapElement = useRef<HTMLDivElement>(null)
  const map = useRef<MunicipalityMap | null>(null)
  const boundaryRequest = useRef(0)
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null)
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [boundaryState, setBoundaryState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [accountLayerVisible, setAccountLayerVisible] = useState(true)

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
    const requestId = ++boundaryRequest.current
    setSelectedMunicipality(municipality)
    map.current?.clearBoundary()
    if (!municipality) { setBoundaryState('idle'); return }
    setBoundaryState('loading')
    try {
      const boundary = await getMunicipalityBoundary(municipality.number)
      if (requestId === boundaryRequest.current) {
        map.current?.showBoundary(boundary)
        setBoundaryState('idle')
      }
    } catch {
      if (requestId === boundaryRequest.current) setBoundaryState('error')
    }
  }

  const municipalityPicker = (
    <section className="municipality-picker" aria-label="Kommunevalg">
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
  )

  const mapWorkspace = (
    <section className="map-workspace" aria-label="Kartgrunnlag">
      <div className="layer-control" aria-label="Kartlag">
        <label><input type="checkbox" checked={accountLayerVisible} onChange={(event) => {
          const visible = event.target.checked
          setAccountLayerVisible(visible)
          map.current?.setAccountLayerVisible(visible)
        }} />{nationalLandCover2025.visualSource.title} ({nationalLandCover2025.version})</label>
      </div>
      <div className="map-frame">
        <div ref={mapElement} className="map" aria-label="Kart over Norge" />
        <MapLegend items={[{
          id: nationalLandCover2025.id,
          title: `${nationalLandCover2025.visualSource.title} (${nationalLandCover2025.version})`,
          visible: accountLayerVisible,
          imageUrl: buildWmsLegendUrl(nationalLandCover2025.visualSource),
        }]} />
      </div>
    </section>
  )

  return (
    <main className="app-shell">
      <header className="site-header">
        <img className="site-header__logo" src={agencyLogo} alt="Miljødirektoratet" />
        <div className="site-header__product">
          <span className="site-header__status">Prototype</span>
          <p>Kommunale naturregnskap</p>
        </div>
      </header>
      <div className={selectedMunicipality ? 'selected-municipality-picker' : 'start-municipality-picker'}>
        {municipalityPicker}
      </div>
      <div className={selectedMunicipality ? 'account-workspace' : 'start-workspace'}>
        {selectedMunicipality ? (
          <AccountOverview data={createUncalculatedAccountOverview(selectedMunicipality.number, selectedMunicipality.name)} />
        ) : (
          <section className="start-view__intro" aria-labelledby="start-title">
            <p className="start-view__eyebrow">Kommunale naturregnskap</p>
            <h1 id="start-title">Velg kommune for å se naturregnskapet</h1>
            <p>Søk etter kommunen du vil utforske. Du får en overordnet arealoversikt og kartet samlet på én flate.</p>
          </section>
        )}
        {mapWorkspace}
      </div>
    </main>
  )
}
