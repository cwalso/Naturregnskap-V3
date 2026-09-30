import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from '../src/app/App'
import agencyLogo from '../src/assets/miljodirektoratet-logo-primary.svg'
import { MunicipalityCombobox } from '../src/components/MunicipalityCombobox'
import {
  datasetRegistry,
  nationalLandCover2025,
  protectedAreas,
  thematicDatasets,
  wildReindeerAreas,
} from '../src/datasets/registry'
import { AccountOverview } from '../src/features/account-overview/AccountOverview'
import { accountCategoryIds, type AccountOverviewData } from '../src/features/account-overview/model'
import { defaultBasemap } from '../src/map/basemaps'
import type { MunicipalityMap } from '../src/map/municipalityMap'
import { buildWmsLegendUrl } from '../src/map/wmsLegend'

const boundary = {
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: [] },
  properties: { number: '5001', name: 'Trondheim' },
}

function mapMock(): MunicipalityMap {
  return {
    showBoundary: vi.fn(),
    clearBoundary: vi.fn(),
    setAccountLayerVisible: vi.fn(),
    setThematicLayerVisible: vi.fn(),
    setThematicLayerStatusHandler: vi.fn(),
    setFeatureInfoHandler: vi.fn(),
    clearFeatureInfo: vi.fn(),
    fitToBoundary: vi.fn(),
    showChanges: vi.fn(),
    clearChanges: vi.fn(),
    destroy: vi.fn(),
  }
}

function accountResponse(number: string, name: string, areaKm2: number | null = 12) {
  const classifiedKm2 = areaKm2 === null ? null : areaKm2 + 3
  return {
    municipalityNumber: number,
    municipalityName: name,
    period: '2025',
    status: areaKm2 === null ? 'not_available' : 'available',
    metrics: [
      {
        id: 'nature',
        areaKm2,
        sharePercent: null,
      },
      {
        id: 'agriculture',
        areaKm2: areaKm2 === null ? null : 2,
        sharePercent: null,
      },
      {
        id: 'built',
        areaKm2: areaKm2 === null ? null : 1,
        sharePercent: null,
      },
    ],
    sourceVersions: ['2025'],
    methodVersion: 'level0-v0.2-prototype',
    sourceFormat: 'geoparquet',
    sourceFeatureCount: areaKm2 === null ? null : 1234,
    areaMethod: 'source-field:SHAPE_Area',
    classifiedAreaKm2: classifiedKm2,
    excludedAreaKm2: areaKm2 === null ? null : 0.5,
    warnings: areaKm2 === null ? [] : ['Hav er eksplisitt ekskludert fra Level0-balansen i prototype-regelsettet.'],
  }
}

function thematicCoverageResponse() {
  return {
    municipalityNumber: '5001',
    municipalityName: 'Trondheim',
    methodVersion: 'thematic-intersection-v1',
    warnings: ['Treffstatus er beregnet mot løpende kildetjenester som ikke er låst til en dataversjon i prototypen.'],
    results: [
      {
        datasetId: 'protected-areas',
        status: 'hit',
        featureCount: 2,
        note: 'Ett eller flere registrerte objekter i kilden krysser kommunegrensen.',
      },
      {
        datasetId: 'wild-reindeer-areas',
        status: 'no_hit',
        featureCount: 0,
        note: 'Spørringen fant ingen registrerte objekter som krysser kommunegrensen. Datasettet har regional dekning, så statusen skal ikke tolkes som en generell vurdering av temaet.',
      },
    ],
  }
}

function mockMunicipalityFlow(areaKm2: number | null = 12) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input)
    if (url === '/api/municipalities') {
      return Promise.resolve(new Response(JSON.stringify([{ number: '5001', name: 'Trondheim' }]), { status: 200 }))
    }
    if (url.endsWith('/account-overview')) {
      return Promise.resolve(new Response(JSON.stringify(accountResponse('5001', 'Trondheim', areaKm2)), { status: 200 }))
    }
    if (url.endsWith('/thematic-coverage')) {
      return Promise.resolve(new Response(JSON.stringify(thematicCoverageResponse()), { status: 200 }))
    }
    return Promise.resolve(new Response(JSON.stringify(boundary), { status: 200 }))
  })
}

async function chooseTrondheim() {
  const input = await screen.findByRole('combobox', { name: 'Velg kommune' })
  await vi.waitFor(() => expect(input).toBeEnabled())
  fireEvent.focus(input)
  fireEvent.click(screen.getByRole('option', { name: 'Trondheim 5001' }))
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.location.hash = ''
})

describe('grunnkonfigurasjon', () => {
  it('registrerer Grunnkart og bygger WMS-tegnforklaring', () => {
    expect(datasetRegistry).toContain(nationalLandCover2025)
    expect(nationalLandCover2025.visualSource).toMatchObject({ type: 'wms', layer: 'arealdekkeniva1' })
    const url = new URL(buildWmsLegendUrl(nationalLandCover2025.visualSource))
    expect(url.searchParams.get('REQUEST')).toBe('GetLegendGraphic')
  })

  it('registrerer reelle supplerende temadatasett med eksplisitt dekningsstatus', () => {
    expect(datasetRegistry).toContain(protectedAreas)
    expect(datasetRegistry).toContain(wildReindeerAreas)
    expect(thematicDatasets).toHaveLength(2)
    expect(protectedAreas).toMatchObject({
      category: 'thematic',
      themeId: 'protected',
      coverage: { scope: 'nationwide', municipalityEvaluation: 'spatial_query' },
    })
    expect(wildReindeerAreas).toMatchObject({
      category: 'thematic',
      themeId: 'reindeer',
      attribution: 'Kilde: Villreinbasen, Miljødirektoratet',
      coverage: { scope: 'regional', municipalityEvaluation: 'spatial_query' },
    })
  })

  it('bruker Kartverkets gråtonekart', () => {
    expect(defaultBasemap).toMatchObject({
      id: 'kartverket-topograatone',
      projection: 'EPSG:3857',
      attribution: '© Kartverket',
    })
  })
})

describe('kommunevalg', () => {
  it('velger eneste treff med Enter', () => {
    const onSelect = vi.fn()
    render(<MunicipalityCombobox municipalities={[
      { number: '0301', name: 'Oslo' },
      { number: '5001', name: 'Trondheim' },
    ]} onSelect={onSelect} />)

    const input = screen.getByRole('combobox', { name: 'Velg kommune' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'trond' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(input).toHaveValue('Trondheim')
    expect(onSelect).toHaveBeenLastCalledWith({ number: '5001', name: 'Trondheim' })
  })

  it('filtrerer og velger kommune', () => {
    const onSelect = vi.fn()
    render(<MunicipalityCombobox municipalities={[
      { number: '0301', name: 'Oslo' },
      { number: '5001', name: 'Trondheim' },
    ]} onSelect={onSelect} />)

    const input = screen.getByRole('combobox', { name: 'Velg kommune' })
    fireEvent.change(input, { target: { value: 'trond' } })
    fireEvent.click(screen.getByRole('option', { name: 'Trondheim 5001' }))

    expect(input).toHaveValue('Trondheim')
    expect(onSelect).toHaveBeenLastCalledWith({ number: '5001', name: 'Trondheim' })
  })
})

describe('sidestruktur og Oversikt', () => {
  it('viser dashboardnavigasjon etter kommunevalg og Oversikt som standard', async () => {
    mockMunicipalityFlow()
    render(<App createMap={() => mapMock()} />)
    await chooseTrondheim()

    const navigation = screen.getByRole('navigation', { name: 'Hovednavigasjon' })
    expect(navigation).toHaveTextContent('Oversikt')
    expect(navigation).toHaveTextContent('Naturtapet')
    expect(navigation).toHaveTextContent('Hva slags natur har vi?')
    expect(navigation).toHaveTextContent('Utforsk i kart')
    expect(screen.getByRole('link', { name: 'Oversikt' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('img', { name: 'Miljødirektoratet' })).toHaveAttribute('src', agencyLogo)
    expect(screen.getByRole('banner')).toHaveTextContent('Kommunalt naturregnskap')
  })

  it('viser faglig avgrensede flater for Naturtapet og Utforsk naturen', async () => {
    mockMunicipalityFlow()
    render(<App createMap={() => mapMock()} />)
    await chooseTrondheim()

    fireEvent.click(screen.getByRole('link', { name: 'Naturtapet' }))
    expect(screen.getByRole('heading', { name: 'Naturtapet i Trondheim' })).toBeInTheDocument()
    expect(screen.getByText('XX dekar')).toBeInTheDocument()
    expect(screen.getByText(/Historisk nedbygging kan bli tilgjengelig/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Hva slags natur har vi?' }))
    expect(screen.getByRole('heading', { name: 'Utforsk naturen i Trondheim' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Heldekkende informasjon om dagens natur' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Se nærmere på naturen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Verdsatte naturtyper/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tilstand og økosystemtjenester' })).toBeInTheDocument()
  })

  it('beholder valgt kommune ved navigasjon', async () => {
    mockMunicipalityFlow()
    render(<App createMap={() => mapMock()} />)
    await chooseTrondheim()

    expect(await screen.findByRole('heading', { name: 'Hvor mye natur har Trondheim?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Naturtapet' }))

    expect(screen.getByRole('combobox', { name: 'Velg kommune' })).toHaveValue('Trondheim')
    expect(screen.getByRole('heading', { name: 'Naturtapet i Trondheim' })).toBeInTheDocument()
  })

  it('lar brukeren gå fra Oversikt til de andre hovedflatene', async () => {
    mockMunicipalityFlow()
    render(<App createMap={() => mapMock()} />)
    await chooseTrondheim()

    fireEvent.click(screen.getByRole('button', { name: /Hva slags natur har vi/ }))
    expect(screen.getByRole('heading', { name: 'Utforsk naturen i Trondheim' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Hva slags natur har vi?' })).toHaveAttribute('aria-current', 'page')
  })

  it('lar brukeren velge et tilkoblet tema og åpne det i kart', async () => {
    const map = mapMock()
    mockMunicipalityFlow()
    render(<App createMap={() => map} />)
    await chooseTrondheim()

    fireEvent.click(screen.getByRole('link', { name: 'Hva slags natur har vi?' }))
    const reindeer = screen.getByRole('button', { name: /Villreinområder/ })
    fireEvent.click(reindeer)

    expect(reindeer).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Villreinområder' })).toBeInTheDocument()
    expect(screen.getByText(/Dekning: Sør-Norge/)).toBeInTheDocument()
    expect(await screen.findByText(/Ingen registrerte treff i Trondheim/)).toBeInTheDocument()
    expect(screen.getByText(/regional dekning/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Vis villreinområder i kart/ }))
    expect(screen.getByRole('heading', { name: 'Utforsk i kart – Trondheim' })).toBeInTheDocument()
    await vi.waitFor(() => {
      expect(map.setThematicLayerVisible).toHaveBeenCalledWith('wild-reindeer-areas', true)
    })
  })

  it('viser kommunespesifikk treffstatus for supplerende temadata', async () => {
    mockMunicipalityFlow()
    render(<App createMap={() => mapMock()} />)
    await chooseTrondheim()

    fireEvent.click(screen.getByRole('link', { name: 'Hva slags natur har vi?' }))

    const protectedTheme = await screen.findByRole('button', { name: /Verneområder/ })
    await vi.waitFor(() => expect(protectedTheme).toHaveTextContent('Treff i kommunen'))

    fireEvent.click(protectedTheme)
    expect(screen.getByText(/Treff registrert i Trondheim/)).toBeInTheDocument()

    const reindeerTheme = screen.getByRole('button', { name: /Villreinområder/ })
    await vi.waitFor(() => expect(reindeerTheme).toHaveTextContent('Ingen registrerte treff'))
  })

  it('viser kart som egen arbeidsflate og beholder kommunegrensen', async () => {
    const map = mapMock()
    const createMap = vi.fn(() => map)
    mockMunicipalityFlow()
    render(<App createMap={createMap} />)
    await chooseTrondheim()
    await vi.waitFor(() => expect(createMap).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('link', { name: 'Utforsk i kart' }))

    expect(screen.getByRole('heading', { name: 'Utforsk i kart – Trondheim' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Kartgrunnlag' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Aktivt kartlag' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Faglag' })).toBeInTheDocument()
    expect(screen.getByText('Heldekkende')).toBeInTheDocument()
    expect(screen.getByText('2 koblet til')).toBeInTheDocument()
    expect(screen.getByText(/Naturvernområder/)).toBeInTheDocument()
    expect(screen.getByText(/Villreinområder/)).toBeInTheDocument()
    expect(screen.getByLabelText('Kart over Trondheim')).toBeInTheDocument()
    await vi.waitFor(() => expect(createMap).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(map.showBoundary).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('checkbox', { name: /Naturvernområder/ }))
    await vi.waitFor(() => {
      expect(map.setThematicLayerVisible).toHaveBeenCalledWith('protected-areas', true)
    })

    const layerStatusHandler = vi.mocked(map.setThematicLayerStatusHandler).mock.calls.at(-1)?.[0]
    expect(layerStatusHandler).toBeTypeOf('function')
    await act(async () => {
      layerStatusHandler?.('protected-areas', 'error')
    })
    expect(screen.getByText('Karttjenesten kunne ikke lastes')).toBeInTheDocument()

    const featureInfoHandler = vi.mocked(map.setFeatureInfoHandler).mock.calls.at(-1)?.[0]
    expect(featureInfoHandler).toBeTypeOf('function')

    await act(async () => {
      featureInfoHandler?.({ status: 'loading', results: [] })
    })
    expect(screen.queryByRole('dialog', { name: 'Objektinformasjon' })).not.toBeInTheDocument()

    await act(async () => {
      featureInfoHandler?.({ status: 'idle', results: [] })
    })
    expect(screen.queryByRole('dialog', { name: 'Objektinformasjon' })).not.toBeInTheDocument()

    await act(async () => {
      featureInfoHandler?.({
        status: 'ready',
        results: [{
          datasetId: 'protected-areas',
          datasetTitle: 'Naturvernområder',
          objectLabel: 'Bymarka naturreservat',
          fields: [
            { label: 'Navn', value: 'Bymarka naturreservat' },
            { label: 'Verneform', value: 'Naturreservat' },
            {
              label: 'Faktaark',
              value: 'https://example.test/bymarka',
              url: 'https://example.test/bymarka',
            },
          ],
        }],
      })
    })
    expect(screen.getByRole('dialog', { name: 'Objektinformasjon' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bymarka naturreservat' })).toBeInTheDocument()
    expect(screen.getByText('Naturreservat')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://example.test/bymarka' })).toHaveAttribute(
      'href',
      'https://example.test/bymarka',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Lukk objektinformasjon' }))
    expect(map.clearFeatureInfo).toHaveBeenCalledTimes(1)

    await act(async () => {
      featureInfoHandler?.({
        status: 'ready',
        results: [{
          datasetId: 'protected-areas',
          datasetTitle: 'Naturvernområder',
          objectLabel: 'Bymarka naturreservat',
          fields: [{ label: 'Navn', value: 'Bymarka naturreservat' }],
        }],
      })
    })

    await act(async () => {
      featureInfoHandler?.({
        status: 'partial',
        message: 'Noe objektinformasjon kunne ikke hentes fra ett eller flere aktive kartlag.',
        results: [{
          datasetId: 'protected-areas',
          datasetTitle: 'Naturvernområder',
          objectLabel: 'Bymarka naturreservat',
          fields: [{ label: 'Navn', value: 'Bymarka naturreservat' }],
        }],
      })
    })
    expect(screen.getByText(/Noe objektinformasjon kunne ikke hentes/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bymarka naturreservat' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Oversikt' }))
    await vi.waitFor(() => {
      expect(map.setThematicLayerVisible).toHaveBeenCalledWith('protected-areas', false)
    })

    fireEvent.click(screen.getByRole('link', { name: 'Utforsk i kart' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tilpass kartet til kommunen' }))
    expect(map.fitToBoundary).toHaveBeenCalledTimes(1)
  })

  it('viser Level0, proveniens og kart på Oversikt uten syntetiske endringer', async () => {
    mockMunicipalityFlow()
    render(<App createMap={() => mapMock()} />)
    await chooseTrondheim()

    expect(await screen.findByRole('heading', { name: 'Hvor mye natur har Trondheim?' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Natur' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Jordbruk' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bebygd' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Arealfordeling i Trondheim' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hva vil du vite videre?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Hva har gått tapt/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hvor ligger arealene?' })).toBeInTheDocument()
    expect(screen.getByLabelText('Kart over Trondheim')).toBeInTheDocument()
    expect(screen.queryByText('Natur → Bebygd')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Om datagrunnlaget', { selector: 'summary' }))
    expect(screen.getByRole('heading', { name: 'Om datagrunnlaget' })).toBeInTheDocument()
    expect(screen.getByText(/500 dekar ekskludert/)).toBeInTheDocument()
    expect(screen.getByText(/1 234/)).toBeInTheDocument()
    expect(screen.getByText(/Summert fra validert arealfelt SHAPE_Area/)).toBeInTheDocument()
  })
})

describe('Level0-regnskap', () => {
  it('bruker de stabile domenekategoriene uten prosentandeler', () => {
    expect(accountCategoryIds).toEqual(['nature', 'agriculture', 'built'])
    const data = accountResponse('5001', 'Trondheim') as AccountOverviewData
    render(<AccountOverview data={data} />)

    expect(screen.getByText(/12.000/)).toHaveTextContent('12 000 dekar')
    expect(screen.getByRole('heading', { name: 'Jordbruk' })).toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Arealregnskap 2025/)).not.toBeInTheDocument()
    expect(screen.getByText('Arealbasert naturregnskap · 2025')).toBeInTheDocument()
  })

  it('viser manglende Level0-data som en tydelig utilgjengelig-tilstand, ikke XX-kort', () => {
    const data = accountResponse('5001', 'Trondheim', null) as AccountOverviewData
    render(<AccountOverview data={data} />)

    expect(screen.queryByText('XX')).not.toBeInTheDocument()
    expect(screen.getByText(/Regnskapstall er ikke klargjort for Trondheim/)).toBeInTheDocument()
    expect(screen.getByText(/Vi viser ikke eksempelverdier eller nuller/)).toBeInTheDocument()
  })
})
