import { getAccountOverview } from '../api/accountOverview'
import {
  getMunicipalityBoundary,
  type MunicipalityBoundary,
} from '../api/municipalities'
import {
  getThematicCoverage,
  type ThematicCoverageResponse,
} from '../api/thematicCoverage'
import type { AccountOverviewData } from '../features/account-overview/model'

type Loader<T> = () => Promise<T>

function cached<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  loader: Loader<T>,
): Promise<T> {
  const existing = cache.get(key)
  if (existing) return existing

  const request = loader().catch((error: unknown) => {
    cache.delete(key)
    throw error
  })
  cache.set(key, request)
  return request
}

const boundaryCache = new Map<string, Promise<MunicipalityBoundary>>()
const accountCache = new Map<string, Promise<AccountOverviewData>>()
const thematicCache = new Map<string, Promise<ThematicCoverageResponse>>()

export function loadMunicipalityBoundary(
  municipalityNumber: string,
): Promise<MunicipalityBoundary> {
  return cached(
    boundaryCache,
    municipalityNumber,
    () => getMunicipalityBoundary(municipalityNumber),
  )
}

export function loadMunicipalityAccount(
  municipalityNumber: string,
  municipalityName: string,
): Promise<AccountOverviewData> {
  return cached(
    accountCache,
    municipalityNumber,
    () => getAccountOverview(municipalityNumber, municipalityName),
  )
}

export function loadMunicipalityThematicCoverage(
  municipalityNumber: string,
): Promise<ThematicCoverageResponse> {
  return cached(
    thematicCache,
    municipalityNumber,
    async () => {
      const response = await getThematicCoverage(municipalityNumber)
      if (response.results.some((item) => item.status === 'unavailable')) {
        thematicCache.delete(municipalityNumber)
      }
      return response
    },
  )
}

export function clearMunicipalityDataCache(
  municipalityNumber?: string,
): void {
  if (!municipalityNumber) {
    boundaryCache.clear()
    accountCache.clear()
    thematicCache.clear()
    return
  }

  boundaryCache.delete(municipalityNumber)
  accountCache.delete(municipalityNumber)
  thematicCache.delete(municipalityNumber)
}
