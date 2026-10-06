import { accountCategoryContent } from './content'
import type { AccountCategoryId, AccountMetricData } from './model'

interface AccountMetricProps {
  readonly metric: AccountMetricData
}

const areaFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })

function CategoryIcon({ id }: { readonly id: AccountCategoryId }) {
  if (id === 'nature') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 4c-4 0-7 3-7 7 0 .7.1 1.3.3 1.9A6.5 6.5 0 0 0 11 26h4v3h2v-3h4a6.5 6.5 0 0 0 1.7-12.8A7 7 0 0 0 16 4Z" fill="currentColor"/>
      </svg>
    )
  }
  if (id === 'agriculture') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 27V13M16 18c-5 0-8-3-8-8 5 0 8 3 8 8Zm0 3c5 0 8-3 8-8-5 0-8 3-8 8ZM16 13c-4 0-6-3-6-7 4 0 6 3 6 7Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="m5 15 11-9 11 9v12H5V15Zm5 12v-8h6v8m4-8h3v4h-3v-4Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function AccountMetric({ metric }: AccountMetricProps) {
  const content = accountCategoryContent[metric.id]
  const hasArea = metric.areaKm2 !== null

  return (
    <article className={`account-metric account-metric--${metric.id}`} data-category-id={metric.id}>
      <div className="account-metric__icon"><CategoryIcon id={metric.id} /></div>
      <h2>{content.label}</h2>
      <p className="account-metric__value">
        {hasArea ? <>{areaFormatter.format(metric.areaKm2 * 1000)} <span>dekar</span></> : 'XX'}
      </p>
      <p className="account-metric__description">{content.description}</p>
    </article>
  )
}
