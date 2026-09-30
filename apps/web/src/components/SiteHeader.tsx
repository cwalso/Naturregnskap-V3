import agencyLogo from '../assets/miljodirektoratet-logo-primary.svg'

export type SiteView = 'oversikt' | 'naturtapet' | 'utforsk-naturen' | 'utforsk-i-kart'

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__bar">
        <div className="site-header__identity">
          <span className="site-header__logo-surface">
            <img className="site-header__logo" src={agencyLogo} alt="Miljødirektoratet" />
          </span>
          <span className="site-header__divider" aria-hidden="true" />
          <p className="site-header__product">Kommunalt naturregnskap</p>
        </div>
      </div>
    </header>
  )
}
