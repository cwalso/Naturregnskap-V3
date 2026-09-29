import { AccountSummary } from './AccountSummary'
import { AccountProvenance } from './AccountProvenance'
import { getAccountProvenanceContent } from './content'
import type { AccountOverviewData } from './model'

interface AccountOverviewProps {
  readonly data: AccountOverviewData
}

export function AccountOverview({ data }: AccountOverviewProps) {
  return (
    <section className="account-overview" aria-labelledby="account-overview-title">
      <header className="account-overview__header">
        <p className="account-overview__eyebrow">Arealregnskap {data.period}</p>
        <h2 id="account-overview-title">Overordnet arealfordeling</h2>
        <p>Fordelingen viser natur, jordbruksareal og bebygd areal på et overordnet nivå, basert på heldekkende regnskapsgrunnlag.</p>
      </header>
      <AccountSummary metrics={data.metrics} />
      <AccountProvenance content={getAccountProvenanceContent(data)} />
      {data.status === 'not_available' && <p className="account-overview__notice">Data er foreløpig ikke tilgjengelig for denne kommunen i prototypen.</p>}
    </section>
  )
}
