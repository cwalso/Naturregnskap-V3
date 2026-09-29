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

  function mapWorkspace(
    title: string,
    description: string,
    variant: 'overview' | 'explore' = 'overview',
  ) {
    if (!selectedMunicipality) return null

    const layerToggle = (
      <label className={variant === 'explore' ? 'layer-toggle' : undefined}>
        <input
          type="checkbox"
          checked={accountLayerVisible}
          onChange={(event) => {
            const visible = event.target.checked
            setAccountLayerVisible(visible)
            map.current?.setAccountLayerVisible(visible)
          }}
        />
        {variant === 'explore' ? (
          <span>
            <strong>{nationalLandCover2025.title}</strong>
            <small>{nationalLandCover2025.visualSource.title} · {nationalLandCover2025.version}</small>
          </span>
        ) : (
          <>{nationalLandCover2025.visualSource.title} ({nationalLandCover2025.version})</>
        )}
      </label>
    )

    const legend = (
      <MapLegend items={[{
        id: nationalLandCover2025.id,
        title: `${nationalLandCover2025.visualSource.title} (${nationalLandCover2025.version})`,
        visible: accountLayerVisible,
        imageUrl: buildWmsLegendUrl(nationalLandCover2025.visualSource),
      }]} />
    )

    return (
      <section
        className={`map-workspace ${variant === 'explore' ? 'map-workspace--explore' : ''}`}
        aria-labelledby="map-workspace-title"
      >
        <div className="map-workspace__header">
          <p className="map-workspace__eyebrow">Kart</p>
          <h2 id="map-workspace-title">{title}</h2>
          <p>{description}</p>
        </div>

        <div className="map-workspace__body">
          <div className="map-sidebar">
            {variant === 'explore' ? (
              <>
                <section className="map-sidebar__section" aria-labelledby="account-layers-title">
                  <div className="map-sidebar__section-heading">
                    <div>
                      <p className="map-sidebar__eyebrow">Regnskapsgrunnlag</p>
                      <h3 id="account-layers-title">Aktivt kartlag</h3>
                    </div>
                    <span className="status-tag">Heldekkende</span>
                  </div>
                  {layerToggle}
                  <p className="map-sidebar__explanation">
                    Grunnkart for arealanalyse er sentralt heldekkende datagrunnlag.
                    Karttjenesten her brukes til visualisering, ikke til å beregne arealtall.
                  </p>
                </section>

                <section className="map-sidebar__section map-sidebar__section--supplementary" aria-labelledby="thematic-layers-title">
                  <div className="map-sidebar__section-heading">
                    <div>
                      <p className="map-sidebar__eyebrow">Supplerende temadata</p>
                      <h3 id="thematic-layers-title">Flere faglag</h3>
                    </div>
                    <span className="status-tag status-tag--muted">Ikke koblet til</span>
                  </div>
                  <p>
                    Temalag kan gi mer innsikt om naturen, men skal holdes adskilt
                    fra selve regnskapsgrunnlaget. Reelle lag kobles på etter
                    kilde- og metodeavklaring.
                  </p>
                  <button
                    type="button"
                    className="map-sidebar__link"
                    onClick={() => navigate('utforsk-naturen')}
                  >
                    Se temadata som vurderes <span aria-hidden="true">→</span>
                  </button>
                </section>

                <section className="map-sidebar__tools" aria-labelledby="map-tools-title">
                  <h3 id="map-tools-title">Kartverktøy</h3>
                  <button
                    type="button"
                    className="map-tool-button"
                    onClick={() => map.current?.fitToBoundary()}
                  >
                    Tilpass kartet til kommunen
                  </button>
                </section>

                {legend}
              </>
            ) : (
              <>
                <div className="layer-control" aria-label="Kartlag">
                  <h3>Kartlag</h3>
                  {layerToggle}
                </div>
                {legend}
              </>
            )}
          </div>

          <div className="map-frame">
            {variant === 'explore' && (
              <div className="map-frame__context" aria-live="polite">
                <span><strong>{selectedMunicipality.name}</strong></span>
                <span>{accountLayerVisible ? 'Regnskapsgrunnlag vises' : 'Regnskapsgrunnlag er skjult'}</span>
              </div>
            )}
            <div
              ref={mapElement}
              className="map"
              aria-label={variant === 'explore' ? `Kart over ${selectedMunicipality.name}` : 'Kart over Norge'}
            />
          </div>
        </div>

        {variant === 'explore' && (
          <div className="map-workspace__method">
            <strong>Kartet er en visning av datagrunnlaget.</strong>
            <span>
              Arealtall og framtidige analyser skal bygge på godkjente data og
              dokumentert metode, ikke beregnes fra kartbildet i nettleseren.
            </span>
          </div>
        )}
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
      <header className="content-page__intro map-page__intro">
        <p className="content-page__eyebrow">Kartutforsking</p>
        <h1 id="explore-map-title">
          Utforsk i kart{selectedMunicipality ? ` – ${selectedMunicipality.name}` : ''}
        </h1>
        <p>
          Utforsk kartgrunnlaget for naturregnskapet. Regnskapsgrunnlag og
          supplerende temadata holdes tydelig adskilt, slik at det er klart hva
          som inngår i selve regnskapet og hva som gir ekstra kontekst.
        </p>
      </header>

      {!selectedMunicipality ? (
        <div className="map-page__picker">
          <p>Velg kommune for å avgrense kartet.</p>
          {municipalityPicker}
        </div>
      ) : (
        <>
          <section className="map-page__facts" aria-label="Om kartvisningen">
            <div>
              <span>Valgt kommune</span>
              <strong>{selectedMunicipality.name}</strong>
            </div>
            <div>
              <span>Regnskapsgrunnlag</span>
              <strong>Grunnkart for arealanalyse · 2025</strong>
            </div>
            <div>
              <span>Visningen brukes til</span>
              <strong>Utforsking og forståelse</strong>
            </div>
          </section>
          {mapWorkspace(
            'Kartgrunnlag',
            'Slå det heldekkende grunnlaget av og på, les tegnforklaringen og utforsk kommunen. Supplerende faglag kobles på separat når datakilde og metodisk rolle er avklart.',
            'explore',
          )}
        </>
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
