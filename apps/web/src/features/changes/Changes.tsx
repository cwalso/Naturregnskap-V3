import type { AccountCategoryId } from '../account-overview/model'
import type { ChangesData } from './model'

const labels: Record<AccountCategoryId, string> = {
  nature: 'Natur',
  agriculture: 'Dyrket mark',
  built: 'Bebygd',
}

function formatDecares(areaM2: number): string {
  return new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 }).format(areaM2 / 1_000)
}

export function Changes({ data }: { readonly data: ChangesData }) {
  return (
    <section className="changes" aria-labelledby="changes-title">
      <h2 id="changes-title">Endringer</h2>
      {data.status === 'available' ? (
        <>
          <p className="changes__warning">Syntetiske testdata – brukes kun for å prøve ut endringsarkitekturen.</p>
          <dl className="changes__list">
            {data.transitions.map((transition) => (
              <div key={`${transition.fromLevel0}-${transition.toLevel0}`}>
                <dt>{labels[transition.fromLevel0]} → {labels[transition.toLevel0]}</dt>
                <dd>{formatDecares(transition.areaM2)} daa</dd>
              </div>
            ))}
          </dl>
        </>
      ) : <p className="account-overview__notice">Endringsdata er foreløpig ikke tilgjengelig for denne kommunen.</p>}
    </section>
  )
}
