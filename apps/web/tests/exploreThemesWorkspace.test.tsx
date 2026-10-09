import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExploreThemesWorkspace } from '../src/features/explore-map/ExploreThemesWorkspace'
import type { MunicipalityBoundary } from '../src/api/municipalities'
import type { MunicipalValuedNature } from '../src/api/municipalValuedNature'

const controller = vi.hoisted(() => ({ update: vi.fn(), fitToMunicipality: vi.fn(), destroy: vi.fn(), setSelectionHandler: vi.fn() }))
const request = vi.hoisted(() => vi.fn())
vi.mock('../src/map/exploreThemeMap', () => ({ createExploreThemeMap: () => controller }))
vi.mock('../src/api/municipalValuedNature', async (original) => ({ ...await original<object>(), getMunicipalValuedNature: request }))
const municipality = { number: '5001', name: 'Trondheim' }
const boundary: MunicipalityBoundary = { type: 'Feature', properties: municipality, geometry: { type: 'Polygon', coordinates: [[[10, 63], [11, 63], [11, 64], [10, 63]]] } }
const data: MunicipalValuedNature = { municipalityNumber: '5001', natureTypes: ['Rikmyr'], localities: [{ id: '123', sourceId: 'source-123', name: 'Myra', natureType: 'Rikmyr', value: 'Stor verdi', color: '#FD7032', rings: [] }] }
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('selvstendige karttemaer', () => {
  it('rydder kommunefilter og lokalitetsvalg ved A → B → C → A → B uten fit', async () => {
    request.mockResolvedValue(data)
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    const selector = screen.getByRole('combobox', { name: 'Velg karttema' })
    expect(selector).toHaveValue('level0')
    expect(request).not.toHaveBeenCalled()
    fireEvent.change(selector, { target: { value: 'valued-nature' } })
    fireEvent.change(await screen.findByRole('combobox', { name: 'Naturtype' }), { target: { value: 'Rikmyr' } })
    fireEvent.click(screen.getByRole('button', { name: /Myra/ }))
    expect(screen.getByRole('region', { name: 'Valgt lokalitet' })).toHaveTextContent('source-123')
    fireEvent.change(selector, { target: { value: 'future-development' } })
    expect(controller.update).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'future-development', data: null, selectedId: null, filter: { natureType: null, value: null } }))
    fireEvent.change(selector, { target: { value: 'level0' } })
    fireEvent.change(selector, { target: { value: 'valued-nature' } })
    expect(await screen.findByRole('combobox', { name: 'Naturtype' })).toHaveValue('')
    expect(screen.queryByRole('region', { name: 'Valgt lokalitet' })).not.toBeInTheDocument()
    expect(controller.fitToMunicipality).not.toHaveBeenCalled()
  })
  it('ignorerer et sent svar for forrige kommune', async () => {
    let resolve!: (data: MunicipalValuedNature) => void
    request.mockImplementation(() => new Promise< MunicipalValuedNature>((done) => { resolve = done }))
    const view = render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Velg karttema' }), { target: { value: 'valued-nature' } })
    const oldSignal = request.mock.calls[0][1] as AbortSignal
    view.rerender(<ExploreThemesWorkspace municipality={{ number: '0301', name: 'Oslo' }} boundary={null} />)
    expect(oldSignal.aborted).toBe(true)
    await act(async () => resolve(data))
    expect(controller.update).toHaveBeenLastCalledWith(expect.objectContaining({ boundary: null, data: null, selectedId: null }))
    expect(screen.queryByRole('combobox', { name: 'Naturtype' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Myra/)).not.toBeInTheDocument()
  })
  it('skiller feil i kommunefilteret fra ingen registreringer og beholder WMS-temaet', async () => {
    request.mockRejectedValue(new Error('HTTP 503'))
    render(<ExploreThemesWorkspace municipality={municipality} boundary={boundary} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Velg karttema' }), { target: { value: 'valued-nature' } })
    expect(await screen.findByRole('alert')).toHaveTextContent('WMS-kartet kan fortsatt vises')
    expect(controller.update).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'valued-nature', data: null }))
    expect(screen.queryByText(/Ingen registrerte lokaliteter i denne kilden/)).not.toBeInTheDocument()
  })
})
