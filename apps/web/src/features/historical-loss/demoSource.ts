import { available, validateHistoricalLoss, type Breakdown, type HistoricalLossDataset } from './model'

export const demoLabel = 'Demodata – illustrasjon, ikke offisiell statistikk'
const nature = [95, 110, 125, 100, 130, 155, 140, 120, 150, 155]
const agriculture = [25, 30, 35, 20, 30, 40, 35, 25, 40, 40]
const distribute = (total: number, categories: readonly [string, string, number][]): Breakdown => ({ coverage: 'complete', categories: categories.map(([id, label, percent]) => ({ id, label, areaDaa: total * percent / 100 })) })

export const trondheimLossDemo: HistoricalLossDataset = validateHistoricalLoss({
  municipalityNumber: '5001', municipalityName: 'Trondheim', measure: 'gross-development', unit: 'daa',
  source: { kind: 'demo', label: demoLabel, version: 'historical-loss-demo-v1', classificationNote: 'Økosystemtyper og etterfølgende arealbruk er illustrative kategorier. SSBs endelige klassifikasjon er ikke avklart.' },
  periods: nature.map((area, index) => {
    const year = 2016 + index, total = area + agriculture[index]
    return { id: String(year), label: String(year), start: `${year}-01-01`, end: `${year}-12-31`, nature: available(area), agriculture: available(agriculture[index]),
      ecosystems: available(distribute(area, [['forest', 'Skog', 60], ['wetland', 'Våtmark', 18], ['heath', 'Hei og buskmark', 12], ['sparse', 'Lite vegetert mark', 8], ['coast', 'Kyststrender, svaberg og dyner', 2]])),
      destinations: available(distribute(total, [['housing', 'Boliger', 45], ['transport', 'Veier og transport', 25], ['business', 'Næring', 20], ['other', 'Andre utbyggingsformål', 10]])),
    }
  }),
})
// No fallback to Trondheim when another municipality is selected.
export function getHistoricalLossData(municipalityNumber: string): HistoricalLossDataset | null {
  return municipalityNumber === trondheimLossDemo.municipalityNumber ? trondheimLossDemo : null
}
