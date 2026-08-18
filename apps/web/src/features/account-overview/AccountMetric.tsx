import { accountCategoryContent } from './content'
import type { AccountMetricData } from './model'

interface AccountMetricProps {
  readonly metric: AccountMetricData
}

const areaFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 })

export function AccountMetric({ metric }: AccountMetricProps) {
  const content = accountCategoryContent[metric.id]
  const hasArea = metric.status === 'available' && metric.areaKm2 !== null

  return (
    <article className={`account-metric account-metric--${metric.id}`} data-category-id={metric.id}>
      <h2>{content.label}</h2>
      <p className="account-metric__value">
        {hasArea ? <>{areaFormatter.format(metric.areaKm2)} <span>km²</span></> : '—'}
      </p>
      <p className="account-metric__status">
        {hasArea ? (metric.sharePercent === null ? 'Beregnet areal' : `${areaFormatter.format(metric.sharePercent)} % av landarealet`) : 'Ikke beregnet ennå'}
      </p>
      <p className="account-metric__description">{content.description}</p>
    </article>
  )
}
