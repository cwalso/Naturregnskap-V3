import { useEffect, useRef, useState } from 'react'

import {
  getEcosystemStatistics,
  type EcosystemPageId,
  type EcosystemStatistics,
} from '../api/ecosystemStatistics'
import {
  forestTypeDefinitions,
  getForestStatistics,
  type ForestStatistics,
} from '../api/forestStatistics'
import {
  getMunicipalities,
  type Municipality,
  type MunicipalityBoundary,
} from '../api/municipalities'
import type { ThematicCoverageResponse } from '../api/thematicCoverage'
import {
  getPlannedCoverageGap,
  getValuedNatureStatistics,
  type PlannedCoverageGap,
  type ValuedNatureStatistics,
} from '../api/valuedNatureStatistics'
import { MapLegend } from '../components/MapLegend'
import { MunicipalityCombobox } from '../components/MunicipalityCombobox'
import { SiteHeader, type SiteView } from '../components/SiteHeader'
import {
  nationalLandCover2025,
  thematicDatasets,
  type ThematicDatasetId,
} from '../datasets/registry'
import {
  loadMunicipalityAccount,
  loadMunicipalityBoundary,
  loadMunicipalityThematicCoverage,
} from '../data/municipalityWorkspace'
import { AccountOverview } from '../features/account-overview/AccountOverview'
import { AccountProvenance } from '../features/account-overview/AccountProvenance'
import { getAccountProvenanceContent } from '../features/account-overview/content'
import { createUnavailableAccountOverview, type AccountOverviewData } from '../features/account-overview/model'
import {
  PlannedDevelopmentSummary,
  type AnalysisAreaMode,
  type PlannedDevelopmentAnalysisTarget,
} from '../features/planned-development/PlannedDevelopmentSummary'
import {
  calculateDrawnAreaAnalysis,
  type DrawnAnalysisArea,
} from '../map/drawnAnalysis'
import {
  calculatePlannedDevelopment,
  calculatePlannedNatureBreakdown,
  natureTypeDefinitions,
  type PlannedDevelopmentResult,
  type PlannedNatureBreakdown,
} from '../map/plannedDevelopment'
import {
  buildValuedNatureMapOverlay,
  calculatePlannedValuedNatureAnalysis,
  type PlannedValuedNatureAnalysis,
  type ValuedNatureMapSelection,
} from '../map/plannedValuedNature'
import {
  createMunicipalityMap,
  type MapFeatureInfoState,
  type MunicipalityMap,
  type MunicipalityMapFactory,
} from '../map/municipalityMap'
import { buildWmsLegendUrl } from '../map/wmsLegend'
import { EcosystemPage } from '../pages/EcosystemPage'
import { ExploreNaturePage } from '../pages/ExploreNaturePage'
import { ForestPage } from '../pages/ForestPage'
import { ThematicDataPage } from '../pages/ThematicDataPage'
import { NaturtapetPage } from '../pages/NaturtapetPage'
import { OverviewPage } from '../pages/OverviewPage'
import { UrbanNaturePage } from '../pages/UrbanNaturePage'

interface AppProps { createMap?: MunicipalityMapFactory }

const MAP_ACCESSIBILITY_DESCRIPTION_ID = 'map-accessibility-description'

const thematicViewByDataset: Record<ThematicDatasetId, SiteView> = {
  'valued-nature': 'tema-valued-nature',
  'protected-areas': 'tema-protected-areas',
  'wild-reindeer-areas': 'tema-wild-reindeer-areas',
  'infrastructure-free-nature': 'tema-infrastructure-free-nature',
}

const datasetByThematicView: Partial<Record<SiteView, ThematicDatasetId>> = {
  'tema-valued-nature': 'valued-nature',
  'tema-protected-areas': 'protected-areas',
  'tema-wild-reindeer-areas': 'wild-reindeer-areas',
  'tema-infrastructure-free-nature': 'infrastructure-free-nature',
}

const ecosystemViewById: Record<EcosystemPageId, SiteView> = {
  vatmark: 'tema-vatmark',
}

const ecosystemByView: Partial<Record<SiteView, EcosystemPageId>> = {
  'tema-vatmark': 'vatmark',
}

const validViews: readonly SiteView[] = [
  'oversikt',
  'naturtapet',
  'utforsk-naturen',
  'utforsk-i-kart',
  'tema-forest',
  'tema-vatmark',
  'tema-urban-nature',
  'tema-valued-nature',
  'tema-protected-areas',
  'tema-wild-reindeer-areas',
  'tema-infrastructure-free-nature',
]

function viewFromHash(): SiteView {
  const value = window.location.hash.replace(/^#/, '') as SiteView
  return validViews.includes(value) ? value : 'oversikt'
}

export function App({ createMap = createMunicipalityMap }: AppProps) {
  const mapElement = useRef<HTMLDivElement>(null)
  const map = useRef<MunicipalityMap | null>(null)
  const boundaryRequest = useRef(0)
  const accountRequest = useRef(0)
  const thematicRequest = useRef(0)
  const [activeView, setActiveView] = useState<SiteView>(() => viewFromHash())
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null)
  const [boundaryData, setBoundaryData] = useState<MunicipalityBoundary | null>(null)
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [boundaryState, setBoundaryState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [accountLayerVisible, setAccountLayerVisible] = useState(true)
  const [accountData, setAccountData] = useState<AccountOverviewData | null>(null)
  const [accountState, setAccountState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [thematicCoverage, setThematicCoverage] = useState<ThematicCoverageResponse | null>(null)
  const [thematicCoverageState, setThematicCoverageState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [forestStatistics, setForestStatistics] = useState<ForestStatistics | null>(null)
  const [forestStatisticsState, setForestStatisticsState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [ecosystemStatistics, setEcosystemStatistics] = useState<EcosystemStatistics | null>(null)
  const [ecosystemStatisticsState, setEcosystemStatisticsState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [valuedNatureStatistics, setValuedNatureStatistics] = useState<ValuedNatureStatistics | null>(null)
  const [valuedNatureStatisticsState, setValuedNatureStatisticsState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [plannedCoverageGap, setPlannedCoverageGap] = useState<PlannedCoverageGap | null>(null)
  const [plannedCoverageGapState, setPlannedCoverageGapState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [mapFeatureInfo, setMapFeatureInfo] = useState<MapFeatureInfoState>({
    status: 'idle',
    results: [],
  })
  const [mapRuntimeError, setMapRuntimeError] = useState<string | null>(null)
  const [plannedDevelopment, setPlannedDevelopment] = useState<PlannedDevelopmentResult | null>(null)
  const [plannedDevelopmentState, setPlannedDevelopmentState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [plannedDevelopmentVisible, setPlannedDevelopmentVisible] = useState(true)
  const [analysisAreaMode, setAnalysisAreaMode] = useState<AnalysisAreaMode>('planned')
  const [drawnAnalysisArea, setDrawnAnalysisArea] = useState<DrawnAnalysisArea | null>(null)
  const [drawingAnalysisArea, setDrawingAnalysisArea] = useState(false)
  const [drawnAnalysis, setDrawnAnalysis] = useState<PlannedDevelopmentResult | null>(null)
  const [drawnAnalysisState, setDrawnAnalysisState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [valuedNatureResultVisible, setValuedNatureResultVisible] = useState(true)
  const [plannedDevelopmentAnalysisTarget, setPlannedDevelopmentAnalysisTarget] =
    useState<PlannedDevelopmentAnalysisTarget>('grunnkart')
  const [plannedNatureBreakdown, setPlannedNatureBreakdown] = useState<PlannedNatureBreakdown | null>(null)
  const [plannedNatureBreakdownState, setPlannedNatureBreakdownState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [plannedValuedNature, setPlannedValuedNature] = useState<PlannedValuedNatureAnalysis | null>(null)
  const [plannedValuedNatureState, setPlannedValuedNatureState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [valuedNatureMapSelection, setValuedNatureMapSelection] =
    useState<ValuedNatureMapSelection>({ kind: 'all' })

  const mapAnalysisResult = analysisAreaMode === 'drawn' ? drawnAnalysis : plannedDevelopment
  const mapAnalysisState = analysisAreaMode === 'drawn' ? drawnAnalysisState : plannedDevelopmentState

  const activeEcosystemId = ecosystemByView[activeView] ?? null
  const activeThematicDatasetId = datasetByThematicView[activeView] ?? null
  const showsMap = activeView === 'utforsk-i-kart'
    || activeView === 'tema-forest'
    || activeEcosystemId !== null
    || activeView === 'tema-urban-nature'
    || activeThematicDatasetId !== null

  useEffect(() => {
    const onHashChange = () => setActiveView(viewFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!showsMap || !selectedMunicipality || !mapElement.current) {
      map.current?.destroy()
      map.current = null
      return
    }

    try {
      setMapRuntimeError(null)
      map.current = createMap(mapElement.current)
      map.current.setFeatureInfoHandler(setMapFeatureInfo)
    } catch (error) {
      map.current = null
      setMapRuntimeError(error instanceof Error ? error.message : 'Ukjent feil ved initialisering av kartet')
    }

    return () => {
      map.current?.destroy()
      map.current = null
    }
  }, [activeView, createMap, selectedMunicipality, showsMap])

  useEffect(() => {
    map.current?.setAccountLayerVisible(
      activeView === 'utforsk-i-kart' ? accountLayerVisible : false,
    )
    map.current?.setForestLayerVisible(activeView === 'tema-forest')
    map.current?.setEcosystemLayer(activeEcosystemId)
    map.current?.setUrbanLayerVisible(activeView === 'tema-urban-nature')
    for (const dataset of thematicDatasets) {
      map.current?.setThematicLayerVisible(
        dataset.id,
        activeThematicDatasetId === dataset.id,
      )
    }
  }, [
    accountLayerVisible,
    activeEcosystemId,
    activeThematicDatasetId,
    activeView,
    selectedMunicipality,
  ])

  useEffect(() => {
    if (!map.current) return
    if (boundaryData) map.current.showBoundary(boundaryData)
    else map.current.clearBoundary()
  }, [activeView, boundaryData, selectedMunicipality])

  useEffect(() => {
    const controller = new AbortController()
    getMunicipalities(controller.signal)
      .then((items) => { setMunicipalities(items); setListState('ready') })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setListState('error')
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (
      (activeView !== 'utforsk-i-kart'
        && activeView !== 'tema-forest'
        && activeEcosystemId === null
        && activeView !== 'tema-valued-nature')
      || !selectedMunicipality
    ) {
      setPlannedDevelopment(null)
      setPlannedDevelopmentState('idle')
      return
    }

    const controller = new AbortController()
    setPlannedDevelopment(null)
    setPlannedDevelopmentState('loading')

    void calculatePlannedDevelopment(selectedMunicipality.number, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setPlannedDevelopment(result)
        setPlannedDevelopmentState('idle')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setPlannedDevelopment(null)
        setPlannedDevelopmentState('error')
      })

    return () => controller.abort()
  }, [activeEcosystemId, activeView, selectedMunicipality])

  useEffect(() => {
    if (!selectedMunicipality || !drawnAnalysisArea) {
      setDrawnAnalysis(null)
      setDrawnAnalysisState('idle')
      return
    }

    const controller = new AbortController()
    setDrawnAnalysis(null)
    setDrawnAnalysisState('loading')

    void calculateDrawnAreaAnalysis(
      selectedMunicipality.number,
      drawnAnalysisArea,
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return
        setDrawnAnalysis(result)
        setDrawnAnalysisState('idle')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setDrawnAnalysis(null)
        setDrawnAnalysisState('error')
      })

    return () => controller.abort()
  }, [drawnAnalysisArea, selectedMunicipality])

  useEffect(() => {
    if (!map.current) return

    const usesGrunnkartAnalysis = plannedDevelopmentAnalysisTarget === 'grunnkart'
    const overlay = activeView === 'utforsk-i-kart'
      && usesGrunnkartAnalysis
      && mapAnalysisResult?.status === 'available'
      ? mapAnalysisResult.overlay
      : null

    map.current.setPlannedDevelopmentOverlay(overlay)
    map.current.setPlannedDevelopmentVisible(
      activeView === 'utforsk-i-kart'
        && usesGrunnkartAnalysis
        && plannedDevelopmentVisible,
    )
    map.current.setDrawnAnalysisAreaVisible(
      activeView === 'utforsk-i-kart' && analysisAreaMode === 'drawn',
    )
  }, [
    activeView,
    analysisAreaMode,
    mapAnalysisResult,
    plannedDevelopmentAnalysisTarget,
    plannedDevelopmentVisible,
    selectedMunicipality,
  ])

  useEffect(() => {
    const needsGrunnkartBreakdown = activeView === 'tema-forest'
      || activeEcosystemId !== null
      || (activeView === 'utforsk-i-kart' && plannedDevelopmentAnalysisTarget === 'grunnkart')
    const analysis = activeView === 'utforsk-i-kart'
      ? mapAnalysisResult
      : plannedDevelopment

    if (!needsGrunnkartBreakdown || analysis?.status !== 'available') {
      setPlannedNatureBreakdown(null)
      setPlannedNatureBreakdownState('idle')
      return
    }

    const controller = new AbortController()
    setPlannedNatureBreakdown(null)
    setPlannedNatureBreakdownState('loading')

    void calculatePlannedNatureBreakdown(analysis, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setPlannedNatureBreakdown(result)
        setPlannedNatureBreakdownState('idle')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setPlannedNatureBreakdown(null)
        setPlannedNatureBreakdownState('error')
      })

    return () => controller.abort()
  }, [
    activeEcosystemId,
    activeView,
    mapAnalysisResult,
    plannedDevelopment,
    plannedDevelopmentAnalysisTarget,
  ])

  useEffect(() => {
    const needsValuedNature = activeView === 'tema-valued-nature'
      || (activeView === 'utforsk-i-kart' && plannedDevelopmentAnalysisTarget === 'valued-nature')
    const analysis = activeView === 'utforsk-i-kart'
      ? mapAnalysisResult
      : plannedDevelopment

    if (!needsValuedNature || analysis?.status !== 'available') {
      setPlannedValuedNature(null)
      setPlannedValuedNatureState('idle')
      return
    }

    const controller = new AbortController()
    setPlannedValuedNature(null)
    setPlannedValuedNatureState('loading')

    void calculatePlannedValuedNatureAnalysis(analysis, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setPlannedValuedNature(result)
        setPlannedValuedNatureState('idle')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setPlannedValuedNature(null)
        setPlannedValuedNatureState('error')
      })

    return () => controller.abort()
  }, [activeView, mapAnalysisResult, plannedDevelopment, plannedDevelopmentAnalysisTarget])

  useEffect(() => {
    if (activeView !== 'tema-forest' || !selectedMunicipality) {
      setForestStatistics(null)
      setForestStatisticsState('idle')
      return
    }

    const controller = new AbortController()
    setForestStatistics(null)
    setForestStatisticsState('loading')

    void getForestStatistics(
      selectedMunicipality.number,
      selectedMunicipality.name,
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return
        setForestStatistics(result)
        setForestStatisticsState('idle')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setForestStatistics(null)
        setForestStatisticsState('error')
      })

    return () => controller.abort()
  }, [activeView, selectedMunicipality])

  useEffect(() => {
    if (!activeEcosystemId || !selectedMunicipality) {
      setEcosystemStatistics(null)
      setEcosystemStatisticsState('idle')
      return
    }

    const controller = new AbortController()
    setEcosystemStatistics(null)
    setEcosystemStatisticsState('loading')

    void getEcosystemStatistics(
      selectedMunicipality.number,
      selectedMunicipality.name,
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return
        setEcosystemStatistics(result)
        setEcosystemStatisticsState('idle')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setEcosystemStatistics(null)
        setEcosystemStatisticsState('error')
      })

    return () => controller.abort()
  }, [activeEcosystemId, selectedMunicipality])

  useEffect(() => {
    if (activeView !== 'tema-valued-nature' || !boundaryData) {
      setValuedNatureStatistics(null)
      setValuedNatureStatisticsState('idle')
      return
    }

    const controller = new AbortController()
    setValuedNatureStatistics(null)
    setValuedNatureStatisticsState('loading')

    void getValuedNatureStatistics(boundaryData, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setValuedNatureStatistics(result)
        setValuedNatureStatisticsState('idle')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setValuedNatureStatistics(null)
        setValuedNatureStatisticsState('error')
      })

    return () => controller.abort()
  }, [activeView, boundaryData])

  useEffect(() => {
    if (activeView !== 'tema-valued-nature' || plannedDevelopment?.status !== 'available') {
      setPlannedCoverageGap(null)
      setPlannedCoverageGapState('idle')
      return
    }

    const controller = new AbortController()
    setPlannedCoverageGap(null)
    setPlannedCoverageGapState('loading')

    void getPlannedCoverageGap(plannedDevelopment, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setPlannedCoverageGap(result)
        setPlannedCoverageGapState('idle')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setPlannedCoverageGap(null)
        setPlannedCoverageGapState('error')
      })

    return () => controller.abort()
  }, [activeView, plannedDevelopment])

  useEffect(() => {
    if (!map.current) return

    if (
      activeView === 'utforsk-i-kart'
      && plannedDevelopmentAnalysisTarget === 'valued-nature'
      && mapAnalysisResult?.status === 'available'
      && plannedValuedNature
      && valuedNatureResultVisible
    ) {
      map.current.setAnalysisHighlight(
        buildValuedNatureMapOverlay(
          plannedValuedNature,
          mapAnalysisResult.overlay,
          valuedNatureMapSelection,
        ),
      )
    } else {
      map.current.setAnalysisHighlight(null)
    }
  }, [
    activeView,
    mapAnalysisResult,
    plannedDevelopmentAnalysisTarget,
    plannedValuedNature,
    valuedNatureMapSelection,
    valuedNatureResultVisible,
  ])

  function navigate(view: SiteView) {
    setActiveView(view)
    const hash = `#${view}`
    if (window.location.hash !== hash) window.location.hash = hash
  }

  async function selectMunicipality(municipality: Municipality | null) {
    const requestId = ++boundaryRequest.current
    const accountRequestId = ++accountRequest.current
    const thematicRequestId = ++thematicRequest.current
    setSelectedMunicipality(municipality)
    setAccountData(null)
    setThematicCoverage(null)
    setForestStatistics(null)
    setForestStatisticsState('idle')
    setEcosystemStatistics(null)
    setEcosystemStatisticsState('idle')
    setValuedNatureStatistics(null)
    setValuedNatureStatisticsState('idle')
    setPlannedCoverageGap(null)
    setPlannedCoverageGapState('idle')
    setBoundaryData(null)
    setPlannedDevelopment(null)
    setPlannedDevelopmentState('idle')
    setPlannedDevelopmentVisible(true)
    setAnalysisAreaMode('planned')
    setDrawnAnalysisArea(null)
    setDrawingAnalysisArea(false)
    setDrawnAnalysis(null)
    setDrawnAnalysisState('idle')
    setValuedNatureResultVisible(true)
    setPlannedDevelopmentAnalysisTarget('grunnkart')
    setPlannedNatureBreakdown(null)
    setPlannedNatureBreakdownState('idle')
    setPlannedValuedNature(null)
    setPlannedValuedNatureState('idle')
    setValuedNatureMapSelection({ kind: 'all' })
    map.current?.clearBoundary()

    if (!municipality) {
      setBoundaryState('idle')
      setAccountState('idle')
      setThematicCoverageState('idle')
      return
    }

    navigate('oversikt')

    setBoundaryState('loading')
    setAccountState('loading')
    setThematicCoverageState('loading')

    void loadMunicipalityAccount(municipality.number, municipality.name)
      .then((data) => {
        if (accountRequestId === accountRequest.current) {
          setAccountData(data)
          setAccountState('idle')
        }
      })
      .catch(() => {
        if (accountRequestId === accountRequest.current) {
          setAccountData(createUnavailableAccountOverview(municipality.number, municipality.name))
          setAccountState('error')
        }
      })

    void loadMunicipalityThematicCoverage(municipality.number)
      .then((data) => {
        if (thematicRequestId === thematicRequest.current) {
          setThematicCoverage(data)
          setThematicCoverageState('idle')
        }
      })
      .catch(() => {
        if (thematicRequestId === thematicRequest.current) {
          setThematicCoverage(null)
          setThematicCoverageState('error')
        }
      })

    try {
      const boundary = await loadMunicipalityBoundary(municipality.number)
      if (requestId === boundaryRequest.current) {
        setBoundaryData(boundary)
        setBoundaryState('idle')
      }
    } catch {
      if (requestId === boundaryRequest.current) setBoundaryState('error')
    }
  }

  function openThematicPage(datasetId: ThematicDatasetId) {
    navigate(thematicViewByDataset[datasetId])
  }

  function openValuedNatureAnalysis() {
    setAnalysisAreaMode('planned')
    setPlannedDevelopmentAnalysisTarget('valued-nature')
    map.current?.setDrawnAnalysisAreaVisible(false)
    navigate('utforsk-i-kart')
  }

  function usePlannedAnalysisArea() {
    setAnalysisAreaMode('planned')
    setDrawingAnalysisArea(false)
    map.current?.cancelDrawnAnalysisArea()
    map.current?.setDrawnAnalysisAreaVisible(false)
  }

  function useDrawnAnalysisArea() {
    if (!drawnAnalysisArea) {
      startDrawingAnalysisArea()
      return
    }
    setAnalysisAreaMode('drawn')
    setDrawingAnalysisArea(false)
    map.current?.cancelDrawnAnalysisArea()
    map.current?.setDrawnAnalysisAreaVisible(true)
  }

  function startDrawingAnalysisArea() {
    setAnalysisAreaMode('drawn')
    setDrawnAnalysisArea(null)
    setDrawnAnalysis(null)
    setDrawnAnalysisState('idle')
    setDrawingAnalysisArea(true)
    map.current?.clearDrawnAnalysisArea()
    map.current?.startDrawnAnalysisArea((area) => {
      setDrawnAnalysisArea(area)
      setAnalysisAreaMode('drawn')
      setDrawingAnalysisArea(false)
      map.current?.setDrawnAnalysisAreaVisible(true)
      map.current?.fitToDrawnAnalysisArea()
    })
    scrollToMapSection('map-canvas-region')
  }

  function finishDrawingAnalysisArea() {
    map.current?.finishDrawnAnalysisArea()
  }

  function undoDrawingAnalysisPoint() {
    map.current?.undoDrawnAnalysisPoint()
  }

  function cancelDrawingAnalysisArea() {
    map.current?.cancelDrawnAnalysisArea()
    setDrawingAnalysisArea(false)
    if (!drawnAnalysisArea) setAnalysisAreaMode('planned')
  }

  function clearDrawnAnalysisArea() {
    map.current?.clearDrawnAnalysisArea()
    setDrawnAnalysisArea(null)
    setDrawnAnalysis(null)
    setDrawnAnalysisState('idle')
    setDrawingAnalysisArea(false)
    setAnalysisAreaMode('planned')
  }

  function findGrunnkartResultInMap() {
    setPlannedDevelopmentVisible(true)
    map.current?.setPlannedDevelopmentVisible(true)
    map.current?.fitToPlannedDevelopmentResult()
    scrollToMapSection('map-canvas-region')
  }

  function showValuedNatureInMap(selection: ValuedNatureMapSelection) {
    setValuedNatureResultVisible(true)
    setValuedNatureMapSelection(selection)

    if (
      mapAnalysisResult?.status === 'available'
      && plannedValuedNature
    ) {
      const overlay = buildValuedNatureMapOverlay(
        plannedValuedNature,
        mapAnalysisResult.overlay,
        selection,
      )
      map.current?.setAnalysisHighlight(overlay)
      if (overlay) map.current?.fitToAnalysisHighlight()
    }

    scrollToMapSection('map-canvas-region')
  }

  function scrollToMapSection(targetId: 'map-canvas-region' | 'map-analysis-panel') {
    document.getElementById(targetId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const municipalityPicker = (
    <section id="municipality-picker" className="municipality-picker" aria-label="Kommunevalg">
      <MunicipalityCombobox
        municipalities={municipalities}
        disabled={listState !== 'ready'}
        placeholder={listState === 'loading' ? 'Laster kommuner…' : 'Søk etter kommune'}
        selectedMunicipality={selectedMunicipality}
        onSelect={(municipality) => void selectMunicipality(municipality)}
      />
      {listState === 'error' && <p role="alert">Kunne ikke hente kommunelisten. Prøv igjen senere.</p>}
      {boundaryState === 'loading' && <p role="status">Laster kommunegrense…</p>}
      {boundaryState === 'error' && <p role="alert">Kunne ikke hente kommunegrensen. Prøv igjen senere.</p>}
    </section>
  )

  function forestMapWorkspace() {
    if (!selectedMunicipality) return null

    return (
      <div className="thematic-map-card forest-map-card">
        <aside className="thematic-map-card__legend" aria-label="Tegnforklaring">
          <strong>Skogtyper</strong>
          <span>Arealdekke nivå 2</span>
          <div className="forest-map-legend__types">
            {forestTypeDefinitions.map((item) => (
              <span key={item.id}>
                <i style={{ backgroundColor: item.color }} aria-hidden="true" />
                {item.label}
              </span>
            ))}
          </div>
        </aside>
        <div className="thematic-map-card__map">
          {mapRuntimeError && (
            <div className="map-runtime-error" role="alert">
              Kartet kunne ikke initialiseres: {mapRuntimeError}
            </div>
          )}
          <div
            ref={mapElement}
            className="map"
            role="region"
            tabIndex={0}
            aria-label={`Kart over skogtyper i ${selectedMunicipality.name}`}
          />
          <button
            type="button"
            className="thematic-map-card__fit"
            onClick={() => map.current?.fitToBoundary()}
          >
            Tilpass kartet til kommunen
          </button>
        </div>
      </div>
    )
  }

  function ecosystemMapWorkspace(ecosystemId: EcosystemPageId) {
    if (!selectedMunicipality) return null
    const definition = natureTypeDefinitions.find((item) => item.id === ecosystemId)
    if (!definition) return null

    return (
      <div className="thematic-map-card ecosystem-map-card">
        <aside className="thematic-map-card__legend" aria-label="Tegnforklaring">
          <strong>{definition.label}</strong>
          <span>Økosystemtype nivå 1</span>
          <div className="ecosystem-map-legend">
            <i style={{ backgroundColor: definition.displayColor }} aria-hidden="true" />
            <span>{definition.label}</span>
          </div>
        </aside>
        <div className="thematic-map-card__map">
          {mapRuntimeError && (
            <div className="map-runtime-error" role="alert">
              Kartet kunne ikke initialiseres: {mapRuntimeError}
            </div>
          )}
          <div
            ref={mapElement}
            className="map"
            role="region"
            tabIndex={0}
            aria-label={`Kart over ${definition.label.toLowerCase()} i ${selectedMunicipality.name}`}
          />
          <button
            type="button"
            className="thematic-map-card__fit"
            onClick={() => map.current?.fitToBoundary()}
          >
            Tilpass kartet til kommunen
          </button>
        </div>
      </div>
    )
  }

  function urbanNatureMapWorkspace() {
    if (!selectedMunicipality) return null

    return (
      <div className="thematic-map-card urban-map-card">
        <aside className="thematic-map-card__legend" aria-label="Tegnforklaring">
          <strong>Bebygd og opparbeidet areal</strong>
          <span>Prototypeinngang til grå arealer</span>
          <div className="ecosystem-map-legend">
            <i style={{ backgroundColor: '#8f8f8f' }} aria-hidden="true" />
            <span>Bebygd og opparbeidet areal</span>
          </div>
        </aside>
        <div className="thematic-map-card__map">
          {mapRuntimeError && (
            <div className="map-runtime-error" role="alert">
              Kartet kunne ikke initialiseres: {mapRuntimeError}
            </div>
          )}
          <div
            ref={mapElement}
            className="map"
            role="region"
            tabIndex={0}
            aria-label={`Kart over grå arealer i ${selectedMunicipality.name}`}
          />
          <button
            type="button"
            className="thematic-map-card__fit"
            onClick={() => map.current?.fitToBoundary()}
          >
            Tilpass kartet til kommunen
          </button>
        </div>
      </div>
    )
  }

  function thematicMapWorkspace(datasetId: ThematicDatasetId) {
    if (!selectedMunicipality) return null
    const dataset = thematicDatasets.find((item) => item.id === datasetId)
    if (!dataset) return null

    const legendLabel = datasetId === 'wild-reindeer-areas'
      ? 'Leveområde for villrein'
      : datasetId === 'infrastructure-free-nature'
        ? 'Status inngrepsfri natur 2023'
        : dataset.visualSource.title

    return (
      <div className="thematic-map-card">
        <aside className="thematic-map-card__legend" aria-label="Tegnforklaring">
          <strong>{dataset.title}</strong>
          <span>{legendLabel}</span>
          <MapLegend
            items={[{
              id: dataset.id,
              title: legendLabel,
              visible: true,
              imageUrl: buildWmsLegendUrl(dataset.visualSource),
            }]}
          />
        </aside>
        <div className="thematic-map-card__map">
          {mapRuntimeError && (
            <div className="map-runtime-error" role="alert">
              Kartet kunne ikke initialiseres: {mapRuntimeError}
            </div>
          )}
          <div
            ref={mapElement}
            className="map"
            role="region"
            tabIndex={0}
            aria-label={`Kartvisning: ${dataset.title} i ${selectedMunicipality.name}`}
          />
          <button
            type="button"
            className="thematic-map-card__fit"
            onClick={() => map.current?.fitToBoundary()}
          >
            Tilpass kartet til kommunen
          </button>
        </div>
      </div>
    )
  }

  function mapWorkspace(
    title: string,
    description: string,
    variant: 'overview' | 'explore' = 'overview',
  ) {
    if (!selectedMunicipality) return null

    if (variant === 'overview') {
      return (
        <section className="overview-map-card" aria-labelledby="overview-map-title">
          <div className="overview-card__header">
            <h2 id="overview-map-title">{title}</h2>
            <p>{description}</p>
          </div>

          <div className="overview-map-card__map">
            {mapRuntimeError && (
              <div className="map-runtime-error" role="alert">
                Kartet kunne ikke initialiseres: {mapRuntimeError}
              </div>
            )}
            <div
              ref={mapElement}
              className="map"
              aria-label={`Kart over ${selectedMunicipality.name}`}
            />
            <div className="overview-map-card__legend" aria-label="Kartgrunnlag">
              <span className="overview-map-card__legend-swatch" aria-hidden="true" />
              <span>Grunnkart for arealanalyse · 2025</span>
            </div>
          </div>

          <button
            type="button"
            className="overview-map-card__action"
            onClick={() => navigate('utforsk-i-kart')}
          >
            Åpne full kartvisning <span aria-hidden="true">→</span>
          </button>
        </section>
      )
    }

    const layerToggle = (
      <label className={variant === 'explore' ? 'layer-toggle' : undefined}>
        <input
          type="checkbox"
          checked={accountLayerVisible}
          onChange={(event) => {
            const visible = event.target.checked
            setAccountLayerVisible(visible)
            map.current?.setAccountLayerVisible(visible)
          }}
        />
        {variant === 'explore' ? (
          <span>
            <strong>{nationalLandCover2025.title}</strong>
            <small>{nationalLandCover2025.visualSource.title} · {nationalLandCover2025.version}</small>
          </span>
        ) : (
          <>{nationalLandCover2025.visualSource.title} ({nationalLandCover2025.version})</>
        )}
      </label>
    )

    const legendItems = [
      {
        id: nationalLandCover2025.id,
        title: `${nationalLandCover2025.visualSource.title} (${nationalLandCover2025.version})`,
        visible: accountLayerVisible,
        imageUrl: buildWmsLegendUrl(nationalLandCover2025.visualSource),
      },
    ]

    const legend = <MapLegend items={legendItems} />

    const analysisAreaLabel = analysisAreaMode === 'drawn'
      ? 'Eget tegnet område'
      : 'Framtidig utbygging'
    const analysisMapStatus = plannedDevelopmentAnalysisTarget === 'valued-nature'
      ? !valuedNatureResultVisible
        ? 'Analyseresultatet er skjult'
        : valuedNatureMapSelection.kind === 'all'
          ? `Verdsatte naturtyper × ${analysisAreaLabel.toLowerCase()}`
          : `${valuedNatureMapSelection.label} × ${analysisAreaLabel.toLowerCase()}`
      : !plannedDevelopmentVisible
        ? 'Analyseresultatet er skjult'
        : `Natur og jordbruk × ${analysisAreaLabel.toLowerCase()}`

    return (
      <section
        className={`map-workspace ${variant === 'explore' ? 'map-workspace--explore' : ''}`}
        aria-labelledby="map-workspace-title"
      >
        <div className="map-workspace__header">
          <p className="map-workspace__eyebrow">Kart</p>
          <h2 id="map-workspace-title">{title}</h2>
          <p>{description}</p>
        </div>

        {variant === 'explore' && (
          <nav className="map-mobile-jump-nav" aria-label="Hurtignavigasjon i kartvisningen">
            <button
              type="button"
              onClick={() => scrollToMapSection('map-canvas-region')}
            >
              Kart
            </button>
            <button
              type="button"
              onClick={() => scrollToMapSection('map-analysis-panel')}
            >
              Analyse
            </button>
          </nav>
        )}

        <div className="map-workspace__body">
          <div
            className="map-sidebar"
            id={variant === 'explore' ? 'map-analysis-panel' : undefined}
          >
            {variant === 'explore' ? (
              <>
                <PlannedDevelopmentSummary
                  state={mapAnalysisState}
                  result={mapAnalysisResult}
                  visible={plannedDevelopmentVisible}
                  onVisibleChange={setPlannedDevelopmentVisible}
                  onFindGrunnkartResultInMap={findGrunnkartResultInMap}
                  natureBreakdown={plannedNatureBreakdown}
                  natureBreakdownState={plannedNatureBreakdownState}
                  analysisTarget={plannedDevelopmentAnalysisTarget}
                  onAnalysisTargetChange={setPlannedDevelopmentAnalysisTarget}
                  valuedNatureAnalysis={plannedValuedNature}
                  valuedNatureAnalysisState={plannedValuedNatureState}
                  valuedNatureResultVisible={valuedNatureResultVisible}
                  onValuedNatureResultVisibleChange={setValuedNatureResultVisible}
                  valuedNatureMapSelection={valuedNatureMapSelection}
                  onShowValuedNatureInMap={showValuedNatureInMap}
                  analysisAreaMode={analysisAreaMode}
                  drawnArea={drawnAnalysisArea}
                  drawing={drawingAnalysisArea}
                  onUsePlannedArea={usePlannedAnalysisArea}
                  onUseDrawnArea={useDrawnAnalysisArea}
                  onStartDrawing={startDrawingAnalysisArea}
                  onFinishDrawing={finishDrawingAnalysisArea}
                  onUndoDrawing={undoDrawingAnalysisPoint}
                  onCancelDrawing={cancelDrawingAnalysisArea}
                  onClearDrawnArea={clearDrawnAnalysisArea}
                />

                <details className="analysis-map-options">
                  <summary>Kartvisning</summary>
                  <div className="analysis-map-options__content">
                    {layerToggle}
                    <button
                      type="button"
                      className="map-tool-button"
                      onClick={() => map.current?.fitToBoundary()}
                    >
                      Vis hele kommunen
                    </button>
                    {legend}
                  </div>
                </details>
              </>
            ) : (
              <>
                <div className="layer-control" aria-label="Kartlag">
                  <h3>Kartlag</h3>
                  {layerToggle}
                </div>
                {legend}
              </>
            )}
          </div>

          <div
            className="map-frame"
            id={variant === 'explore' ? 'map-canvas-region' : undefined}
            aria-labelledby={variant === 'explore' ? 'map-canvas-title' : undefined}
          >
            {variant === 'explore' && (
              <>
                <h3 id="map-canvas-title" className="visually-hidden">Interaktivt kart</h3>
                <p id={MAP_ACCESSIBILITY_DESCRIPTION_ID} className="visually-hidden">
                  Kartet supplerer analysen. De viktigste resultatene finnes også som tekst
                  i analysepanelet.
                </p>
              </>
            )}
            {variant === 'explore' && (
              <div className="map-frame__context" aria-live="polite">
                <span className="map-frame__context-municipality">
                  <small>Analyseområde</small>
                  <strong>{analysisAreaLabel} · {selectedMunicipality.name}</strong>
                </span>
                <span className="map-frame__context-analysis">
                  <small>Kartet viser</small>
                  <strong>{analysisMapStatus}</strong>
                </span>
                <button
                  type="button"
                  className="map-frame__fit"
                  onClick={() => map.current?.fitToBoundary()}
                >
                  Hele kommunen
                </button>
              </div>
            )}
            {mapRuntimeError && (
              <div className="map-runtime-error" role="alert">
                Kartet kunne ikke initialiseres: {mapRuntimeError}
              </div>
            )}
            <div
              ref={mapElement}
              className="map"
              role={variant === 'explore' ? 'region' : 'img'}
              tabIndex={variant === 'explore' ? 0 : undefined}
              aria-label={variant === 'explore' ? `Interaktivt kart over ${selectedMunicipality.name}` : 'Kart over Norge'}
              aria-describedby={variant === 'explore' ? MAP_ACCESSIBILITY_DESCRIPTION_ID : undefined}
            />

            {variant === 'explore'
              && mapFeatureInfo.status !== 'idle'
              && mapFeatureInfo.status !== 'loading'
              && (
              <aside
                className="map-info-popup"
                role="region"
                aria-label="Objektinformasjon"
                aria-live="polite"
              >
                <button
                  type="button"
                  className="map-info-popup__close"
                  aria-label="Lukk objektinformasjon"
                  onClick={() => map.current?.clearFeatureInfo()}
                >
                  ×
                </button>

                {mapFeatureInfo.status === 'error' && (
                  <>
                    <p className="map-info-popup__eyebrow">Objektinformasjon</p>
                    <p role="alert">{mapFeatureInfo.message}</p>
                  </>
                )}

                {mapFeatureInfo.status === 'partial' && (
                  <p className="map-info-popup__warning" role="status">{mapFeatureInfo.message}</p>
                )}

                {(mapFeatureInfo.status === 'ready' || mapFeatureInfo.status === 'partial')
                  && mapFeatureInfo.results.map((result) => (
                  <article className="map-feature-card" key={result.datasetId}>
                    <p className="map-info-popup__eyebrow">{result.datasetTitle}</p>
                    <h4>{result.objectLabel}</h4>
                    <dl>
                      {result.fields.map((field, index) => (
                        <div key={`${result.datasetId}-${field.label}-${index}`}>
                          <dt>{field.label}</dt>
                          <dd>
                            {field.url ? (
                              <a href={field.url} target="_blank" rel="noreferrer">
                                {field.value}
                              </a>
                            ) : field.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))}
              </aside>
            )}
          </div>
        </div>

        {variant === 'explore' && (
          <div className="map-workspace__method">
            <strong>Kartet viser både datagrunnlag og et illustrativt plananslag.</strong>
            <span>
              Regnskapsgrunnlag, supplerende temadata og analyse holdes adskilt.
              Plananslaget beregnes i nettleseren fra Grunnkart-raster og DiBK-data
              med dokumentert prototypemetode.
            </span>
          </div>
        )}
      </section>
    )
  }

  const overview = selectedMunicipality ? (
        <OverviewPage
          onNavigate={navigate}
          municipalityName={selectedMunicipality.name}
          accountContent={
            accountState === 'loading'
              ? <section className="account-overview"><p role="status">Laster arealbalanse…</p></section>
              : accountState === 'error'
                ? <section className="account-overview"><p role="alert">Kunne ikke hente arealbalansen. Prøv igjen senere.</p></section>
                : <AccountOverview data={accountData ?? createUnavailableAccountOverview(selectedMunicipality.number, selectedMunicipality.name)} />
          }
          provenanceContent={
            accountState === 'idle'
              ? (
                <AccountProvenance
                  content={getAccountProvenanceContent(
                    accountData ?? createUnavailableAccountOverview(
                      selectedMunicipality.number,
                      selectedMunicipality.name,
                    ),
                  )}
                />
              )
              : null
          }
        />
      ) : (
        <div className="start-workspace">
          <div className="start-municipality-picker">{municipalityPicker}</div>
          <section className="start-view__intro" aria-labelledby="start-title">
            <p className="start-view__eyebrow">Kommunale naturregnskap</p>
            <h1 id="start-title">Velg kommune for å se naturregnskapet</h1>
            <p>
              Søk etter kommunen du vil utforske. Du får en overordnet
              arealoversikt basert på felles regnskapsgrunnlag og kan gå videre
              til naturtap, supplerende naturdata og kart.
            </p>
          </section>
        </div>
      )

  const mapView = (
    <section className="content-page map-page" aria-labelledby="explore-map-title">
      <header className="content-page__intro map-page__intro">
        <p className="content-page__eyebrow">Kart og analyse</p>
        <h1 id="explore-map-title">
          Utforsk i kart{selectedMunicipality ? ` – ${selectedMunicipality.name}` : ''}
        </h1>
        <p>
          Velg et analyseområde og kryss det med natur- og arealdata. Resultatet
          vises som tydelige tall og kan stedfestes direkte i kartet.
        </p>
      </header>

      {!selectedMunicipality ? (
        <div className="map-page__picker">
          <p>Velg kommune for å avgrense kartet.</p>
          {municipalityPicker}
        </div>
      ) : (
        <>
          <div className="map-page__flow" aria-label="Arbeidsflyt">
            <span><b>1</b> Velg område</span>
            <span><b>2</b> Velg datagrunnlag</span>
            <span><b>3</b> Les og stedfest resultatet</span>
          </div>
          {mapWorkspace(
            'Analyse',
            'Kartet viser valgt analyseområde og resultat. Tallene i analysepanelet er hovedresultatet; kartet brukes til å finne hvor overlappene ligger.',
            'explore',
          )}
        </>
      )}
    </section>
  )

  const activeContent = !selectedMunicipality ? overview : (
    <>
      {activeView === 'oversikt' && overview}
      {activeView === 'naturtapet' && <NaturtapetPage municipalityName={selectedMunicipality.name} />}
      {activeView === 'utforsk-naturen' && (
        <ExploreNaturePage
          municipalityName={selectedMunicipality.name}
          thematicCoverage={thematicCoverage}
          thematicCoverageState={thematicCoverageState}
          onOpenThemePage={openThematicPage}
          onOpenForestPage={() => navigate('tema-forest')}
          onOpenEcosystemPage={(ecosystemId) => navigate(ecosystemViewById[ecosystemId])}
          onOpenUrbanNaturePage={() => navigate('tema-urban-nature')}
        />
      )}
      {activeView === 'tema-forest' && (
        <ForestPage
          municipalityName={selectedMunicipality.name}
          statistics={forestStatistics}
          statisticsState={forestStatisticsState}
          plannedNatureBreakdown={plannedNatureBreakdown}
          plannedNatureBreakdownState={plannedNatureBreakdownState}
          onBack={() => navigate('utforsk-naturen')}
          onOpenMap={() => {
            setPlannedDevelopmentAnalysisTarget('grunnkart')
            navigate('utforsk-i-kart')
          }}
          mapContent={forestMapWorkspace()}
        />
      )}
      {activeEcosystemId && (
        <EcosystemPage
          ecosystemId={activeEcosystemId}
          municipalityName={selectedMunicipality.name}
          statistics={ecosystemStatistics}
          statisticsState={ecosystemStatisticsState}
          plannedNatureBreakdown={plannedNatureBreakdown}
          plannedNatureBreakdownState={plannedNatureBreakdownState}
          onBack={() => navigate('utforsk-naturen')}
          onOpenMap={() => {
            setPlannedDevelopmentAnalysisTarget('grunnkart')
            navigate('utforsk-i-kart')
          }}
          mapContent={ecosystemMapWorkspace(activeEcosystemId)}
        />
      )}
      {activeView === 'tema-urban-nature' && (
        <UrbanNaturePage
          municipalityName={selectedMunicipality.name}
          accountData={accountData}
          accountState={accountState}
          onBack={() => navigate('utforsk-naturen')}
          mapContent={urbanNatureMapWorkspace()}
        />
      )}
      {datasetByThematicView[activeView] && (
        <ThematicDataPage
          datasetId={datasetByThematicView[activeView]!}
          municipalityName={selectedMunicipality.name}
          thematicCoverage={thematicCoverage}
          thematicCoverageState={thematicCoverageState}
          valuedNatureStatistics={valuedNatureStatistics}
          valuedNatureStatisticsState={valuedNatureStatisticsState}
          plannedValuedNature={plannedValuedNature}
          plannedValuedNatureState={plannedValuedNatureState}
          plannedCoverageGap={plannedCoverageGap}
          plannedCoverageGapState={plannedCoverageGapState}
          onBack={() => navigate('utforsk-naturen')}
          onOpenFutureDevelopmentAnalysis={
            datasetByThematicView[activeView] === 'valued-nature'
              ? openValuedNatureAnalysis
              : undefined
          }
          mapContent={thematicMapWorkspace(datasetByThematicView[activeView]!)}
        />
      )}
      {activeView === 'utforsk-i-kart' && mapView}
    </>
  )

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Hopp til hovedinnhold</a>
      <SiteHeader
        activeView={activeView}
        municipalityPicker={selectedMunicipality ? municipalityPicker : undefined}
        onNavigate={navigate}
      />
      <main id="main-content" className="service-main" tabIndex={-1}>
        {activeContent}
      </main>
    </div>
  )
}
