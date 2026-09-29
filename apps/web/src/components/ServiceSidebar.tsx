import type { ReactNode } from 'react'

import type { SiteView } from './SiteHeader'

interface ServiceSidebarProps {
  readonly activeView: SiteView
  readonly municipalityPicker: ReactNode
  readonly municipalityName: string
  readonly onNavigate: (view: SiteView) => void
}

const items: ReadonlyArray<{
  view: SiteView
  label: string
  icon: string
}> = [
  { view: 'oversikt', label: 'Oversikt', icon: '⌂' },
  { view: 'naturtapet', label: 'Naturtapet', icon: '↗' },
  { view: 'utforsk-naturen', label: 'Hva slags natur har vi?', icon: '◒' },
  { view: 'utforsk-i-kart', label: 'Utforsk i kart', icon: '▱' },
]

export function ServiceSidebar({
  activeView,
  municipalityPicker,
  municipalityName,
  onNavigate,
}: ServiceSidebarProps) {
  return (
    <aside className="service-sidebar" aria-label="Navigasjon og kommunevalg">
      <div className="service-sidebar__picker">
        <span className="service-sidebar__label">Velg kommune</span>
        <div className="service-sidebar__municipality">
          <span className="service-sidebar__pin" aria-hidden="true">⌖</span>
          <strong>{municipalityName}</strong>
        </div>
        <div className="service-sidebar__picker-control">
          {municipalityPicker}
        </div>
      </div>

      <nav className="service-sidebar__navigation" aria-label="Hovednavigasjon">
        {items.map((item) => (
          <a
            key={item.view}
            href={`#${item.view}`}
            aria-current={activeView === item.view ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              onNavigate(item.view)
            }}
          >
            <span className="service-sidebar__icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="service-sidebar__footer">
        <a href="#method">Metode og datagrunnlag</a>
      </div>
    </aside>
  )
}
