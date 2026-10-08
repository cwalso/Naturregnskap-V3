import type { PlannedDevelopmentAnalysis, PlannedDevelopmentOverlayGrid, PlannedDevelopmentResult } from './plannedDevelopment'
import type { PlannedValuedNatureAnalysis, ValuedNatureMapSelection } from './plannedValuedNature'
import type { AnalysisRasterOverlay } from './analysisRasterOverlay'

export type GrunnkartMapSelection = 'all' | 'nature' | 'agriculture'
export type AnalysisMapRenderState = 'idle' | 'loading' | 'ready' | 'error'
export const analysisColors = { area: '#566B63', nature: '#006B57', agriculture: '#B85A0D', valued: '#6F3FA0' } as const

export function grunnkartSelectionLabel(selection: GrunnkartMapSelection): string {
  return selection === 'nature' ? 'Natur' : selection === 'agriculture' ? 'Jordbruk' : 'Natur og jordbruk'
}

export function buildGrunnkartMapOverlay(
  overlay: PlannedDevelopmentOverlayGrid,
  selection: GrunnkartMapSelection,
): AnalysisRasterOverlay | null {
  const mask = overlay.cleaned.map((value) => (
    (value === 1 && selection !== 'agriculture') || (value === 2 && selection !== 'nature') ? value : 0
  ))
  if (!mask.some(Boolean)) return null
  return {
    width: overlay.width, height: overlay.height, extent: overlay.extent, mask,
    fillColor: analysisColors.nature,
    palette: { 1: analysisColors.nature, 2: analysisColors.agriculture },
    calm: true,
  }
}

export interface AnalysisPresentation {
  readonly kind: 'not_started' | 'drawing' | 'loading' | 'hits' | 'no_hits' | 'hidden' | 'error' | 'unavailable'
  readonly title: string
  readonly detail: string
  readonly selectionLabel: string
}

export function analysisPresentation(input: {
  readonly state: 'idle' | 'loading' | 'error'
  readonly result: PlannedDevelopmentResult | null
  readonly basis: string
  readonly valued: PlannedValuedNatureAnalysis | null
  readonly valuedState: 'idle' | 'loading' | 'error'
  readonly selection: GrunnkartMapSelection
  readonly valuedSelection: ValuedNatureMapSelection
  readonly visible: boolean
  readonly drawing: boolean
  readonly renderState: AnalysisMapRenderState
}): AnalysisPresentation {
  const valuedBasis = input.basis === 'valued-nature'
  const selectionLabel = valuedBasis
    ? input.valuedSelection.kind === 'all' ? 'Alle registrerte treff' : input.valuedSelection.label
    : grunnkartSelectionLabel(input.selection)
  const state = (kind: AnalysisPresentation['kind'], title: string, detail: string) => ({ kind, title, detail, selectionLabel })
  if (input.drawing) return state('drawing', 'Tegn analyseområdet', 'Trykk for hvert hjørne. Bruk Ferdig, Angre punkt eller Avbryt.')
  if (input.state === 'loading' || (valuedBasis && input.valuedState === 'loading')) {
    return state('loading', 'Analysen beregnes', 'Vent på resultatet. Et tomt kart betyr ikke null treff.')
  }
  if (input.state === 'error' || (valuedBasis && input.valuedState === 'error')) {
    return state('error', 'Analysen kunne ikke beregnes', 'Teknisk feil. Dette skal ikke tolkes som null treff.')
  }
  if (input.result?.status === 'not_available') return state('unavailable', 'Analysegrunnlaget er ikke tilgjengelig', input.result.reason)
  if (!input.result) return state('not_started', 'Analysen er ikke kjørt', 'Velg et analyseområde og datagrunnlag. Tegn et område hvis du vil undersøke en egen flate.')
  if (valuedBasis && !input.valued) return state('loading', 'Analysen beregnes', 'Henter registrerte naturtyper for analyseområdet.')
  if (!input.visible) return state('hidden', 'Resultatet er skjult', 'Tallene gjelder fortsatt. Vis resultatlaget eller bruk Zoom til treff.')
  if (input.renderState === 'error') return state('error', 'Kartresultatet kunne ikke vises', 'Tallene er beregnet, men kartvisningen feilet. Dette er ikke null treff.')
  const valuedSelection = input.valuedSelection
  const hasHits = valuedBasis
    ? (valuedSelection.kind === 'all'
      ? input.valued!.affectedFeatureCount > 0
      : (valuedSelection.kind === 'value' ? input.valued!.valueMetrics : input.valued!.typeMetrics)
        .some((metric) => metric.label === valuedSelection.label && metric.featureCount > 0))
    : grunnkartArea(input.result, input.selection) > 0
  if (!hasHits) return state('no_hits', 'Ingen treff i valgt resultat', valuedBasis
    ? 'Ingen registrert overlapp. Datasettet er ikke heldekkende; null treff betyr ikke fravær av naturverdi.'
    : 'Ingen overlapp med valgt kategori i analyseområdet. Områdets ramme vises fortsatt.')
  if (input.renderState === 'loading') return state('loading', 'Viser treff i kartet…', 'Tallene er beregnet. Trefflaget klargjøres.')
  return state('hits', `${selectionLabel} vises i kartet`, 'Markerte flater er treff. Den dempede rammen viser analyseområdet.')
}

function grunnkartArea(result: PlannedDevelopmentAnalysis, selection: GrunnkartMapSelection) {
  return selection === 'nature' ? result.natureKm2 : selection === 'agriculture' ? result.agricultureKm2 : result.natureKm2 + result.agricultureKm2
}
