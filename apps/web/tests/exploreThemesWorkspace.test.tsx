import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExploreThemesWorkspace } from '../src/features/explore-map/ExploreThemesWorkspace'
import type { MunicipalityBoundary } from '../src/api/municipalities'
import type { MunicipalValuedNature } from '../src/api/municipalValuedNature'
import type { LayerMapStatus } from '../src/map/exploreThemeMap'
import type { MapLayerId } from '../src/features/explore-map/mapThemes'

const controller = vi.hoisted(() => ({ update: vi.fn(), fitToMunicipality: vi.fn(), destroy: vi.fn(), setSelectionHandler: vi.fn() }))
const request = vi.hoisted(() => vi.fn())
let statusHandler: (layer: MapLayerId, status: LayerMapStatus, owner: string | null) => void
vi.mock('../src/map/exploreThemeMap', () => ({ createExploreLayerMap: (_target: HTMLElement, onStatus: typeof statusHandler) => { statusHandler = onStatus; return controller } }))
vi.mock('../src/api/municipalValuedNature', async (original) => ({ ...await original<object>(), getMunicipalValuedNature: request }))
const municipality = { number: '5001', name: 'Trondheim' }
const boundary: MunicipalityBoundary = { type: 'Feature', properties: municipality, geometry: { type: 'Polygon', coordinates: [[[10, 63], [11, 63], [11, 64], [10, 63]]] } }
const data: MunicipalValuedNature = { municipalityNumber: '5001', natureTypes: ['Rikmyr'], localities: [{ id: '123', sourceId: 'source-123', name: 'Myra', natureType: 'Rikmyr', value: 'Stor verdi', color: '#FD7032', rings: [] }] }
afterEach(() => { cleanup(); vi.clearAllMocks() })
const checkbox = (name: string) => screen.getByRole('checkbox', { name })

describe('uavhengige kartlag', () => {
  it('kombinerer alle lag og slår alle av; opasitet/filter/objektvalg bevares når andre lag endres', async () => {
    request.mockResolvedValue(data)
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    expect(checkbox('Grunnkart nivå 0')).toBeChecked()
    expect(request).not.toHaveBeenCalled()
    fireEvent.click(checkbox('Verdsatte naturtyper'))
    fireEvent.change(await screen.findByRole('combobox', { name: 'Naturtype' }), { target: { value: 'Rikmyr' } })
    fireEvent.click(screen.getByRole('button', { name: /Myra/ }))
    fireEvent.click(checkbox('Framtidig utbygging'))
    fireEvent.change(screen.getByRole('slider', { name: 'Gjennomsiktighet – Grunnkart nivå 0' }), { target: { value: '50' } })
    expect(screen.getByRole('region', { name: 'Valgt lokalitet' })).toHaveTextContent('source-123')
    expect(controller.update).toHaveBeenLastCalledWith(expect.objectContaining({
      layers: { level0: { visible: true, opacity: 0.5 }, 'future-development': { visible: true, opacity: 1 }, 'valued-nature': { visible: true, opacity: 1 } },
      filter: { natureType: 'Rikmyr', value: null }, selectedId: '123', data,
    }))
    const calls = request.mock.calls.length
    fireEvent.click(checkbox('Grunnkart nivå 0'))
    fireEvent.click(checkbox('Framtidig utbygging'))
    expect(screen.getByRole('combobox', { name: 'Naturtype' })).toHaveValue('Rikmyr')
    expect(screen.getByRole('region', { name: 'Valgt lokalitet' })).toBeInTheDocument()
    expect(request).toHaveBeenCalledTimes(calls)
    fireEvent.click(checkbox('Verdsatte naturtyper'))
    expect(screen.getByText(/Alle temalag er slått av/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Tegnforklaring' })).not.toBeInTheDocument()
    fireEvent.click(checkbox('Grunnkart nivå 0'))
    expect(screen.getByRole('slider', { name: 'Gjennomsiktighet – Grunnkart nivå 0' })).toHaveValue('50')
    fireEvent.click(checkbox('Verdsatte naturtyper'))
    expect(await screen.findByRole('combobox', { name: 'Naturtype' })).toHaveValue('Rikmyr')
    expect(screen.queryByRole('region', { name: 'Valgt lokalitet' })).not.toBeInTheDocument()
    expect(controller.fitToMunicipality).not.toHaveBeenCalled()
  })
  it('avbryter naturtypehenting ved deaktivering og ignorerer sent svar og feil fra skjult lag', async () => {
    let resolve!: (data: MunicipalValuedNature) => void
    request.mockImplementation(() => new Promise<MunicipalValuedNature>((done) => { resolve = done }))
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    fireEvent.click(checkbox('Verdsatte naturtyper'))
    const signal = request.mock.calls[0][1] as AbortSignal
    fireEvent.click(checkbox('Framtidig utbygging'))
    expect(signal.aborted).toBe(false)
    fireEvent.click(checkbox('Verdsatte naturtyper'))
    expect(signal.aborted).toBe(true)
    await act(async () => resolve(data))
    act(() => statusHandler('valued-nature', 'error', '5001'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(controller.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: null, layers: expect.objectContaining({ 'future-development': { visible: true, opacity: 1 } }) }))
  })
  it('ignorerer data/status for forrige kommune og nullstiller bare kommunens naturtypevalg', async () => {
    let resolve!: (data: MunicipalValuedNature) => void
    request.mockImplementation(() => new Promise<MunicipalValuedNature>((done) => { resolve = done }))
    const view = render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    fireEvent.click(checkbox('Verdsatte naturtyper'))
    const oldSignal = request.mock.calls[0][1] as AbortSignal
    fireEvent.click(checkbox('Framtidig utbygging'))
    view.rerender(<ExploreThemesWorkspace municipality={{ number: '0301', name: 'Oslo' }} boundary={null} />)
    expect(oldSignal.aborted).toBe(true)
    await act(async () => resolve(data))
    act(() => statusHandler('future-development', 'error', '5001'))
    expect(controller.update).toHaveBeenLastCalledWith(expect.objectContaining({ boundary: null, data: null, selectedId: null }))
    expect(checkbox('Framtidig utbygging')).toBeChecked()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Naturtype' })).not.toBeInTheDocument()
  })
  it('beholder øvrige lag ved naturtypefeil og skiller feil fra null treff', async () => {
    request.mockRejectedValue(new Error('HTTP 503'))
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    fireEvent.click(checkbox('Framtidig utbygging'))
    fireEvent.click(checkbox('Verdsatte naturtyper'))
    expect(await screen.findByRole('alert')).toHaveTextContent('WMS-kartet kan fortsatt vises')
    expect(controller.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: null, layers: expect.objectContaining({ 'future-development': { visible: true, opacity: 1 }, 'valued-nature': { visible: true, opacity: 1 } }) }))
    expect(screen.queryByText(/Ingen registrerte lokaliteter i denne kilden/)).not.toBeInTheDocument()
  })
  it('har tre faglige grupper, ingen uvirksomme lag og en velger som kan lukkes uten å fjerne kartet', () => {
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    for (const role of ['Regnskapsgrunnlag', 'Plandata', 'Supplerende temadata']) expect(within(screen.getByRole('group', { name: role })).getAllByRole('checkbox')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /Kartlag/ }))
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Interaktivt kart i Trondheim' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Tegnforklaring: Grunnkart nivå 0' })).toBeInTheDocument()
    expect(controller.destroy).not.toHaveBeenCalled()
    expect(controller.fitToMunicipality).not.toHaveBeenCalled()
  })
})
