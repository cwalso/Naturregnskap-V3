// Internal presentation contract. This is not a contract for an SSB API.
export type DataField<T> = { readonly status: 'available'; readonly value: T }
  | { readonly status: 'missing' | 'not-in-delivery'; readonly reason: string }
export const available = <T,>(value: T): DataField<T> => ({ status: 'available', value })
export const valueOf = <T,>(field: DataField<T>): T | null => field.status === 'available' ? field.value : null
export interface Breakdown {
  readonly coverage: 'complete' | 'partial'
  readonly categories: readonly { readonly id: string; readonly label: string; readonly areaDaa: number }[]
}
export interface LossPeriod {
  readonly id: string
  readonly label: string
  readonly start: string
  readonly end: string
  readonly nature: DataField<number>
  readonly agriculture: DataField<number>
  readonly ecosystems: DataField<Breakdown>
  readonly destinations: DataField<Breakdown>
}
export interface HistoricalLossDataset {
  readonly municipalityNumber: string
  readonly municipalityName: string
  readonly measure: 'gross-development'
  readonly unit: 'daa'
  readonly source: { readonly kind: 'demo' | 'official'; readonly label: string; readonly version: string; readonly classificationNote: string }
  readonly periods: readonly LossPeriod[]
}
export interface LossSummary {
  readonly nature: number | null
  readonly agriculture: number | null
  readonly total: number | null
  readonly ecosystems: DataField<Breakdown>
  readonly destinations: DataField<Breakdown>
}
const sum = (values: readonly (number | null)[]) => values.length > 0 && values.every(v => v !== null) ? values.reduce<number>((n, v) => n + v!, 0) : null
function combine(fields: readonly DataField<Breakdown>[]): DataField<Breakdown> {
  const unavailable = fields.find(field => field.status !== 'available')
  if (unavailable) return unavailable
  if (!fields.length) return { status: 'missing', reason: 'Ingen perioder er valgt.' }
  const categories = new Map<string, { id: string; label: string; areaDaa: number }>()
  for (const field of fields) if (field.status === 'available') for (const item of field.value.categories) {
    const previous = categories.get(item.id)
    categories.set(item.id, { ...item, areaDaa: (previous?.areaDaa ?? 0) + item.areaDaa })
  }
  return available({ coverage: fields.some(field => field.status === 'available' && field.value.coverage === 'partial') ? 'partial' : 'complete', categories: [...categories.values()].sort((a, b) => b.areaDaa - a.areaDaa) })
}
export function summarizeLoss(periods: readonly LossPeriod[]): LossSummary {
  const nature = sum(periods.map(p => valueOf(p.nature))), agriculture = sum(periods.map(p => valueOf(p.agriculture)))
  return { nature, agriculture, total: nature !== null && agriculture !== null ? nature + agriculture : null, ecosystems: combine(periods.map(p => p.ecosystems)), destinations: combine(periods.map(p => p.destinations)) }
}
export function validateHistoricalLoss(data: HistoricalLossDataset): HistoricalLossDataset {
  if (data.measure !== 'gross-development' || data.unit !== 'daa') throw new Error('Ukjent mål eller arealenhet.')
  const ids = new Set<string>(), labels = new Map<string, string>()
  let end = ''
  for (const period of data.periods) {
    if (ids.has(period.id) || !period.label || !/^\d{4}-\d{2}-\d{2}$/.test(period.start) || !/^\d{4}-\d{2}-\d{2}$/.test(period.end) || !Number.isFinite(Date.parse(period.start)) || !Number.isFinite(Date.parse(period.end)) || period.start > period.end || period.start <= end) throw new Error('Periodene må være unike, sorterte og uten overlapp.')
    ids.add(period.id); end = period.end
    for (const amount of [period.nature, period.agriculture]) if (amount.status === 'available' && (!Number.isFinite(amount.value) || amount.value < 0)) throw new Error('Ugyldig nedbyggingsareal.')
    for (const [name, field, denominator] of [['ecosystems', period.ecosystems, valueOf(period.nature)], ['destinations', period.destinations, summarizeLoss([period]).total]] as const) {
      if (field.status !== 'available') continue
      const categoryIds = new Set<string>()
      for (const category of field.value.categories) {
        const key = `${name}:${category.id}`
        if (!category.id || !category.label || categoryIds.has(category.id) || !Number.isFinite(category.areaDaa) || category.areaDaa < 0 || (labels.has(key) && labels.get(key) !== category.label)) throw new Error('Ugyldig eller motstridende kategori.')
        categoryIds.add(category.id); labels.set(key, category.label)
      }
      const area = field.value.categories.reduce((n, c) => n + c.areaDaa, 0)
      if (denominator !== null && (area > denominator + 1e-6 || (field.value.coverage === 'complete' && Math.abs(area - denominator) > 1e-6))) throw new Error('Fordelingen stemmer ikke med nedbyggingsarealet.')
    }
  }
  return data
}
export const formatDaa = (value: number) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 }).format(value)
export const periodLabel = (periods: readonly LossPeriod[]) => !periods.length ? 'Ingen periode' : periods.length === 1 ? periods[0].label : `${periods[0].label}–${periods.at(-1)!.label}`
