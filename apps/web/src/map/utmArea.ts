import proj4 from 'proj4'
import { getMunicipalityBoundary, type MunicipalityBoundary } from '../api/municipalities'

const UTM33 = '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs +type=crs'
const municipalityFactors = new Map<string, Promise<number>>()

/** Convert projected EPSG:25833 square metres to terrain km² at the municipality midpoint. */
export function terrainAreaKm2(projectedSquareMeters: number, midpointEasting: number): number {
  if (!Number.isFinite(midpointEasting)) throw new Error('Mangler gyldig kommunemidtpunkt for arealkorreksjon')
  const k = .9996 * (1 + (midpointEasting - 500_000) ** 2 / (2 * 6_380_000 ** 2))
  return projectedSquareMeters / (k * k * 1_000_000)
}

export function municipalityAreaFactor(boundary: MunicipalityBoundary): number {
  let min = Infinity
  let max = -Infinity
  function visit(value: unknown) {
    if (!Array.isArray(value)) return
    if (typeof value[0] === 'number' && typeof value[1] === 'number') {
      const [x] = proj4('EPSG:4326', UTM33, [value[0], value[1]])
      min = Math.min(min, x)
      max = Math.max(max, x)
    } else value.forEach(visit)
  }
  visit(boundary.geometry.coordinates)
  return terrainAreaKm2(1_000_000, (min + max) / 2)
}

/** Shared boundary lookup: abort applies to each consumer, never to another consumer's request. */
export async function getMunicipalityAreaFactor(number: string, signal?: AbortSignal): Promise<number> {
  signal?.throwIfAborted()
  let request = municipalityFactors.get(number)
  if (!request) {
    request = getMunicipalityBoundary(number).then(municipalityAreaFactor).catch((error: unknown) => {
      if (municipalityFactors.get(number) === request) municipalityFactors.delete(number)
      throw error
    })
    municipalityFactors.set(number, request)
    if (municipalityFactors.size > 16) municipalityFactors.delete(municipalityFactors.keys().next().value!)
  }
  const factor = await request
  signal?.throwIfAborted()
  return factor
}
