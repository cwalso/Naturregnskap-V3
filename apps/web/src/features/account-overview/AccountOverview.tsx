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
        <p>Her ser du den overordnede inndelingen av arealene i kommunen. Kartet viser foreløpig Grunnkart for arealanalyse; arealverdiene er ikke koblet til ennå.</p>
      </header>
      <AccountSummary metrics={data.metrics} />
      <p className="account-overview__notice">Arealverdier vises når analysekilde og beregningsmetode er avklart og koblet til løsningen.</p>
    </section>
  )
}
