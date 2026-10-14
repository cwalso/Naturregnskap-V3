import { useState, type MouseEvent } from 'react'
import type { SiteView } from '../components/SiteHeader'
import { OverviewPhoto } from '../features/overview/OverviewPhoto'
import { overviewImages } from '../features/overview/content'
import { LossBreakdown, LossMetrics, LossSourceLabel, LossTimeline } from '../features/historical-loss/LossPresentation'
import { periodLabel, summarizeLoss, type HistoricalLossDataset } from '../features/historical-loss/model'

interface Props {
  readonly municipalityNumber: string
  readonly municipalityName: string
  readonly historicalLoss: HistoricalLossDataset | null
  readonly onNavigate: (view: SiteView) => void
}
function LossExplorer({ data }: { readonly data: HistoricalLossDataset }) {
  const [start, setStart] = useState(0), [end, setEnd] = useState(data.periods.length - 1)
  const periods = data.periods.slice(start, end + 1), summary = summarizeLoss(periods)
  return <>
    <section className="loss-section loss-section--tinted" aria-labelledby="loss-time-title"><div className="loss-inner">
      <p className="loss-eyebrow">Hva har vi mistet?</p><h2 id="loss-time-title">Utvikling over tid</h2>
      <p className="loss-section__intro">Velg en periode og se hvor mye natur og jordbruk som er bygget ned. Tallene viser brutto nedbygging, uten fratrekk for arealer som eventuelt er tilbakeført.</p>
      <LossSourceLabel data={data} />
      <div className="loss-selector">
        <label>Fra periode<select value={start} onChange={e => { const value = Number(e.target.value); setStart(value); if (value > end) setEnd(value) }}>{data.periods.map((p, i) => <option key={p.id} value={i}>{p.label}</option>)}</select></label>
        <label>Til periode<select value={end} onChange={e => { const value = Number(e.target.value); setEnd(value); if (value < start) setStart(value) }}>{data.periods.map((p, i) => <option key={p.id} value={i}>{p.label}</option>)}</select></label>
        <button type="button" onClick={() => { setStart(0); setEnd(data.periods.length - 1) }}>Vis hele perioden</button>
      </div>
      <p className="loss-period-note">Valgt periode: {periodLabel(periods)}{data.source.kind === 'demo' ? ' (illustrativ)' : ''}</p>
      <LossMetrics summary={summary} />
      <LossTimeline periods={periods} sourceLabel={data.source.label} />
    </div></section>
    <section className="loss-section" aria-labelledby="loss-ecosystem-title"><div className="loss-inner">
      <p className="loss-eyebrow">Naturarealene</p><h2 id="loss-ecosystem-title">Hvilke økosystemtyper er bygget ned?</h2>
      <p className="loss-section__intro">Fordeling innen nedbygd natur, {periodLabel(periods)}. Andelene gjelder nedbygd natur i valgt periode. Jordbruksareal inngår ikke i denne fordelingen.</p>
      <LossSourceLabel data={data} /><LossBreakdown field={summary.ecosystems} denominator={summary.nature} name="Nedbygd natur etter økosystemtype" />
      <p className="loss-period-note">{data.source.classificationNote}</p>
    </div></section>
    {summary.destinations.status !== 'not-in-delivery' && <section className="loss-section loss-section--tinted" aria-labelledby="loss-destination-title"><div className="loss-inner">
      <p className="loss-eyebrow">Etterfølgende arealbruk</p><h2 id="loss-destination-title">Hva har arealene blitt bygget ned til?</h2>
      <p className="loss-section__intro">Fordeling av samlet nedbygd natur og jordbruk, {periodLabel(periods)}. Det er ikke avklart om SSB leverer denne variabelen.</p>
      <LossSourceLabel data={data} /><LossBreakdown field={summary.destinations} denominator={summary.total} name="Nedbygging etter etterfølgende arealbruk" />
    </div></section>}
  </>
}
export function NaturtapetPage({ municipalityNumber, municipalityName, historicalLoss, onNavigate }: Props) {
  const data = historicalLoss?.municipalityNumber === municipalityNumber ? historicalLoss : null
  const link = (view: SiteView) => (event: MouseEvent<HTMLAnchorElement>) => { event.preventDefault(); onNavigate(view) }
  return <div className="historical-loss">
    <header className="loss-hero loss-inner">
      <div><nav className="loss-breadcrumb" aria-label="Brødsmuler"><a href="#oversikt" onClick={link('oversikt')}>Kommuneoversikt</a><span aria-hidden="true">›</span><span>Naturtapet</span></nav>
        <p className="loss-eyebrow">Historisk nedbygging</p><h1>Naturtapet i {municipalityName}</h1>
        <p className="loss-lead">Natur som blir til bebyggelse, veier eller andre opparbeidede arealer, endrer landskapet. Her utforsker vi nedbygging over tid – én av flere former for naturtap.</p>
        {data ? <><LossSourceLabel data={data} /><p className="loss-period-note">Referanseperiode: {periodLabel(data.periods)}{data.source.kind === 'demo' ? ' (illustrativ)' : ''}. Arealenhet: dekar.</p></> : <p className="loss-unavailable">Historiske nedbyggingsdata er ikke tilgjengelige for {municipalityName} i denne versjonen. Demonstrasjonen finnes bare for Trondheim.</p>}
      </div><OverviewPhoto image={overviewImages.road} eager />
    </header>
    {data && data.periods.length > 0 && <LossExplorer key={`${municipalityNumber}:${data.source.version}`} data={data} />}
    <section className="loss-location" aria-labelledby="loss-location-title"><div className="loss-inner loss-location__inner">
      <div><p className="loss-eyebrow">Hvor har nedbyggingen skjedd?</p><h2 id="loss-location-title">Statistikk først.<br />Stedfesting senere.</h2><p>Stedfestede historiske nedbyggingsdata er ikke tilgjengelige i denne versjonen. Utbyggingspolygoner forventes først i 2027. Kommunetall alene kan ikke vise hvor inngrepene har skjedd.</p></div>
      <div className="loss-location__aside"><h3>Et annet spørsmål: Hva kan bli berørt?</h3><p>Kartet viser dagens natur og arealer avsatt til framtidig utbygging. Planavsetninger beskriver mulig utbyggingspress, ikke faktisk nedbygging.</p><a className="loss-link" href="#utforsk-i-kart" onClick={link('utforsk-i-kart')}>Se planområder i kart <span aria-hidden="true">→</span></a></div>
    </div></section>
    <section className="loss-section" aria-labelledby="loss-method-title"><div className="loss-inner loss-two-columns">
      <div><p className="loss-eyebrow">Metode og kilder</p><h2 id="loss-method-title">Hva forteller tallene?</h2><p>Nedbygging beskriver en arealovergang. Tallene dekker ikke all forringelse av natur, og er ikke en netto endring i kommunens naturareal.</p><a className="loss-link" href="#oversikt" onClick={link('oversikt')}>Tilbake til Kommuneoversikt <span aria-hidden="true">→</span></a></div>
      <div className="loss-method">
        <details><summary>Demodata og illustrativ periode</summary><p>Trondheims eksempel for 2016–2025 er konstruert for å vise hvordan statistikken kan utforskes. Årstall, arealer, økosystemfordeling og etterfølgende arealbruk er illustrative. De er ikke dokumenterte lokale funn eller offisielle SSB-tall.</p></details>
        <details><summary>Brutto nedbygging og dagens arealbeholdning</summary><p>Natur og jordbruk telles hver for seg og summeres uten dobbeltelling. Brutto nedbygging har ikke fratrekk for tilbakeførte arealer. Dagens SSB-baserte arealbeholdning og Grunnkart har andre datagrunnlag. Historiske tall trekkes ikke fra beholdningen, og vi beregner ikke nedbygging som andel av dagens naturareal.</p></details>
        <details><summary>Hva må avklares før SSB-tall publiseres?</summary><p>Statistikk i tabellform forventes 25. november 2026. Variabler, perioder, kategorier, definisjoner og sammenlignbarhet er ennå ikke avklart. Fordeling per økosystemtype og etterfølgende arealbruk er ikke bekreftet. Kildeversjon, datadekning og klassifikasjon må dokumenteres før offisielle tall erstatter demonstrasjonen.</p></details>
      </div>
    </div></section>
  </div>
}
