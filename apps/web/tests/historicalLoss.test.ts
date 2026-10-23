import { expect, it } from 'vitest'
import { getHistoricalLossData, trondheimLossDemo as demo } from '../src/features/historical-loss/demoSource'
import { available, summarizeLoss, validateHistoricalLoss, type HistoricalLossDataset } from '../src/features/historical-loss/model'
import { adaptSsbHistoricalLoss } from '../src/features/historical-loss/ssbAdapter'

it('keeps annual, ecosystem and destination sums consistent without nature/agriculture double counting', () => {
  const result = summarizeLoss(demo.periods)
  expect(result).toMatchObject({ nature: 1280, agriculture: 320, total: 1600 })
  expect(result.ecosystems.status === 'available' && result.ecosystems.value.categories.reduce((n,c) => n+c.areaDaa,0)).toBeCloseTo(1280)
  expect(result.destinations.status === 'available' && result.destinations.value.categories.reduce((n,c) => n+c.areaDaa,0)).toBeCloseTo(1600)
  expect(demo.periods).toHaveLength(10)
  expect(summarizeLoss(demo.periods.slice(0, 2))).toMatchObject({ nature: 205, agriculture: 55, total: 260 })
  expect(getHistoricalLossData('0301')).toBeNull()
})
it('supports unknown categories, multi-year periods and absent delivery variables without converting missing to zero', () => {
  const missing = { status: 'missing', reason: 'Suppressed' } as const
  const notDelivered = { status: 'not-in-delivery', reason: 'No variable' } as const
  const custom: HistoricalLossDataset = { ...demo, periods: [{ ...demo.periods[0], id: 'custom', label: '2000–2005', start: '2000-01-01', end: '2005-12-31', nature: available(0), agriculture: missing, ecosystems: available({ coverage: 'complete', categories: [{ id: 'unknown', label: 'Ny kildekategori', areaDaa: 0 }] }), destinations: notDelivered }] }
  expect(validateHistoricalLoss(custom)).toBe(custom)
  expect(summarizeLoss(custom.periods)).toMatchObject({ nature: 0, agriculture: null, total: null, destinations: notDelivered })
  expect(summarizeLoss([])).toMatchObject({ nature: null, agriculture: null, total: null })
  expect(summarizeLoss([demo.periods[0], { ...demo.periods[1], nature: missing, ecosystems: missing }])).toMatchObject({ nature: null, total: null, ecosystems: missing })
})
it('rejects overlapping periods, conflicting category labels and broken complete sums', () => {
  expect(() => validateHistoricalLoss({ ...demo, periods: [demo.periods[0], demo.periods[0]] })).toThrow(/Periodene/)
  expect(() => validateHistoricalLoss({ ...demo, periods: [{ ...demo.periods[0], nature: available(-1) }] })).toThrow(/Ugyldig/)
  expect(() => validateHistoricalLoss({ ...demo, periods: [{ ...demo.periods[0], nature: available(10) }] })).toThrow(/Fordelingen/)
  expect(() => validateHistoricalLoss({ ...demo, periods: [demo.periods[0], { ...demo.periods[1], ecosystems: available({ coverage: 'partial', categories: [{ id: 'forest', label: 'Annen betydning', areaDaa: 1 }] }) }] })).toThrow(/motstridende/)
})
it('requires a supplied, confirmed mapping and official provenance for an SSB delivery', () => {
  expect(() => adaptSsbHistoricalLoss({}, () => demo)).toThrow(/offisiell/)
  const rawDelivery = Symbol('unknown delivery shape')
  const mapped = adaptSsbHistoricalLoss(rawDelivery, input => {
    expect(input).toBe(rawDelivery)
    return { ...demo, source: { ...demo.source, kind: 'official', label: 'Confirmed source' } }
  })
  expect(mapped.source.kind).toBe('official')
})
