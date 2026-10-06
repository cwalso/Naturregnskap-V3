import type {
  AccountCategoryId,
  AccountOverviewData,
} from '../features/account-overview/model'

const SSB_TABLE_URL = 'https://data.ssb.no/api/pxwebapi/v2/tables/09594/data'

const SSB_CLASSES: Record<AccountCategoryId, readonly string[]> = {
  built: ['01', '02', '03', '04', '05', '06', '07', '08-09', '10-11', '12-13', '14'],
  agriculture: ['15-16'],
  nature: ['17', '18', '19', '20', '21', '24'],
}

const FRESHWATER_CLASSES = ['22.01', '22.02'] as const
const REQUESTED_CLASSES = [
  ...SSB_CLASSES.built,
  ...SSB_CLASSES.agriculture,
  ...SSB_CLASSES.nature,
  ...FRESHWATER_CLASSES,
]

type CategoryIndex = string[] | Record<string, number>

export async function getAccountOverview(
  number: string,
  name: string,
  signal?: AbortSignal,
): Promise<AccountOverviewData> {
  const response = await fetch(buildSsbUrl(number), { signal })
  if (!response.ok) {
    throw new Error(`SSB-spørringen feilet med HTTP ${response.status}`)
  }

  const data: unknown = await response.json()
  return parseSsbAccountOverview(data, number, name)
}

function buildSsbUrl(number: string): string {
  const params = new URLSearchParams({
    lang: 'no',
    outputformat: 'json-stat2',
    'valueCodes[Region]': number,
    'valueCodes[ArealKlasse]': REQUESTED_CLASSES.join(','),
    'valueCodes[ContentsCode]': 'Areal',
    'valueCodes[Tid]': 'top(1)',
  })
  return `${SSB_TABLE_URL}?${params.toString()}`
}

function parseSsbAccountOverview(
  value: unknown,
  municipalityNumber: string,
  municipalityName: string,
): AccountOverviewData {
  if (typeof value !== 'object' || value === null) {
    throw new Error('SSB returnerte et ugyldig svar')
  }

  const root = value as Record<string, unknown>
  if (!Array.isArray(root.value) || typeof root.dimension !== 'object' || root.dimension === null) {
    throw new Error('SSB returnerte et ugyldig JSON-stat-svar')
  }

  const dimensions = root.dimension as Record<string, unknown>
  const areaIndex = readCategoryIndex(dimensions.ArealKlasse)
  const timeIndex = readCategoryIndex(dimensions.Tid)
  const period = firstCategoryCode(timeIndex)

  for (const code of REQUESTED_CLASSES) {
    if (categoryPosition(areaIndex, code) < 0) {
      throw new Error(`SSB-svaret mangler arealklasse ${code}`)
    }
  }

  const values = root.value
  const readArea = (code: string): number => {
    const raw = values[categoryPosition(areaIndex, code)]
    if (raw === null || raw === undefined) return 0
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
      throw new Error(`SSB returnerte ugyldig areal for klasse ${code}`)
    }
    return raw
  }

  const sum = (codes: readonly string[]) => codes.reduce((total, code) => total + readArea(code), 0)

  return {
    municipalityNumber,
    municipalityName,
    period,
    status: 'available',
    sourceKind: 'ssb-prototype',
    sourceName: 'SSB tabell 09594',
    sourceVersions: [period],
    methodVersion: 'ssb-09594-publicdemo-v1',
    methodStatus: 'prototype',
    metrics: [
      { id: 'nature', areaKm2: sum(SSB_CLASSES.nature), sharePercent: null },
      { id: 'agriculture', areaKm2: sum(SSB_CLASSES.agriculture), sharePercent: null },
      { id: 'built', areaKm2: sum(SSB_CLASSES.built), sharePercent: null },
    ],
    warnings: [
      'Prototypevisning basert på SSBs arealstatistikk. Ferskvann inngår ikke i de tre hovedkategoriene i denne grupperingen.',
      'Tallene er ikke det endelige Grunnkart-baserte regnskapsgrunnlaget for kommunale naturregnskap.',
    ],
  }
}

function readCategoryIndex(dimension: unknown): CategoryIndex {
  if (typeof dimension !== 'object' || dimension === null) {
    throw new Error('SSB-svaret mangler dimensjon')
  }
  const category = (dimension as Record<string, unknown>).category
  if (typeof category !== 'object' || category === null) {
    throw new Error('SSB-svaret mangler kategori')
  }
  const index = (category as Record<string, unknown>).index
  if (Array.isArray(index) && index.every((item) => typeof item === 'string')) {
    return index
  }
  if (
    typeof index === 'object'
    && index !== null
    && Object.values(index).every((item) => typeof item === 'number')
  ) {
    return index as Record<string, number>
  }
  throw new Error('SSB-svaret har ugyldig kategoriindeks')
}

function categoryPosition(index: CategoryIndex, code: string): number {
  if (Array.isArray(index)) return index.indexOf(code)
  const position = index[code]
  return typeof position === 'number' ? position : -1
}

function firstCategoryCode(index: CategoryIndex): string {
  if (Array.isArray(index)) {
    if (!index.length) throw new Error('SSB-svaret mangler år')
    return index[0]
  }

  const first = Object.entries(index).sort((a, b) => a[1] - b[1])[0]
  if (!first) throw new Error('SSB-svaret mangler år')
  return first[0]
}
