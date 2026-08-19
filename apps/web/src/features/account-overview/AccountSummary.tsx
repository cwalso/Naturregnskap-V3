import { AccountMetric } from './AccountMetric'
import type { AccountMetricData } from './model'

interface AccountSummaryProps {
  readonly metrics: readonly AccountMetricData[]
}

export function AccountSummary({ metrics }: AccountSummaryProps) {
  const orderedMetrics = ['nature', 'agriculture', 'built'].map((id) =>
    metrics.find((metric) => metric.id === id),
  ).filter((metric): metric is AccountMetricData => metric !== undefined)
  return <div className="account-summary">{orderedMetrics.map((metric) => <AccountMetric key={metric.id} metric={metric} />)}</div>
}
