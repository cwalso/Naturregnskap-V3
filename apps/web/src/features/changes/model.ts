import type { AccountCategoryId } from '../account-overview/model'

export interface ChangeSource {
  readonly dataset: string
  readonly version: string
  readonly purpose: string
}

export interface ChangeTransition {
  readonly fromLevel0: AccountCategoryId | null
  readonly toLevel0: AccountCategoryId
  readonly fromSourceClass?: string | null
  readonly toSourceClass?: string | null
}

export interface ChangeFeature {
  readonly changeId: string
  readonly municipalityNumber: string
  readonly geometry: { readonly type: string; readonly coordinates: unknown }
  readonly geometryCrs: string
  readonly areaM2: number
  readonly period: string
  readonly source: ChangeSource
  readonly transition: ChangeTransition
}

export interface ChangeArea {
  readonly fromLevel0: AccountCategoryId
  readonly toLevel0: AccountCategoryId
  readonly areaM2: number
}

export interface ChangesData {
  readonly municipalityNumber: string
  readonly municipalityName: string
  readonly status: 'available' | 'not_available'
  readonly period: string | null
  readonly source: ChangeSource | null
  readonly transitions: readonly ChangeArea[]
  readonly features: readonly ChangeFeature[]
}

export function unavailableChanges(
  municipalityNumber: string,
  municipalityName: string,
): ChangesData {
  return {
    municipalityNumber,
    municipalityName,
    status: 'not_available',
    period: null,
    source: null,
    transitions: [],
    features: [],
  }
}
