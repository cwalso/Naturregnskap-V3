import agencyLogo from '../assets/miljodirektoratet-logo-primary.svg'

interface SiteHeaderProps {
  readonly municipalityName?: string
}

const navigationItems = [
  { label: 'Oversikt', href: '#main-content', current: true },
  { label: 'Naturtapet', href: '#account-content', current: false },
  { label: 'Utforsk naturen', href: '#account-content', current: false },
  { label: 'Utforsk i kart', href: '#map-workspace', current: false },
] as const

export function SiteHeader({ municipalityName }: SiteHeaderProps) {
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
          <a href="#municipality-picker">Bytt kommune</a>
          <a href="#help">Hjelp og veileder</a>
        </div>
      </div>
      <nav className="primary-navigation" aria-label="Hovednavigasjon">
        <div className="primary-navigation__inner">
          {navigationItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              aria-current={item.current ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  )
}
