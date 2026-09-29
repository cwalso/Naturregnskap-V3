import { useEffect, useRef, useState } from 'react'

import { getMunicipalities, getMunicipalityBoundary, type Municipality } from '../api/municipalities'
import { getAccountOverview } from '../api/accountOverview'
import { getChangeFeatures, getChanges } from '../api/changes'
import { MapLegend } from '../components/MapLegend'
import { MunicipalityCombobox } from '../components/MunicipalityCombobox'
import { SiteHeader } from '../components/SiteHeader'
import { nationalLandCover2025 } from '../datasets/registry'
import { AccountOverview } from '../features/account-overview/AccountOverview'
import { createUnavailableAccountOverview, type AccountOverviewData } from '../features/account-overview/model'
import { Changes } from '../features/changes/Changes'
import { unavailableChanges, type ChangeFeature, type ChangesData } from '../features/changes/model'
import { createMunicipalityMap, type MunicipalityMap, type MunicipalityMapFactory } from '../map/municipalityMap'
import { buildWmsLegendUrl } from '../map/wmsLegend'

interface AppProps { createMap?: MunicipalityMapFactory }

export function App({ createMap = createMunicipalityMap }: AppProps) {
  const mapElement = useRef<HTMLDivElement>(null)
  const map = useRef<MunicipalityMap | null>(null)
  const boundaryRequest = useRef(0)
  const accountRequest = useRef(0)
  const changesRequest = useRef(0)
  const changeFeaturesRequest = useRef(0)
  const currentChangeFeatures = useRef<readonly ChangeFeature[]>([])
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null)
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [boundaryState, setBoundaryState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [accountLayerVisible, setAccountLayerVisible] = useState(true)
  const [accountData, setAccountData] = useState<AccountOverviewData | null>(null)
  const [accountState, setAccountState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [changesData, setChangesData] = useState<ChangesData | null>(null)
  const [changesState, setChangesState] = useState<'idle' | 'loading' | 'error'>('idle')

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
    const accountRequestId = ++accountRequest.current
    const changesRequestId = ++changesRequest.current
    const changeFeaturesRequestId = ++changeFeaturesRequest.current
    setSelectedMunicipality(municipality)
    setAccountData(null)
    setChangesData(null)
    currentChangeFeatures.current = []
    map.current?.clearBoundary()
    map.current?.clearChanges()
    if (!municipality) { setBoundaryState('idle'); setAccountState('idle'); setChangesState('idle'); return }
    setBoundaryState('loading')
    setAccountState('loading')
    setChangesState('loading')
    void getAccountOverview(municipality.number)
      .then((data) => {
        if (accountRequestId === accountRequest.current) { setAccountData(data); setAccountState('idle') }
      })
      .catch(() => {
        if (accountRequestId === accountRequest.current) {
          setAccountData(createUnavailableAccountOverview(municipality.number, municipality.name))
          setAccountState('error')
        }
      })
    void getChanges(municipality.number)
      .then((data) => {
        if (changesRequestId !== changesRequest.current) return

        setChangesData(data)
        setChangesState('idle')

        if (data.status !== 'available' || !data.generationId) {
          currentChangeFeatures.current = []
          map.current?.clearChanges()
          return
        }

        void getChangeFeatures(municipality.number)
          .then((featureData) => {
            if (changeFeaturesRequestId !== changeFeaturesRequest.current) return

            if (
              featureData.status === 'available' &&
              featureData.generationId === data.generationId
            ) {
              currentChangeFeatures.current = featureData.features
              map.current?.showChanges(featureData.features)
            } else {
              currentChangeFeatures.current = []
              map.current?.clearChanges()
            }
          })
          .catch(() => {
            if (changeFeaturesRequestId === changeFeaturesRequest.current) {
              currentChangeFeatures.current = []
              map.current?.clearChanges()
            }
          })
      })
      .catch(() => {
        if (changesRequestId === changesRequest.current) {
          setChangesData(unavailableChanges(municipality.number, municipality.name))
          currentChangeFeatures.current = []
          map.current?.clearChanges()
          setChangesState('error')
        }
      })
    try {
      const boundary = await getMunicipalityBoundary(municipality.number)
      if (requestId === boundaryRequest.current) {
        map.current?.showBoundary(boundary)
        if (currentChangeFeatures.current.length) map.current?.showChanges(currentChangeFeatures.current)
        setBoundaryState('idle')
      }
    } catch {
      if (requestId === boundaryRequest.current) setBoundaryState('error')
    }
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

  const mapWorkspace = (
    <section id="map-workspace" className="map-workspace" aria-label="Kartgrunnlag">
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
    <div className="app-shell">
      <SiteHeader municipalityName={selectedMunicipality?.name} />
      <main id="main-content">
        <div className={selectedMunicipality ? 'selected-municipality-picker' : 'start-municipality-picker'}>
          {municipalityPicker}
        </div>
        <div id="account-content" className={selectedMunicipality ? 'account-workspace' : 'start-workspace'}>
          {selectedMunicipality ? (
            accountState === 'loading' ? <section className="account-overview"><p role="status">Laster arealbalanse…</p></section> :
              accountState === 'error' ? <section className="account-overview"><p role="alert">Kunne ikke hente arealbalansen. Prøv igjen senere.</p></section> :
              <div className="account-panel">
                <AccountOverview data={accountData ?? createUnavailableAccountOverview(selectedMunicipality.number, selectedMunicipality.name)} />
                {changesState === 'loading' ? <section className="changes"><p role="status">Laster endringsdata…</p></section> :
                  changesState === 'error' ? <section className="changes"><p role="alert">Kunne ikke hente endringsdata. Prøv igjen senere.</p></section> :
                    <Changes data={changesData ?? unavailableChanges(selectedMunicipality.number, selectedMunicipality.name)} />}
              </div>
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
    </div>
  )
}
