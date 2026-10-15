import { useId, useRef, useState, type ReactNode } from 'react'


export type SiteView =
  | 'oversikt'
  | 'naturtapet'
  | 'utforsk-naturen'
  | 'utforsk-i-kart'
  | 'tema-forest'
  | 'tema-vatmark'
  | 'tema-urban-nature'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const navigationId = useId()
  const menuButton = useRef<HTMLButtonElement>(null)

  return (
    <header className="site-header" onKeyDown={(event) => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
        menuButton.current?.focus()
      }
    }}>
      <div className="site-header__bar">
        <button
          type="button"
          className="site-header__brand"
          onClick={() => { setMenuOpen(false); onNavigate?.('oversikt') }}
          aria-label="Gå til kommuneoversikten"
        >
          <span className="site-header__brand-label">Kommunale naturregnskap</span>
        </button>

        <span className="site-header__test" role="note" aria-label="Testversjon">★ TEST ★</span>

        <div className="site-header__utilities">
          {municipalityPicker && (
            <div className="site-header__municipality">
              <span className="site-header__municipality-label">Velg kommune:</span>
              {municipalityPicker}
            </div>
          )}

          {onNavigate && (
            <button ref={menuButton} type="button" className="site-menu-toggle"
              aria-label={menuOpen ? 'Lukk meny' : 'Åpne meny'}
              aria-expanded={menuOpen} aria-controls={navigationId}
              onClick={() => setMenuOpen((open) => !open)}>
              <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
            </button>
          )}
        </div>
      </div>
      {onNavigate && (
        <nav id={navigationId} className={`site-navigation ${menuOpen ? 'is-open' : ''}`} aria-label="Hovednavigasjon">
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
                setMenuOpen(false)
                onNavigate(item.view)
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}
