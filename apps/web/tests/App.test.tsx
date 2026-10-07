import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from '../src/app/App'
import agencyLogo from '../src/assets/miljodirektoratet-logo-primary.svg'
import { MunicipalityCombobox } from '../src/components/MunicipalityCombobox'
import {
  datasetRegistry,
  infrastructureFreeNature,
  nationalLandCover2025,
  protectedAreas,
  thematicDatasets,
  valuedNature,
  wildReindeerAreas,
} from '../src/datasets/registry'
import { AccountOverview } from '../src/features/account-overview/AccountOverview'
import { accountCategoryIds, type AccountOverviewData } from '../src/features/account-overview/model'
import { defaultBasemap } from '../src/map/basemaps'
import type { MunicipalityMap } from '../src/map/municipalityMap'
import { buildWmsLegendUrl } from '../src/map/wmsLegend'

const municipalityListSource = [
  { kommunenummer: '5001', kommunenavnNorsk: 'Trondheim' },
]

const boundarySource = {
  kommunenummer: '5001',
  kommunenavn: 'Trondheim',
  omrade: {
    type: 'Polygon',
    coordinates: [[
      [10, 63],
      [11, 63],
      [11, 64],
      [10, 63],
    ]],
  },
}

function mapMock(): MunicipalityMap {
  return {
    showBoundary: vi.fn(),
    clearBoundary: vi.fn(),
    setAccountLayerVisible: vi.fn(),
    setPlannedDevelopmentOverlay: vi.fn(),
    setPlannedDevelopmentVisible: vi.fn(),
    fitToPlannedDevelopmentResult: vi.fn(),
    setAnalysisHighlight: vi.fn(),
    fitToAnalysisHighlight: vi.fn(),
    setThematicLayerVisible: vi.fn(),
    setThematicLayerStatusHandler: vi.fn(),
    setFeatureInfoHandler: vi.fn(),
    clearFeatureInfo: vi.fn(),
    refreshSize: vi.fn(),
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

function ssbAccountSource(areaKm2: number | null = 12) {
  const codes = [
    '01', '02', '03', '04', '05', '06', '07', '08-09', '10-11', '12-13', '14',
    '15-16', '17', '18', '19', '20', '21', '24', '22.01', '22.02',
  ]
  const values = new Array(codes.length).fill(0)
  if (areaKm2 !== null) {
    values[codes.indexOf('01')] = 1
    values[codes.indexOf('15-16')] = 2
    values[codes.indexOf('17')] = areaKm2
  }
  return {
    dimension: {
      ArealKlasse: { category: { index: Object.fromEntries(codes.map((code, index) => [code, index])) } },
      Tid: { category: { index: { '2025': 0 } } },
    },
    value: values,
  }
}

function thematicFeatureCount(url: string): number {
  if (url.includes('/naturtyper_kuverdi/')) return 3
  if (url.includes('/vern/')) return 2
  return 0
}

function mockMunicipalityFlow(areaKm2: number | null = 12) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input)
    if (url === 'https://api.kartverket.no/kommuneinfo/v1/kommuner') {
      return Promise.resolve(new Response(JSON.stringify(municipalityListSource), { status: 200 }))
    }
    if (url.startsWith('https://data.ssb.no/api/pxwebapi/v2/tables/09594/data?')) {
      return Promise.resolve(new Response(JSON.stringify(ssbAccountSource(areaKm2)), { status: 200 }))
    }
    if (url.includes('kart.miljodirektoratet.no/arcgis/rest/services/')) {
      return Promise.resolve(new Response(JSON.stringify({
        count: thematicFeatureCount(url),
      }), { status: 200 }))
    }
    return Promise.resolve(new Response(JSON.stringify(boundarySource), { status: 200 }))
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
    expect(thematicDatasets).toHaveLength(4)
    expect(datasetRegistry).toContain(valuedNature)
    expect(datasetRegistry).toContain(infrastructureFreeNature)
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
    expect(valuedNature).toMatchObject({
      category: 'thematic',
      themeId: 'valued',
      sourceStatus: 'connected',
      coverage: { scope: 'partial', municipalityEvaluation: 'spatial_query' },
    })
    expect(infrastructureFreeNature).toMatchObject({
      category: 'thematic',
      themeId: 'infrastructure-free',
      sourceStatus: 'visual-only',
      analysisSource: null,
      coverage: { municipalityEvaluation: 'visual_only' },
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
  it('skiller teknisk feil fra manglende klargjorte regnskapstall', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url === 'https://api.kartverket.no/kommuneinfo/v1/kommuner') {
        return Promise.resolve(new Response(
          JSON.stringify(municipalityListSource),
          { status: 200 },
        ))
      }
      if (url.startsWith('https://data.ssb.no/api/pxwebapi/v2/tables/09594/data?')) {
        return Promise.resolve(new Response(null, { status: 503 }))
      }
      if (url.includes('kart.miljodirektoratet.no/arcgis/rest/services/')) {
        return Promise.resolve(new Response(JSON.stringify({
          count: thematicFeatureCount(url),
        }), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify(boundarySource), { status: 200 }))
    })

    render(<App createMap={() => mapMock()} />)
    await chooseTrondheim()

    expect(
      await screen.findByText('Kunne ikke hente arealbalansen. Prøv igjen senere.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Se statistikk for naturen i Trondheim/ })).toBeInTheDocument()
    expect(screen.getByText('Kommunevis kartleggingsgrad er ikke beregnet i prototypen ennå.')).toBeInTheDocument()
  })

  it('viser dashboardnavigasjon etter kommunevalg og Oversikt som standard', async () => {
    mockMunicipalityFlow()
    render(<App createMap={() => mapMock()} />)
    await chooseTrondheim()

    const navigation = screen.getByRole('navigation', { name: 'Hovednavigasjon' })
    expect(navigation).toHaveTextContent('Kommuneoversikt')
    expect(navigation).toHaveTextContent('Naturtapet')
    expect(navigation).toHaveTextContent('Naturtema')
    expect(navigation).toHaveTextContent('Utforsk i kart')
    expect(screen.getByRole('link', { name: 'Kommuneoversikt' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('img', { name: 'Miljødirektoratet' })).toHaveAttribute('src', agencyLogo)
    expect(screen.getByRole('banner')).toHaveTextContent('TEST')
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
    expect(screen.getByRole('heading', { name: 'Hva slags natur har vi i Trondheim?' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Heldekkende informasjon om dagens natur' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Naturtema' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Verdsatte naturtyper/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Grunnkart og temadata har ulike roller' })).toBeInTheDocument()
  })

  it('beholder valgt kommune ved navigasjon', async () => {
    mockMunicipalityFlow()
    render(<App createMap={() => mapMock()} />)
    await chooseTrondheim()

    expect(await screen.findByRole('heading', { name: 'Naturregnskap for Trondheim' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Naturtapet' }))

    expect(screen.getByRole('combobox', { name: 'Velg kommune' })).toHaveValue('Trondheim')
    expect(screen.getByRole('heading', { name: 'Naturtapet i Trondheim' })).toBeInTheDocument()
  })

  it('lar brukeren gå fra Oversikt til de andre hovedflatene', async () => {
    mockMunicipalityFlow()
    render(<App createMap={() => mapMock()} />)
    await chooseTrondheim()

    fireEvent.click(screen.getByRole('button', { name: /Hva slags natur har vi/ }))
    expect(screen.getByRole('heading', { name: 'Hva slags natur har vi i Trondheim?' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Hva slags natur har vi?' })).toHaveAttribute('aria-current', 'page')
  })

  it('åpner Verdsatte naturtyper som egen temaside og går videre til analyse', async () => {
    const map = mapMock()
    mockMunicipalityFlow()
    render(<App createMap={() => map} />)
    await chooseTrondheim()

    fireEvent.click(screen.getByRole('link', { name: 'Hva slags natur har vi?' }))
    const valuedTheme = await screen.findByRole('button', { name: /Verdsatte naturtyper/ })
    await vi.waitFor(() => expect(valuedTheme).toHaveTextContent('Treff i kommunen'))
    fireEvent.click(valuedTheme)

    expect(screen.getByRole('heading', { name: 'Verdsatte naturtyper', level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/3 registrerte objekter i Trondheim/)).toBeInTheDocument()
    expect(screen.getByText(/Datasettet er ikke heldekkende/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Hva slags natur har vi?' })).toHaveAttribute('aria-current', 'page')

    fireEvent.click(screen.getByRole('button', { name: /Åpne analyse/ }))
    expect(screen.getByRole('heading', { name: 'Utforsk i kart – Trondheim' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Verdsatte naturtyper/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('åpner øvrige naturtema som egne sider med kommunespesifikk status', async () => {
    mockMunicipalityFlow()
    render(<App createMap={() => mapMock()} />)
    await chooseTrondheim()

    fireEvent.click(screen.getByRole('link', { name: 'Hva slags natur har vi?' }))
    const reindeer = screen.getByRole('button', { name: /Villreinområder/ })
    await vi.waitFor(() => expect(reindeer).toHaveTextContent('Ingen registrerte treff'))
    fireEvent.click(reindeer)

    expect(screen.getByRole('heading', { name: 'Villreinområder', level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/Ingen registrerte treff i Trondheim/)).toBeInTheDocument()
    expect(screen.getByText('Sør-Norge')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Tilbake til naturtema/ }))
    expect(screen.getByRole('heading', { name: 'Naturtema' })).toBeInTheDocument()
  })

  it('viser kartet som egen analyseflate uten generell kartlagliste', async () => {
    const map = mapMock()
    const createMap = vi.fn(() => map)
    mockMunicipalityFlow()
    render(<App createMap={createMap} />)
    await chooseTrondheim()
    expect(createMap).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('link', { name: 'Utforsk i kart' }))

    expect(screen.getByRole('heading', { name: 'Utforsk i kart – Trondheim' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Hurtignavigasjon i kartvisningen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kart' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Analyse' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Kart' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Analyse' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Kartlag' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Naturvernområder/ })).not.toBeInTheDocument()

    const interactiveMap = screen.getByLabelText('Interaktivt kart over Trondheim')
    expect(interactiveMap).toBeInTheDocument()
    expect(interactiveMap).toHaveAttribute('tabindex', '0')
    expect(interactiveMap).toHaveAttribute('aria-describedby', 'map-accessibility-description')

    expect(screen.getByRole('heading', { name: 'Framtidig utbygging' })).toBeInTheDocument()
    expect(
      screen.queryByRole('checkbox', { name: 'Vis framtidige utbyggingsområder i kartet' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/brukes som analyseområde/)).toBeInTheDocument()
    expect(screen.getByText('Flere analyser planlegges')).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /Naturvernområder/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Kart viser nå:/)).toBeInTheDocument()

    const valuedNatureAnalysis = screen.getByRole('radio', { name: /Verdsatte naturtyper/ })
    fireEvent.click(valuedNatureAnalysis)
    expect(valuedNatureAnalysis).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/Verdsatte naturtyper × framtidig utbygging/)).toBeInTheDocument()

    await vi.waitFor(() => expect(createMap).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(map.showBoundary).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: 'Tilpass kartet til kommunen' }))
    expect(map.fitToBoundary).toHaveBeenCalledTimes(1)
  })

  it('viser enkel kommuneoversikt med hovedkategorier og innganger videre', async () => {
    mockMunicipalityFlow()
    render(<App createMap={() => mapMock()} />)
    await chooseTrondheim()

    expect(await screen.findByRole('heading', { name: 'Naturregnskap for Trondheim' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Natur' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dyrket mark' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bebygd' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Se statistikk for naturen i Trondheim/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Se naturen i Trondheim i kart/ })).toBeInTheDocument()
    expect(screen.getByText('Naturtap')).toBeInTheDocument()
    expect(screen.getByText('Kartleggingsgrad')).toBeInTheDocument()
    expect(screen.queryByLabelText('Kart over Trondheim')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Om datagrunnlaget', { selector: 'summary' }))
    expect(screen.getByRole('heading', { name: 'Om datagrunnlaget' })).toBeInTheDocument()
  })
})

describe('Level0-regnskap', () => {
  it('bruker de stabile domenekategoriene uten prosentandeler', () => {
    expect(accountCategoryIds).toEqual(['nature', 'agriculture', 'built'])
    const data = accountResponse('5001', 'Trondheim') as AccountOverviewData
    render(<AccountOverview data={data} />)

    expect(screen.getByText(/12.000/)).toHaveTextContent('12 000 dekar')
    expect(screen.getByRole('heading', { name: 'Dyrket mark' })).toBeInTheDocument()
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
