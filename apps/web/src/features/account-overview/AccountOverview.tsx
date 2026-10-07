import { AccountSummary } from './AccountSummary'
import type { AccountOverviewData } from './model'

interface AccountOverviewProps {
  readonly data: AccountOverviewData
}

export function AccountOverview({ data }: AccountOverviewProps) {
  const ssbPrototype = data.sourceKind === 'ssb-prototype'

  return (
    <section className="account-overview" aria-labelledby="account-overview-title">
      <header className="account-overview__header">
        <h1 id="account-overview-title">Naturregnskap for {data.municipalityName}</h1>
        <p className="account-overview__meta">
          {ssbPrototype
            ? `Prototypevisning · SSB ${data.period}`
            : `Arealbasert naturregnskap · ${data.period}`}
        </p>
      </header>

      {data.status === 'available' ? (
        <AccountSummary metrics={data.metrics} />
      ) : (
        <div className="account-overview__unavailable" role="status">
          <strong>Regnskapstall er ikke klargjort for {data.municipalityName} i prototypen ennå.</strong>
          <span>
            Vi viser ikke eksempelverdier eller nuller når et etterprøvbart resultat mangler.
          </span>
        </div>
      )}
    </section>
  )
}
