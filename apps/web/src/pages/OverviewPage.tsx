import type { MouseEvent, ReactNode } from 'react'
import type { SiteView } from '../components/SiteHeader'
import type { AccountOverviewData } from '../features/account-overview/model'
import type { ThematicCoverageResponse } from '../api/thematicCoverage'
import { LossBreakdown, LossMetrics, LossSourceLabel } from '../features/historical-loss/LossPresentation'
import { periodLabel, summarizeLoss, type HistoricalLossDataset } from '../features/historical-loss/model'
import { overviewImages } from '../features/overview/content'
import { OverviewPhoto } from '../features/overview/OverviewPhoto'
import { OverviewSummary, type OverviewDataState } from '../features/overview/OverviewSummary'
import { OverviewThemes } from '../features/overview/OverviewThemes'
import '../features/overview/OverviewPage.css'
import { PlanAreaPreview } from '../features/plan-area/PlanAreaPreview'
import type { PlanAreaResult } from '../features/plan-area/model'

interface OverviewPageProps {
  readonly accountData: AccountOverviewData | null
  readonly accountState: OverviewDataState
  readonly historicalLoss: HistoricalLossDataset | null
  readonly mapContent: ReactNode
  readonly provenanceContent: ReactNode
  readonly municipalityNumber: string
  readonly municipalityName: string
  readonly thematicCoverage: ThematicCoverageResponse | null
  readonly thematicCoverageState: OverviewDataState
  readonly onNavigate: (view: SiteView) => void
  readonly planAreaResult?: PlanAreaResult | null
  readonly planAreaState?: OverviewDataState
  readonly onOpenPlanAnalysis?: () => void
}

export function OverviewPage(props: OverviewPageProps) {
  const { municipalityName, municipalityNumber, accountState, onNavigate } = props
  const accountData = props.accountData?.municipalityNumber === municipalityNumber ? props.accountData : null
  const lossData = props.historicalLoss?.municipalityNumber === municipalityNumber ? props.historicalLoss : null
  const loss = lossData ? summarizeLoss(lossData.periods) : null
  function link(view: SiteView) { return (event: MouseEvent<HTMLAnchorElement>) => { event.preventDefault(); onNavigate(view) } }

  return <div className="overview-home">
    <section className="overview-home__hero overview-home__inner" aria-labelledby="overview-home-title">
      <div className="overview-home__summary">
        <p className="overview-home__eyebrow">Kommuneoversikt</p>
        <h1 id="overview-home-title">Naturregnskap for {municipalityName} kommune</h1>
        <p className="overview-home__lead">Et overblikk over arealene. En inngang til naturen.</p>
        <OverviewSummary data={accountData} state={accountState} />
        <div className="overview-home__questions">
          <details><summary>Hva legger vi i natur, jordbruk og bebygd?</summary><p>Natur omfatter skog, myr og andre natur- og utmarksarealer. Jordbruk omfatter dyrket mark og grasmark. Bebygd er bebygde og opparbeidede arealer. Inndelingen beskriver arealbruk, ikke naturens tilstand eller alle naturverdier.</p></details>
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
          <p>Historisk nedbygging forteller hva som har endret seg. Dagens arealoversikt forteller hva vi har. De to spørsmålene trenger ulike datagrunnlag.</p>
          <a className="overview-home__link" href="#naturtapet" onClick={link('naturtapet')}>Les om naturtapet <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>

    <section className="overview-home__section overview-home__loss" aria-labelledby="overview-loss-title">
      <div className="overview-home__inner">
        <div className="overview-home__section-heading"><div><p className="overview-home__eyebrow">Hva har vi mistet?</p><h2 id="overview-loss-title">Hva har blitt bygget ned?</h2></div>
          <a className="overview-home__link" href="#naturtapet" onClick={link('naturtapet')}>Mer om naturtapet <span aria-hidden="true">→</span></a>
        </div>
        {lossData && loss ? <>
          <LossSourceLabel data={lossData} />
          <div className="overview-loss-preview">
            <div><p className="overview-home__section-intro">Brutto nedbygging, {periodLabel(lossData.periods)}{lossData.source.kind === 'demo' ? ' (illustrativ periode)' : ''}. Natur og jordbruk telles hver for seg.</p>
              <LossMetrics summary={loss} compact />
              <p className="overview-home__source-note">Tallene beskriver nedbygging i perioden. De trekkes ikke fra dagens arealbeholdning.</p>
            </div>
            <div><h3>Nedbygd natur etter økosystemtype</h3><LossBreakdown field={loss.ecosystems} denominator={loss.nature} name="Historisk forhåndsvisning: økosystemtyper" compact /><p className="overview-home__source-note">{lossData.source.classificationNote}</p></div>
          </div>
        </> : <p className="loss-unavailable">Historiske nedbyggingsdata er ikke tilgjengelige for {municipalityName}. Se Naturtapet for status og kildeforklaringer. Demonstrasjonen finnes bare for Trondheim.</p>}
        <div className="overview-home__questions overview-home__questions--wide">
          <details><summary>Hvor kommer tallene fra?</summary><p>Arealoversikten øverst bruker eksisterende kommunevise arealtall. Historisk nedbygging demonstreres foreløpig med konstruerte Trondheim-data fra en egen kilde. Vi beregner ikke naturtap ved å trekke fra to ulike årsversjoner av et kart.</p></details>
          <details><summary>Hva er forskjellen på arealkategorier og økosystemer?</summary><p>Natur, Jordbruk og Bebygd er hovedkategorier. Skog og våtmark beskriver mer detaljerte økosystemer. Verneområder, verdsatte naturtyper, inngrepsfri natur og villrein er supplerende temadata.</p></details>
        </div>
      </div>
    </section>

    <section className="overview-story overview-story--reverse overview-home__future" aria-labelledby="overview-future-title">
      <div className="overview-home__inner overview-story__inner">
        <div className="overview-story__text"><p className="overview-home__eyebrow">Hva kan bli berørt?</p>
          <h2 id="overview-future-title">Hvilken natur ligger i områder avsatt til framtidig utbygging?</h2>
          <p>Planområder viser <mark>mulig utbyggingspress</mark>. I kartet kan du se dagens natur og jordbruk innenfor arealer avsatt til framtidig utbygging. Planavsetninger er ikke forventet naturtap.</p>
          <p>Grunnkart beskriver heldekkende arealkategorier. Registrerte naturverdier, som verdsatte naturtyper, er supplerende informasjon. Planoverlappanalysen undersøker overlapp med disse lokalitetene, og viser ikke samlet naturareal avsatt til utbygging.</p>
          <PlanAreaPreview result={props.planAreaResult??null} state={props.planAreaState??'idle'} municipalityNumber={municipalityNumber}/>
          <a className="overview-home__link" href="#utforsk-i-kart" onClick={event=>{event.preventDefault();if(props.onOpenPlanAnalysis)props.onOpenPlanAnalysis();else onNavigate('utforsk-i-kart')}}>Åpne arealfordelingen i kart <span aria-hidden="true">→</span></a>
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
