import { validateHistoricalLoss, type HistoricalLossDataset } from './model'

/** Supply a mapping only after SSB's columns, units, periods and classification
 * are confirmed. No endpoint, table ID or assumed SSB payload is defined here. */
export type SsbLossMapping = (delivery: unknown) => HistoricalLossDataset
export function adaptSsbHistoricalLoss(delivery: unknown, mapConfirmedDelivery: SsbLossMapping): HistoricalLossDataset {
  const mapped = mapConfirmedDelivery(delivery)
  if (mapped.source.kind !== 'official') throw new Error('SSB-adapteren krever en dokumentert offisiell kilde.')
  return validateHistoricalLoss(mapped)
}
