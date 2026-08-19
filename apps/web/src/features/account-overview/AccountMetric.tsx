import { accountCategoryContent } from './content'
import type { AccountMetricData } from './model'

interface AccountMetricProps {
  readonly metric: AccountMetricData
}

const areaFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })

export function AccountMetric({ metric }: AccountMetricProps) {
  const content = accountCategoryContent[metric.id]
  const hasArea = metric.areaKm2 !== null

  return (
    <article className={`account-metric account-metric--${metric.id}`} data-category-id={metric.id}>
      <h2>{content.label}</h2>
      <p className="account-metric__value">
        {hasArea ? <>{areaFormatter.format(metric.areaKm2 * 1000)} <span>dekar</span></> : 'XX'}
      </p>
      <p className="account-metric__description">{content.description}</p>
    </article>
  )
}
