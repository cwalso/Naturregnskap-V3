import { focusAnalysisSection } from '../analysis-ui/analysisContentNavigation'
import { hasAnalysisGeometry } from './analysisGeometry'
import { MobileAnalysisControls, type AnalysisViewMode } from './MobileAnalysisControls'
import { AnalysisPanel } from '../future-analysis/AnalysisPanel'
import { calculateFutureNature, selectionGeometry, type Result, type Selection } from '../future-analysis/model'
import { calculatePlanArea } from '../plan-area/source'
import { PlanAreaPanel } from '../plan-area/PlanAreaPanel'
import { planAreaGeometry, type PlanAreaResult, type PlanAreaSelection } from '../plan-area/model'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Municipality, MunicipalityBoundary } from '../../api/municipalities'
import type { ThematicCoverageResponse } from '../../api/thematicCoverage'
import { filterRegisteredNature, getMunicipalValuedNature, noMunicipalNatureFilter, type MunicipalNatureFilter, type MunicipalValuedNature } from '../../api/municipalValuedNature'
import { createExploreLayerMap, type LayerMapController, type LayerMapStatus } from '../../map/exploreThemeMap'
import { greyPresentations, type GreyPresentation, initialMapLayers, mapLayers, mapLayerRoles, type MapLayerId, type MapLayerState, type MapLayerDefinition } from './mapThemes'
import { RegisteredNatureDetails, RegisteredNaturePanel } from './RegisteredNaturePanel'
import { ExploreMapIcon } from './ExploreMapIcon'
import './ExploreThemesWorkspace.css'
import './MobileSplitView.css'

interface Props { municipality: Municipality; boundary: MunicipalityBoundary | null; coverage?: ThematicCoverageResponse | null; coverageState?: 'idle' | 'loading' | 'error'; initialAnalysisOpen?: boolean; initialAnalysisMode?: 'area' | 'nature'; initialAreaSelection?: PlanAreaSelection }
interface Choice { owner: string; filter: MunicipalNatureFilter; selectedId: string | null; search: string; limit: number }
const freshChoice = (owner: string): Choice => ({ owner, filter: noMunicipalNatureFilter, selectedId: null, search: '', limit: 60 })
const displayOrder: MapLayerId[] = ['level0', 'future-development', 'valued-nature', 'protected-areas', 'intact-nature', 'wild-reindeer', 'grey-areas']
interface MapStatus { owner: string | null; layers: Partial<Record<MapLayerId, LayerMapStatus>> }

function ServiceLegend({ url, description }: { url: string; description: string }) {
  const [failed, setFailed] = useState(false)
  return <div className="explore-themes__service-legend">{failed
    ? <p role="status">Tegnforklaringen fra kilden kunne ikke hentes. Kartlaget kan fortsatt vises.</p>
    : <img src={url} alt={description} onError={() => setFailed(true)} />}</div>
}

export function ExploreThemesWorkspace({ municipality, boundary, coverage, coverageState = 'idle', initialAnalysisOpen = false, initialAnalysisMode = 'nature', initialAreaSelection = {kind:'all'} }: Props) {
  const owner = municipality.number
  const [activeMode, setActiveMode] = useState<'area' | 'nature' | null>(initialAnalysisOpen ? initialAnalysisMode : null)
  const analysisMode = activeMode ?? 'area'
  const [viewMode,setViewMode] = useState<AnalysisViewMode>('split')
  const returnToAnalysis = useRef(initialAnalysisOpen)
  const analysisPanelElement = useRef<HTMLElement>(null)
  const [greyPresentation, setGreyPresentation] = useState<GreyPresentation>('graa_arealer')
  const grey = greyPresentations.find((item) => item.layer === greyPresentation)!
  const [layers, setLayers] = useState<MapLayerState>(initialMapLayers)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [storedPanel, setPanel] = useState<{ owner: string; value: MapLayerId | 'legend' | 'object' | 'analysis' } | null>(() => initialAnalysisOpen ? { owner: municipality.number, value: 'analysis' } : null)
  const panel = storedPanel?.owner === municipality.number || storedPanel?.value === 'analysis' ? storedPanel?.value ?? null : null
  const [analysisState, setAnalysisState] = useState<{ owner: string; result: Result | null; loading: boolean; error: string | null } | null>(null)
  const [areaState,setAreaState]=useState<{owner:string;result:PlanAreaResult|null;loading:boolean;error:string|null}|null>(null)
  const [storedAreaSelection,setAreaSelection]=useState<{owner:string;selection:PlanAreaSelection}>({owner:municipality.number,selection:initialAreaSelection})
  const areaSelection=useMemo<PlanAreaSelection>(()=>storedAreaSelection.owner===municipality.number?storedAreaSelection.selection:{kind:'all'},[storedAreaSelection,municipality.number])
  const [storedAnalysisSelection, storeAnalysisSelection] = useState<{ owner: string; selection: Selection }>({ owner: municipality.number, selection: { kind: 'all' } })
  const analysisSelection = useMemo<Selection>(() => storedAnalysisSelection.owner === municipality.number ? storedAnalysisSelection.selection : { kind: 'all' }, [storedAnalysisSelection, municipality.number])
  const panelElement = useRef<HTMLElement>(null)
  const analysisReturnFocus = useRef<HTMLElement | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const pickerButton = useRef<HTMLButtonElement>(null)
  function openPanel(value: MapLayerId | 'legend' | 'object' | 'analysis') {
    if (value !== 'analysis' && (panel === 'analysis' || (!panel && !pickerOpen))) {returnToAnalysis.current = panel === 'analysis';analysisReturnFocus.current = document.activeElement as HTMLElement}
    opener.current = document.activeElement as HTMLElement
    setPickerOpen(false); setPanel({ owner: municipality.number, value })
  }
  const closePanel = useCallback(() => {
    const temporary = pickerOpen || (panel !== null && panel !== 'analysis')
    if (!temporary && activeMode) setViewMode('map')
    setPanel(temporary && activeMode && returnToAnalysis.current ? { owner, value: 'analysis' } : null); setPickerOpen(false)
    requestAnimationFrame(() => {
      const target = temporary && activeMode ? analysisReturnFocus.current : opener.current
      if (target?.isConnected && target.getClientRects().length) target.focus({ preventScroll: true })
      else element.current?.focus({ preventScroll: true })
    })
  }, [activeMode, owner, panel, pickerOpen])
  useEffect(() => {
    if (panel) {
      const buttons = [...((panel === 'analysis' ? analysisPanelElement.current : panelElement.current)?.querySelectorAll<HTMLButtonElement>('header button') ?? [])]
      ;(buttons.find((button) => button.getClientRects().length) ?? buttons.at(-1))?.focus({ preventScroll: true })
    }
  }, [panel])
  useEffect(() => {
    if (!panel && !pickerOpen) return
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); closePanel() } }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [panel, pickerOpen, closePanel])
  const [storedChoice, setChoice] = useState<Choice>(() => freshChoice(owner))
  const choice = storedChoice.owner === owner ? storedChoice : freshChoice(owner)
  const [records, setRecords] = useState<{ number: string; status: 'loading' | 'ready' | 'error'; data: MunicipalValuedNature | null; error?: string } | null>(null)
  const previousOwner = useRef(owner)
  useEffect(() => {
    if (previousOwner.current === owner) return
    previousOwner.current = owner
    setChoice(freshChoice(owner))
    setAreaState(null)
    setAnalysisState(null)
    setAreaSelection({owner,selection:{kind:'all'}})
    storeAnalysisSelection({owner,selection:{kind:'all'}})
    setPanel(activeMode && (panel === 'analysis' || returnToAnalysis.current) ? {owner,value:'analysis'} : null)
    setPickerOpen(false)
  }, [owner, panel, activeMode])
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
    if (layerId === 'valued-nature' && !visible) {
      updateChoice({ selectedId: null })
      if (panel === 'valued-nature' || panel === 'object') closePanel()
    }
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
    controller.current?.setSelectionHandler((selectedId) => {
      setChoice((previous) => ({ ...(previous.owner === owner ? previous : freshChoice(owner)), selectedId }))
      if (selectedId) {
        opener.current = element.current
        setPickerOpen(false); setPanel({ owner, value: 'object' })
      } else setPanel((previous) => previous?.value === 'object' ? { owner, value: 'valued-nature' } : previous)
    })
    return () => controller.current?.setSelectionHandler(null)
  }, [owner])
  useEffect(() => {
    if (activeMode !== 'nature' || !activeBoundary) return
    const abort = new AbortController()
    setAnalysisState({ owner, result: null, loading: true, error: null })
    void calculateFutureNature(owner, abort.signal).then((result) => {
      if (!abort.signal.aborted) setAnalysisState({ owner, result, loading: false, error: null })
    }).catch((error: unknown) => {
      if (!abort.signal.aborted) setAnalysisState({ owner, result: null, loading: false, error: error instanceof Error ? error.message : 'Analysen kunne ikke beregnes.' })
    })
    return () => abort.abort()
  }, [activeMode, activeBoundary, owner])
  useEffect(()=>{
    if(activeMode!=='area'||!activeBoundary)return
    const abort=new AbortController()
    setAreaState(previous=>({owner,result:previous?.owner===owner?previous.result:null,loading:true,error:null}))
    void calculatePlanArea(owner,abort.signal).then(result=>{if(!abort.signal.aborted)setAreaState({owner,result,loading:false,error:null})}).catch((error:unknown)=>{if(!abort.signal.aborted)setAreaState({owner,result:null,loading:false,error:error instanceof Error?error.message:'Analysen kunne ikke beregnes.'})})
    return()=>abort.abort()
  },[activeMode,activeBoundary,owner])
  const activeArea=previousOwner.current===owner&&areaState?.owner===owner?areaState:null
  const areaResult=activeMode==='area'&&activeBoundary&&activeArea?.result?.status==='available'&&activeArea.result.municipalityNumber===owner&&activeArea.result.methodVersion==='planned-land-cover-area-v1'&&activeArea.result.analysisId?activeArea.result:null
  const activeAnalysis = activeMode === 'nature' && activeBoundary && previousOwner.current === owner && analysisState?.owner === owner ? analysisState : null
  const analysisResult = activeAnalysis?.result?.status === 'available' && activeAnalysis.result.municipalityNumber===owner && activeAnalysis.result.methodVersion==='future-valued-nature-geometry-v3' && activeAnalysis.result.analysisId ? activeAnalysis.result : null
  const canFitAnalysis=useMemo(()=>activeMode==='area'?Boolean(areaResult&&!activeArea?.loading&&!activeArea?.error&&hasAnalysisGeometry(planAreaGeometry(areaResult,areaSelection))):Boolean(analysisResult&&!activeAnalysis?.loading&&!activeAnalysis?.error&&hasAnalysisGeometry(selectionGeometry(analysisResult,analysisSelection))),[activeMode,areaResult,activeArea?.loading,activeArea?.error,areaSelection,analysisResult,activeAnalysis?.loading,activeAnalysis?.error,analysisSelection])
  useEffect(() => { controller.current?.setFutureNature?.(analysisResult, analysisSelection);controller.current?.setPlanArea?.(areaResult,areaSelection) }, [analysisResult, analysisSelection,areaResult,areaSelection])
  function chooseArea(selection:PlanAreaSelection){setAreaSelection({owner,selection});controller.current?.setPlanArea?.(areaResult,selection)}
  function changeAnalysisMode(mode: 'area' | 'nature') {
    if (activeMode === mode) return
    setAreaSelection({owner,selection:{kind:'all'}})
    storeAnalysisSelection({owner,selection:{kind:'all'}})
    setActiveMode(mode)
  }
  function openPrimaryAnalysis(){if (!activeMode) { changeAnalysisMode('area'); setViewMode('split') };openPanel('analysis')}
  function endAnalysis() {
    setActiveMode(null); setPanel(null); setPickerOpen(false); returnToAnalysis.current = false
    setAreaState(null); setAnalysisState(null)
    setAreaSelection({owner,selection:{kind:'all'}}); storeAnalysisSelection({owner,selection:{kind:'all'}})
    requestAnimationFrame(()=>element.current?.focus({preventScroll:true}))
  }
  function openLayers() {
    if (pickerOpen) { closePanel(); return }
    if (panel === 'analysis' || !panel) {returnToAnalysis.current = panel === 'analysis';analysisReturnFocus.current = document.activeElement as HTMLElement}
    opener.current = document.activeElement as HTMLElement; setPanel(null); setPickerOpen(true)
  }
  function showAreaMap(){setViewMode('map');setPanel(null);setPickerOpen(false);requestAnimationFrame(()=>element.current?.focus({preventScroll:true}))}
  function chooseAnalysis(selection: Selection) {
    storeAnalysisSelection({ owner, selection })
    controller.current?.setFutureNature?.(analysisResult, selection)
  }
  function changeViewMode(mode: AnalysisViewMode) {setViewMode(mode);setPickerOpen(false);setPanel(mode === 'map' ? null : {owner,value:'analysis'})}
  function showLocalityDetails(){
    if(analysisSelection.kind!=='locality'||!analysisResult?.localities.some(l=>l.id===analysisSelection.label))return
    setPickerOpen(false);setPanel({owner,value:'analysis'})
    if(viewMode==='map')setViewMode('results')
    requestAnimationFrame(()=>{const root=analysisPanelElement.current?.querySelector<HTMLElement>('[data-analysis-content]');if(root)focusAnalysisSection(root,'selected-locality')})
  }
  function fitAnalysis(){if(!canFitAnalysis)return;if(activeMode === 'area')controller.current?.setPlanArea?.(areaResult,areaSelection,true);else controller.current?.setFutureNature?.(analysisResult,analysisSelection,true)}
  const filteredTypes = data?.natureTypes.filter((name) => name.toLocaleLowerCase('nb').includes(choice.search.trim().toLocaleLowerCase('nb')) || name === choice.filter.natureType) ?? []

  const natureFilter = natureVisible ? <>
    {(!activeRecords || activeRecords.status === 'loading') && <p role="status">Henter kommunens registrerte lokaliteter og naturtyper…</p>}
    {activeRecords?.status === 'error' && <p role="alert">{activeRecords.error} WMS-kartet kan fortsatt vises. Filter og lokalitetsinformasjon er utilgjengelig; dette er ikke null treff.</p>}
    {data && <RegisteredNaturePanel id={id} data={data} filter={choice.filter} search={choice.search} types={filteredTypes} localities={visible} selectedId={selected?.id ?? null} limit={choice.limit}
      onFilter={(filter) => updateChoice({ filter, selectedId: null, limit: 60 })} onSearch={(search) => updateChoice({ search })} onReset={() => setChoice(freshChoice(owner))}
      onSelect={(selectedId) => { updateChoice({ selectedId }); openPanel('object') }} onMore={() => updateChoice({ limit: choice.limit + 60 })} />}
  </> : null
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
    <div className={`explore-themes__body ${panel ? 'has-detail' : ''} ${panel==='analysis'&&analysisMode==='area'?'has-area-analysis':''} ${pickerOpen ? 'layers-open' : ''} ${activeMode ? `has-analysis mode-${viewMode}` : ''} ${pickerOpen || panel && panel !== 'analysis' ? 'has-aux' : ''}`} data-analysis-mode={activeMode??'none'} data-view-mode={viewMode} data-analysis-id={areaResult?.analysisId??analysisResult?.analysisId}>
      {activeMode && <MobileAnalysisControls mode={activeMode} viewMode={viewMode} area={activeArea?.result??null} nature={activeAnalysis?.result??null} loading={activeMode==='area'?(activeArea?.loading??true):(activeAnalysis?.loading??true)} error={activeMode==='area'?(activeArea?.error??null):(activeAnalysis?.error??null)} areaSelection={areaSelection} natureSelection={analysisSelection} onMode={changeAnalysisMode} onView={changeViewMode} onArea={chooseArea} onNature={chooseAnalysis} onFit={fitAnalysis} canFit={canFitAnalysis} onLayers={openLayers} onEnd={endAnalysis} onDetails={showLocalityDetails} layersOpen={pickerOpen} panelId={`${id}-analysis`}/>}
      <aside className="explore-themes__panel explore-themes__controls" aria-label="Lagvelger">
        <div className="explore-themes__panel-heading"><h2><ExploreMapIcon name="layers" />Kartlag</h2><span className="explore-themes__counter">{activeDefinitions.length} aktive</span><button type="button" className="explore-themes__mobile-close explore-themes__icon-button" onClick={closePanel} aria-label="Lukk kartlag"><ExploreMapIcon name="close" /></button></div>
        <p className="explore-themes__intro">Velg hva du vil se i kartet.</p>
        <button type="button" className="explore-themes__analysis-entry" aria-expanded={panel === 'analysis'} aria-controls={`${id}-analysis`} onClick={openPrimaryAnalysis}>Analyser planområder</button>
        <div id={`${id}-layers`} className="explore-themes__layer-list">
          {mapLayerRoles.map((role) => <fieldset key={role}><legend>{role}</legend>
            {mapLayers.filter((item) => item.role === role).sort((a, b) => displayOrder.indexOf(a.id) - displayOrder.indexOf(b.id)).map((item) => <div className={`explore-themes__layer ${layers[item.id].visible ? 'is-active' : ''}`} key={item.id}>
              <label className="explore-themes__layer-choice"><input type="checkbox" aria-label={item.name} checked={layers[item.id].visible} onChange={(event) => toggleLayer(item.id, event.target.checked)} /><span>{item.name}{item.id === 'intact-nature' && <small>Januar 2023</small>}{layers[item.id].visible && layers[item.id].opacity === 0 && <small>Helt gjennomsiktig</small>}{item.id === 'valued-nature' && (choice.filter.natureType || choice.filter.value) && <small>Filter aktivt</small>}</span></label>
              <button type="button" className="explore-themes__icon-button" aria-label={`Innstillinger for ${item.name}`} aria-expanded={panel === item.id} aria-controls={`${id}-detail`} onClick={() => openPanel(item.id)}><ExploreMapIcon name="settings" /></button>
            </div>)}
          </fieldset>)}
          <p className="explore-themes__footnote">Temadata supplerer regnskapsgrunnlaget. Lagvalg starter ingen analyse.</p>
        </div>
        <div className="explore-themes__layer-actions"><button type="button" disabled={!activeDefinitions.length} onClick={() => { setLayers((previous) => Object.fromEntries(Object.entries(previous).map(([key, value]) => [key, { ...value, visible: false }])) as unknown as MapLayerState); updateChoice({ selectedId: null }); setPanel(null) }}>Slå av alle</button><button type="button" onClick={() => openPanel('legend')}><ExploreMapIcon name="legend" />Tegnforklaring</button></div>
      </aside>
      <section className="explore-themes__map" aria-label="Kommunekart">
        <header><button type="button" className="explore-themes__tablet-back" onClick={closePanel}><ExploreMapIcon name="back" />Tilbake til kartlag</button><strong className="explore-themes__map-context"><ExploreMapIcon name="pin" />{municipality.name}<span> · Kommuneutsnitt</span></strong><button type="button" disabled={!activeBoundary} onClick={() => controller.current?.fitToMunicipality()}><ExploreMapIcon name="reset" />Vis hele kommunen</button></header>
        <div className="explore-themes__map-surface"><div ref={element} className="explore-themes__canvas" role="region" aria-label={`Interaktivt kart i ${municipality.name}`} aria-describedby={`${id}-instructions`} tabIndex={0} onPointerDownCapture={(event) => { if (!(event.target as HTMLElement).closest('.ol-control')) event.currentTarget.focus({ preventScroll: true }) }} />
          <button type="button" className="explore-themes__mobile-whole" aria-label="Vis hele kommunen fra kartet" disabled={!activeBoundary} onClick={()=>controller.current?.fitToMunicipality()}><ExploreMapIcon name="reset" /></button>
          {!activeBoundary && <p className="explore-themes__map-notice" role="status">Venter på kommunegrensen…</p>}
          {creationError && <p className="explore-themes__map-notice" role="alert">{creationError}</p>}
          {activeDefinitions.length === 0 && <p className="explore-themes__map-notice">Alle temalag er slått av. Bakgrunnskartet vises.</p>}
          {natureVisible && (choice.filter.natureType || choice.filter.value) && <button type="button" className="explore-themes__filter-chip" aria-label="Åpne aktivt naturtypefilter" onClick={() => openPanel('valued-nature')}><ExploreMapIcon name="settings" /><span>{[choice.filter.natureType, choice.filter.value].filter(Boolean).join(' · ')}</span></button>}
          {activeDefinitions.length >= 5 && <button type="button" className="explore-themes__many-layers" onClick={() => openPanel('legend')}>{activeDefinitions.length} lag vises · Se tegnforklaring</button>}
          <button type="button" className="explore-themes__floating-legend" onClick={() => openPanel('legend')}><ExploreMapIcon name="legend" />Tegnforklaring</button>
        </div>
        <footer><span>{activeDefinitions.length} aktive kartlag</span><span>Supplerende kartvisning</span></footer>
        <div className="sr-only">{activeDefinitions.filter((item) => item.id !== panel).map((item) => <div key={item.id}>{layerStatus(item)}</div>)}</div>
        <p id={`${id}-instructions`} className="sr-only">Flytt kartet med mus, berøring eller piltaster. Zoom med musehjul eller pluss og minus. Lagvalg starter ingen analyse. Escape lukker åpne paneler.</p>
      </section>
      {panel && panel !== 'analysis' && <aside ref={panelElement} id={`${id}-detail`} className="explore-themes__panel explore-themes__info" aria-label={panel === 'object' ? 'Objektinformasjon' : definition ? `Innstillinger: ${definition.name}` : 'Aktive lag og tegnforklaring'}>
        <header className="explore-themes__detail-heading"><button type="button" className="explore-themes__detail-back explore-themes__icon-button" aria-label={activeMode ? "Tilbake til analysen" : "Tilbake til kartlag"} onClick={closePanel}><ExploreMapIcon name="back" /></button><div><small>{panel === 'object' ? 'Verdsatte naturtyper' : definition?.role ?? 'Aktive kartlag'}</small><h2>{panel === 'object' ? 'Objektinformasjon' : definition?.name ?? 'Tegnforklaring'}</h2></div><button type="button" className="explore-themes__icon-button" aria-label="Lukk detaljpanel" onClick={closePanel}><ExploreMapIcon name="close" /></button></header>
        <div className="explore-themes__detail-scroll" tabIndex={0} role="region" aria-label="Rullbart detaljinnhold">
          {definition && <>
            {!layers[definition.id].visible && <p className="explore-themes__reference">Dette laget er slått av.<button type="button" onClick={() => toggleLayer(definition.id, true)}>Aktiver {definition.name}</button></p>}
            {definition.id === 'valued-nature' && natureFilter}
            <section className="explore-themes__opacity-settings"><label htmlFor={`${id}-opacity-${definition.id}`}>Gjennomsiktighet <output htmlFor={`${id}-opacity-${definition.id}`}>{Math.round((1 - layers[definition.id].opacity) * 100)} %</output></label><input id={`${id}-opacity-${definition.id}`} type="range" min="0" max="100" step="5" value={Math.round((1 - layers[definition.id].opacity) * 100)} aria-label={`Gjennomsiktighet – ${definition.name}`} onChange={(event) => setLayers((previous) => ({ ...previous, [definition.id]: { ...previous[definition.id], opacity: 1 - Number(event.target.value) / 100 } }))} /><div><span>Ugjennomsiktig</span><span>Helt gjennomsiktig</span></div></section>
            {definition.id === 'grey-areas' && <fieldset className="explore-themes__presentations"><legend>Framstilling – Grå arealer</legend>{greyPresentations.map((item) => <label key={item.layer}><input type="radio" name={`${id}-grey`} value={item.layer} checked={greyPresentation === item.layer} onChange={() => setGreyPresentation(item.layer)} />{item.label}</label>)}</fieldset>}

            {layerStatus(definition)}
            {layerInfo(definition)}
          </>}
          {panel === 'object' && selected && <RegisteredNatureDetails locality={selected} municipality={municipality} onBack={() => setPanel({ owner, value: 'valued-nature' })} onClear={() => { updateChoice({ selectedId: null }); setPanel({ owner, value: 'valued-nature' }) }} />}
          {panel === 'legend' && (activeDefinitions.length ? [...activeDefinitions].reverse().map(layerInfo) : <p>Ingen aktive kartlag. Bakgrunnskartet vises.</p>)}
        </div>
      </aside>}
      {activeMode && <aside ref={analysisPanelElement} id={`${id}-analysis`} hidden={panel !== 'analysis'} className="explore-themes__panel explore-themes__info explore-themes__analysis-panel" aria-label={analysisMode === 'area' ? 'Arealer avsatt til framtidig utbygging' : 'Planoverlapp – naturtyper'}>
        <header className="explore-themes__detail-heading"><button type="button" className="explore-themes__detail-back explore-themes__icon-button" aria-label="Skjul analyseresultater" onClick={showAreaMap}><ExploreMapIcon name="back" /></button><div><small>Plananalyser</small><h2>{analysisMode === 'area' ? 'Arealfordeling' : 'Registrerte naturverdier'}</h2></div><button type="button" className="explore-themes__icon-button" aria-label="Avslutt analyse" onClick={endAnalysis}><ExploreMapIcon name="close" /></button></header>
        <div className="explore-themes__detail-scroll" tabIndex={0} role="region" aria-label="Rullbart detaljinnhold">
          <>
            <div className="explore-themes__analysis-switch" role="group" aria-label="Velg plananalyse"><button type="button" aria-pressed={analysisMode==='area'} onClick={()=>{changeAnalysisMode('area')}}>Arealfordeling</button><button type="button" aria-pressed={analysisMode==='nature'} onClick={()=>{changeAnalysisMode('nature')}}>Registrerte naturverdier</button></div>
            {analysisMode==='area'?<PlanAreaPanel result={activeArea?.result??null} loading={activeArea?.loading??true} error={activeArea?.error??null} selection={areaSelection} onSelect={chooseArea} onFit={fitAnalysis} canFit={canFitAnalysis} onShowMap={showAreaMap}/>:<AnalysisPanel key={`${owner}-${activeMode}`}  result={activeAnalysis?.result ?? null} loading={activeAnalysis?.loading ?? true} error={activeAnalysis?.error ?? null} selection={analysisSelection} onSelect={chooseAnalysis} onFit={fitAnalysis} canFit={canFitAnalysis} />}
          </>
        </div>
      </aside>}
      <nav className="explore-themes__mobile-nav" aria-label="Kartkontroller">
        <button type="button" aria-label="Analyser planområder" aria-expanded={panel === 'analysis'} aria-controls={`${id}-analysis`} onClick={()=>{if(panel==='analysis')showAreaMap();else openPrimaryAnalysis()}}>Plananalyser</button>
        <button ref={pickerButton} type="button" aria-expanded={pickerOpen} aria-controls={`${id}-layers`} onClick={openLayers}><ExploreMapIcon name="layers" />Kartlag ({activeDefinitions.length})</button>
        <button type="button" aria-expanded={panel === 'valued-nature'} onClick={() => { toggleLayer('valued-nature', true); openPanel('valued-nature') }}><ExploreMapIcon name="settings" />Naturtypefilter</button>
        <button type="button" aria-expanded={panel === 'legend'} onClick={() => openPanel('legend')}><ExploreMapIcon name="legend" />Tegnforklaring</button>
      </nav>
    </div>
  </section>
}
