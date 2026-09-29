import type { ReactNode } from 'react'
import type { SiteView } from '../components/SiteHeader'

interface OverviewPageProps {
  readonly municipalityName: string
  readonly accountContent: ReactNode
  readonly distributionContent: ReactNode
  readonly mapContent: ReactNode
  readonly onNavigate: (view: SiteView) => void
}

const nextSteps: ReadonlyArray<{
  view: SiteView
  eyebrow: string
  title: string
  text: string
}> = [
  {
    view: 'naturtapet',
    eyebrow: 'Historisk endring',
    title: 'Hva har gått tapt?',
    text: 'Se dokumentert nedbygging og naturtap når datagrunnlaget er tilgjengelig.',
  },
  {
    view: 'utforsk-naturen',
    eyebrow: 'Dagens natur',
    title: 'Hva slags natur har vi?',
    text: 'Gå fra den overordnede arealfordelingen til mer detaljert naturinformasjon og supplerende temadata.',
  },
  {
    view: 'utforsk-i-kart',
    eyebrow: 'Kart',
    title: 'Hvor ligger arealene?',
    text: 'Se regnskapsgrunnlaget og supplerende faglag geografisk.',
  },
]

export function OverviewPage({
  municipalityName,
  accountContent,
  distributionContent,
  mapContent,
  onNavigate,
}: OverviewPageProps) {
  return (
    <div className="account-workspace">
      {accountContent}

      <div className="overview-dashboard-grid">
        {distributionContent}
        {mapContent}
      </div>

      <section className="overview-next" aria-labelledby="overview-next-title">
        <div className="section-heading">
          <p className="section-heading__kicker">Neste i fortellingen</p>
          <h2 id="overview-next-title">Hva vil du vite videre?</h2>
          <p>
            Arealfordelingen er utgangspunktet. Derfra kan du se på endring over
            tid, utforske hva slags natur kommunen har, eller gå til kartet.
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
              <span className="journey-card__arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>

    </div>
  )
}
