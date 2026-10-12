import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { Municipality, MunicipalityBoundary } from '../../api/municipalities'
import type { ThematicCoverageResponse } from '../../api/thematicCoverage'
import { filterRegisteredNature, getMunicipalValuedNature, municipalValueLegend, noMunicipalNatureFilter, type MunicipalNatureFilter, type MunicipalValuedNature } from '../../api/municipalValuedNature'
import { createExploreLayerMap, type LayerMapController, type LayerMapStatus } from '../../map/exploreThemeMap'
import { greyPresentations, type GreyPresentation, initialMapLayers, mapLayers, mapLayerRoles, type MapLayerId, type MapLayerState, type MapLayerDefinition } from './mapThemes'
import { ExploreMapIcon } from './ExploreMapIcon'
import './ExploreThemesWorkspace.css'

interface Props { municipality: Municipality; boundary: MunicipalityBoundary | null; coverage?: ThematicCoverageResponse | null; coverageState?: 'idle' | 'loading' | 'error' }
interface Choice { owner: string; filter: MunicipalNatureFilter; selectedId: string | null; search: string; limit: number }
const freshChoice = (owner: string): Choice => ({ owner, filter: noMunicipalNatureFilter, selectedId: null, search: '', limit: 60 })
interface MapStatus { owner: string | null; layers: Partial<Record<MapLayerId, LayerMapStatus>> }

function ServiceLegend({ url, description }: { url: string; description: string }) {
  const [failed, setFailed] = useState(false)
  return <div className="explore-themes__service-legend">{failed
    ? <p role="status">Tegnforklaringen fra kilden kunne ikke hentes. Kartlaget kan fortsatt vises.</p>
    : <img src={url} alt={description} onError={() => setFailed(true)} />}</div>
}

export function ExploreThemesWorkspace({ municipality, boundary, coverage, coverageState = 'idle' }: Props) {
  const [greyPresentation, setGreyPresentation] = useState<GreyPresentation>('graa_arealer')
  const grey = greyPresentations.find((item) => item.layer === greyPresentation)!
  const [layers, setLayers] = useState<MapLayerState>(initialMapLayers)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [storedPanel, setPanel] = useState<{ owner: string; value: MapLayerId | 'legend' } | null>(null)
  const panel = storedPanel?.owner === municipality.number ? storedPanel.value : null
  const panelElement = useRef<HTMLElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const pickerButton = useRef<HTMLButtonElement>(null)
  function openPanel(value: MapLayerId | 'legend') {
    opener.current = document.activeElement as HTMLElement
    setPickerOpen(false); setPanel({ owner: municipality.number, value })
  }
  const closePanel = useCallback(() => {
    setPanel(null); setPickerOpen(false)
    requestAnimationFrame(() => {
      const target = opener.current
      if (target?.isConnected && target.getClientRects().length) target.focus({ preventScroll: true })
      else element.current?.focus({ preventScroll: true })
    })
  }, [])
  useEffect(() => {
    if (panel) {
      const buttons = [...(panelElement.current?.querySelectorAll<HTMLButtonElement>('header button') ?? [])]
      ;(buttons.find((button) => button.getClientRects().length) ?? buttons.at(-1))?.focus({ preventScroll: true })
    }
  }, [panel])
  useEffect(() => {
    if (!panel && !pickerOpen) return
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); closePanel() } }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [panel, pickerOpen, closePanel])
  const owner = municipality.number
  const [storedChoice, setChoice] = useState<Choice>(() => freshChoice(owner))
  const choice = storedChoice.owner === owner ? storedChoice : freshChoice(owner)
  const [records, setRecords] = useState<{ number: string; status: 'loading' | 'ready' | 'error'; data: MunicipalValuedNature | null; error?: string } | null>(null)
  const [mapState, setMapState] = useState<MapStatus>({ owner: null, layers: {} })
  const [creationError, setCreationError] = useState<string | null>(null)
  const element = useRef<HTMLDivElement>(null)
  const controller = useRef<LayerMapController | null>(null)
  const id = useId()
  const activeBoundary = boundary?.properties.number === owner ? boundary : null
  const natureVisible = layers['valued-nature'].visible
  const activeRecords = records?.number === owner && natureVisible ? records : null
  const data = activeRecords?.status === 'ready' ? activeRecords.data : null
  const visible = data ? filterRegisteredNature(data, choice.filter) : []
  const selected = visible.find((item) => item.id === choice.selectedId)
  const activeDefinitions = mapLayers.filter((item) => layers[item.id].visible).sort((a, b) => a.zIndex - b.zIndex)
  const reindeerCoverage = coverage?.municipalityNumber === owner ? coverage.results.find((item) => item.datasetId === 'wild-reindeer-areas') : undefined
  const updateChoice = (update: Partial<Choice>) => setChoice({ ...choice, ...update, owner })
  function toggleLayer(layerId: MapLayerId, visible: boolean) {
    setLayers((previous) => ({ ...previous, [layerId]: { ...previous[layerId], visible } }))
    if (layerId === 'valued-nature' && !visible) updateChoice({ selectedId: null })
  }

  useEffect(() => {
    if (!element.current) return
    try { controller.current = createExploreLayerMap(element.current, (layer, status, number) => setMapState((previous) => {
      if (previous.owner === number && previous.layers[layer] === status) return previous
      return { owner: number, layers: { ...(previous.owner === number ? previous.layers : {}), [layer]: status } }
    })) }
    catch (error) { setCreationError(error instanceof Error ? error.message : 'Kartet kunne ikke opprettes.') }
    return () => { controller.current?.destroy(); controller.current = null }
  }, [])
  useEffect(() => {
    if (!natureVisible || !activeBoundary) return
    const abort = new AbortController()
    // Keep a completed municipality result while the layer is hidden; other toggles never reload it.
    setRecords((previous) => previous?.number === activeBoundary.properties.number && previous.status === 'ready'
      ? previous : { number: activeBoundary.properties.number, status: 'loading', data: null })
    void getMunicipalValuedNature(activeBoundary, abort.signal).then((data) => {
      if (!abort.signal.aborted) setRecords({ number: data.municipalityNumber, status: 'ready', data })
    }).catch((error: unknown) => {
      if (!abort.signal.aborted) setRecords({ number: activeBoundary.properties.number, status: 'error', data: null,
        error: error instanceof Error ? error.message : 'Naturtypeoversikten kunne ikke hentes.' })
    })
    return () => abort.abort()
  }, [natureVisible, activeBoundary])
  useEffect(() => {
    controller.current?.update({ boundary: activeBoundary, layers, greyPresentation, data, filter: choice.filter, selectedId: selected?.id ?? null })
  }, [activeBoundary, layers, greyPresentation, data, choice.filter, selected?.id])
  useEffect(() => {
    controller.current?.setSelectionHandler((selectedId) => setChoice((previous) => ({ ...(previous.owner === owner ? previous : freshChoice(owner)), selectedId })))
    return () => controller.current?.setSelectionHandler(null)
  }, [owner])
  const filteredTypes = data?.natureTypes.filter((name) => name.toLocaleLowerCase('nb').includes(choice.search.trim().toLocaleLowerCase('nb')) || name === choice.filter.natureType) ?? []

  const natureFilter = natureVisible ? <section className="explore-themes__nature-filter" aria-label="Filter og lokaliteter for Verdsatte naturtyper">
          <h3>Utforsk naturtypene</h3>
          {(!activeRecords || activeRecords.status === 'loading') && <p role="status">Henter kommunens registrerte lokaliteter og naturtyper…</p>}
          {activeRecords?.status === 'error' && <p role="alert">{activeRecords.error} WMS-kartet kan fortsatt vises. Filter og lokalitetsinformasjon er utilgjengelig; dette er ikke null treff.</p>}
          {data && <>
            <p>{data.localities.length} registrerte lokaliteter · {data.natureTypes.length} naturtyper i kommunen. Oversikten omfatter også lokaliteter som krysser kommunegrensen.</p>
            {data.localities.length === 0 ? <p>Ingen registrerte lokaliteter i denne kilden. Det dokumenterer ikke fravær av naturverdi.</p> : <>
              <label htmlFor={`${id}-search`}>Søk i naturtyper</label>
              <input id={`${id}-search`} type="search" value={choice.search} placeholder="Skriv del av naturtypenavnet" onChange={(event) => updateChoice({ search: event.target.value })} />
              <label htmlFor={`${id}-type`}>Naturtype</label>
              <select id={`${id}-type`} value={choice.filter.natureType ?? ''} onChange={(event) => updateChoice({ filter: { ...choice.filter, natureType: event.target.value || null }, selectedId: null, limit: 60 })}>
                <option value="">Alle registrerte naturtyper</option>{filteredTypes.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              {filteredTypes.length === 0 && <p>Ingen naturtypenavn samsvarer med søket.</p>}
              <label htmlFor={`${id}-value`}>Verdikategori</label>
              <select id={`${id}-value`} value={choice.filter.value ?? ''} onChange={(event) => updateChoice({ filter: { ...choice.filter, value: event.target.value || null }, selectedId: null, limit: 60 })}>
                <option value="">Alle fire verdikategorier</option>{municipalValueLegend.map((item) => <option key={item.label}>{item.label}</option>)}
              </select>
              <button type="button" onClick={() => setChoice(freshChoice(owner))}>Vis alle registrerte lokaliteter</button>
              <p aria-live="polite">Kart og liste viser {visible.length} registrerte lokaliteter{choice.filter.natureType ? ` · ${choice.filter.natureType}` : ''}{choice.filter.value ? ` · ${choice.filter.value}` : ''}.</p>
              <details open={visible.length <= 60 || undefined}><summary>Lokaliteter ({visible.length})</summary>
                <ul className="explore-themes__localities" aria-label="Registrerte lokaliteter">{visible.slice(0, choice.limit).map((item) => <li key={item.id}><button type="button" aria-pressed={selected?.id === item.id} onClick={() => updateChoice({ selectedId: item.id })}><strong>{item.name === 'Ikke oppgitt' ? `Lokalitet ${item.id}` : item.name}</strong><small>{item.natureType} · {item.value}</small></button></li>)}</ul>
                {visible.length > choice.limit && <button type="button" onClick={() => updateChoice({ limit: choice.limit + 60 })}>Vis flere lokaliteter</button>}
              </details>
              {selected && <section aria-label="Valgt lokalitet"><h3>{selected.name}</h3><p>{selected.natureType} · {selected.value}</p><p>Objekt-ID: {selected.id}<br />Kilde-ID: {selected.sourceId}</p><button type="button" onClick={() => updateChoice({ selectedId: null })}>Fjern valg</button></section>}
            </>}
          </>}
        </section> : null
  const definition = mapLayers.find((item) => item.id === panel)
  function layerStatus(item: MapLayerDefinition) {
    if (!layers[item.id as MapLayerId].visible || !activeBoundary || mapState.owner !== owner) return null
    const status = mapState.layers[item.id as MapLayerId]
    if (status === 'out-of-scale') return <p role="status">Grå arealer vises ved målestokk 1:250 000 eller nærmere. Zoom inn for å se kartdata.</p>
    if (status === 'loading') return <p role="status">Laster {item.name.toLocaleLowerCase('nb')}…</p>
    if (status === 'empty') return <p role="status">Karttjenesten returnerte et gyldig, tomt bilde for dette utsnittet.</p>
    if (status === 'error') return <p role="alert">Kartdata for {item.name} kunne ikke vises. Dette er en datafeil, ikke fravær av registreringer.</p>
    return null
  }
  function layerInfo(item: MapLayerDefinition) {
    return <section className="explore-themes__layer-info" key={item.id} aria-label={`Tegnforklaring: ${item.name}`}>
      <h3>{item.name}</h3><span className="explore-themes__role">{item.role}</span>
      {item.reference && <p className="explore-themes__reference">{item.reference}</p>}
      {item.id === 'grey-areas' ? <><p>{grey.description}</p><ServiceLegend key={grey.legendImage.url} {...grey.legendImage} /></> : item.legendImage && <ServiceLegend key={item.legendImage.url} {...item.legendImage} />}
      {item.id === 'wild-reindeer' && layers['wild-reindeer'].visible && <p role="status">{reindeerCoverage?.status === 'no_hit'
        ? 'Ingen registrerte leveområder for villrein i kommunen i denne kilden. Dette er en gyldig tom visning, ikke en kartfeil.'
        : reindeerCoverage?.status === 'hit' ? 'Kilden har registrerte leveområder som krysser kommunegrensen.'
        : coverageState === 'loading' ? 'Kontrollerer kommunens villreinregistreringer…'
        : 'Registreringsdekningen kunne ikke bekreftes nå. Det betyr ikke null registreringer; WMS-kartet kan fortsatt vises.'}</p>}
      {item.legend.length > 0 && <ul className="explore-themes__legend">{item.legend.map((symbol) => <li key={symbol.label}><i style={{ background: symbol.background ?? symbol.color }} aria-hidden="true" />{symbol.label}</li>)}</ul>}
      <details className="explore-themes__source"><summary>Kilde og forbehold</summary>
        <p>{item.description}</p><p>{item.note}</p><p>{item.source}</p>
        {item.metadataUrl && <p><a href={item.metadataUrl} target="_blank" rel="noreferrer">Offisiell kilde, metadata og bruksvilkår</a></p>}
        <p>Kartlaget avgrenses visuelt til valgt kommune. Lagvalg, gjennomsiktighet, filter og lokalitetsvalg beholder kartutsnittet.</p>
        {item.id === 'level0' && <p>Kommuneoversikten bruker et klargjort raster der det finnes; detaljkartet bruker samme eksisterende WMS-klassifisering. Klargjort kommuneoversikt finnes foreløpig for Trondheim.</p>}
        {item.id === 'valued-nature' && <p>Fire verdikategorier hentes romlig mot kommunegrensen. Alle-visningen bruker WMS; filtrerte utvalg viser kildens lokalitetsgeometri med samme verdifarger. Filtrene gjelder bare dette laget.</p>}
        {item.id === 'future-development' && <p>Arealbruksstatus 2 og arealformål i 1000-/2000-serien. Bare Natur og Jordbruk innenfor disse formålene vises. Bebygd og vann skjules. Planer og datadekning varierer mellom kommuner.</p>}
      </details>
    </section>
  }
  return <section className="explore-themes" aria-label="Kart med flere lag">
    <div className={`explore-themes__body ${panel ? 'has-detail' : ''} ${pickerOpen ? 'layers-open' : ''}`}>
      <aside className="explore-themes__panel explore-themes__controls" aria-label="Lagvelger">
        <div className="explore-themes__panel-heading"><h2><ExploreMapIcon name="layers" />Kartlag</h2><span className="explore-themes__counter">{activeDefinitions.length} aktive</span><button type="button" className="explore-themes__mobile-close explore-themes__icon-button" onClick={closePanel} aria-label="Lukk kartlag"><ExploreMapIcon name="close" /></button></div>
        <p className="explore-themes__intro">Velg hva du vil se i kartet.</p>
        <div id={`${id}-layers`} className="explore-themes__layer-list">
          {mapLayerRoles.map((role) => <fieldset key={role}><legend>{role}</legend>
            {mapLayers.filter((item) => item.role === role).map((item) => <div className={`explore-themes__layer ${layers[item.id].visible ? 'is-active' : ''}`} key={item.id}>
              <label className="explore-themes__layer-choice"><input type="checkbox" aria-label={item.name} checked={layers[item.id].visible} onChange={(event) => toggleLayer(item.id, event.target.checked)} /><span>{item.name}{item.id === 'intact-nature' && <small>Januar 2023</small>}{layers[item.id].visible && layers[item.id].opacity === 0 && <small>Helt gjennomsiktig</small>}{item.id === 'valued-nature' && (choice.filter.natureType || choice.filter.value) && <small>Filter aktivt</small>}</span></label>
              <button type="button" className="explore-themes__icon-button" aria-label={`Innstillinger for ${item.name}`} aria-expanded={panel === item.id} aria-controls={`${id}-detail`} onClick={() => openPanel(item.id)}><ExploreMapIcon name="settings" /></button>
              <div className="explore-themes__layer-status">{layerStatus(item)}</div>
            </div>)}
          </fieldset>)}
          <p className="explore-themes__footnote">Temadata supplerer regnskapsgrunnlaget. Lagvalg starter ingen analyse.</p>
        </div>
        <div className="explore-themes__layer-actions"><button type="button" disabled={!activeDefinitions.length} onClick={() => { setLayers((previous) => Object.fromEntries(Object.entries(previous).map(([key, value]) => [key, { ...value, visible: false }])) as unknown as MapLayerState); updateChoice({ selectedId: null }); setPanel(null) }}>Slå av alle</button><button type="button" onClick={() => openPanel('legend')}><ExploreMapIcon name="legend" />Tegnforklaring</button></div>
      </aside>
      <section className="explore-themes__map" aria-label="Kommunekart">
        <header><button type="button" className="explore-themes__tablet-back" onClick={closePanel}><ExploreMapIcon name="back" />Tilbake til kartlag</button><strong className="explore-themes__map-context"><ExploreMapIcon name="pin" />{municipality.name}<span> · Kommuneutsnitt</span></strong><button type="button" disabled={!activeBoundary} onClick={() => controller.current?.fitToMunicipality()}><ExploreMapIcon name="reset" />Vis hele kommunen</button></header>
        <div className="explore-themes__map-surface"><div ref={element} className="explore-themes__canvas" role="region" aria-label={`Interaktivt kart i ${municipality.name}`} aria-describedby={`${id}-instructions`} tabIndex={0} />
          {!activeBoundary && <p className="explore-themes__map-notice" role="status">Venter på kommunegrensen…</p>}
          {creationError && <p className="explore-themes__map-notice" role="alert">{creationError}</p>}
          {activeDefinitions.length === 0 && <p className="explore-themes__map-notice">Alle temalag er slått av. Bakgrunnskartet vises.</p>}
          <button type="button" className="explore-themes__floating-legend" onClick={() => openPanel('legend')}><ExploreMapIcon name="legend" />Tegnforklaring</button>
        </div>
        <footer><span>{activeDefinitions.length} aktive kartlag</span><span>Supplerende kartvisning</span></footer>
        <p id={`${id}-instructions`} className="sr-only">Flytt kartet med mus, berøring eller piltaster. Zoom med musehjul eller pluss og minus. Lagvalg starter ingen analyse. Escape lukker åpne paneler.</p>
      </section>
      {panel && <aside ref={panelElement} id={`${id}-detail`} className="explore-themes__panel explore-themes__info" aria-label={definition ? `Innstillinger: ${definition.name}` : 'Aktive lag og tegnforklaring'}>
        <header className="explore-themes__detail-heading"><button type="button" className="explore-themes__detail-back explore-themes__icon-button" aria-label="Tilbake til kartlag" onClick={closePanel}><ExploreMapIcon name="back" /></button><div><small>{definition?.role ?? 'Aktive kartlag'}</small><h2>{definition?.name ?? 'Tegnforklaring'}</h2></div><button type="button" className="explore-themes__icon-button" aria-label="Lukk detaljpanel" onClick={closePanel}><ExploreMapIcon name="close" /></button></header>
        <div className="explore-themes__detail-scroll">
          {definition && <>
            {!layers[definition.id].visible && <p className="explore-themes__reference">Dette laget er slått av.<button type="button" onClick={() => toggleLayer(definition.id, true)}>Aktiver {definition.name}</button></p>}
            {definition.id === 'valued-nature' && natureFilter}
            <section className="explore-themes__opacity-settings"><label htmlFor={`${id}-opacity-${definition.id}`}>Gjennomsiktighet <output htmlFor={`${id}-opacity-${definition.id}`}>{Math.round((1 - layers[definition.id].opacity) * 100)} %</output></label><input id={`${id}-opacity-${definition.id}`} type="range" min="0" max="100" step="5" value={Math.round((1 - layers[definition.id].opacity) * 100)} aria-label={`Gjennomsiktighet – ${definition.name}`} onChange={(event) => setLayers((previous) => ({ ...previous, [definition.id]: { ...previous[definition.id], opacity: 1 - Number(event.target.value) / 100 } }))} /><div><span>Ugjennomsiktig</span><span>Helt gjennomsiktig</span></div></section>
            {definition.id === 'grey-areas' && <label>Framstilling – Grå arealer<select value={greyPresentation} onChange={(event) => setGreyPresentation(event.target.value as GreyPresentation)}>{greyPresentations.map((item) => <option key={item.layer} value={item.layer}>{item.label}</option>)}</select></label>}
            {layerInfo(definition)}
          </>}
          {panel === 'legend' && (activeDefinitions.length ? [...activeDefinitions].reverse().map(layerInfo) : <p>Ingen aktive kartlag. Bakgrunnskartet vises.</p>)}
        </div>
      </aside>}
      <nav className="explore-themes__mobile-nav" aria-label="Kartkontroller">
        <button ref={pickerButton} type="button" aria-expanded={pickerOpen} aria-controls={`${id}-layers`} onClick={() => { if (pickerOpen) closePanel(); else { opener.current = pickerButton.current; setPanel(null); setPickerOpen(true) } }}><ExploreMapIcon name="layers" />Kartlag ({activeDefinitions.length})</button>
        <button type="button" aria-expanded={panel === 'valued-nature'} onClick={() => { toggleLayer('valued-nature', true); openPanel('valued-nature') }}><ExploreMapIcon name="settings" />Naturtypefilter</button>
        <button type="button" aria-expanded={panel === 'legend'} onClick={() => openPanel('legend')}><ExploreMapIcon name="legend" />Tegnforklaring</button>
      </nav>
    </div>
  </section>
}
