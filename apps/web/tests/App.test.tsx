import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from '../src/app/App'
import agencyLogo from '../src/assets/miljodirektoratet-logo-primary.svg'
import { MunicipalityCombobox } from '../src/components/MunicipalityCombobox'
import { datasetRegistry, nationalLandCover2025 } from '../src/datasets/registry'
import { AccountOverview } from '../src/features/account-overview/AccountOverview'
import { accountCategoryIds, type AccountOverviewData } from '../src/features/account-overview/model'
import { defaultBasemap } from '../src/map/basemaps'
import type { MunicipalityMap } from '../src/map/municipalityMap'
import { buildWmsLegendUrl } from '../src/map/wmsLegend'

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

describe('WMS-tegnforklaring', () => {
  it('bygger GetLegendGraphic-URL uten nettverkskall', () => {
    const url = new URL(buildWmsLegendUrl(nationalLandCover2025.visualSource))

    expect(`${url.origin}${url.pathname}`).toBe(nationalLandCover2025.visualSource.endpoint)
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      SERVICE: 'WMS',
      REQUEST: 'GetLegendGraphic',
      VERSION: '1.3.0',
      FORMAT: 'image/png',
      LAYER: 'arealdekkeniva1',
      SLD_VERSION: '1.1.0',
    })
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

  it('kan også søke på kommunenummer', () => {
    render(<MunicipalityCombobox municipalities={municipalities} onSelect={vi.fn()} />)
    const input = screen.getByRole('combobox', { name: 'Velg kommune' })

    fireEvent.change(input, { target: { value: '5001' } })

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Trondheim5001'])
  })

  it('viser maksimalt ti treff om gangen', () => {
    const manyMunicipalities = Array.from({ length: 15 }, (_, index) => ({
      number: String(1000 + index),
      name: `Kommune ${String(index + 1).padStart(2, '0')}`,
    }))
    render(<MunicipalityCombobox municipalities={manyMunicipalities} onSelect={vi.fn()} />)

    fireEvent.focus(screen.getByRole('combobox', { name: 'Velg kommune' }))

    expect(screen.getAllByRole('option')).toHaveLength(10)
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

  it('viser starttilstanden uten kommuneoversikt før valg', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    render(<App createMap={() => mapMock()} />)

    expect(screen.getByRole('heading', { name: 'Velg kommune for å se naturregnskapet' })).toBeInTheDocument()
    expect(screen.queryByText(/kommune$/, { selector: '#account-overview-title' })).not.toBeInTheDocument()
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
    expect(screen.getByRole('heading', { name: 'Trondheim kommune' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Natur' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bebygd' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Jordbruk' })).toBeInTheDocument()
    expect(screen.getAllByText('Ikke beregnet ennå')).toHaveLength(3)
    expect(map.clearBoundary).toHaveBeenCalled()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/municipalities/5001/boundary', { signal: undefined }))
    await vi.waitFor(() => expect(map.showBoundary).toHaveBeenCalledWith(boundary))
    expect(fetch).toHaveBeenLastCalledWith('/api/municipalities/5001/boundary', { signal: undefined })
  })

  it('tømmer kommunegrense og oversikt og går tilbake til starttilstanden', async () => {
    const map = mapMock()
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify([{ number: '5001', name: 'Trondheim' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(boundary), { status: 200 }))
    render(<App createMap={() => map} />)

    const input = await screen.findByRole('combobox', { name: 'Velg kommune' })
    await vi.waitFor(() => expect(input).toBeEnabled())
    fireEvent.focus(input)
    fireEvent.click(screen.getByRole('option', { name: 'Trondheim 5001' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tøm kommunesøk' }))

    expect(map.clearBoundary).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('heading', { name: 'Trondheim kommune' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Velg kommune for å se naturregnskapet' })).toBeInTheDocument()
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
    const legend = screen.getByRole('complementary', { name: 'Tegnforklaring' })
    expect(legend).toHaveTextContent('Arealdekke nivå 1 (2025)')
    expect(screen.getByRole('img', { name: 'Tegnforklaring for Arealdekke nivå 1 (2025)' })).toHaveAttribute(
      'src', expect.stringContaining('REQUEST=GetLegendGraphic'),
    )
    fireEvent.click(layerControl)
    expect(map.setAccountLayerVisible).toHaveBeenCalledWith(false)
    expect(legend).toHaveTextContent('Ingen aktive faglag')
    expect(legend).not.toHaveTextContent('Arealdekke nivå 1 (2025)')
    fireEvent.click(layerControl)
    expect(map.setAccountLayerVisible).toHaveBeenLastCalledWith(true)
    expect(legend).toHaveTextContent('Arealdekke nivå 1 (2025)')
  })

  it('viser lokal offisiell logo, produktnavn og prototype-status i lys profilheader', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    render(<App createMap={() => mapMock()} />)

    const header = screen.getByRole('banner')
    const logo = screen.getByRole('img', { name: 'Miljødirektoratet' })
    expect(header).toHaveClass('site-header')
    expect(header).toHaveTextContent('Kommunale naturregnskap')
    expect(header).toHaveTextContent('Prototype')
    expect(logo).toHaveAttribute('src', agencyLogo)
    expect(logo.getAttribute('src')).not.toMatch(/^https?:/)
  })
})

describe('overordnet regnskapsoversikt', () => {
  afterEach(cleanup)

  it('bruker de stabile domenekategoriene', () => {
    expect(accountCategoryIds).toEqual(['nature', 'built', 'agriculture'])
  })

  it('rendrer eksplisitte beregnede testdata uten at de brukes i runtime', () => {
    const testData: AccountOverviewData = {
      municipalityNumber: '5001',
      municipalityName: 'Trondheim',
      metrics: [
        { id: 'nature', areaKm2: 123.45, sharePercent: 40.5, status: 'available' },
        { id: 'built', areaKm2: 12, sharePercent: null, status: 'available' },
        { id: 'agriculture', areaKm2: null, sharePercent: null, status: 'not-calculated' },
      ],
    }

    render(<AccountOverview data={testData} />)

    expect(screen.getByText(/123,45/)).toHaveTextContent('123,45 km²')
    expect(screen.getByText('40,5 % av landarealet')).toBeInTheDocument()
    expect(screen.getByText('Ikke beregnet ennå')).toBeInTheDocument()
  })
})
