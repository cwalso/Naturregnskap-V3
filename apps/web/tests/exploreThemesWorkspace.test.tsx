import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { natureFixture } from './natureFixture'
import { planAreaFixture } from './planAreaFixture'
import { ExploreThemesWorkspace } from '../src/features/explore-map/ExploreThemesWorkspace'
import type { MunicipalityBoundary } from '../src/api/municipalities'
import type { MunicipalValuedNature } from '../src/api/municipalValuedNature'
import type { LayerMapStatus } from '../src/map/exploreThemeMap'
import type { MapLayerId } from '../src/features/explore-map/mapThemes'

const controller = vi.hoisted(() => ({ update: vi.fn(), setPlanArea:vi.fn(),setFutureNature:vi.fn(),fitToMunicipality: vi.fn(), destroy: vi.fn(), setSelectionHandler: vi.fn() }))
const areaRequest=vi.hoisted(()=>vi.fn())
vi.mock('../src/features/plan-area/source',()=>({calculatePlanArea:areaRequest}))
const natureRequest=vi.hoisted(()=>vi.fn())
vi.mock('../src/features/future-analysis/model',async original=>({...await original<object>(),calculateFutureNature:natureRequest}))
const request = vi.hoisted(() => vi.fn())
let statusHandler: (layer: MapLayerId, status: LayerMapStatus, owner: string | null) => void
vi.mock('../src/map/exploreThemeMap', () => ({ createExploreLayerMap: (_target: HTMLElement, onStatus: typeof statusHandler) => { statusHandler = onStatus; return controller } }))
vi.mock('../src/api/municipalValuedNature', async (original) => ({ ...await original<object>(), getMunicipalValuedNature: request }))
const municipality = { number: '5001', name: 'Trondheim' }
const boundary: MunicipalityBoundary = { type: 'Feature', properties: municipality, geometry: { type: 'Polygon', coordinates: [[[10, 63], [11, 63], [11, 64], [10, 63]]] } }
const data: MunicipalValuedNature = { municipalityNumber: '5001', natureTypes: ['Rikmyr'], localities: [{ id: '123', sourceId: 'source-123', name: 'Myra', natureType: 'Rikmyr', value: 'Stor verdi', color: '#FD7032', rings: [] }] }
afterEach(() => { cleanup(); vi.clearAllMocks() })
beforeEach(()=>{natureRequest.mockResolvedValue({status:'not_available',municipalityNumber:'5001',reason:'Naturverdigrunnlag mangler'});areaRequest.mockResolvedValue({status:'not_available',municipalityNumber:'5001',reason:'Grunnlag mangler'})})
const checkbox = (name: string) => screen.getByRole('checkbox', { name })

const settings = (name: string) => fireEvent.click(screen.getByRole('button', { name: `Innstillinger for ${name}` }))
const legend = () => fireEvent.click(screen.getAllByRole('button', { name: 'Tegnforklaring' })[0])
const lastContext = () => controller.update.mock.calls.at(-1)![0]

describe('uavhengige kartlag i V2-paneler', () => {
  it('opens the primary area analysis, forwards exact selections and isolates results after municipality change',async()=>{
    areaRequest.mockResolvedValueOnce(planAreaFixture)
    const view=render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary}/>)
    fireEvent.click(screen.getAllByRole('button',{name:'Analyser planområder'})[0])
    const table=await screen.findByRole('table',{name:'Økosystemtyper innenfor planområder'})
    fireEvent.click(within(table).getByRole('button',{name:'Skog'}))
    expect(controller.setPlanArea).toHaveBeenLastCalledWith(planAreaFixture,{kind:'category',id:'skog'})
    fireEvent.click(screen.getByRole('button',{name:'Tilpass kart til utvalget'}))
    expect(controller.setPlanArea).toHaveBeenLastCalledWith(planAreaFixture,{kind:'category',id:'skog'},true)
    view.rerender(<ExploreThemesWorkspace municipality={{number:'0301',name:'Oslo'}} boundary={null}/>)
    expect(screen.queryByRole('table',{name:'Økosystemtyper innenfor planområder'})).not.toBeInTheDocument()
    expect(controller.setPlanArea).toHaveBeenLastCalledWith(null,{kind:'all'})
    expect(controller.destroy).not.toHaveBeenCalled()
  })
  it('keeps the analysis purpose, resets geographical selection and accepts only new municipality results', async () => {
    areaRequest.mockResolvedValueOnce(planAreaFixture)
    const view = render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} initialAnalysisOpen initialAnalysisMode="area" initialAreaSelection={{kind:'category',id:'skog'}} />)
    await screen.findByRole('table',{name:'Økosystemtyper innenfor planområder'})
    const oslo={number:'0301',name:'Oslo'}
    areaRequest.mockResolvedValueOnce({status:'not_available',municipalityNumber:'0301',reason:'Oslo mangler grunnlag, ikke null treff'})
    view.rerender(<ExploreThemesWorkspace municipality={oslo} boundary={{...boundary,properties:oslo}} />)
    expect(screen.getByRole('group',{name:'Velg plananalyse'})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'Arealfordeling'})).toHaveAttribute('aria-pressed','true')
    expect(await screen.findByText('Oslo mangler grunnlag, ikke null treff')).toBeInTheDocument()
    expect(controller.setPlanArea).toHaveBeenLastCalledWith(null,{kind:'all'})
    areaRequest.mockResolvedValueOnce(planAreaFixture)
    view.rerender(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    await screen.findByRole('table',{name:'Økosystemtyper innenfor planområder'})
    expect(screen.getByRole('button',{name:'Skog'})).toHaveAttribute('aria-pressed','false')
    expect(controller.destroy).not.toHaveBeenCalled()
  })
  it('keeps registered-nature mode open while the new municipality boundary is loading', () => {
    const view=render(<ExploreThemesWorkspace municipality={municipality} boundary={null} initialAnalysisOpen initialAnalysisMode="nature" />)
    view.rerender(<ExploreThemesWorkspace municipality={{number:'0301',name:'Oslo'}} boundary={null}/>)
    expect(screen.getByRole('button',{name:'Registrerte naturverdier'})).toHaveAttribute('aria-pressed','true')
    expect(screen.getByRole('heading',{name:'Registrerte naturverdier'})).toBeInTheDocument()
    expect(controller.destroy).not.toHaveBeenCalled()
  })
  it('ignores an old municipality’s pending area result',async()=>{
    let resolve!: (result:typeof planAreaFixture)=>void
    areaRequest.mockImplementationOnce(()=>new Promise(done=>{resolve=done}))
    const view=render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} initialAnalysisOpen initialAnalysisMode="area"/>)
    const signal=areaRequest.mock.calls[0][1] as AbortSignal
    view.rerender(<ExploreThemesWorkspace municipality={{number:'0301',name:'Oslo'}} boundary={null}/>)
    expect(signal.aborted).toBe(true)
    await act(async()=>resolve(planAreaFixture))
    expect(controller.setPlanArea).toHaveBeenLastCalledWith(null,{kind:'all'})
    expect(screen.queryByRole('table',{name:'Økosystemtyper innenfor planområder'})).not.toBeInTheDocument()
  })
  it('keeps loading, empty and error statuses outside layer rows, accessible and in settings', () => {
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    const row = checkbox('Grunnkart nivå 0').closest('.explore-themes__layer')!
    const content = row.innerHTML
    for (const status of ['loading', 'empty', 'error', 'ready'] as const) {
      act(() => statusHandler('level0', status, '5001'))
      expect(row.innerHTML).toBe(content)
      if (status === 'error') expect(screen.getByRole('alert')).toHaveTextContent('Dette er en datafeil')
    }
    settings('Grunnkart nivå 0')
    act(() => statusHandler('level0', 'error', '5001'))
    expect(within(screen.getByRole('complementary', { name: 'Innstillinger: Grunnkart nivå 0' })).getByRole('alert')).toHaveTextContent('Kartdata for Grunnkart nivå 0 kunne ikke vises')
    fireEvent.click(checkbox('Grunnkart nivå 0'))
    expect(checkbox('Grunnkart nivå 0')).not.toBeChecked()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it('returnerer fokus til kartet når lokalitetskortets objektpanel lukkes', async () => {
    request.mockResolvedValue(data)
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    fireEvent.click(checkbox('Verdsatte naturtyper'))
    const openingButton = screen.getByRole('button', { name: 'Innstillinger for Verdsatte naturtyper' })
    vi.spyOn(openingButton, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList)
    openingButton.focus(); fireEvent.click(openingButton)
    const locality = await screen.findByRole('button', { name: /Myra/ })
    locality.focus(); fireEvent.click(locality)
    expect(screen.getByRole('complementary', { name: 'Objektinformasjon' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.getByRole('region', { name: 'Interaktivt kart i Trondheim' })).toHaveFocus())
    expect(lastContext().selectedId).toBe('123')
    expect(controller.fitToMunicipality).not.toHaveBeenCalled()
  })
  it('beholder filter, objekt og opasitet når andre lag eller paneler endres', async () => {
    request.mockResolvedValue(data)
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    expect(checkbox('Grunnkart nivå 0')).toBeChecked()
    expect(request).not.toHaveBeenCalled()
    fireEvent.click(checkbox('Verdsatte naturtyper')); settings('Verdsatte naturtyper')
    fireEvent.change(await screen.findByRole('combobox', { name: 'Naturtype' }), { target: { value: 'Rikmyr' } })
    fireEvent.click(screen.getByRole('button', { name: /Myra/ }))
    fireEvent.click(checkbox('Framtidig utbygging')); settings('Grunnkart nivå 0')
    fireEvent.change(screen.getByRole('slider', { name: 'Gjennomsiktighet – Grunnkart nivå 0' }), { target: { value: '50' } })
    expect(lastContext()).toMatchObject({ layers: { level0: { visible: true, opacity: .5 }, 'future-development': { visible: true, opacity: 1 } }, filter: { natureType: 'Rikmyr', value: null }, selectedId: '123', data })
    const calls = request.mock.calls.length
    fireEvent.click(checkbox('Grunnkart nivå 0')); fireEvent.click(checkbox('Framtidig utbygging'))
    settings('Verdsatte naturtyper')
    expect(screen.getByRole('combobox', { name: 'Naturtype' })).toHaveValue('Rikmyr')
    expect(request).toHaveBeenCalledTimes(calls)
    fireEvent.click(checkbox('Verdsatte naturtyper'))
    expect(screen.getByText(/Alle temalag er slått av/)).toBeInTheDocument()
    expect(lastContext().selectedId).toBeNull()
    fireEvent.click(checkbox('Grunnkart nivå 0')); settings('Grunnkart nivå 0')
    expect(screen.getByRole('slider')).toHaveValue('50')
    fireEvent.click(checkbox('Verdsatte naturtyper')); settings('Verdsatte naturtyper')
    expect(await screen.findByRole('combobox', { name: 'Naturtype' })).toHaveValue('Rikmyr')
    expect(lastContext().selectedId).toBeNull()
    expect(controller.fitToMunicipality).not.toHaveBeenCalled()
  })
  it('avbryter henting og ignorerer sent svar eller feil fra skjult lag', async () => {
    let resolve!: (data: MunicipalValuedNature) => void
    request.mockImplementation(() => new Promise<MunicipalValuedNature>(done => { resolve = done }))
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    fireEvent.click(checkbox('Verdsatte naturtyper')); const signal = request.mock.calls[0][1] as AbortSignal
    fireEvent.click(checkbox('Framtidig utbygging')); expect(signal.aborted).toBe(false)
    fireEvent.click(checkbox('Verdsatte naturtyper')); expect(signal.aborted).toBe(true)
    await act(async () => resolve(data)); act(() => statusHandler('valued-nature','error','5001'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(lastContext()).toMatchObject({ data: null, layers: { 'future-development': { visible: true, opacity: 1 } } })
  })
  it('isolerer kommunevalg og lukker detaljer uten å slette lagvalg', async () => {
    let resolve!: (data: MunicipalValuedNature) => void
    request.mockImplementation(() => new Promise<MunicipalValuedNature>(done => { resolve=done }))
    const view=render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    fireEvent.click(checkbox('Verdsatte naturtyper')); settings('Verdsatte naturtyper')
    const signal=request.mock.calls[0][1] as AbortSignal
    fireEvent.click(checkbox('Framtidig utbygging'))
    view.rerender(<ExploreThemesWorkspace municipality={{number:'0301',name:'Oslo'}} boundary={null} />)
    expect(signal.aborted).toBe(true); await act(async()=>resolve(data))
    act(()=>statusHandler('future-development','error','5001'))
    expect(lastContext()).toMatchObject({ boundary:null,data:null,selectedId:null })
    expect(checkbox('Framtidig utbygging')).toBeChecked()
    expect(screen.queryByRole('complementary',{name:/Innstillinger:/})).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it('skiller naturtypefeil fra null treff og bevarer øvrige lag', async()=>{
    request.mockRejectedValue(new Error('HTTP 503'))
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    fireEvent.click(checkbox('Framtidig utbygging')); fireEvent.click(checkbox('Verdsatte naturtyper')); settings('Verdsatte naturtyper')
    expect(await screen.findByRole('alert')).toHaveTextContent('WMS-kartet kan fortsatt vises')
    expect(lastContext()).toMatchObject({data:null,layers:{'future-development':{visible:true,opacity:1}}})
    expect(screen.queryByText(/Ingen registrerte lokaliteter i denne kilden/)).not.toBeInTheDocument()
  })
  it('har tre grupper og kompakte rader; Escape lukker detaljer og beholder kartinstansen',()=>{
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    expect(screen.getAllByRole('checkbox')).toHaveLength(7)
    for(const role of ['Regnskapsgrunnlag','Plandata','Supplerende temadata']) expect(within(screen.getByRole('group',{name:role})).getAllByRole('checkbox')).toHaveLength(role==='Supplerende temadata'?5:1)
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    settings('Grunnkart nivå 0'); expect(screen.getByRole('slider')).toHaveValue('30')
    fireEvent.keyDown(window,{key:'Escape'})
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.getByRole('region',{name:'Interaktivt kart i Trondheim'})).toBeInTheDocument()
    expect(controller.destroy).not.toHaveBeenCalled(); expect(controller.fitToMunicipality).not.toHaveBeenCalled()
  })
  it('støtter alle 128 kombinasjoner og legendene følger aktive lag i tegnerekkefølge',async()=>{
    request.mockResolvedValue(data)
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    const names=['Grunnkart nivå 0','Framtidig utbygging','Verdsatte naturtyper','Verneområder','Inngrepsfri natur (INON)','Villrein','Grå arealer']
    const ids=['level0','future-development','valued-nature','protected-areas','intact-nature','wild-reindeer','grey-areas']
    const choices=names.map(checkbox) as HTMLInputElement[]
    legend()
    for(let bits=0;bits<128;bits++){
      await act(async()=>{choices.forEach((input,i)=>{if(input.checked!==!!(bits&(1<<i)))fireEvent.click(input)})})
      ids.forEach((id,i)=>expect(lastContext().layers[id].visible).toBe(!!(bits&(1<<i))))
      expect(document.querySelectorAll('.explore-themes__layer-info')).toHaveLength(ids.filter((_,i)=>bits&(1<<i)).length)
    }
    expect(screen.getByText('Status: januar 2023')).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(4)
    expect([...document.querySelectorAll('.explore-themes__layer-info h3')].map(e=>e.textContent)).toEqual(['Verneområder','Verdsatte naturtyper','Framtidig utbygging','Villrein','Inngrepsfri natur (INON)','Grå arealer','Grunnkart nivå 0'])
    settings('Inngrepsfri natur (INON)');fireEvent.change(screen.getByRole('slider'),{target:{value:'75'}})
    expect(lastContext().layers['intact-nature']).toEqual({visible:true,opacity:.25})
    expect(controller.fitToMunicipality).not.toHaveBeenCalled()
  },15000)
  it('bytter gråarealprodukt med kildelegend og målestokkforbehold',()=>{
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    expect(screen.queryByRole('checkbox',{name:/FKB/})).not.toBeInTheDocument()
    fireEvent.click(checkbox('Grå arealer'));settings('Grå arealer')
    fireEvent.click(screen.getByRole('radio',{name:'Andel med vegetasjon'}))
    expect(lastContext()).toMatchObject({greyPresentation:'andel_med_vegetasjon',layers:{level0:{visible:true,opacity:.7},'grey-areas':{visible:true,opacity:.75}}})
    expect(screen.getByAltText('Andel med vegetasjon: kildens prosentklasser.')).toHaveAttribute('src',expect.stringContaining('LAYER=andel_med_vegetasjon'))
    act(()=>statusHandler('grey-areas','out-of-scale','5001'))
    expect(screen.getByText(/Zoom inn for å se kartdata/)).toBeInTheDocument()
    fireEvent.click(checkbox('Grå arealer'));fireEvent.click(checkbox('Grå arealer'))
    settings('Grå arealer'); expect(screen.getByRole('radio',{name:'Andel med vegetasjon'})).toBeChecked()
    expect(controller.fitToMunicipality).not.toHaveBeenCalled()
  })
  it('skiller gyldig tom villreinvisning fra ukjent dekning og feil',()=>{
    const coverage={municipalityNumber:'5001',municipalityName:'Trondheim',methodVersion:'thematic-intersection-v1' as const,warnings:[],results:[{datasetId:'wild-reindeer-areas' as const,status:'no_hit' as const,featureCount:0,note:''}]}
    const view=render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} coverage={coverage} />)
    fireEvent.click(checkbox('Villrein'));settings('Villrein');act(()=>statusHandler('wild-reindeer','empty','5001'))
    expect(screen.getByText(/Ingen registrerte leveområder for villrein/)).toBeInTheDocument();expect(screen.getByText(/gyldig, tomt bilde/)).toBeInTheDocument()
    view.rerender(<ExploreThemesWorkspace municipality={{number:'3431',name:'Dovre'}} boundary={null} coverage={coverage} coverageState="loading" />)
    settings('Villrein');expect(screen.getByText(/Kontrollerer kommunens villreinregistreringer/)).toBeInTheDocument()
    expect(screen.queryByText(/Ingen registrerte leveområder/)).not.toBeInTheDocument()
    act(()=>statusHandler('wild-reindeer','error','5001'));expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.click(checkbox('Villrein'));expect(screen.queryByText(/Kontrollerer kommunens villreinregistreringer/)).not.toBeInTheDocument()
  })
})

describe('objekt og filter i samme kontekstpanel',()=>{
  it('åpner faktisk kartvalg i objektpanelet og returnerer til filter uten å endre kart eller øvrige lag',async()=>{
    request.mockResolvedValue(data)
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    fireEvent.click(checkbox('Verdsatte naturtyper')); fireEvent.click(checkbox('Framtidig utbygging')); settings('Verdsatte naturtyper')
    fireEvent.change(await screen.findByRole('combobox',{name:'Naturtype'}),{target:{value:'Rikmyr'}})
    const handler=controller.setSelectionHandler.mock.calls.at(-1)![0]
    act(()=>handler('123'))
    expect(screen.getByRole('complementary',{name:'Objektinformasjon'})).toBeInTheDocument()
    expect(screen.getByRole('region',{name:'Valgt lokalitet'})).toHaveTextContent('source-123')
    expect(lastContext()).toMatchObject({selectedId:'123',filter:{natureType:'Rikmyr',value:null},layers:{'future-development':{visible:true,opacity:1}}})
    fireEvent.click(screen.getByRole('button',{name:'Tilbake til naturtypefilter'}))
    expect(screen.getByRole('combobox',{name:'Naturtype'})).toHaveValue('Rikmyr')
    expect(lastContext().selectedId).toBe('123')
    fireEvent.click(screen.getByRole('button',{name:/Myra/}));fireEvent.click(screen.getByRole('button',{name:'Fjern valg'}))
    expect(lastContext().selectedId).toBeNull();expect(screen.getByRole('combobox',{name:'Naturtype'})).toHaveValue('Rikmyr')
    expect(controller.fitToMunicipality).not.toHaveBeenCalled();expect(controller.destroy).not.toHaveBeenCalled()
  })
  it('bevarer aktivt typevalg gjennom navnesøk og panelrundtur; nullstill påvirker bare naturtypene',async()=>{
    request.mockResolvedValue({...data,natureTypes:['Rikmyr','Skog']})
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    fireEvent.click(checkbox('Verdsatte naturtyper'));fireEvent.click(checkbox('Framtidig utbygging'));settings('Verdsatte naturtyper')
    fireEvent.change(await screen.findByRole('combobox',{name:'Naturtype'}),{target:{value:'Rikmyr'}})
    fireEvent.click(screen.getByText('Søk i naturtypenavn'));fireEvent.change(screen.getByRole('searchbox',{name:'Søk i naturtyper'}),{target:{value:'skog'}})
    expect(screen.getByRole('option',{name:'Rikmyr'})).toBeInTheDocument()
    legend();settings('Verdsatte naturtyper')
    expect(screen.getByRole('combobox',{name:'Naturtype'})).toHaveValue('Rikmyr')
    fireEvent.click(screen.getByRole('button',{name:'Vis alle registrerte lokaliteter'}))
    expect(lastContext()).toMatchObject({filter:{natureType:null,value:null},layers:{'future-development':{visible:true,opacity:1}}})
  })
})


describe('B5.2a aktiv analyse uavhengig av panel', () => {
  it.each(['area','nature'] as const)('retains %s result, selection and consumer through temporary panels and map-only mode', async mode => {
    areaRequest.mockResolvedValue(planAreaFixture); natureRequest.mockResolvedValue(natureFixture)
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} initialAnalysisOpen initialAnalysisMode={mode}/>)
    const request = mode==='area' ? areaRequest : natureRequest
    const setter = mode==='area' ? controller.setPlanArea : controller.setFutureNature
    if(mode==='area') fireEvent.click(within(await screen.findByRole('table',{name:'Økosystemtyper innenfor planområder'})).getByRole('button',{name:'Skog'}))
    else {
      fireEvent.change(await screen.findByRole('searchbox'),{target:{value:'Testmyra'}})
      fireEvent.click(screen.getByRole('button',{name:/Testmyra/}))
    }
    const expected=mode==='area' ? {kind:'category',id:'skog'} : {kind:'locality',label:'BN1'}
    const result=mode==='area' ? planAreaFixture : natureFixture
    const signal=request.mock.calls[0][1] as AbortSignal
    settings('Grunnkart nivå 0')
    fireEvent.change(screen.getByRole('slider'),{target:{value:'50'}})
    expect(setter.mock.calls.at(-1)?.slice(0,2)).toEqual([result,expected])
    expect(signal.aborted).toBe(false)
    fireEvent.keyDown(window,{key:'Escape'})
    expect(screen.getByRole('group',{name:'Velg plananalyse'})).toBeInTheDocument()
    if(mode==='nature') expect(screen.getByRole('searchbox')).toHaveValue('Testmyra')
    legend(); fireEvent.keyDown(window,{key:'Escape'})
    fireEvent.click(screen.getByRole('button',{name:'Skjul analyseresultater'}))
    expect(setter.mock.calls.at(-1)?.slice(0,2)).toEqual([result,expected])
    fireEvent.click(screen.getAllByRole('button',{name:'Analyser planområder'})[0])
    expect(request).toHaveBeenCalledTimes(1)
    expect(controller.destroy).not.toHaveBeenCalled()
    expect(controller.fitToMunicipality).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button',{name:'Avslutt analyse'}))
    expect(controller.setPlanArea).toHaveBeenLastCalledWith(null,{kind:'all'})
    expect(controller.setFutureNature).toHaveBeenLastCalledWith(null,{kind:'all'})
    expect(lastContext().layers.level0.opacity).toBe(.5)
  })
  it('continues a pending area calculation while results are hidden and ignores it after finishing',async()=>{
    let resolve!: (v:typeof planAreaFixture)=>void
    areaRequest.mockImplementationOnce(()=>new Promise(done=>{resolve=done}))
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} initialAnalysisOpen initialAnalysisMode="area"/>)
    const signal=areaRequest.mock.calls[0][1] as AbortSignal
    settings('Grunnkart nivå 0')
    expect(signal.aborted).toBe(false)
    await act(async()=>resolve(planAreaFixture))
    expect(controller.setPlanArea).toHaveBeenLastCalledWith(planAreaFixture,{kind:'all'})
    fireEvent.keyDown(window,{key:'Escape'})
    expect(screen.getByRole('table',{name:'Økosystemtyper innenfor planområder'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Avslutt analyse'}))
    expect(signal.aborted).toBe(true)
    expect(controller.setPlanArea).toHaveBeenLastCalledWith(null,{kind:'all'})
  })
  it('resets type-specific selection and search on analysis changes while keeping ordinary layers',async()=>{
    areaRequest.mockResolvedValue(planAreaFixture);natureRequest.mockResolvedValue(natureFixture)
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} initialAnalysisOpen initialAnalysisMode="nature"/>)
    fireEvent.change(await screen.findByRole('searchbox'),{target:{value:'Testmyra'}})
    fireEvent.click(screen.getByRole('button',{name:/Testmyra/}))
    fireEvent.click(checkbox('Framtidig utbygging'))
    fireEvent.click(screen.getByRole('button',{name:'Arealfordeling'}))
    await screen.findByRole('table',{name:'Økosystemtyper innenfor planområder'})
    expect(controller.setPlanArea).toHaveBeenLastCalledWith(planAreaFixture,{kind:'all'})
    fireEvent.click(screen.getByRole('button',{name:'Registrerte naturverdier'}))
    expect(await screen.findByRole('searchbox')).toHaveValue('')
    expect(controller.setFutureNature).toHaveBeenLastCalledWith(natureFixture,{kind:'all'})
    expect(lastContext().layers['future-development'].visible).toBe(true)
  })
  it('rejects a late nature response from a previous municipality even while a temporary panel is open',async()=>{
    let resolve!: (v:typeof natureFixture)=>void
    natureRequest.mockImplementationOnce(()=>new Promise(done=>{resolve=done}))
    const view=render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} initialAnalysisOpen initialAnalysisMode="nature"/>)
    const signal=natureRequest.mock.calls[0][1] as AbortSignal
    settings('Grunnkart nivå 0')
    view.rerender(<ExploreThemesWorkspace municipality={{number:'0301',name:'Oslo'}} boundary={null}/>)
    expect(signal.aborted).toBe(true)
    await act(async()=>resolve(natureFixture))
    expect(controller.setFutureNature).toHaveBeenLastCalledWith(null,{kind:'all'})
    expect(screen.getByRole('button',{name:'Registrerte naturverdier'})).toHaveAttribute('aria-pressed','true')
    expect(screen.queryByText(/Unikt overlappsareal/)).not.toBeInTheDocument()
  })
})


describe('B5.2b mobile presentation state',()=>{
  it('keeps the exact analysis and selection across the three modes, layer return and type changes',async()=>{
    areaRequest.mockResolvedValue(planAreaFixture);natureRequest.mockResolvedValue(natureFixture)
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} initialAnalysisOpen initialAnalysisMode="area"/>)
    await screen.findByRole('table',{name:'Økosystemtyper innenfor planområder'})
    const body=document.querySelector('.explore-themes__body')!
    expect(body).toHaveAttribute('data-view-mode','split')
    fireEvent.change(screen.getByRole('combobox',{name:'Kartutvalg i analysen'}),{target:{value:'category:skog'}})
    const modes=screen.getByRole('group',{name:'Visning av kart og resultater'})
    for(const [label,mode]of [['Mer kart','map'],['Mer resultat','results'],['Delt','split']]){
      fireEvent.click(within(modes).getByRole('button',{name:label}))
      expect(body).toHaveAttribute('data-view-mode',mode)
      expect(controller.setPlanArea).toHaveBeenLastCalledWith(planAreaFixture,{kind:'category',id:'skog'})
      expect(areaRequest).toHaveBeenCalledTimes(1)
    }
    fireEvent.click(within(modes).getByRole('button',{name:'Mer resultat'}))
    fireEvent.click(document.querySelector('.mobile-analysis-toolbar button')!)
    expect(body).toHaveClass('layers-open')
    fireEvent.click(screen.getByRole('button',{name:'Lukk kartlag'}))
    expect(body).toHaveAttribute('data-view-mode','results')
    fireEvent.change(screen.getByRole('combobox',{name:'Velg aktiv plananalyse'}),{target:{value:'nature'}})
    await screen.findByRole('searchbox')
    expect(body).toHaveAttribute('data-view-mode','results')
    expect(controller.setFutureNature).toHaveBeenLastCalledWith(natureFixture,{kind:'all'})
    expect(controller.destroy).not.toHaveBeenCalled()
  })
  it('uses exact existing values for quick selections and forwards explicit fit',async()=>{
    areaRequest.mockResolvedValue(planAreaFixture)
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} initialAnalysisOpen initialAnalysisMode="area"/>)
    await screen.findByRole('table',{name:'Økosystemtyper innenfor planområder'})
    fireEvent.change(screen.getByRole('combobox',{name:'Kartutvalg i analysen'}),{target:{value:'category:vatmark'}})
    expect(screen.getByRole('region',{name:'Aktiv analyse og kartutvalg'})).toHaveTextContent(/0,11 daa/)
    fireEvent.click(screen.getByRole('button',{name:'Tilpass aktivt kartutvalg'}))
    expect(controller.setPlanArea).toHaveBeenLastCalledWith(planAreaFixture,{kind:'category',id:'vatmark'},true)
    fireEvent.click(screen.getByRole('button',{name:'Avslutt aktiv analyse'}))
    expect(bodyMode()).toBe('none')
    function bodyMode(){return document.querySelector('.explore-themes__body')!.getAttribute('data-analysis-mode')}
  })
})

describe('B5.2c explicit analysis fit',()=>{
  it('selects a locality without fit and only fits it on explicit request',async()=>{
    natureRequest.mockResolvedValue(natureFixture)
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} initialAnalysisOpen initialAnalysisMode="nature"/>)
    fireEvent.click(await screen.findByRole('button',{name:/Testmyra/}))
    expect(controller.setFutureNature).toHaveBeenLastCalledWith(natureFixture,{kind:'locality',label:'BN1'})
    expect(controller.setFutureNature.mock.calls.some(c=>c[2]===true)).toBe(false)
    fireEvent.click(screen.getByRole('button',{name:'Tilpass kart til utvalget'}))
    expect(controller.setFutureNature).toHaveBeenLastCalledWith(natureFixture,{kind:'locality',label:'BN1'},true)
    expect(natureRequest).toHaveBeenCalledTimes(1)
  })
  it('disables both fit entry points for missing overlap geometry and after municipality change',async()=>{
    natureRequest.mockResolvedValue({...natureFixture,localities:natureFixture.localities.map(l=>({...l,overlapGeometry:[]}))})
    const view=render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} initialAnalysisOpen initialAnalysisMode="nature"/>)
    fireEvent.click(await screen.findByRole('button',{name:/Testmyra/}))
    expect(screen.getByRole('button',{name:'Tilpass aktivt kartutvalg'})).toBeDisabled()
    expect(screen.getByRole('button',{name:'Tilpass kart til utvalget'})).toBeDisabled()
    fireEvent.click(screen.getByRole('button',{name:'Tilpass aktivt kartutvalg'}))
    expect(controller.setFutureNature.mock.calls.some(c=>c[2]===true)).toBe(false)
    view.rerender(<ExploreThemesWorkspace municipality={{number:'0301',name:'Oslo'}} boundary={null}/>)
    expect(screen.getByRole('button',{name:'Tilpass aktivt kartutvalg'})).toBeDisabled()
  })
})

describe('B5.2c reset and result ownership',()=>{
  it('resets selection and search from either mobile quick reset or the visible panel, including an already unselected analysis',async()=>{
    natureRequest.mockResolvedValue(natureFixture)
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} initialAnalysisOpen initialAnalysisMode="nature"/>)
    const search=await screen.findByRole('searchbox')
    fireEvent.change(search,{target:{value:'Testmyra'}})
    fireEvent.click(screen.getByRole('button',{name:/^Testmyra/}))
    fireEvent.change(screen.getByRole('combobox',{name:'Kartutvalg i analysen'}),{target:{value:'reset'}})
    expect(search).toHaveValue('')
    expect(controller.setFutureNature).toHaveBeenLastCalledWith(natureFixture,{kind:'all'})
    fireEvent.change(search,{target:{value:'finnes_ikke'}})
    fireEvent.click(screen.getByRole('button',{name:'Nullstill utvalg'}))
    expect(search).toHaveValue('')
    expect(screen.getByRole('button',{name:/^Testmyra/})).toBeInTheDocument()
    expect(natureRequest).toHaveBeenCalledOnce()
    expect(controller.setFutureNature.mock.calls.some(c=>c[2]===true)).toBe(false)
    expect(controller.destroy).not.toHaveBeenCalled()
  })
  it.each(['area','nature'] as const)('rejects a mismatched municipality result in %s before showing numbers or enabling fit',async mode=>{
    const result={...(mode==='area'?planAreaFixture:natureFixture),municipalityNumber:'0301'}
    ;(mode==='area'?areaRequest:natureRequest).mockResolvedValue(result)
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} initialAnalysisOpen initialAnalysisMode={mode}/>)
    expect(await screen.findByRole('alert')).toHaveTextContent(/ikke aktiv kommune/)
    expect(screen.getByRole('button',{name:'Tilpass aktivt kartutvalg'})).toBeDisabled()
    expect(document.querySelector('.explore-themes__body')).not.toHaveAttribute('data-analysis-id')
    expect(screen.queryByRole('region',{name:'Valgt lokalitet'})).not.toBeInTheDocument()
  })
})
