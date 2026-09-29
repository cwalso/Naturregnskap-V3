import type { ReactNode } from 'react'
import type { SiteView } from '../components/SiteHeader'

interface OverviewPageProps {
  readonly municipalityName: string
  readonly accountContent: ReactNode
  readonly mapContent: ReactNode
  readonly onNavigate: (view: SiteView) => void
}

const nextSteps: ReadonlyArray<{
  view: SiteView
  eyebrow: string
  title: string
  text: string
  status: string
}> = [
  {
    view: 'naturtapet',
    eyebrow: 'Historisk endring',
    title: 'Se Naturtapet',
    text: 'Utforsk dokumentert nedbygging og naturtap når datagrunnlaget er tilgjengelig.',
    status: 'Datagrunnlag under avklaring',
  },
  {
    view: 'utforsk-naturen',
    eyebrow: 'Dagens natur',
    title: 'Utforsk naturen',
    text: 'Gå videre til mer detaljert naturinformasjon og supplerende temadata.',
    status: 'Struktur etablert',
  },
  {
    view: 'utforsk-i-kart',
    eyebrow: 'Kart',
    title: 'Utforsk i kart',
    text: 'Se det heldekkende kartgrunnlaget for kommunen og kommende faglag.',
    status: 'Kartgrunnlag tilgjengelig',
  },
]

export function OverviewPage({
  municipalityName,
  accountContent,
  mapContent,
  onNavigate,
}: OverviewPageProps) {
  return (
    <div className="account-workspace">
      <section className="overview-intro" aria-labelledby="overview-title">
        <p className="overview-intro__eyebrow">Kommunale naturregnskap</p>
        <h1 id="overview-title">Naturregnskap for {municipalityName}</h1>
        <p>
          Her får du en overordnet oversikt over hvordan kommunens areal fordeler
          seg mellom natur, jordbruksareal og bebygd areal. Første versjon skal
          først og fremst etablere et felles og etterprøvbart regnskapsgrunnlag.
        </p>
      </section>

      <section className="overview-context" aria-label="Hva denne oversikten viser">
        <div>
          <p className="overview-context__label">Dette er selve regnskapet</p>
          <h2>Heldekkende arealfordeling</h2>
          <p>
            Regnskapsgrunnlaget bygger på felles metode og heldekkende data.
            Supplerende temadata og videre analyse holdes tydelig adskilt.
          </p>
        </div>
        <div className="overview-context__fact">
          <span className="section-tag">Første versjon</span>
          <strong>Utbredelse / areal</strong>
          <span>Tilstand og økosystemtjenester er videreutvikling.</span>
        </div>
      </section>

      {accountContent}

      <section className="overview-next" aria-labelledby="overview-next-title">
        <div className="section-heading">
          <p className="section-heading__kicker">Gå videre</p>
          <h2 id="overview-next-title">Utforsk flere deler av kunnskapsgrunnlaget</h2>
          <p>
            De ulike visningene har ulike datagrunnlag og modenhet. Det skal være
            tydelig for brukeren hva som er regnskap, hva som er supplerende
            innsikt, og hva som fortsatt er under utvikling.
          </p>
        </div>

        <div className="journey-grid">
          {nextSteps.map((step) => (
            <button
              type="button"
              className="journey-card"
              key={step.view}
              onClick={() => onNavigate(step.view)}
            >
              <span className="journey-card__eyebrow">{step.eyebrow}</span>
              <strong>{step.title}</strong>
              <span>{step.text}</span>
              <span className="journey-card__status">{step.status}</span>
              <span className="journey-card__arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>

      {mapContent}
    </div>
  )
}
