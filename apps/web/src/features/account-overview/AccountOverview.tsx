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
        <p className="account-overview__eyebrow">
          {ssbPrototype ? `Prototypevisning · SSB ${data.period}` : `Arealbasert naturregnskap · ${data.period}`}
        </p>
        <h2 id="account-overview-title">Hvor mye natur har {data.municipalityName}?</h2>
        {ssbPrototype ? (
          <p>
            For å gjøre prototypen testbar viser vi foreløpig kommunens landareal
            gruppert i Natur, Dyrket mark og Bebygd med SSB tabell 09594.
            Ferskvann inngår ikke i disse tre tallene. Dette er ikke det endelige
            Grunnkart-baserte regnskapsgrunnlaget.
          </p>
        ) : (
          <p>
            Kommunens areal er her gruppert i tre overordnede kategorier:
            Natur, Dyrket mark og Bebygd. Tallene bygger på samme heldekkende
            regnskapsgrunnlag.
          </p>
        )}
      </header>
      {data.status === 'available' ? (
        <AccountSummary metrics={data.metrics} />
      ) : (
        <div className="account-overview__unavailable" role="status">
          <strong>Regnskapstall er ikke klargjort for {data.municipalityName} i prototypen ennå.</strong>
          <span>
            Vi viser ikke eksempelverdier eller nuller når et etterprøvbart Level0-resultat mangler.
          </span>
        </div>
      )}
    </section>
  )
}
