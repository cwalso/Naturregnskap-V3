import type { MouseEvent, ReactNode } from 'react'
import type { SiteView } from '../components/SiteHeader'
import type { AccountOverviewData } from '../features/account-overview/model'
import type { ThematicCoverageResponse } from '../api/thematicCoverage'
import { natureTypeDefinitions } from '../map/plannedDevelopment'
import { overviewImages } from '../features/overview/content'
import { OverviewPhoto } from '../features/overview/OverviewPhoto'
import { OverviewSummary, type OverviewDataState } from '../features/overview/OverviewSummary'
import { OverviewThemes } from '../features/overview/OverviewThemes'
import '../features/overview/OverviewPage.css'

interface OverviewPageProps {
  readonly accountData: AccountOverviewData | null
  readonly accountState: OverviewDataState
  readonly mapContent: ReactNode
  readonly provenanceContent: ReactNode
  readonly municipalityNumber: string
  readonly municipalityName: string
  readonly thematicCoverage: ThematicCoverageResponse | null
  readonly thematicCoverageState: OverviewDataState
  readonly onNavigate: (view: SiteView) => void
}

export function OverviewPage(props: OverviewPageProps) {
  const { municipalityName, municipalityNumber, accountState, onNavigate } = props
  const accountData = props.accountData?.municipalityNumber === municipalityNumber ? props.accountData : null
  function link(view: SiteView) { return (event: MouseEvent<HTMLAnchorElement>) => { event.preventDefault(); onNavigate(view) } }

  return <div className="overview-home">
    <section className="overview-home__hero overview-home__inner" aria-labelledby="overview-home-title">
      <div className="overview-home__summary">
        <p className="overview-home__eyebrow">Kommuneoversikt</p>
        <h1 id="overview-home-title">Naturregnskap for {municipalityName} kommune</h1>
        <p className="overview-home__lead">Et overblikk over arealene. En inngang til naturen.</p>
        <OverviewSummary data={accountData} state={accountState} />
        <div className="overview-home__questions">
          <details><summary>Hva legger vi i natur, jordbruk og bebygget?</summary><p>Natur omfatter skog, myr og andre natur- og utmarksarealer. Jordbruk omfatter dyrket mark og grasmark. Bebygget er bebygde og opparbeidede arealer. Inndelingen beskriver arealbruk, ikke naturens tilstand eller alle naturverdier.</p></details>
          <details><summary>Hva er et naturregnskap?</summary><p>Et naturregnskap gir oversikt over naturens areal og utbredelse. En dokumentert tidsserie kan vise endringer. Dagens prototype viser en arealoversikt; supplerende naturdata og plananalyser utforskes på egne sider.</p></details>
        </div>
      </div>
      <div className="overview-home__geography">{props.mapContent}
        <p className="overview-home__source-note">{accountData?.sourceKind === 'ssb-prototype' ? `Tall: SSBs arealstatistikk ${accountData.period}. Kart: Grunnkart 2025. De to kildene har ulike inndelinger og er ikke identiske.` : 'Kart: Grunnkart for arealanalyse 2025. Kilde og metode for arealtallene vises nedenfor.'}</p>
        {props.provenanceContent}
      </div>
    </section>

    <section className="overview-story" aria-labelledby="overview-loss-story-title">
      <div className="overview-home__inner overview-story__inner">
        <OverviewPhoto image={overviewImages.coast} eager />
        <div className="overview-story__text"><p className="overview-home__eyebrow">Natur og arealbruk</p>
          <h2 id="overview-loss-story-title">Natur bygges ned<br />bit for bit.</h2>
          <p>Små inngrep kan over tid endre store landskap. Å kjenne naturen vi har, er et viktig utgangspunkt for å følge utviklingen.</p>
          <p>For {municipalityName} er dokumenterte historiske naturtapstall ennå ikke koblet til denne visningen.</p>
          <a className="overview-home__link" href="#naturtapet" onClick={link('naturtapet')}>Les om naturtapet <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>

    <section className="overview-home__section overview-home__loss" aria-labelledby="overview-loss-title">
      <div className="overview-home__inner">
        <div className="overview-home__section-heading"><div><p className="overview-home__eyebrow">Historisk endring</p><h2 id="overview-loss-title">Hva slags natur ble bygget ned?</h2></div>
          <a className="overview-home__link" href="#naturtapet" onClick={link('naturtapet')}>Mer om naturtapet <span aria-hidden="true">→</span></a>
        </div>
        <p className="overview-home__section-intro">Fordelingen krever dokumenterte endringer over tid. Historisk nedbygging per naturtype er foreløpig ikke tilgjengelig for {municipalityName}. Under finner du naturtypene fra dagens Grunnkart-inndeling.</p>
        <table className="overview-loss-list" aria-label="Naturtyper og status for historisk nedbygging">
          <thead><tr><th scope="col">Naturtype</th><th scope="col">Historisk nedbygging</th></tr></thead>
          <tbody>{natureTypeDefinitions.map(type => <tr key={type.id}>
            <th scope="row">{type.label}</th><td>Ikke tilgjengelig</td>
          </tr>)}</tbody>
        </table>
        <div className="overview-home__questions overview-home__questions--wide">
          <details><summary>Hvor kommer tallene fra?</summary><p>Arealoversikten øverst bruker eksisterende kommunevise arealtall. Historiske naturtapstall er ikke tilgjengelige her. Vi beregner ikke naturtap ved å trekke fra to ulike årsversjoner av et kart.</p></details>
          <details><summary>Hva er forskjellen på arealkategorier og økosystemer?</summary><p>Natur, Jordbruk og Bebygget er hovedkategorier. Skog og våtmark beskriver mer detaljerte økosystemer. Verneområder, verdsatte naturtyper, inngrepsfri natur og villrein er supplerende temadata.</p></details>
        </div>
      </div>
    </section>

    <section className="overview-story overview-story--reverse" aria-labelledby="overview-drivers-title">
      <div className="overview-home__inner overview-story__inner">
        <div className="overview-story__text"><p className="overview-home__eyebrow">Hva endrer landskapet?</p>
          <h2 id="overview-drivers-title">Nye behov.<br />De samme arealene.</h2>
          <p><mark>Boliger</mark>, <mark>veier</mark> og <mark>næring</mark> trenger plass. Hvilke arealer som endres, og hva de endres til, må dokumenteres for å forstå utviklingen.</p>
          <p>Vi har ennå ingen dokumentert fordeling av drivkreftene for naturtap i {municipalityName}. Planavsetninger viser framtidig arealbruk, ikke faktisk nedbygging.</p>
          <a className="overview-home__link" href="#naturtapet" onClick={link('naturtapet')}>Utforsk bakgrunnen for naturtap <span aria-hidden="true">→</span></a>
        </div>
        <OverviewPhoto image={overviewImages.road} />
      </div>
    </section>

    <OverviewThemes municipalityNumber={municipalityNumber} municipalityName={municipalityName} coverage={props.thematicCoverage} coverageState={props.thematicCoverageState} onNavigate={onNavigate} />
    <section className="overview-home__next" aria-labelledby="overview-next-title"><div className="overview-home__inner">
      <div><p className="overview-home__eyebrow">Ta et nærmere blikk</p><h2 id="overview-next-title">Se naturen i sammenheng.</h2><p>Utforsk datagrunnlaget, kombiner kartlag og finn registrert natur.</p></div>
      <a className="overview-home__button" href="#utforsk-i-kart" onClick={link('utforsk-i-kart')}>Åpne Utforsk i kart <span aria-hidden="true">→</span></a>
    </div></section>
  </div>
}
