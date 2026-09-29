import agencyLogo from '../assets/miljodirektoratet-logo-primary.svg'

export type SiteView = 'oversikt' | 'naturtapet' | 'utforsk-naturen' | 'utforsk-i-kart'

interface SiteHeaderProps {
  readonly municipalityName?: string
  readonly activeView: SiteView
  readonly onNavigate(view: SiteView): void
  readonly onChangeMunicipality(): void
}

const navigationItems: ReadonlyArray<{ label: string; view: SiteView }> = [
  { label: 'Oversikt', view: 'oversikt' },
  { label: 'Naturtapet', view: 'naturtapet' },
  { label: 'Utforsk naturen', view: 'utforsk-naturen' },
  { label: 'Utforsk i kart', view: 'utforsk-i-kart' },
]

export function SiteHeader({
  municipalityName,
  activeView,
  onNavigate,
  onChangeMunicipality,
}: SiteHeaderProps) {
  const productName = municipalityName
    ? `Naturregnskap for ${municipalityName}`
    : 'Naturregnskap for din kommune'

  return (
    <header className="site-header">
      <div className="site-header__bar">
        <div className="site-header__identity">
          <span className="site-header__logo-surface">
            <img className="site-header__logo" src={agencyLogo} alt="Miljødirektoratet" />
          </span>
          <p className="site-header__product">{productName}</p>
        </div>
        <div className="site-header__actions" aria-label="Tjenestehandlinger">
          <button type="button" className="site-header__action" onClick={onChangeMunicipality}>Bytt kommune</button>
          <a href="#help">Hjelp og veileder</a>
        </div>
      </div>
      <nav className="primary-navigation" aria-label="Hovednavigasjon">
        <div className="primary-navigation__inner">
          {navigationItems.map((item) => (
            <a
              key={item.view}
              href={`#${item.view}`}
              aria-current={activeView === item.view ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault()
                onNavigate(item.view)
              }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  )
}
