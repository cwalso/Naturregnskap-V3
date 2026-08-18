import { AccountSummary } from './AccountSummary'
import type { AccountOverviewData } from './model'

interface AccountOverviewProps {
  readonly data: AccountOverviewData
}

export function AccountOverview({ data }: AccountOverviewProps) {
  return (
    <section className="account-overview" aria-labelledby="account-overview-title">
      <header className="account-overview__header">
        <p className="account-overview__eyebrow">Overordnet arealoversikt</p>
        <h1 id="account-overview-title">{data.municipalityName} kommune</h1>
        <p>Her ser du en overordnet oversikt over arealene i kommunen. Kart og statistikk bygger på et felles datagrunnlag.</p>
      </header>
      <AccountSummary metrics={data.metrics} />
      <p className="account-overview__notice">Arealverdiene vises når en autoritativ analysekilde og beregningsmetode er koblet til.</p>
    </section>
  )
}
