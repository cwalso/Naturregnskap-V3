import type { ReactNode } from 'react'
import type { SiteView } from '../components/SiteHeader'

interface OverviewPageProps {
  readonly accountContent: ReactNode
  readonly provenanceContent: ReactNode
  readonly municipalityName: string
  readonly onNavigate: (view: SiteView) => void
}

export function OverviewPage({
  accountContent,
  provenanceContent,
  municipalityName,
  onNavigate,
}: OverviewPageProps) {
  return (
    <div className="account-workspace overview-sketch">
      {accountContent}

      <div className="overview-sketch__actions" aria-label="Videre utforsking">
        <button type="button" onClick={() => onNavigate('utforsk-naturen')}>
          Se statistikk for naturen i {municipalityName}
          <span aria-hidden="true">›</span>
        </button>
        <button type="button" onClick={() => onNavigate('utforsk-i-kart')}>
          Se naturen i {municipalityName} i kart
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <section className="overview-sketch__status" aria-label="Status og utvikling">
        <button
          type="button"
          className="overview-status-card"
          onClick={() => onNavigate('naturtapet')}
        >
          <span className="overview-status-card__heading">
            <strong>Naturtap</strong>
            <span>2017–2026</span>
          </span>
          <span className="overview-status-card__value">XX</span>
          <span className="overview-status-card__meta">
            Åpne siden for dokumentert nedbygging og metode.
          </span>
        </button>

        <article className="overview-status-card">
          <span className="overview-status-card__heading">
            <strong>Kartleggingsgrad</strong>
            <span>2025</span>
          </span>
          <span className="overview-status-card__value">–</span>
          <span className="overview-status-card__meta">
            Kommunevis kartleggingsgrad er ikke beregnet i prototypen ennå.
          </span>
        </article>
      </section>

      <div className="overview-sketch__provenance">
        {provenanceContent}
      </div>
    </div>
  )
}
