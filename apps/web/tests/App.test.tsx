import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from '../src/app/App'
import { datasetRegistry, nationalLandCover2025 } from '../src/datasets/registry'
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

describe('kommunevalg', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('viser den alfabetisk sorterte kommunelisten', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([
      { number: '5001', name: 'Trondheim' }, { number: '0301', name: 'Oslo' },
    ]), { status: 200 }))
    render(<App createMap={() => mapMock()} />)

    const select = await screen.findByLabelText('Velg kommune')
    expect(select).toBeEnabled()
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Velg en kommune', 'Oslo', 'Trondheim'])
  })

  it('henter og viser grensen når en kommune velges', async () => {
    const map = mapMock()
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify([{ number: '5001', name: 'Trondheim' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(boundary), { status: 200 }))
    render(<App createMap={() => map} />)

    const select = await screen.findByLabelText('Velg kommune')
    await vi.waitFor(() => expect(select).toBeEnabled())
    fireEvent.change(select, { target: { value: '5001' } })
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
