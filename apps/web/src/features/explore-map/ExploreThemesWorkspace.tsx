import { useEffect, useId, useRef, useState } from 'react'
import type { Municipality, MunicipalityBoundary } from '../../api/municipalities'
import { filterRegisteredNature, getMunicipalValuedNature, municipalValueLegend, noMunicipalNatureFilter, type MunicipalNatureFilter, type MunicipalValuedNature } from '../../api/municipalValuedNature'
import { createExploreLayerMap, type LayerMapController, type LayerMapStatus } from '../../map/exploreThemeMap'
import { initialMapLayers, mapLayers, mapLayerRoles, type MapLayerId, type MapLayerState } from './mapThemes'
import './ExploreThemesWorkspace.css'

interface Props { municipality: Municipality; boundary: MunicipalityBoundary | null }
interface Choice { owner: string; filter: MunicipalNatureFilter; selectedId: string | null; search: string; limit: number }
const freshChoice = (owner: string): Choice => ({ owner, filter: noMunicipalNatureFilter, selectedId: null, search: '', limit: 60 })
interface MapStatus { owner: string | null; layers: Partial<Record<MapLayerId, LayerMapStatus>> }

export function ExploreThemesWorkspace({ municipality, boundary }: Props) {
  const [layers, setLayers] = useState<MapLayerState>(initialMapLayers)
  const [pickerOpen, setPickerOpen] = useState(() => !window.matchMedia?.('(max-width: 900px)').matches)
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
    controller.current?.update({ boundary: activeBoundary, layers, data, filter: choice.filter, selectedId: selected?.id ?? null })
  }, [activeBoundary, layers, data, choice.filter, selected?.id])
  useEffect(() => {
    controller.current?.setSelectionHandler((selectedId) => setChoice((previous) => ({ ...(previous.owner === owner ? previous : freshChoice(owner)), selectedId })))
    return () => controller.current?.setSelectionHandler(null)
  }, [owner])
  const filteredTypes = data?.natureTypes.filter((name) => name.toLocaleLowerCase('nb').includes(choice.search.trim().toLocaleLowerCase('nb')) || name === choice.filter.natureType) ?? []

  return <section className="explore-themes" aria-label="Kart med flere lag">
    <div className="explore-themes__body">
      <section className="explore-themes__map" aria-label="Kommunekart">
        <header><strong>Utforsk i kart – {municipality.name}</strong><button type="button" disabled={!activeBoundary} onClick={() => controller.current?.fitToMunicipality()}>Vis hele kommunen</button></header>
        <div ref={element} className="explore-themes__canvas" role="region" aria-label={`Interaktivt kart i ${municipality.name}`} tabIndex={0} />
        {!activeBoundary && <p role="status">Venter på kommunegrensen…</p>}
        {creationError && <p role="alert">{creationError}</p>}
        {activeDefinitions.length === 0 && <p>Alle temalag er slått av. Bakgrunnskartet vises.</p>}
      </section>
      <aside className="explore-themes__panel explore-themes__controls" aria-label="Lagvelger">
        <button type="button" className="explore-themes__picker-toggle" aria-expanded={pickerOpen} aria-controls={`${id}-layers`} onClick={() => setPickerOpen((open) => !open)}>
          Kartlag · {activeDefinitions.length} aktive <span aria-hidden="true">{pickerOpen ? '−' : '+'}</span>
        </button>
        <div id={`${id}-layers`} hidden={!pickerOpen}>
          <p>Slå lag av og på uavhengig. Kombinasjonen er en kartvisning; ingen overlapp beregnes.</p>
          <div className="explore-themes__layer-list">
            {mapLayerRoles.map((role) => <fieldset key={role}><legend>{role}</legend>
              {mapLayers.filter((item) => item.role === role).map((definition) => {
                const settings = layers[definition.id]
                const transparency = Math.round((1 - settings.opacity) * 100)
                const status = mapState.owner === owner ? mapState.layers[definition.id] : 'idle'
                return <div className="explore-themes__layer" key={definition.id}>
                  <label className="explore-themes__layer-choice"><input type="checkbox" checked={settings.visible} onChange={(event) => toggleLayer(definition.id, event.target.checked)} />{definition.name}</label>
                  {settings.visible && <>
                    <label className="explore-themes__opacity" htmlFor={`${id}-opacity-${definition.id}`}>Gjennomsiktighet <output htmlFor={`${id}-opacity-${definition.id}`}>{transparency} %</output></label>
                    <input id={`${id}-opacity-${definition.id}`} type="range" min="0" max="100" step="5" value={transparency} aria-label={`Gjennomsiktighet – ${definition.name}`} onChange={(event) => setLayers((previous) => ({ ...previous, [definition.id]: { ...previous[definition.id], opacity: 1 - Number(event.target.value) / 100 } }))} />
                    {activeBoundary && status === 'loading' && <p role="status">Laster {definition.name.toLocaleLowerCase('nb')}…</p>}
                    {status === 'error' && <p role="alert">Kartdata for {definition.name} kunne ikke vises. Dette er en datafeil, ikke fravær av registreringer.</p>}
                  </>}
                </div>
              })}
            </fieldset>)}
          </div>
          <small>Grunnkart nederst, framtidig utbygging over og naturtyper øverst. Kommunegrensen ligger over alle lag.</small>
        </div>
      </aside>
      {activeDefinitions.length > 0 && <aside className="explore-themes__panel explore-themes__info" aria-label="Aktive lag og tegnforklaring">
        <h2>Tegnforklaring</h2>
        {activeDefinitions.map((definition) => <section className="explore-themes__layer-info" key={definition.id} aria-label={`Tegnforklaring: ${definition.name}`}>
          <h3>{definition.name}</h3><span className="explore-themes__role">{definition.role}</span>
          <ul className="explore-themes__legend">{definition.legend.map((item) => <li key={item.label}><i style={{ backgroundColor: item.color }} aria-hidden="true" />{item.label}</li>)}</ul>
          <details className="explore-themes__source"><summary>Om {definition.name.toLocaleLowerCase('nb')}</summary>
            <p>{definition.description}</p><p>{definition.note}</p><p>{definition.source}</p>
            <p>Kartlaget avgrenses visuelt til valgt kommune. Lagvalg, gjennomsiktighet, filter og lokalitetsvalg beholder kartutsnittet.</p>
            {definition.id === 'level0' && <p>Kommuneoversikten bruker et klargjort raster der det finnes; detaljkartet bruker samme eksisterende WMS-klassifisering. Klargjort kommuneoversikt finnes foreløpig for Trondheim.</p>}
            {definition.id === 'valued-nature' && <p>Fire verdikategorier hentes romlig mot kommunegrensen. Alle-visningen bruker WMS; filtrerte utvalg viser kildens lokalitetsgeometri med samme verdifarger. Filtrene gjelder bare dette laget.</p>}
            {definition.id === 'future-development' && <p>Arealbruksstatus 2 og arealformål i 1000-/2000-serien. Bare Natur og Jordbruk innenfor disse formålene vises. Bebygd og vann skjules. Planer og datadekning varierer mellom kommuner.</p>}
          </details>
        </section>)}
        {natureVisible && <section className="explore-themes__nature-filter" aria-label="Filter og lokaliteter for Verdsatte naturtyper">
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
        </section>}
      </aside>}
    </div>
  </section>
}
