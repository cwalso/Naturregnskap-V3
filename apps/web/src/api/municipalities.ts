import { buildApiUrl } from './url'

export interface Municipality {
  number: string
  name: string
}

export interface MunicipalityBoundary {
  type: 'Feature'
  geometry: GeoJSONGeometry
  properties: Municipality
}

interface GeoJSONGeometry {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: unknown[]
}

async function requestJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`Forespørselen feilet med HTTP ${response.status}`)
  }
  return response.json()
}

export async function getMunicipalities(signal?: AbortSignal): Promise<Municipality[]> {
  const data = await requestJson(buildApiUrl('/api/municipalities'), signal)
  if (!Array.isArray(data) || !data.every(isMunicipality)) {
    throw new Error('Kommunelisten returnerte et ugyldig svar')
  }
  return [...data].sort((a, b) => a.name.localeCompare(b.name, 'nb'))
}

export async function getMunicipalityBoundary(
  number: string,
  signal?: AbortSignal,
): Promise<MunicipalityBoundary> {
  const data = await requestJson(buildApiUrl(`/api/municipalities/${number}/boundary`), signal)
  if (!isBoundary(data)) {
    throw new Error('Kommunegrensen returnerte et ugyldig svar')
  }
  return data
}

function isMunicipality(value: unknown): value is Municipality {
  return typeof value === 'object' && value !== null &&
    'number' in value && typeof value.number === 'string' &&
    'name' in value && typeof value.name === 'string'
}

function isBoundary(value: unknown): value is MunicipalityBoundary {
  if (typeof value !== 'object' || value === null || !('type' in value) || value.type !== 'Feature' ||
      !('properties' in value) || !isMunicipality(value.properties) ||
      !('geometry' in value) || typeof value.geometry !== 'object' || value.geometry === null) return false
  const geometry = value.geometry
  return 'type' in geometry && (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') &&
    'coordinates' in geometry && Array.isArray(geometry.coordinates)
}
