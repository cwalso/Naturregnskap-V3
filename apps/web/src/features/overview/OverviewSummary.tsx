import { accountCategoryIds, type AccountOverviewData } from '../account-overview/model'

export type OverviewDataState = 'idle' | 'loading' | 'error'
const labels = { nature: 'Natur', agriculture: 'Jordbruk', built: 'Bebygget' } as const
const descriptions = { nature: 'Skog, myr og andre natur- og utmarksarealer.', agriculture: 'Dyrket mark og grasmark i arealgrupperingen.', built: 'Bebygde og opparbeidede arealer.' } as const
const area = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })
const share = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })

export function OverviewSummary({ data, state }: { readonly data: AccountOverviewData | null; readonly state: OverviewDataState }) {
  return <>
    {state === 'loading' && <p className="overview-home__data-note" role="status">Laster arealbalanse…</p>}
    {state === 'error' && <p className="overview-home__data-note" role="alert">Kunne ikke hente arealbalansen. Prøv igjen senere.</p>}
    {state === 'idle' && data?.status !== 'available' && <p className="overview-home__data-note" role="status">Regnskapstall er ikke klargjort for {data?.municipalityName ?? 'kommunen'} i prototypen ennå.</p>}
    <div className="overview-summary" aria-label="Arealoversikt">
      {accountCategoryIds.map(id => {
        const metric = state === 'idle' && data?.status === 'available' ? data.metrics.find(item => item.id === id) : undefined
        const areaAvailable = metric?.areaKm2 != null && Number.isFinite(metric.areaKm2) && metric.areaKm2 >= 0
        const shareAvailable = metric?.sharePercent != null && Number.isFinite(metric.sharePercent) && metric.sharePercent >= 0 && metric.sharePercent <= 100
        return <article key={id} className={`overview-summary__card overview-summary__card--${id}`}>
          <div className="overview-summary__heading"><h2><i aria-hidden="true" />{labels[id]}</h2>{shareAvailable && <span className="overview-summary__share">{share.format(metric.sharePercent!)} % av landarealet</span>}</div>
          <p className="overview-summary__number">{areaAvailable ? <>{area.format(metric.areaKm2! * 1000)} <span>dekar</span></> : state === 'loading' ? 'Henter areal…' : 'Areal ikke tilgjengelig'}</p>
          <p className="overview-summary__description">{descriptions[id]}</p>
          {!shareAvailable && <p className="overview-summary__missing">Andel av landarealet er ikke oppgitt.</p>}
        </article>
      })}
    </div>
    <p className="overview-home__data-note">Offisiell statistikk om historisk nedbygging er ikke koblet til ennå.</p>
  </>
}
