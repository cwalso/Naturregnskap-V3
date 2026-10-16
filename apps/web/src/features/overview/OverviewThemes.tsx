import type { SiteView } from '../../components/SiteHeader'
import type { ThematicCoverageResponse } from '../../api/thematicCoverage'
import { overviewEcosystems, overviewNatureThemes, type OverviewTheme } from './content'
import { OverviewPhoto } from './OverviewPhoto'
import type { OverviewDataState } from './OverviewSummary'

interface Props {
  readonly municipalityNumber: string
  readonly municipalityName: string
  readonly coverage: ThematicCoverageResponse | null
  readonly coverageState: OverviewDataState
  readonly onNavigate: (view: SiteView) => void
}

function themeStatus(theme: OverviewTheme, { municipalityNumber, coverage, coverageState }: Props) {
  if (!theme.datasetId) return 'Grunnkart · 2025'
  if (theme.datasetId === 'infrastructure-free-nature') return 'Kartlag · januar 2023'
  if (coverageState === 'loading') return 'Kontrollerer registreringer…'
  const result = coverage?.municipalityNumber === municipalityNumber ? coverage.results.find(item => item.datasetId === theme.datasetId) : undefined
  if (coverageState === 'error' || !result || result.status === 'unavailable') return 'Registreringsstatus ikke tilgjengelig'
  if (result.status === 'no_hit') return 'Ingen registrerte treff i kilden'
  return result.featureCount !== null ? `${new Intl.NumberFormat('nb-NO').format(result.featureCount)} kildeobjekter med treff` : 'Registrerte treff i kommunen'
}

export function OverviewThemes(props: Props) {
  return <section className="overview-home__section overview-home__themes" aria-labelledby="overview-themes-title">
    <div className="overview-home__inner">
      <div className="overview-home__section-heading"><div><p className="overview-home__eyebrow">Naturen i dag</p><h2 id="overview-themes-title">Naturtema i {props.municipalityName}</h2></div>
        <a className="overview-home__link" href="#utforsk-naturen" onClick={event => { event.preventDefault(); props.onNavigate('utforsk-naturen') }}>Se alle naturtema <span aria-hidden="true">→</span></a>
      </div>
      <p>Se fordelingen av dagens natur etter økosystemtype på Naturtema.</p>
      {[{ title: 'Økosystemer', themes: overviewEcosystems, explanation: 'Skog og våtmark vises fra det heldekkende Grunnkart-grunnlaget.' }, { title: 'Naturverdier og vern', themes: overviewNatureThemes, explanation: 'Supplerende temadata. Registreringene er ikke heldekkende naturkunnskap.' }].map(group => <div className="overview-theme-group" key={group.title}>
        <h3>{group.title}</h3><p className="overview-theme-group__intro">{group.explanation}</p>
        <div className="overview-theme-grid">{group.themes.map(theme => <article className="overview-theme-card" key={theme.view}>
          <OverviewPhoto image={theme.image} />
          <a href={`#${theme.view}`} onClick={event => { event.preventDefault(); props.onNavigate(theme.view) }}>
            <h4>{theme.title}</h4><p>{theme.description}</p>
            <div className="overview-theme-card__footer"><span>{themeStatus(theme, props)}</span><span aria-hidden="true">→</span></div>
            <span className="visually-hidden">Åpne temasiden {theme.title}</span>
          </a>
        </article>)}</div>
      </div>)}
    </div>
  </section>
}
