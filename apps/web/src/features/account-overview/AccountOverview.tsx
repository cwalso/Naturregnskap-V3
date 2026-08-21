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
        <p className="account-overview__eyebrow">Arealbalanse {data.period}</p>
        <h1 id="account-overview-title">{data.municipalityName} kommune</h1>
        <p>Beholdning på overordnet nivå 0, basert på klargjort Grunnkart for arealanalyse.</p>
      </header>
      <AccountSummary metrics={data.metrics} />
      <AccountProvenance content={getAccountProvenanceContent(data)} />
      {data.status === 'not_available' && <p className="account-overview__notice">Data er foreløpig ikke tilgjengelig for denne kommunen i prototypen.</p>}
    </section>
  )
}
