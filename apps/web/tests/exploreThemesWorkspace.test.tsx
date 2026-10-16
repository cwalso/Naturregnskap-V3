import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { planAreaFixture } from './planAreaFixture'
import { ExploreThemesWorkspace } from '../src/features/explore-map/ExploreThemesWorkspace'
import type { MunicipalityBoundary } from '../src/api/municipalities'
import type { MunicipalValuedNature } from '../src/api/municipalValuedNature'
import type { LayerMapStatus } from '../src/map/exploreThemeMap'
import type { MapLayerId } from '../src/features/explore-map/mapThemes'

const controller = vi.hoisted(() => ({ update: vi.fn(), setPlanArea:vi.fn(),fitToMunicipality: vi.fn(), destroy: vi.fn(), setSelectionHandler: vi.fn() }))
const areaRequest=vi.hoisted(()=>vi.fn())
vi.mock('../src/features/plan-area/source',()=>({calculatePlanArea:areaRequest}))
const request = vi.hoisted(() => vi.fn())
let statusHandler: (layer: MapLayerId, status: LayerMapStatus, owner: string | null) => void
vi.mock('../src/map/exploreThemeMap', () => ({ createExploreLayerMap: (_target: HTMLElement, onStatus: typeof statusHandler) => { statusHandler = onStatus; return controller } }))
vi.mock('../src/api/municipalValuedNature', async (original) => ({ ...await original<object>(), getMunicipalValuedNature: request }))
const municipality = { number: '5001', name: 'Trondheim' }
const boundary: MunicipalityBoundary = { type: 'Feature', properties: municipality, geometry: { type: 'Polygon', coordinates: [[[10, 63], [11, 63], [11, 64], [10, 63]]] } }
const data: MunicipalValuedNature = { municipalityNumber: '5001', natureTypes: ['Rikmyr'], localities: [{ id: '123', sourceId: 'source-123', name: 'Myra', natureType: 'Rikmyr', value: 'Stor verdi', color: '#FD7032', rings: [] }] }
afterEach(() => { cleanup(); vi.clearAllMocks() })
beforeEach(()=>{areaRequest.mockResolvedValue({status:'not_available',municipalityNumber:'5001',reason:'Grunnlag mangler'})})
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
