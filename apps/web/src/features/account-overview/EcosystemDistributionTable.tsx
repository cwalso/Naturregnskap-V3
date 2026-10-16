import type { EcosystemStatistics } from '../../api/ecosystemStatistics'

const area = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })
const percent = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })

/** Existing stock statistics and formatting, shared by Naturtema and Myr/våtmark. */
export function EcosystemDistributionTable({ statistics, state, municipalityNumber, selectedId }: {
  statistics?: EcosystemStatistics | null
  state: 'idle' | 'loading' | 'error'
  municipalityNumber?: string
  selectedId?: string
}) {
  const active = statistics?.municipalityNumber === municipalityNumber ? statistics : null
  if (state === 'loading') return <p role="status">Laster økosystemfordeling…</p>
  if (state === 'error') return <p role="alert">Økosystemfordelingen kunne ikke hentes. Dette betyr ikke at natur mangler.</p>
  if (!active || active.status === 'not_available') return <p role="status">{active?.status === 'not_available' ? active.reason : 'Økosystemfordelingen er ikke klargjort for kommunen.'}</p>
  return <table className="thematic-nature-table ecosystem-type-table" aria-label="Fordeling av dagens natur etter økosystemtype" data-method={active.methodVersion}>
    <thead><tr><th scope="col">Økosystemtype</th><th scope="col">Areal</th><th scope="col">Andel av natur</th></tr></thead>
    <tbody>{active.metrics.filter(item => item.areaKm2 > 0).sort((a,b) => b.areaKm2-a.areaKm2).map(item => <tr key={item.id} className={item.id === selectedId ? 'is-active' : undefined}>
      <th scope="row">{item.label}</th><td>{area.format(item.areaKm2 * 1000)} dekar</td><td>{percent.format(item.shareOfNaturePercent)} %</td>
    </tr>)}</tbody>
  </table>
}
