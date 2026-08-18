import { AccountMetric } from './AccountMetric'
import type { AccountMetricData } from './model'

interface AccountSummaryProps {
  readonly metrics: readonly AccountMetricData[]
}

export function AccountSummary({ metrics }: AccountSummaryProps) {
  return <div className="account-summary">{metrics.map((metric) => <AccountMetric key={metric.id} metric={metric} />)}</div>
}
