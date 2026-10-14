import type { CSSProperties } from 'react'
import { formatDaa, periodLabel, summarizeLoss, valueOf, type Breakdown, type DataField, type HistoricalLossDataset, type LossPeriod, type LossSummary } from './model'
import './HistoricalLoss.css'

export function LossSourceLabel({ data }: { readonly data: HistoricalLossDataset }) {
  return <p className={`loss-source ${data.source.kind === 'demo' ? 'loss-source--demo' : ''}`}>{data.source.label}</p>
}
export function LossMetrics({ summary, compact = false }: { readonly summary: LossSummary; readonly compact?: boolean }) {
  const metrics = [['Nedbygd natur', summary.nature], ['Nedbygd jordbruk', summary.agriculture], ...(!compact ? [['Samlet nedbygging', summary.total]] : [])] as const
  return <dl className={`loss-metrics ${compact ? 'loss-metrics--compact' : ''}`} aria-label="Nøkkeltall for brutto nedbygging">
    {metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value === null ? 'Ikke tilgjengelig' : <>{formatDaa(value as number)} <span>dekar</span></>}</dd></div>)}
  </dl>
}
export function LossBreakdown({ field, denominator, name, compact = false }: { readonly field: DataField<Breakdown>; readonly denominator: number | null; readonly name: string; readonly compact?: boolean }) {
  if (field.status !== 'available') return <p className="loss-unavailable">{field.status === 'not-in-delivery' ? 'Inngår ikke i leveransen.' : 'Fordelingen er ikke tilgjengelig.'} {field.reason}</p>
  const categories = [...field.value.categories].sort((a, b) => b.areaDaa - a.areaDaa)
  const largest = Math.max(...categories.map(c => c.areaDaa), 1)
  return <>
    {field.value.coverage === 'partial' && <p>Fordelingen dekker bare deler av nedbyggingsarealet.</p>}
    <table className={`loss-breakdown ${compact ? 'loss-breakdown--compact' : ''}`} aria-label={name}>
      <thead><tr><th scope="col">Kategori</th><th scope="col">Dekar</th>{!compact && <th scope="col">Andel</th>}</tr></thead>
      <tbody>{categories.map(c => <tr key={c.id}><th scope="row">{c.label}</th><td><span className="loss-breakdown__track" aria-hidden="true"><i style={{ width: `${c.areaDaa / largest * 100}%` }} /></span><span>{formatDaa(c.areaDaa)}</span></td>{!compact && <td>{denominator !== null && denominator > 0 ? `${formatDaa(c.areaDaa / denominator * 100)} %` : '–'}</td>}</tr>)}</tbody>
    </table>
  </>
}
export function LossTimeline({ periods, sourceLabel }: { readonly periods: readonly LossPeriod[]; readonly sourceLabel: string }) {
  const largest = Math.max(...periods.flatMap(p => [valueOf(p.nature) ?? 0, valueOf(p.agriculture) ?? 0]), 1)
  return <>
    <figure className="loss-timeline">
      <div className="loss-timeline__legend"><span><i />Natur</span><span><i />Jordbruk</span></div>
      <div className="loss-timeline__chart" aria-hidden="true" style={{ '--period-count': periods.length } as CSSProperties}>
        {periods.map(p => <div className="loss-timeline__period" key={p.id}>
          <div className="loss-timeline__bars">{[p.nature, p.agriculture].map((field, index) => <span key={index} className={`loss-timeline__bar loss-timeline__bar--${index}`} style={{ '--amount': `${(valueOf(field) ?? 0) / largest * 100}%` } as CSSProperties}>{field.status !== 'available' && <span>–</span>}</span>)}</div>
          <span className="loss-timeline__year">{p.label}</span>
        </div>)}
      </div>
      <figcaption>{sourceLabel}. Brutto nedbygging per periode, i dekar. Lengste søyle: {formatDaa(largest)} dekar. Manglende verdi er merket med –.</figcaption>
    </figure>
    <details className="loss-table-details"><summary>Se tallene i tabell</summary>
      <table className="loss-time-table" aria-label={`Nedbygging per periode, ${periodLabel(periods)}`}><thead><tr><th scope="col">Periode</th><th scope="col">Natur (daa)</th><th scope="col">Jordbruk (daa)</th><th scope="col">Samlet (daa)</th></tr></thead>
        <tbody>{periods.map(p => { const s = summarizeLoss([p]); return <tr key={p.id}><th scope="row">{p.label}</th>{[s.nature, s.agriculture, s.total].map((v, i) => <td key={i}>{v === null ? 'Ikke tilgjengelig' : formatDaa(v)}</td>)}</tr> })}</tbody>
      </table>
    </details>
  </>
}
