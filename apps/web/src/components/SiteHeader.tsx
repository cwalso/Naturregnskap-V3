import type { ReactNode } from 'react'

import agencyLogo from '../assets/miljodirektoratet-logo-primary.svg'

export type SiteView =
  | 'oversikt'
  | 'naturtapet'
  | 'utforsk-naturen'
  | 'utforsk-i-kart'
  | 'tema-valued-nature'
  | 'tema-protected-areas'
  | 'tema-wild-reindeer-areas'
  | 'tema-infrastructure-free-nature'

interface SiteHeaderProps {
  readonly activeView?: SiteView
  readonly municipalityPicker?: ReactNode
  readonly onNavigate?: (view: SiteView) => void
}

const items: ReadonlyArray<{ view: SiteView; label: string }> = [
  { view: 'oversikt', label: 'Kommuneoversikt' },
  { view: 'naturtapet', label: 'Naturtapet' },
  { view: 'utforsk-naturen', label: 'Naturtema' },
  { view: 'utforsk-i-kart', label: 'Utforsk i kart' },
]

export function SiteHeader({
  activeView,
  municipalityPicker,
  onNavigate,
}: SiteHeaderProps) {
  const natureSectionActive = activeView === 'utforsk-naturen' || activeView?.startsWith('tema-')

  return (
    <header className="site-header">
      <div className="site-header__bar">
        <button
          type="button"
          className="site-header__brand"
          onClick={() => onNavigate?.('oversikt')}
          aria-label="Gå til kommuneoversikten"
        >
          <img className="site-header__logo" src={agencyLogo} alt="Miljødirektoratet" />
        </button>

        <span className="site-header__test" aria-label="Testversjon">★ TEST ★</span>

        <div className="site-header__utilities">
          {municipalityPicker && (
            <div className="site-header__municipality">
              <span className="site-header__municipality-label">Velg kommune:</span>
              {municipalityPicker}
            </div>
          )}

          {onNavigate && (
            <details className="site-menu">
              <summary aria-label="Åpne meny">
                <span aria-hidden="true">☰</span>
              </summary>
              <nav className="site-menu__panel" aria-label="Hovednavigasjon">
                {items.map((item) => (
                  <a
                    key={item.view}
                    href={`#${item.view}`}
                    aria-current={
                      activeView === item.view
                        || (item.view === 'utforsk-naturen' && natureSectionActive)
                        ? 'page'
                        : undefined
                    }
                    onClick={(event) => {
                      event.preventDefault()
                      onNavigate(item.view)
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </details>
          )}
        </div>
      </div>
    </header>
  )
}
