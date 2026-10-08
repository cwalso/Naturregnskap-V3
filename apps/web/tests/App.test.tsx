import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from '../src/app/App'
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
import { buildForestTileUrl, forestTypeDefinitions } from '../src/api/forestStatistics'
import { AccountOverview } from '../src/features/account-overview/AccountOverview'
import { accountCategoryIds, type AccountOverviewData } from '../src/features/account-overview/model'
import { defaultBasemap } from '../src/map/basemaps'
import type { MunicipalityMap } from '../src/map/municipalityMap'
import { buildWmsLegendUrl } from '../src/map/wmsLegend'
import * as plannedAnalysis from '../src/map/plannedDevelopment'
import * as drawnAnalysis from '../src/map/drawnAnalysis'
import * as valuedAnalysis from '../src/map/plannedValuedNature'
import type { AnalysisRasterOverlay } from '../src/map/analysisRasterOverlay'

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
    setForestLayerVisible: vi.fn(),
    setEcosystemLayer: vi.fn(),
    setUrbanLayerVisible: vi.fn(),
    setPlannedDevelopmentOverlay: vi.fn(),
    setPlannedDevelopmentVisible: vi.fn(),
    fitToPlannedDevelopmentResult: vi.fn(),
    setAnalysisHighlight: vi.fn(),
    setValuedNaturePresentation: vi.fn(),
    setValuedNatureSelectionHandler: vi.fn(),
    fitToValuedNatureResults: vi.fn(),
    setAnalysisFocus: vi.fn(),
    setAnalysisArea: vi.fn(),
    setAnalysisLayerStatusHandler: vi.fn(),
    setDrawnAnalysisArea: vi.fn(),
    fitToAnalysisHighlight: vi.fn(),
    startDrawnAnalysisArea: vi.fn(),
    finishDrawnAnalysisArea: vi.fn(),
    undoDrawnAnalysisPoint: vi.fn(),
    cancelDrawnAnalysisArea: vi.fn(),
    clearDrawnAnalysisArea: vi.fn(),
    setDrawnAnalysisAreaVisible: vi.fn(),
    fitToDrawnAnalysisArea: vi.fn(),
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
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input)
    if (url === 'https://api.kartverket.no/kommuneinfo/v1/kommuner') {
      return Promise.resolve(new Response(JSON.stringify(municipalityListSource), { status: 200 }))
    }
    if (url.startsWith('https://data.ssb.no/api/pxwebapi/v2/tables/09594/data?')) {
      return Promise.resolve(new Response(JSON.stringify(ssbAccountSource(areaKm2)), { status: 200 }))
    }
    if (url.includes('miljodirektoratet.no/arcgis/rest/services/')) {
      const body = init?.body instanceof URLSearchParams ? init.body : null
      if (body?.get('returnCountOnly') === 'true') {
        return Promise.resolve(new Response(JSON.stringify({
          count: thematicFeatureCount(url),
        }), { status: 200 }))
      }
      if (url.includes('/naturtyper_kuverdi/') && body?.get('returnGeometry') === 'true') {
        return Promise.resolve(new Response(JSON.stringify({
          features: [
            {
              attributes: { OBJECTID: 1, Verdikategori: 'Svært stor verdi', Naturtype: 'Gammel furuskog' },
              geometry: { rings: [[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]] },
            },
            {
              attributes: { OBJECTID: 2, Verdikategori: 'Stor verdi', Naturtype: 'Rikmyr' },
              geometry: { rings: [[[200, 0], [400, 0], [400, 100], [200, 100], [200, 0]]] },
            },
            {
              attributes: { OBJECTID: 3, Verdikategori: 'Stor verdi', Naturtype: 'Rikmyr' },
              geometry: { rings: [[[500, 0], [600, 0], [600, 100], [500, 100], [500, 0]]] },
            },
          ],
        }), { status: 200 }))
      }
      if (url.includes('/naturtyper_nin/FeatureServer/1/')) {
        return Promise.resolve(new Response(JSON.stringify({ features: [] }), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify({ count: thematicFeatureCount(url) }), { status: 200 }))
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
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
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
      visualSource: {
        endpoint: 'https://kart3.miljodirektoratet.no/arcgis/services/villrein/MapServer/WMSServer',
      },
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

  it('bruker dokumenterte Grunnkart-klasser for skog', () => {
    expect(forestTypeDefinitions).toEqual([
      expect.objectContaining({ label: 'Granskog', sourceValue: 'skogGran', rgb: [102, 194, 164] }),
      expect.objectContaining({ label: 'Furuskog', sourceValue: 'skogFuru', rgb: [165, 186, 27] }),
      expect.objectContaining({ label: 'Barblandingsskog', sourceValue: 'skogBarblanding', rgb: [28, 133, 72] }),
      expect.objectContaining({ label: 'Blandingsskog', sourceValue: 'skogBlanding', rgb: [103, 166, 79] }),
      expect.objectContaining({ label: 'Lauvskog', sourceValue: 'skogLauv', rgb: [158, 204, 115] }),
    ])
    const url = new URL(buildForestTileUrl([10, 100, 100]))
    expect(url.searchParams.get('layers')).toBe('arealdekkeniva2')
    expect(url.searchParams.get('sld_body')).toContain('skogGran')
    expect(url.searchParams.get('sld_body')).toContain('skogLauv')
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
    expect(screen.queryByRole('img', { name: 'Miljødirektoratet' })).not.toBeInTheDocument()
    expect(screen.getByRole('banner')).toHaveTextContent('Kommunale naturregnskap')
    expect(screen.getByRole('banner')).toHaveTextContent('TEST')
  })

  it('viser faglig avgrensede flater for Naturtapet og Utforsk naturen', async () => {
    mockMunicipalityFlow()
    render(<App createMap={() => mapMock()} />)
    await chooseTrondheim()

    fireEvent.click(screen.getByRole('link', { name: 'Naturtapet' }))
    expect(screen.getByRole('heading', { name: 'Naturtapet i Trondheim' })).toBeInTheDocument()
    expect(screen.getByText('XX dekar')).toBeInTheDocument()
    expect(screen.getByText(/Historisk nedbygging kan bli tilgjengelig som statistikk/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Naturtema' }))
    expect(screen.getByRole('heading', { name: 'Hva slags natur har vi i Trondheim?' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Heldekkende informasjon om dagens natur' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Naturtema' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Temasider fra regnskapsgrunnlaget' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Myr \(våtmark\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Skog/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bynaturen \(grå arealer\)/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Hei og buskmark/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Lite vegetert mark/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Kyststrender, svaberg og dyner/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Verdsatte naturtyper/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Grunnkart og temadata har ulike roller' })).toBeInTheDocument()
  })

  it('går alltid til Oversikt når en kommune velges', async () => {
    mockMunicipalityFlow()
    window.location.hash = '#naturtapet'
    render(<App createMap={() => mapMock()} />)

    expect(screen.getByRole('heading', { name: 'Velg kommune for å se naturregnskapet' })).toBeInTheDocument()
    await chooseTrondheim()

    expect(await screen.findByRole('heading', { name: 'Naturregnskap for Trondheim' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#oversikt')
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

    fireEvent.click(screen.getByRole('button', { name: /Se statistikk for naturen i Trondheim/ }))
    expect(screen.getByRole('heading', { name: 'Hva slags natur har vi i Trondheim?' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Naturtema' })).toHaveAttribute('aria-current', 'page')
  })

  it('åpner Skog som heldekkende temaside fra Grunnkartet', async () => {
    const map = mapMock()
    mockMunicipalityFlow()
    render(<App createMap={() => map} />)
    await chooseTrondheim()

    fireEvent.click(screen.getByRole('link', { name: 'Naturtema' }))
    fireEvent.click(screen.getByRole('button', { name: /Skog/ }))

    expect(screen.getByRole('heading', { name: 'Skog', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Skog er del av det heldekkende regnskapsgrunnlaget')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fordeling på skogtype' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Skogtyper etter størrelse' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Kart over skogtyper i Trondheim' })).toBeInTheDocument()
    await vi.waitFor(() => expect(map.setForestLayerVisible).toHaveBeenCalledWith(true))
  })

  it('åpner Myr (våtmark) med samme temasidemal', async () => {
    const map = mapMock()
    mockMunicipalityFlow()
    render(<App createMap={() => map} />)
    await chooseTrondheim()

    fireEvent.click(screen.getByRole('link', { name: 'Naturtema' }))
    fireEvent.click(screen.getByRole('button', { name: /Myr \(våtmark\)/ }))

    expect(screen.getByRole('heading', { name: 'Myr (våtmark)', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Myr (våtmark) er del av det heldekkende regnskapsgrunnlaget')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fordeling av landbasert natur' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Økosystemtypene i kommunen' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Kart over våtmark i Trondheim' })).toBeInTheDocument()
    await vi.waitFor(() => expect(map.setEcosystemLayer).toHaveBeenCalledWith('vatmark'))
  })

  it('åpner Bynaturen (grå arealer) som egen temaside', async () => {
    const map = mapMock()
    mockMunicipalityFlow()
    render(<App createMap={() => map} />)
    await chooseTrondheim()

    fireEvent.click(screen.getByRole('link', { name: 'Naturtema' }))
    fireEvent.click(screen.getByRole('button', { name: /Bynaturen \(grå arealer\)/ }))

    expect(screen.getByRole('heading', { name: 'Bynaturen (grå arealer)', level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/Bynaturen er analyse- og beslutningsstøtte/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Kart over grå arealer i Trondheim' })).toBeInTheDocument()
    await vi.waitFor(() => expect(map.setUrbanLayerVisible).toHaveBeenCalledWith(true))
  })

  it('åpner Verdsatte naturtyper som egen temaside og går videre til analyse', async () => {
    const map = mapMock()
    mockMunicipalityFlow()
    render(<App createMap={() => map} />)
    await chooseTrondheim()

    fireEvent.click(screen.getByRole('link', { name: 'Naturtema' }))
    const valuedTheme = await screen.findByRole('button', { name: /Verdsatte naturtyper/ })
    await vi.waitFor(() => expect(valuedTheme).toHaveTextContent('Treff i kommunen'))
    fireEvent.click(valuedTheme)

    expect(screen.getByRole('heading', { name: 'Verdsatte naturtyper', level: 1 })).toBeInTheDocument()
    await vi.waitFor(() => {
      expect(screen.getByText('3 registrerte lokaliteter')).toBeInTheDocument()
      expect(screen.getByText('Gammel furuskog')).toBeInTheDocument()
      expect(screen.getByText('Rikmyr')).toBeInTheDocument()
    })
    expect(screen.getAllByText(/Datasettet er ikke heldekkende/).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Naturtema' })).toHaveAttribute('aria-current', 'page')

    fireEvent.click(screen.getByRole('button', { name: /Åpne analyse/ }))
    expect(screen.getByRole('heading', { name: 'Utforsk i kart – Trondheim' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Verdsatte naturtyper/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('åpner Villreinområder med kart og faglig innhold', async () => {
    const map = mapMock()
    mockMunicipalityFlow()
    render(<App createMap={() => map} />)
    await chooseTrondheim()

    fireEvent.click(screen.getByRole('link', { name: 'Naturtema' }))
    const reindeer = screen.getByRole('button', { name: /Villreinområder/ })
    await vi.waitFor(() => expect(reindeer).toHaveTextContent('Ingen registrerte treff'))
    fireEvent.click(reindeer)

    expect(screen.getByRole('heading', { name: 'Villreinområder', level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/Ingen registrerte treff i Trondheim/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Funksjonsområder i kildetjenesten' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Kartvisning: Villreinområder i Trondheim' })).toBeInTheDocument()
    await vi.waitFor(() => expect(map.setThematicLayerVisible).toHaveBeenCalledWith('wild-reindeer-areas', true))
  })

  it('åpner Inngrepsfri natur med statusår, historikk og kart', async () => {
    const map = mapMock()
    mockMunicipalityFlow()
    render(<App createMap={() => map} />)
    await chooseTrondheim()

    fireEvent.click(screen.getByRole('link', { name: 'Naturtema' }))
    fireEvent.click(screen.getByRole('button', { name: /Inngrepsfri natur/ }))

    expect(screen.getByRole('heading', { name: 'Inngrepsfri natur', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('2023')).toBeInTheDocument()
    expect(screen.getByText('1988–2023')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tidsserie og endring' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Kartvisning: Inngrepsfri natur i Trondheim' })).toBeInTheDocument()
    await vi.waitFor(() => expect(map.setThematicLayerVisible).toHaveBeenCalledWith('infrastructure-free-nature', true))
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
    expect(screen.getByRole('button', { name: 'Resultat' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Kart' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Analyse' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Kartlag' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Naturvernområder/ })).not.toBeInTheDocument()

    const interactiveMap = screen.getByLabelText('Interaktivt kart over Trondheim')
    expect(interactiveMap).toBeInTheDocument()
    expect(interactiveMap).toHaveAttribute('tabindex', '0')
    expect(interactiveMap).toHaveAttribute('aria-describedby', 'map-accessibility-description')

    expect(screen.getByRole('heading', { name: 'Hva blir berørt?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Framtidig utbygging/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Eget område/ })).toBeEnabled()
    expect(screen.getByText('Flere datalag')).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /Verneområder/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Tegnforklaring for analysen')).toBeInTheDocument()
    expect(screen.getByText('Velg område')).toBeInTheDocument()
    expect(screen.getByText('Velg datagrunnlag')).toBeInTheDocument()
    expect(screen.getByText('Les og stedfest resultatet')).toBeInTheDocument()

    const valuedNatureAnalysis = screen.getByRole('radio', { name: /Verdsatte naturtyper/ })
    fireEvent.click(valuedNatureAnalysis)
    expect(valuedNatureAnalysis).toHaveAttribute('aria-checked', 'true')
    expect(document.querySelector('.map-frame__context-analysis')).toHaveTextContent('Verdsatte naturtyper')
    expect(document.querySelector('.map-frame__context-municipality')).toHaveTextContent('Framtidig utbygging')

    await vi.waitFor(() => expect(createMap).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(map.showBoundary).toHaveBeenCalled())

    fireEvent.click(screen.getByText('Kartvisning'))
    fireEvent.click(screen.getByRole('button', { name: 'Vis hele kommunen' }))
    expect(map.fitToBoundary).toHaveBeenCalledTimes(1)
  })

  it('viser enkel kommuneoversikt med hovedkategorier og innganger videre', async () => {
    mockMunicipalityFlow()
    render(<App createMap={() => mapMock()} />)
    await chooseTrondheim()

    expect(await screen.findByRole('heading', { name: 'Naturregnskap for Trondheim' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Natur' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fulldyrka jord' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bebygd og opparbeidet areal' })).toBeInTheDocument()
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
    expect(screen.getByRole('heading', { name: 'Fulldyrka jord' })).toBeInTheDocument()
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

function analysisFixture(id: string, offset: number, index: number): plannedAnalysis.PlannedDevelopmentAnalysis {
  const mask = new Uint8Array(16)
  mask[index] = 1
  return {
    municipalityNumber: '5001', analysisId: id,
    analysisAreaKind: id.startsWith('planned') ? 'planned' : 'drawn',
    status: 'available', analysisAreaKm2: 0.004, natureKm2: 0.001, agricultureKm2: 0.002,
    natureWithNarrowStripsKm2: 0.001, agricultureWithNarrowStripsKm2: 0.002,
    natureSharePercent: null, agricultureSharePercent: null,
    natureShareOfAnalysisAreaPercent: 25, agricultureShareOfAnalysisAreaPercent: 50,
    pixelMeters: 21.15625, tileCount: 1, source: 'Eget tegnet område',
    methodVersion: 'drawn-area-raster-v1',
    overlay: {
      kind: id.startsWith('planned') ? 'planned' : 'drawn',
      zoom: 9, cx0: 0, cy0: 0, width: 4, height: 4,
      extent: [offset, 0, offset + 4, 4], cleaned: mask, analysisMask: mask.slice(),
    },
  }
}

function breakdownFixture(analysis: plannedAnalysis.PlannedDevelopmentAnalysis): plannedAnalysis.PlannedNatureBreakdown {
  return {
    municipalityNumber: '5001', analysisId: analysis.analysisId, status: 'available',
    source: 'NIBIO Grunnkart for arealanalyse', level: 'okosystemtypeniva1',
    methodVersion: 'planned-nature-types-v1', tileCount: 1, pixelMeters: 21.15625,
    classificationPixelMeters: 10.578125, classifiedAreaKm2: 0.001, unclassifiedAreaKm2: 0,
    metrics: [{ id: 'skog', label: `${analysis.analysisId}-resultat`, color: '#9ECC73', areaKm2: 0.001, sharePercent: 100 }],
  }
}

function valuedFixture(analysis: plannedAnalysis.PlannedDevelopmentAnalysis): valuedAnalysis.PlannedValuedNatureAnalysis {
  const indices = Uint32Array.from(Array.from(analysis.overlay.analysisMask).flatMap((value, index) => value ? [index] : []))
  return {
    municipalityNumber: '5001', analysisId: analysis.analysisId, status: 'available',
    source: 'Miljødirektoratet – naturtyper med KU-verdi', methodVersion: 'planned-valued-nature-v2',
    pixelMeters: 21.15625, candidateFeatureCount: 1, affectedFeatureCount: 1,
    uniqueOverlapAreaKm2: 0.001, registeredOverlapAreaKm2: 0.001, hasOverlappingRegistrations: false,
    allOverlapPixelIndices: indices,
    localities: [{ id: '1', name: 'Lokaliteten', natureType: `${analysis.analysisId}-resultat`, value: 'Stor verdi', color: '#FD7032', overlapAreaKm2: .001,
      rings: [[[0, 0], [0, 100], [100, 100], [100, 0], [0, 0]]] }],
    valueMetrics: [{ label: 'Stor verdi', color: '#FD7032', featureCount: 1, areaKm2: 0.001, sharePercent: 100, mapPixelIndices: indices }],
    typeMetrics: [{ label: `${analysis.analysisId}-resultat`, featureCount: 1, areaKm2: 0.001, sharePercent: 100, mapPixelIndices: indices }],
  }
}

describe('overlay state when switching analysis areas', () => {
  it.each(['grunnkart', 'valued-nature'] as const)('isolates plan → A → B → plan in the %s UI and map, including late responses', async (basis) => {
    const map = mapMock()
    mockMunicipalityFlow()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
    const plan = analysisFixture('planned:5001', 0, 0)
    const a = analysisFixture('drawn:A', 100, 1)
    const b = analysisFixture('drawn:B', 200, 2)
    vi.spyOn(plannedAnalysis, 'calculatePlannedDevelopment').mockResolvedValue(plan)
    vi.spyOn(drawnAnalysis, 'calculateDrawnAreaAnalysis').mockImplementation(async (_number, area) => area.id === a.analysisId ? a : b)
    const types = vi.spyOn(plannedAnalysis, 'calculatePlannedNatureBreakdown')
      .mockImplementation(async (analysis) => breakdownFixture(analysis))
    const valued = vi.spyOn(valuedAnalysis, 'calculatePlannedValuedNatureAnalysis')
      .mockImplementation(async (analysis) => valuedFixture(analysis))

    render(<App createMap={() => map} />)
    await chooseTrondheim()
    fireEvent.click(screen.getByRole('link', { name: 'Utforsk i kart' }))
    if (basis === 'valued-nature') fireEvent.click(screen.getByRole('radio', { name: /Verdsatte naturtyper/ }))
    await screen.findAllByText(`${plan.analysisId}-resultat`)
    if (basis === 'valued-nature') {
      fireEvent.click(screen.getAllByRole('button', { name: /^Stor verdi/ })[0])
      expect(screen.getByText(/^Kart og liste:/)).toBeInTheDocument()
    }

    async function draw(result: plannedAnalysis.PlannedDevelopmentAnalysis, button: RegExp) {
      fireEvent.click(screen.getByRole('button', { name: button }))
      const handler = vi.mocked(map.startDrawnAnalysisArea).mock.lastCall![0]
      act(() => handler({ id: result.analysisId, rings: [], extent: result.overlay.extent, areaKm2: 0.004 }))
      await screen.findAllByText(`${result.analysisId}-resultat`)
    }
    await draw(a, /Eget område/)
    expect(screen.queryAllByText(`${plan.analysisId}-resultat`)).toHaveLength(0)
    expect(screen.queryByText(/^Kart og liste:/)).not.toBeInTheDocument()
    await draw(b, /Tegn på nytt/)
    expect(screen.queryAllByText(`${a.analysisId}-resultat`)).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: /Framtidig utbygging/ }))
    await screen.findAllByText(`${plan.analysisId}-resultat`)
    expect(screen.queryAllByText(`${b.analysisId}-resultat`)).toHaveLength(0)

    // Begin another B analysis, leave while it is pending and then let it resolve.
    // Deliberately ignore AbortSignal in the mock to exercise App's stale-response guard.
    let finishLate: (() => void) | undefined
    if (basis === 'grunnkart') {
      types.mockImplementation((analysis) => analysis.analysisId === b.analysisId
        ? new Promise((resolve) => { finishLate = () => resolve(breakdownFixture(analysis)) })
        : Promise.resolve(breakdownFixture(analysis)))
    } else {
      valued.mockImplementation((analysis) => analysis.analysisId === b.analysisId
        ? new Promise((resolve) => { finishLate = () => resolve(valuedFixture(analysis)) })
        : Promise.resolve(valuedFixture(analysis)))
    }
    fireEvent.click(screen.getByRole('button', { name: /Eget område/ }))
    await vi.waitFor(() => expect(finishLate).toBeDefined())
    fireEvent.click(screen.getByRole('button', { name: /Framtidig utbygging/ }))
    await screen.findAllByText(`${plan.analysisId}-resultat`)
    await act(async () => { finishLate!() })
    expect(screen.queryAllByText(`${b.analysisId}-resultat`)).toHaveLength(0)
    expect(screen.getAllByText(`${plan.analysisId}-resultat`).length).toBeGreaterThan(0)

    const highlights = vi.mocked(map.setAnalysisHighlight).mock.calls
      .map(([overlay]) => overlay).filter((overlay): overlay is AnalysisRasterOverlay => overlay !== null)
    if (basis === 'grunnkart') expect(highlights.length).toBeGreaterThan(0)
    else {
      const models = vi.mocked(map.setValuedNaturePresentation).mock.calls.map(([model]) => model).filter((model) => model !== null)
      expect(models.length).toBeGreaterThan(0)
      models.forEach((model) => {
        const expected = [plan, a, b].find((analysis) => analysis.analysisId === model!.analysisId)!
        expect(model!.overlay).toBe(expected.overlay)
        expect(model!.municipalityNumber).toBe('5001')
      })
      expect(models.at(-1)!.analysisId).toBe(plan.analysisId)
    }
    for (const overlay of highlights) {
      const expected = [plan, a, b].find((analysis) => analysis.overlay.extent[0] === overlay.extent[0])!
      expect(overlay.mask).toEqual(expected.overlay.analysisMask)
    }
    expect(map.setAnalysisArea).toHaveBeenLastCalledWith(plan.overlay)
  })
})

async function openAnalysisWorkspace(result = analysisFixture('planned:5001', 0, 0)) {
  const map = mapMock()
  mockMunicipalityFlow()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
  vi.spyOn(plannedAnalysis, 'calculatePlannedDevelopment').mockResolvedValue(result)
  vi.spyOn(plannedAnalysis, 'calculatePlannedNatureBreakdown').mockResolvedValue(breakdownFixture(result))
  vi.spyOn(valuedAnalysis, 'calculatePlannedValuedNatureAnalysis').mockResolvedValue(valuedFixture(result))
  render(<App createMap={() => map} />)
  await chooseTrondheim()
  fireEvent.click(screen.getByRole('link', { name: 'Utforsk i kart' }))
  await screen.findByRole('button', { name: 'Vis Natur i kartet' })
  return map
}

describe('result selection and map feedback', () => {
  it('links source locality selection in list and map and filters both by value/type/all', async () => {
    const result = analysisFixture('planned:5001', 0, 0)
    const map = await openAnalysisWorkspace(result)
    const valued = valuedFixture(result)
    vi.mocked(valuedAnalysis.calculatePlannedValuedNatureAnalysis).mockResolvedValue({
      ...valued, affectedFeatureCount: 2,
      localities: [...valued.localities, { ...valued.localities[0], id: '2', name: 'Enga', natureType: 'Naturbeitemark', value: 'Middels verdi', color: '#FEC02D' }],
      valueMetrics: [...valued.valueMetrics, { ...valued.valueMetrics[0], label: 'Middels verdi', color: '#FEC02D' }],
      typeMetrics: [...valued.typeMetrics, { ...valued.typeMetrics[0], label: 'Naturbeitemark' }],
    })
    fireEvent.click(screen.getByRole('radio', { name: /Verdsatte naturtyper/ }))
    const list = within(await screen.findByRole('list', { name: 'Berørte lokaliteter' }))
    fireEvent.click(list.getByRole('button', { name: /Lokaliteten/ }))
    expect(map.fitToValuedNatureResults).toHaveBeenLastCalledWith(true)
    expect(vi.mocked(map.setValuedNaturePresentation).mock.lastCall![0]!.selectedId).toBe('1')
    act(() => vi.mocked(map.setValuedNatureSelectionHandler).mock.lastCall![0]!('2'))
    expect(list.getByRole('button', { name: /Enga/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('region', { name: 'Valgt lokalitet' })).toHaveTextContent('Enga')
    fireEvent.click(screen.getByRole('button', { name: /^Stor verdi/ }))
    expect(list.queryByRole('button', { name: /Enga/ })).not.toBeInTheDocument()
    expect(vi.mocked(map.setValuedNaturePresentation).mock.lastCall![0]!.selection).toEqual({ kind: 'value', label: 'Stor verdi' })
    expect(vi.mocked(map.setValuedNaturePresentation).mock.lastCall![0]!.selectedId).toBeNull()
    fireEvent.change(screen.getByRole('combobox', { name: 'Naturtype' }), { target: { value: 'Naturbeitemark' } })
    expect(list.queryByRole('button', { name: /Lokaliteten/ })).not.toBeInTheDocument()
    expect(list.getByRole('button', { name: /Enga/ })).toBeInTheDocument()
    expect(vi.mocked(map.setValuedNaturePresentation).mock.lastCall![0]!.selection).toEqual({ kind: 'type', label: 'Naturbeitemark' })
    fireEvent.click(screen.getByRole('button', { name: 'Vis alle' }))
    expect(list.getAllByRole('button')).toHaveLength(2)
    expect(vi.mocked(map.setValuedNaturePresentation).mock.lastCall![0]!.selection).toEqual({ kind: 'all' })
    expect(screen.getByText('Ingen kartlegging registrert i dekningskilden for analysemasken.')).toBeInTheDocument()
  })

  it('reports a locality service failure separately from missing coverage and zero registrations', async () => {
    const map = await openAnalysisWorkspace()
    vi.mocked(valuedAnalysis.calculatePlannedValuedNatureAnalysis).mockRejectedValue(new Error('HTTP 503'))
    fireEvent.click(screen.getByRole('radio', { name: /Verdsatte naturtyper/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Teknisk feil')
    expect(screen.queryByRole('list', { name: 'Berørte lokaliteter' })).not.toBeInTheDocument()
    expect(map.setValuedNaturePresentation).toHaveBeenLastCalledWith(null)
  })
  it('selects Nature/Agriculture from the cards and finds the active mask, including when hidden', async () => {
    const result = analysisFixture('planned:5001', 0, 0)
    result.overlay.cleaned[3] = 2
    result.overlay.analysisMask[3] = 1
    const map = await openAnalysisWorkspace(result)
    expect(screen.getByRole('button', { name: 'Vis Natur i kartet' })).toHaveAccessibleDescription('ca. 1 dekar 25,0 % av analyseområdet')
    fireEvent.click(screen.getByRole('button', { name: 'Vis Jordbruk i kartet' }))
    expect(screen.getByRole('button', { name: 'Vis Jordbruk i kartet' })).toHaveAttribute('aria-pressed', 'true')
    const selected = vi.mocked(map.setAnalysisHighlight).mock.lastCall![0]!
    expect(Array.from(selected.mask)).toEqual(Array.from({ length: 16 }, (_, index) => index === 3 ? 2 : 0))
    expect(map.fitToAnalysisHighlight).toHaveBeenCalledTimes(1)
    expect(map.setAnalysisArea).toHaveBeenLastCalledWith(result.overlay)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Vis resultatlaget' }))
    expect(map.setAnalysisHighlight).toHaveBeenLastCalledWith(null)
    expect(screen.getAllByText('Resultatet er skjult')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: /Zoom til treff/ }))
    expect(vi.mocked(map.setAnalysisHighlight).mock.lastCall![0]!.mask).toEqual(selected.mask)
    expect(map.fitToAnalysisHighlight).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: 'Vis Natur i kartet' }))
    expect(vi.mocked(map.setAnalysisHighlight).mock.lastCall![0]!.mask[0]).toBe(1)
    expect(vi.mocked(map.setAnalysisHighlight).mock.lastCall![0]!.mask[3]).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Vis alle treff' }))
    expect(vi.mocked(map.setAnalysisHighlight).mock.lastCall![0]!.mask).toEqual(result.overlay.cleaned)
  })

  it('keeps the selected valued category when finding it and resets filters when changing basis or area', async () => {
    const map = await openAnalysisWorkspace()
    fireEvent.click(screen.getByRole('radio', { name: /Verdsatte naturtyper/ }))
    await screen.findByRole('button', { name: /^Stor verdi/ })
    fireEvent.click(screen.getAllByRole('button', { name: /^Stor verdi/ })[0])
    expect(vi.mocked(map.setValuedNaturePresentation).mock.lastCall![0]!.selection).toEqual({ kind: 'value', label: 'Stor verdi' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Vis resultatlaget' }))
    fireEvent.click(screen.getByRole('button', { name: /Zoom til treff/ }))
    expect(vi.mocked(map.setValuedNaturePresentation).mock.lastCall![0]!.selection).toEqual({ kind: 'value', label: 'Stor verdi' })
    expect(screen.getByText(/^Kart og liste:/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Eget område/ }))
    expect(screen.queryByText(/^Kart og liste:/)).not.toBeInTheDocument()
    expect(map.setAnalysisHighlight).toHaveBeenLastCalledWith(null)
    fireEvent.click(within(document.querySelector('.analysis-draw-controls')!).getByRole('button', { name: 'Avbryt' }))
    await screen.findByRole('button', { name: /^Stor verdi/ })
    fireEvent.click(screen.getByRole('radio', { name: /Natur og jordbruk/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Vis Natur i kartet' }))
    fireEvent.click(screen.getByRole('button', { name: /Eget område/ }))
    fireEvent.click(within(document.querySelector('.analysis-draw-controls')!).getByRole('button', { name: 'Avbryt' }))
    await screen.findByRole('button', { name: 'Vis Natur i kartet' })
    expect(screen.getByRole('button', { name: 'Vis Natur i kartet' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('explains no hits without fitting an empty mask and preserves the analysis area', async () => {
    const result = { ...analysisFixture('planned:5001', 0, 0), agricultureKm2: 0 }
    const map = await openAnalysisWorkspace(result)
    fireEvent.click(screen.getByRole('button', { name: 'Vis Jordbruk i kartet' }))
    expect(screen.getAllByText('Ingen treff i valgt resultat')).toHaveLength(2)
    expect(map.setAnalysisHighlight).toHaveBeenLastCalledWith(null)
    expect(map.fitToAnalysisHighlight).not.toHaveBeenCalled()
    expect(map.setAnalysisArea).toHaveBeenLastCalledWith(result.overlay)
  })

  it('distinguishes a rendering failure from a successful calculation and from no hits', async () => {
    const map = await openAnalysisWorkspace()
    act(() => vi.mocked(map.setAnalysisLayerStatusHandler).mock.lastCall![0]!('error'))
    expect(screen.getByRole('alert')).toHaveTextContent('Kartresultatet kunne ikke vises')
    expect(screen.getByRole('button', { name: 'Vis Natur i kartet' })).toHaveTextContent('1 dekar')
    expect(screen.queryByText('Ingen treff i valgt resultat')).not.toBeInTheDocument()
  })

  it('explains zero valued hits as incomplete thematic coverage and keeps find/visibility controls available', async () => {
    const map = await openAnalysisWorkspace()
    vi.mocked(valuedAnalysis.calculatePlannedValuedNatureAnalysis).mockResolvedValue({
      ...valuedFixture(analysisFixture('planned:5001', 0, 0)),
      affectedFeatureCount: 0, allOverlapPixelIndices: new Uint32Array(),
      uniqueOverlapAreaKm2: 0, registeredOverlapAreaKm2: 0, valueMetrics: [], typeMetrics: [], localities: [],
    })
    fireEvent.click(screen.getByRole('radio', { name: /Verdsatte naturtyper/ }))
    await screen.findByText('Ingen kartlegging registrert i dekningskilden for analysemasken.')
    expect(screen.getAllByText('Ingen treff i valgt resultat')).toHaveLength(2)
    expect(document.querySelector('.analysis-result-notice')).toHaveTextContent('ikke heldekkende')
    fireEvent.click(screen.getByRole('button', { name: /Zoom til treff/ }))
    expect(map.fitToAnalysisHighlight).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Vis resultatlaget' }))
    expect(screen.getAllByText('Resultatet er skjult')).toHaveLength(2)
  })

  it('provides map/result navigation and drawing actions next to the map for mobile use', async () => {
    const map = await openAnalysisWorkspace()
    fireEvent.click(screen.getByRole('button', { name: 'Resultat' }))
    expect(document.querySelector('#map-analysis-panel')!.scrollIntoView).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Eget område/ }))
    const tools = within(screen.getByLabelText('Tegneverktøy ved kartet'))
    fireEvent.click(tools.getByRole('button', { name: 'Angre punkt' }))
    fireEvent.click(tools.getByRole('button', { name: 'Ferdig' }))
    expect(map.undoDrawnAnalysisPoint).toHaveBeenCalledOnce()
    expect(map.finishDrawnAnalysisArea).toHaveBeenCalledOnce()
    fireEvent.click(tools.getByRole('button', { name: 'Avbryt' }))
    expect(screen.queryByLabelText('Tegneverktøy ved kartet')).not.toBeInTheDocument()
  })

  it('restores the selected polygon and its view when returning to the map', async () => {
    const map = await openAnalysisWorkspace()
    const area: drawnAnalysis.DrawnAnalysisArea = {
      id: 'drawn:persisted', rings: [[[100, 0], [200, 0], [200, 100], [100, 0]]], extent: [100, 0, 200, 100], areaKm2: .01,
    }
    vi.spyOn(drawnAnalysis, 'calculateDrawnAreaAnalysis').mockResolvedValue(analysisFixture(area.id, 100, 1))
    fireEvent.click(screen.getByRole('button', { name: /Eget område/ }))
    act(() => vi.mocked(map.startDrawnAnalysisArea).mock.lastCall![0](area))
    await screen.findByRole('button', { name: 'Vis Natur i kartet' })
    fireEvent.click(screen.getByRole('link', { name: 'Kommuneoversikt' }))
    vi.mocked(map.fitToDrawnAnalysisArea).mockClear()
    fireEvent.click(screen.getByRole('link', { name: 'Utforsk i kart' }))
    expect(map.setDrawnAnalysisArea).toHaveBeenLastCalledWith(area)
    expect(map.setDrawnAnalysisAreaVisible).toHaveBeenLastCalledWith(true)
    expect(map.fitToDrawnAnalysisArea).toHaveBeenCalled()
  })
})
