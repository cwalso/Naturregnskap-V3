import { useEffect, useRef, useState } from 'react'

import {
  getMunicipalities,
  getMunicipalityBoundary,
  type Municipality,
  type MunicipalityBoundary,
} from '../api/municipalities'
import { getAccountOverview } from '../api/accountOverview'
import { MapLegend } from '../components/MapLegend'
import { MunicipalityCombobox } from '../components/MunicipalityCombobox'
import { SiteHeader, type SiteView } from '../components/SiteHeader'
import { nationalLandCover2025 } from '../datasets/registry'
import { AccountOverview } from '../features/account-overview/AccountOverview'
import { createUnavailableAccountOverview, type AccountOverviewData } from '../features/account-overview/model'
import { createMunicipalityMap, type MunicipalityMap, type MunicipalityMapFactory } from '../map/municipalityMap'
import { buildWmsLegendUrl } from '../map/wmsLegend'
import { ExploreNaturePage } from '../pages/ExploreNaturePage'
import { NaturtapetPage } from '../pages/NaturtapetPage'
import { OverviewPage } from '../pages/OverviewPage'

interface AppProps { createMap?: MunicipalityMapFactory }

function viewFromHash(): SiteView {
  const value = window.location.hash.replace(/^#/, '')
  if (value === 'naturtapet' || value === 'utforsk-naturen' || value === 'utforsk-i-kart') return value
  return 'oversikt'
}

export function App({ createMap = createMunicipalityMap }: AppProps) {
  const mapElement = useRef<HTMLDivElement>(null)
  const map = useRef<MunicipalityMap | null>(null)
  const boundaryRequest = useRef(0)
  const accountRequest = useRef(0)
  const [activeView, setActiveView] = useState<SiteView>(() => viewFromHash())
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null)
  const [boundaryData, setBoundaryData] = useState<MunicipalityBoundary | null>(null)
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [boundaryState, setBoundaryState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [accountLayerVisible, setAccountLayerVisible] = useState(true)
  const [accountData, setAccountData] = useState<AccountOverviewData | null>(null)
  const [accountState, setAccountState] = useState<'idle' | 'loading' | 'error'>('idle')

  const showsMap = activeView === 'oversikt' || activeView === 'utforsk-i-kart'

  useEffect(() => {
    const onHashChange = () => setActiveView(viewFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!showsMap || !selectedMunicipality || !mapElement.current) {
      map.current?.destroy()
      map.current = null
      return
    }

    map.current = createMap(mapElement.current)
    map.current.setAccountLayerVisible(accountLayerVisible)
    if (boundaryData) map.current.showBoundary(boundaryData)

    return () => {
      map.current?.destroy()
      map.current = null
    }
  }, [accountLayerVisible, boundaryData, createMap, selectedMunicipality, showsMap])

  useEffect(() => {
    const controller = new AbortController()
    getMunicipalities(controller.signal)
      .then((items) => { setMunicipalities(items); setListState('ready') })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setListState('error')
      })
    return () => controller.abort()
  }, [])

  function navigate(view: SiteView) {
    const hash = `#${view}`
    if (window.location.hash === hash) setActiveView(view)
    else window.location.hash = hash
  }

  async function selectMunicipality(municipality: Municipality | null) {
    const requestId = ++boundaryRequest.current
    const accountRequestId = ++accountRequest.current
    setSelectedMunicipality(municipality)
    setAccountData(null)
    setBoundaryData(null)
    map.current?.clearBoundary()

    if (!municipality) {
      setBoundaryState('idle')
      setAccountState('idle')
      return
    }

    setBoundaryState('loading')
    setAccountState('loading')

    void getAccountOverview(municipality.number)
      .then((data) => {
        if (accountRequestId === accountRequest.current) {
          setAccountData(data)
          setAccountState('idle')
        }
      })
      .catch(() => {
        if (accountRequestId === accountRequest.current) {
          setAccountData(createUnavailableAccountOverview(municipality.number, municipality.name))
          setAccountState('error')
        }
      })

    try {
      const boundary = await getMunicipalityBoundary(municipality.number)
      if (requestId === boundaryRequest.current) {
        setBoundaryData(boundary)
        setBoundaryState('idle')
      }
    } catch {
      if (requestId === boundaryRequest.current) setBoundaryState('error')
    }
  }

  function changeMunicipality() {
    navigate('oversikt')
    window.setTimeout(() => {
      document.querySelector<HTMLInputElement>('#municipality-picker input')?.focus()
    }, 0)
  }

  const municipalityPicker = (
    <section id="municipality-picker" className="municipality-picker" aria-label="Kommunevalg">
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

  function mapWorkspace(title: string, description: string) {
    if (!selectedMunicipality) return null

    return (
      <section className="map-workspace" aria-labelledby="map-workspace-title">
        <div className="map-workspace__header">
          <p className="map-workspace__eyebrow">Kart</p>
          <h2 id="map-workspace-title">{title}</h2>
          <p>{description}</p>
        </div>
        <div className="map-workspace__body">
          <div className="map-sidebar">
            <div className="layer-control" aria-label="Kartlag">
              <h3>Kartlag</h3>
              <label>
                <input
                  type="checkbox"
                  checked={accountLayerVisible}
                  onChange={(event) => {
                    const visible = event.target.checked
                    setAccountLayerVisible(visible)
                    map.current?.setAccountLayerVisible(visible)
                  }}
                />
                {nationalLandCover2025.visualSource.title} ({nationalLandCover2025.version})
              </label>
            </div>
            <MapLegend items={[{
              id: nationalLandCover2025.id,
              title: `${nationalLandCover2025.visualSource.title} (${nationalLandCover2025.version})`,
              visible: accountLayerVisible,
              imageUrl: buildWmsLegendUrl(nationalLandCover2025.visualSource),
            }]} />
          </div>
          <div className="map-frame">
            <div ref={mapElement} className="map" aria-label="Kart over Norge" />
          </div>
        </div>
      </section>
    )
  }

  const overview = (
    <>
      <div className={selectedMunicipality ? 'selected-municipality-picker' : 'start-municipality-picker'}>
        {municipalityPicker}
      </div>
      {selectedMunicipality ? (
        <OverviewPage
          municipalityName={selectedMunicipality.name}
          onNavigate={navigate}
          accountContent={
            accountState === 'loading'
              ? <section className="account-overview"><p role="status">Laster arealbalanse…</p></section>
              : accountState === 'error'
                ? <section className="account-overview"><p role="alert">Kunne ikke hente arealbalansen. Prøv igjen senere.</p></section>
                : <AccountOverview data={accountData ?? createUnavailableAccountOverview(selectedMunicipality.number, selectedMunicipality.name)} />
          }
          mapContent={mapWorkspace(
            'Se arealfordelingen i kart',
            'Se det heldekkende arealgrunnlaget og den valgte kommunen i kartet.',
          )}
        />
      ) : (
        <div className="start-workspace">
          <section className="start-view__intro" aria-labelledby="start-title">
            <p className="start-view__eyebrow">Kommunale naturregnskap</p>
            <h1 id="start-title">Velg kommune for å se naturregnskapet</h1>
            <p>
              Søk etter kommunen du vil utforske. Du får en overordnet
              arealoversikt basert på felles regnskapsgrunnlag og kan gå videre
              til naturtap, supplerende naturdata og kart.
            </p>
          </section>
        </div>
      )}
    </>
  )

  const mapView = (
    <section className="content-page map-page" aria-labelledby="explore-map-title">
      <header className="content-page__intro">
        <p className="content-page__eyebrow">Kartutforsking</p>
        <h1 id="explore-map-title">
          Utforsk i kart{selectedMunicipality ? ` – ${selectedMunicipality.name}` : ''}
        </h1>
        <p>
          Her kan du utforske det heldekkende kartgrunnlaget som brukes i
          naturregnskapet. Kartet er en visning av datagrunnlaget, ikke et eget
          beregningsgrunnlag i nettleseren.
        </p>
      </header>
      {!selectedMunicipality ? (
        <div className="map-page__picker">
          <p>Velg kommune for å avgrense kartet.</p>
          {municipalityPicker}
        </div>
      ) : mapWorkspace(
        'Kartgrunnlag',
        'Grunnkart for arealanalyse vises for valgt kommune. Flere faglag kan kobles på senere med tydelig skille mellom regnskapsgrunnlag og supplerende temalag.',
      )}
    </section>
  )

  return (
    <div className="app-shell">
      <SiteHeader
        municipalityName={selectedMunicipality?.name}
        activeView={activeView}
        onNavigate={navigate}
        onChangeMunicipality={changeMunicipality}
      />
      <main id="main-content">
        {activeView === 'oversikt' && overview}
        {activeView === 'naturtapet' && <NaturtapetPage municipalityName={selectedMunicipality?.name} />}
        {activeView === 'utforsk-naturen' && <ExploreNaturePage municipalityName={selectedMunicipality?.name} />}
        {activeView === 'utforsk-i-kart' && mapView}
      </main>
    </div>
  )
}
