import { accountCategoryContent } from './content'
import type { AccountMetricData } from './model'

interface AccountMetricProps {
  readonly metric: AccountMetricData
}

const areaFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })

const categoryImages = {
  nature: 'https://images.unsplash.com/photo-1763411892689-2acd58cd8ac1?auto=format&fit=crop&q=82&w=1400',
  agriculture: 'https://images.unsplash.com/photo-1672307737210-fe901d0fd798?auto=format&fit=crop&q=82&w=1400',
  built: 'https://images.unsplash.com/photo-1772325652571-f1406f80ee01?auto=format&fit=crop&q=82&w=1400',
} as const

export function AccountMetric({ metric }: AccountMetricProps) {
  const content = accountCategoryContent[metric.id]
  const hasArea = metric.areaKm2 !== null

  return (
    <article className={`account-metric account-metric--${metric.id}`} data-category-id={metric.id}>
      <div className="account-metric__visual">
        <img src={categoryImages[metric.id]} alt="" loading="lazy" />
      </div>
      <div className="account-metric__body">
        <h2>{content.label}</h2>
        <p className="account-metric__value">
          {hasArea ? <>{areaFormatter.format(metric.areaKm2 * 1000)} <span>dekar</span></> : 'Ikke tilgjengelig'}
        </p>
        <p className="account-metric__description">{content.description}</p>
      </div>
    </article>
  )
}
