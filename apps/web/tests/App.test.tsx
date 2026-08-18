import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from '../src/app/App'
import { MunicipalityCombobox } from '../src/components/MunicipalityCombobox'
import { datasetRegistry, nationalLandCover2025 } from '../src/datasets/registry'
import { defaultBasemap } from '../src/map/basemaps'
import type { MunicipalityMap } from '../src/map/municipalityMap'

const boundary = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { number: '5001', name: 'Trondheim' } }

function mapMock(): MunicipalityMap {
  return { showBoundary: vi.fn(), clearBoundary: vi.fn(), setAccountLayerVisible: vi.fn(), destroy: vi.fn() }
}

describe('dataset registry', () => {
  it('registrerer Grunnkart 2025 med WMS kun som visualSource', () => {
    expect(datasetRegistry).toContain(nationalLandCover2025)
    expect(nationalLandCover2025.visualSource).toMatchObject({ type: 'wms', layer: 'arealdekkeniva1' })
    expect(nationalLandCover2025.analysisSource).toBeNull()
  })
})

describe('bakgrunnskart', () => {
  it('bruker Kartverkets gråtonekart i EPSG:3857 utenfor dataset registry', () => {
    expect(defaultBasemap).toMatchObject({
      id: 'kartverket-topograatone',
      projection: 'EPSG:3857',
      attribution: '© Kartverket',
    })
    expect(defaultBasemap.url).toContain('/topograatone/')
    expect(datasetRegistry).not.toContain(defaultBasemap)
  })
})

describe('søkbar kommunevelger', () => {
  const municipalities = [
    { number: '0301', name: 'Oslo' },
    { number: '5001', name: 'Trondheim' },
    { number: '4204', name: 'Kristiansand' },
  ]

  afterEach(cleanup)

  it('filtrerer navn og lar brukeren velge med mus', () => {
    const onSelect = vi.fn()
    render(<MunicipalityCombobox municipalities={municipalities} onSelect={onSelect} />)

    const input = screen.getByRole('combobox', { name: 'Velg kommune' })
    fireEvent.change(input, { target: { value: 'trond' } })
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Trondheim5001'])
    fireEvent.click(screen.getByRole('option', { name: 'Trondheim 5001' }))

    expect(input).toHaveValue('Trondheim')
    expect(onSelect).toHaveBeenLastCalledWith(municipalities[1])
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('støtter piltaster, Enter, Escape og tømming', () => {
    const onSelect = vi.fn()
    render(<MunicipalityCombobox municipalities={municipalities} onSelect={onSelect} />)
    const input = screen.getByRole('combobox', { name: 'Velg kommune' })

    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenLastCalledWith(municipalities[1])

    fireEvent.click(screen.getByRole('button', { name: 'Tøm kommunesøk' }))
    expect(input).toHaveValue('')
    expect(onSelect).toHaveBeenLastCalledWith(null)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('kommunevalg', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('viser den alfabetisk sorterte kommunelisten i søkefeltet', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([
      { number: '5001', name: 'Trondheim' }, { number: '0301', name: 'Oslo' },
    ]), { status: 200 }))
    render(<App createMap={() => mapMock()} />)

    const input = await screen.findByRole('combobox', { name: 'Velg kommune' })
    expect(input).toBeEnabled()
    fireEvent.focus(input)
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Oslo0301', 'Trondheim5001'])
  })

  it('henter og viser grensen når en kommune velges', async () => {
    const map = mapMock()
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify([{ number: '5001', name: 'Trondheim' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(boundary), { status: 200 }))
    render(<App createMap={() => map} />)

    const input = await screen.findByRole('combobox', { name: 'Velg kommune' })
    await vi.waitFor(() => expect(input).toBeEnabled())
    fireEvent.focus(input)
    fireEvent.click(screen.getByRole('option', { name: 'Trondheim 5001' }))
    expect(map.clearBoundary).toHaveBeenCalled()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/municipalities/5001/boundary', { signal: undefined }))
    await vi.waitFor(() => expect(map.showBoundary).toHaveBeenCalledWith(boundary))
    expect(fetch).toHaveBeenLastCalledWith('/api/municipalities/5001/boundary', { signal: undefined })
  })

  it('viser feil når kommunelisten ikke kan hentes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }))
    render(<App createMap={() => mapMock()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Kunne ikke hente kommunelisten')
  })

  it('viser lagkontrollen og endrer synlighet i kartmodulen', async () => {
    const map = mapMock()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    render(<App createMap={() => map} />)

    const layerControl = screen.getByRole('checkbox', { name: 'Arealdekke nivå 1 (2025)' })
    expect(layerControl).toBeChecked()
    fireEvent.click(layerControl)
    expect(map.setAccountLayerVisible).toHaveBeenCalledWith(false)
    fireEvent.click(layerControl)
    expect(map.setAccountLayerVisible).toHaveBeenLastCalledWith(true)
  })
})
