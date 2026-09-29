import { accountCategoryContent } from './content'
import type { AccountOverviewData } from './model'

interface AccountDistributionProps {
  readonly data: AccountOverviewData
}

const areaFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })

export function AccountDistribution({ data }: AccountDistributionProps) {
  return (
    <section className="overview-distribution" aria-labelledby="overview-distribution-title">
      <div className="overview-card__header">
        <h2 id="overview-distribution-title">Arealfordeling i {data.municipalityName}</h2>
        <p>
          Areal i dekar. De tre kategoriene er samme Level0-inndeling som i
          naturregnskapet over.
        </p>
      </div>

      {data.status === 'available' ? (
        <div className="overview-distribution__metrics">
          {data.metrics.map((metric) => (
            <div className={`overview-distribution__metric overview-distribution__metric--${metric.id}`} key={metric.id}>
              <span className="overview-distribution__swatch" aria-hidden="true" />
              <span>
                <strong>{accountCategoryContent[metric.id].label}</strong>
                <small>
                  {metric.areaKm2 === null
                    ? 'Ikke tilgjengelig'
                    : `${areaFormatter.format(metric.areaKm2 * 1000)} dekar`}
                </small>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="overview-distribution__empty">
          Arealfordelingen vises når Level0-resultatet er klargjort for kommunen.
        </p>
      )}

      <div className="overview-distribution__source">
        <span aria-hidden="true">ⓘ</span>
        <p>
          <strong>Datagrunnlag:</strong> Grunnkart for arealanalyse (2025).
          <br />
          Metode og klassifisering er dokumentert separat.
        </p>
      </div>
    </section>
  )
}
