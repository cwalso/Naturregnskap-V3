const KARTVERKET_BASE_URL = 'https://api.kartverket.no/kommuneinfo/v1'

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

interface KartverketMunicipality {
  kommunenummer: string
  kommunenavnNorsk: string
}

interface KartverketBoundary {
  kommunenummer: string
  kommunenavn: string
  omrade: GeoJSONGeometry
}

async function requestJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`Forespørselen feilet med HTTP ${response.status}`)
  }
  return response.json()
}

export async function getMunicipalities(signal?: AbortSignal): Promise<Municipality[]> {
  const data = await requestJson(`${KARTVERKET_BASE_URL}/kommuner`, signal)
  if (!Array.isArray(data) || !data.every(isKartverketMunicipality)) {
    throw new Error('Kommunelisten fra Kartverket returnerte et ugyldig svar')
  }

  return data
    .map((item) => ({ number: item.kommunenummer, name: item.kommunenavnNorsk }))
    .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
}

export async function getMunicipalityBoundary(
  number: string,
  signal?: AbortSignal,
): Promise<MunicipalityBoundary> {
  const data = await requestJson(
    `${KARTVERKET_BASE_URL}/kommuner/${number}/omrade`,
    signal,
  )
  if (!isKartverketBoundary(data)) {
    throw new Error('Kommunegrensen fra Kartverket returnerte et ugyldig svar')
  }

  return {
    type: 'Feature',
    geometry: data.omrade,
    properties: {
      number: data.kommunenummer,
      name: data.kommunenavn,
    },
  }
}

function isKartverketMunicipality(value: unknown): value is KartverketMunicipality {
  return typeof value === 'object' && value !== null
    && 'kommunenummer' in value && typeof value.kommunenummer === 'string'
    && 'kommunenavnNorsk' in value && typeof value.kommunenavnNorsk === 'string'
}

function isGeometry(value: unknown): value is GeoJSONGeometry {
  return typeof value === 'object' && value !== null
    && 'type' in value && (value.type === 'Polygon' || value.type === 'MultiPolygon')
    && 'coordinates' in value && Array.isArray(value.coordinates)
}

function isKartverketBoundary(value: unknown): value is KartverketBoundary {
  return typeof value === 'object' && value !== null
    && 'kommunenummer' in value && typeof value.kommunenummer === 'string'
    && 'kommunenavn' in value && typeof value.kommunenavn === 'string'
    && 'omrade' in value && isGeometry(value.omrade)
}
