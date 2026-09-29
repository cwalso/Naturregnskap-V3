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
        <p className="account-overview__eyebrow">Arealbasert naturregnskap · {data.period}</p>
        <h2 id="account-overview-title">Hvor mye natur har {data.municipalityName}?</h2>
        <p>
          Kommunens areal er her gruppert i tre overordnede kategorier:
          Natur, Dyrket mark og Bebygd. Tallene bygger på samme heldekkende
          regnskapsgrunnlag.
        </p>
      </header>
      <AccountSummary metrics={data.metrics} />
      <AccountProvenance content={getAccountProvenanceContent(data)} />
      {data.status === 'not_available' && <p className="account-overview__notice">Data er foreløpig ikke tilgjengelig for denne kommunen i prototypen.</p>}
    </section>
  )
}
