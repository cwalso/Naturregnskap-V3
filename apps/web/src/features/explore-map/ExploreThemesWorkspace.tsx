import { useEffect, useId, useRef, useState } from 'react'
import type { Municipality, MunicipalityBoundary } from '../../api/municipalities'
import { filterRegisteredNature, getMunicipalValuedNature, municipalValueLegend, noMunicipalNatureFilter, type MunicipalNatureFilter, type MunicipalValuedNature } from '../../api/municipalValuedNature'
import { createExploreThemeMap, type ThemeMapController, type ThemeMapStatus } from '../../map/exploreThemeMap'
import { mapThemes, mapThemeById, type MapThemeId } from './mapThemes'
import './ExploreThemesWorkspace.css'

interface Props { municipality: Municipality; boundary: MunicipalityBoundary | null }
interface Choice { owner: string; filter: MunicipalNatureFilter; selectedId: string | null; search: string; limit: number }
const freshChoice = (owner: string): Choice => ({ owner, filter: noMunicipalNatureFilter, selectedId: null, search: '', limit: 60 })

export function ExploreThemesWorkspace({ municipality, boundary }: Props) {
  const [theme, setTheme] = useState<MapThemeId>('level0')
  const definition = mapThemeById(theme)
  const owner = `${municipality.number}:${theme}`
  const [storedChoice, setChoice] = useState<Choice>(() => freshChoice(owner))
  const choice = storedChoice.owner === owner ? storedChoice : freshChoice(owner)
  const [records, setRecords] = useState<{ number: string; status: 'loading' | 'ready' | 'error'; data: MunicipalValuedNature | null; error?: string } | null>(null)
  const [mapState, setMapState] = useState<{ theme: MapThemeId; status: ThemeMapStatus }>({ theme, status: 'idle' })
  const [creationError, setCreationError] = useState<string | null>(null)
  const element = useRef<HTMLDivElement>(null)
  const controller = useRef<ThemeMapController | null>(null)
  const id = useId()
  const activeBoundary = boundary?.properties.number === municipality.number ? boundary : null
  const activeRecords = records?.number === municipality.number && theme === 'valued-nature' ? records : null
  const data = activeRecords?.status === 'ready' ? activeRecords.data : null
  const visible = data ? filterRegisteredNature(data, choice.filter) : []
  const selected = visible.find((item) => item.id === choice.selectedId)
  const updateChoice = (update: Partial<Choice>) => setChoice({ ...choice, ...update, owner })

  useEffect(() => {
    if (!element.current) return
    try { controller.current = createExploreThemeMap(element.current, (theme, status) => setMapState({ theme, status })) }
    catch (error) { setCreationError(error instanceof Error ? error.message : 'Kartet kunne ikke opprettes.') }
    return () => { controller.current?.destroy(); controller.current = null }
  }, [])
  useEffect(() => {
    if (theme !== 'valued-nature' || !activeBoundary) return
    const abort = new AbortController()
    setRecords({ number: activeBoundary.properties.number, status: 'loading', data: null })
    void getMunicipalValuedNature(activeBoundary, abort.signal).then((data) => {
      if (!abort.signal.aborted) setRecords({ number: data.municipalityNumber, status: 'ready', data })
    }).catch((error: unknown) => {
      if (!abort.signal.aborted) setRecords({ number: activeBoundary.properties.number, status: 'error', data: null,
        error: error instanceof Error ? error.message : 'Naturtypeoversikten kunne ikke hentes.' })
    })
    return () => abort.abort()
  }, [theme, activeBoundary])
  useEffect(() => {
    controller.current?.update({ boundary: activeBoundary, theme, data, filter: choice.filter, selectedId: selected?.id ?? null })
  }, [activeBoundary, theme, data, choice.filter, selected?.id])
  useEffect(() => {
    controller.current?.setSelectionHandler((selectedId) => setChoice((previous) => ({ ...(previous.owner === owner ? previous : freshChoice(owner)), selectedId })))
    return () => controller.current?.setSelectionHandler(null)
  }, [owner])
  const status = mapState.theme === theme ? mapState.status : 'loading'
  const filteredTypes = data?.natureTypes.filter((name) => name.toLocaleLowerCase('nb').includes(choice.search.trim().toLocaleLowerCase('nb')) || name === choice.filter.natureType) ?? []

  return <section className="explore-themes" aria-label="Selvstendige kartvisninger">
    <div className="explore-themes__selector">
      <label htmlFor={`${id}-theme`}>Velg karttema</label>
      <select id={`${id}-theme`} value={theme} onChange={(event) => {
        const next = event.target.value as MapThemeId
        setTheme(next); setChoice(freshChoice(`${municipality.number}:${next}`))
      }}>{mapThemes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <span className="explore-themes__role">{definition.role}</span>
    </div>
    <p className="explore-themes__description">{definition.description}</p>
    <div className="explore-themes__body">
      <section className="explore-themes__map" aria-label={`Karttema: ${definition.name}`}>
        <header><strong>{definition.name} – {municipality.name}</strong><button type="button" disabled={!activeBoundary} onClick={() => controller.current?.fitToMunicipality()}>Vis hele kommunen</button></header>
        <div ref={element} className="explore-themes__canvas" role="region" aria-label={`Interaktivt kart: ${definition.name} i ${municipality.name}`} tabIndex={0} />
        {!activeBoundary && <p role="status">Venter på kommunegrensen…</p>}
        {activeBoundary && status === 'loading' && <p role="status">Laster {definition.name.toLocaleLowerCase('nb')}…</p>}
        {(creationError || status === 'error') && <p role="alert">{creationError ?? `Kartdata for ${definition.name} kunne ikke vises. Dette er en datafeil, ikke fravær av registreringer.`}</p>}
      </section>
      <aside className="explore-themes__panel" aria-label="Tema og tegnforklaring">
        <h2>Tegnforklaring</h2>
        <ul className="explore-themes__legend">{definition.legend.map((item) => <li key={item.label}><i style={{ backgroundColor: item.color }} aria-hidden="true" />{item.label}</li>)}</ul>
        <p>{definition.note}</p>
        {theme === 'valued-nature' && <>
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
        </>}
        <details className="explore-themes__source"><summary>Kilde og avgrensning</summary><p>{definition.source}</p>
          <p>Karttemaet avgrenses visuelt til valgt kommune. Temabytte, filter og lokalitetsvalg beholder kartutsnittet.</p>
          {theme === 'level0' && <p>Kommuneoversikten bruker et klargjort raster der det finnes; detaljkartet bruker samme eksisterende WMS-klassifisering. Klargjort kommuneoversikt finnes foreløpig for Trondheim.</p>}
          {theme === 'valued-nature' && <p>Alle lokaliteter fra de fire verdikategoriene hentes romlig mot kommunegrensen. Alle-visningen bruker WMS; filtrerte utvalg viser kildens lokalitetsgeometri med samme verdifarger. Dette er ingen kryssanalyse.</p>}
          {theme === 'future-development' && <p>Arealbruksstatus 2 og arealformål i 1000-/2000-serien. Kildens planflater vises uten fratrekk av Bebygd eller analysegridets stripebehandling. Planer og datadekning varierer mellom kommuner.</p>}
        </details>
      </aside>
    </div>
  </section>
}
