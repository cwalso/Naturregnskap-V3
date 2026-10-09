import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ExploreAnalysisWorkspace } from '../src/features/explore-map/ExploreAnalysisWorkspace'
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
import * as valuedAnalysis from '../src/map/plannedValuedNature'

const newMap = vi.hoisted(() => ({
  update: vi.fn(), fitToMunicipality: vi.fn(), destroy: vi.fn(), setLocalitySelectionHandler: vi.fn(),
  onStatus: undefined as unknown as (status: string) => void,
}))
vi.mock('../src/map/exploreAnalysisMap', () => ({ createExploreAnalysisMap: vi.fn((_element, onStatus) => {
  newMap.onStatus = onStatus
  return newMap
}) }))
vi.mock('../src/map/exploreThemeMap', () => ({ createExploreThemeMap: vi.fn(() => ({
  update: newMap.update, fitToMunicipality: newMap.fitToMunicipality, destroy: newMap.destroy,
  setSelectionHandler: newMap.setLocalitySelectionHandler,
})) }))

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
  newMap.update.mockClear()
  newMap.fitToMunicipality.mockClear()
  newMap.setLocalitySelectionHandler.mockClear()
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

    fireEvent.click(screen.getByRole('button', { name: /Åpne Utforsk i kart/ }))
    expect(screen.getByRole('heading', { name: 'Utforsk i kart – Trondheim' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Velg karttema' })).toHaveValue('level0')
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

  it('starter med selvstendig nivå 0 uten automatisk plananalyse', async () => {
    mockMunicipalityFlow()
    const calculate = vi.spyOn(plannedAnalysis, 'calculatePlannedDevelopment')
    const createMap = vi.fn(() => mapMock())
    render(<App createMap={createMap} />)
    await chooseTrondheim()
    fireEvent.click(screen.getByRole('link', { name: 'Utforsk i kart' }))
    expect(screen.getByRole('heading', { name: 'Utforsk i kart – Trondheim' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /Interaktivt kart: Grunnkart nivå 0/ })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('combobox', { name: 'Velg karttema' })).toHaveValue('level0')
    expect(newMap.update).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'level0', data: null }))
    expect(calculate).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /Eget område|Zoom til treff|Finn resultatet/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Flere datalag')).not.toBeInTheDocument()
    expect(createMap).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Vis hele kommunen' }))
    expect(newMap.fitToMunicipality).toHaveBeenCalledOnce()
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
    pixelMeters: 21.15625, tileCount: 1, source: id.startsWith('planned') ? 'DiBK kommuneplaner' : 'Eget tegnet område',
    methodVersion: id.startsWith('planned') ? 'dibk-plan-raster-v2' : 'drawn-area-raster-v2',
    overlay: {
      kind: id.startsWith('planned') ? 'planned' : 'drawn',
      zoom: 9, cx0: 0, cy0: 0, width: 4, height: 4,
      extent: [offset, 0, offset + 4, 4], cleaned: mask, analysisMask: mask.slice(),
    },
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

function PreservedAnalysisFixture({ plan, valued, valuedState = 'idle' }: {
  plan: plannedAnalysis.PlannedDevelopmentAnalysis
  valued: valuedAnalysis.PlannedValuedNatureAnalysis | null
  valuedState?: 'idle' | 'loading' | 'error'
}) {
  const [target, setTarget] = useState<'grunnkart' | 'valued-nature'>('grunnkart')
  return <ExploreAnalysisWorkspace municipality={{ number: '5001', name: 'Trondheim' }} boundary={null}
    result={plan} state="idle" target={target} onTargetChange={setTarget}
    valued={valued} valuedState={valuedState} coverage={null} coverageState="idle" />
}
function openAnalysisWorkspace(options: { valued?: valuedAnalysis.PlannedValuedNatureAnalysis | null; valuedState?: 'idle' | 'loading' | 'error' } = {}) {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
  const plan = analysisFixture('planned:5001', 0, 0)
  const view = render(<PreservedAnalysisFixture plan={plan} valued={options.valued === undefined ? valuedFixture(plan) : options.valued} valuedState={options.valuedState} />)
  return { plan, view }
}

describe('preserved analysis workspace presentation and stale results', () => {
  it('uses the shares of the whole valid area and shows both masks automatically', () => {
    const { plan } = openAnalysisWorkspace()
    expect(screen.getByText('50 % av gyldig analyseareal')).toBeInTheDocument()
    expect(newMap.update).toHaveBeenLastCalledWith(expect.objectContaining({ plan, showNatureAgriculture: true, showValuedNature: false, valued: null }))
    expect(newMap.fitToMunicipality).not.toHaveBeenCalled()
  })
  it('links list and map selection without fitting, and filters both by value/type/all', () => {
    const valued = valuedFixture(analysisFixture('planned:5001', 0, 0))
    openAnalysisWorkspace({ valued: { ...valued, affectedFeatureCount: 2,
      localities: [...valued.localities, { ...valued.localities[0], id: '2', name: 'Enga', natureType: 'Naturbeitemark', value: 'Middels verdi' }],
      valueMetrics: [...valued.valueMetrics, { ...valued.valueMetrics[0], label: 'Middels verdi' }],
      typeMetrics: [...valued.typeMetrics, { ...valued.typeMetrics[0], label: 'Naturbeitemark' }],
    } })
    fireEvent.click(screen.getByRole('radio', { name: 'Verdsatte naturtyper' }))
    const list = within(screen.getByRole('list', { name: 'Berørte lokaliteter' }))
    fireEvent.click(list.getByRole('button', { name: /Lokaliteten/ }))
    expect(newMap.update).toHaveBeenLastCalledWith(expect.objectContaining({ selectedLocalityId: '1' }))
    act(() => newMap.setLocalitySelectionHandler.mock.lastCall![0]('2'))
    expect(list.getByRole('button', { name: /Enga/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /^Stor verdi/ }))
    expect(list.queryByRole('button', { name: /Enga/ })).not.toBeInTheDocument()
    expect(newMap.update).toHaveBeenLastCalledWith(expect.objectContaining({ selection: { kind: 'value', label: 'Stor verdi' }, selectedLocalityId: null }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Naturtype' }), { target: { value: 'Naturbeitemark' } })
    expect(list.queryByRole('button', { name: /Lokaliteten/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Vis alle' }))
    expect(list.getAllByRole('button')).toHaveLength(2)
    expect(newMap.fitToMunicipality).not.toHaveBeenCalled()
  })
  it('removes stale valued results and selection during theme round trip', () => {
    openAnalysisWorkspace()
    fireEvent.click(screen.getByRole('radio', { name: 'Verdsatte naturtyper' }))
    fireEvent.click(screen.getByRole('button', { name: /^Stor verdi/ }))
    fireEvent.click(screen.getByRole('radio', { name: 'Natur og jordbruk' }))
    expect(newMap.update).toHaveBeenLastCalledWith(expect.objectContaining({ valued: null, showValuedNature: false, showNatureAgriculture: true }))
    fireEvent.click(screen.getByRole('radio', { name: 'Verdsatte naturtyper' }))
    expect(newMap.update).toHaveBeenLastCalledWith(expect.objectContaining({ selection: { kind: 'all' }, selectedLocalityId: null }))
    expect(newMap.fitToMunicipality).not.toHaveBeenCalled()
  })
  it('ignores a late valued result when its theme is no longer active', () => {
    const { plan, view } = openAnalysisWorkspace({ valued: null, valuedState: 'loading' })
    fireEvent.click(screen.getByRole('radio', { name: 'Verdsatte naturtyper' }))
    expect(screen.getByText('Beregner berørte naturtypelokaliteter…')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Natur og jordbruk' }))
    view.rerender(<PreservedAnalysisFixture plan={plan} valued={valuedFixture(plan)} />)
    expect(newMap.update).toHaveBeenLastCalledWith(expect.objectContaining({ valued: null, showNatureAgriculture: true }))
    expect(screen.queryByRole('list', { name: 'Berørte lokaliteter' })).not.toBeInTheDocument()
  })
  it('reports service failure as technical error while retaining the ordinary theme', () => {
    openAnalysisWorkspace({ valued: null, valuedState: 'error' })
    fireEvent.click(screen.getByRole('radio', { name: 'Verdsatte naturtyper' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Teknisk feil')
    expect(newMap.update).toHaveBeenLastCalledWith(expect.objectContaining({ valued: null, showValuedNature: true }))
  })
  it('distinguishes no registered hits from absent natural value or unknown coverage', () => {
    const plan = analysisFixture('planned:5001', 0, 0)
    openAnalysisWorkspace({ valued: { ...valuedFixture(plan), affectedFeatureCount: 0, uniqueOverlapAreaKm2: 0, localities: [], valueMetrics: [], typeMetrics: [], allOverlapPixelIndices: new Uint32Array() } })
    fireEvent.click(screen.getByRole('radio', { name: 'Verdsatte naturtyper' }))
    expect(screen.getByText(/Ingen registrerte treff/)).toHaveTextContent('ikke fravær av naturverdi')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it('reports map service failure independently of valid calculated numbers', () => {
    openAnalysisWorkspace()
    fireEvent.click(screen.getByRole('radio', { name: 'Verdsatte naturtyper' }))
    act(() => newMap.onStatus('error'))
    expect(screen.getByRole('alert')).toHaveTextContent('Temakartet kunne ikke hentes')
    expect(screen.getByText('Unikt overlappsareal')).toBeInTheDocument()
  })
  it('provides mobile result navigation without adding drawing controls', () => {
    openAnalysisWorkspace()
    fireEvent.click(screen.getByRole('button', { name: 'Resultat' }))
    expect(document.querySelector('#explore-result')!.scrollIntoView).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /Eget område|Tegn på nytt|Angre punkt/ })).not.toBeInTheDocument()
  })
})

describe('workspace rejects unrelated input without misleading numbers', () => {
  const municipality = { number: '5001', name: 'Trondheim' }
  it.each(['drawn:uuid', 'planned:0301'])('does not present %s as the current plan', (id) => {
    render(<ExploreAnalysisWorkspace municipality={municipality} boundary={null} result={analysisFixture(id, 0, 0)} state="idle" target="grunnkart" onTargetChange={vi.fn()} valued={null} valuedState="idle" coverage={null} coverageState="idle" />)
    expect(screen.queryByText('25 % av gyldig analyseareal')).not.toBeInTheDocument()
    expect(newMap.update).toHaveBeenLastCalledWith(expect.objectContaining({ plan: null }))
  })
  it('does not convert a missing denominator to zero percent', () => {
    const result = { ...analysisFixture('planned:5001', 0, 0), analysisAreaKm2: 0, natureKm2: 0, agricultureKm2: 0, natureShareOfAnalysisAreaPercent: null, agricultureShareOfAnalysisAreaPercent: null }
    render(<ExploreAnalysisWorkspace municipality={municipality} boundary={null} result={result} state="idle" target="grunnkart" onTargetChange={vi.fn()} valued={null} valuedState="idle" coverage={null} coverageState="idle" />)
    expect(screen.getAllByText('Andel kan ikke beregnes uten gyldig analyseareal')).toHaveLength(2)
    expect(screen.queryByText('0 % av gyldig analyseareal')).not.toBeInTheDocument()
  })
})
