import { accountCategoryContent } from './content'
import type { AccountCategoryId, AccountMetricData } from './model'

interface AccountMetricProps {
  readonly metric: AccountMetricData
}

const areaFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })

function CategoryLandscape({ id }: { readonly id: AccountCategoryId }) {
  if (id === 'nature') {
    return (
      <svg viewBox="0 0 480 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="nature-sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#8faeb4" />
            <stop offset="1" stopColor="#d8d0b4" />
          </linearGradient>
        </defs>
        <rect width="480" height="180" fill="url(#nature-sky)" />
        <path d="M0 105 95 58l74 42 62-69 88 71 75-39 86 42v75H0Z" fill="#66735f" />
        <path d="M0 122c94-13 134 11 210 4 84-8 150-24 270-5v59H0Z" fill="#7d704c" />
        <path d="M210 128c30-13 60-17 95-10 26 5 53 13 86 8l53-7 36 10v51H185c4-22 9-39 25-52Z" fill="#526c71" />
      </svg>
    )
  }

  if (id === 'agriculture') {
    return (
      <svg viewBox="0 0 480 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="480" height="180" fill="#b8cdd1" />
        <path d="M0 96 90 62l74 25 67-46 93 61 72-30 84 37v71H0Z" fill="#6c8069" />
        <path d="M0 125c100-24 185-17 265 5 78 22 142 8 215-4v54H0Z" fill="#8c9b61" />
        <rect x="215" y="86" width="74" height="50" fill="#8c4437" />
        <path d="m206 88 47-29 48 29Z" fill="#644d3d" />
        <rect x="240" y="105" width="18" height="31" fill="#efe5ce" />
        <rect x="270" y="101" width="12" height="12" fill="#d4e6ea" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 480 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="480" height="180" fill="#7e9d78" />
      <path d="M0 20h480v160H0Z" fill="#69966b" opacity=".55" />
      <path d="M48 0 220 180M160 0l172 180M278 0l170 180" stroke="#c4ba99" strokeWidth="18" opacity=".72" />
      <path d="M0 128 202 0M127 180 329 0M275 180 477 0" stroke="#b4aa89" strokeWidth="12" opacity=".65" />
      {[74,160,254,350].map((x) => (
        <g key={x}>
          <rect x={x} y="62" width="42" height="30" rx="2" fill="#d7d6ce" />
          <path d={`M${x - 4} 64 ${x + 21} 45 ${x + 46} 64Z`} fill="#5c6260" />
        </g>
      ))}
    </svg>
  )
}

export function AccountMetric({ metric }: AccountMetricProps) {
  const content = accountCategoryContent[metric.id]
  const hasArea = metric.areaKm2 !== null

  return (
    <article className={`account-metric account-metric--${metric.id}`} data-category-id={metric.id}>
      <div className="account-metric__visual">
        <CategoryLandscape id={metric.id} />
      </div>
      <div className="account-metric__body">
        <h2>{content.label}</h2>
        <p className="account-metric__value">
          {hasArea ? <>{areaFormatter.format(metric.areaKm2 * 1000)} <span>dekar</span></> : 'Ikke tilgjengelig'}
        </p>
        <p className="account-metric__description">{content.description}</p>
      </div>
    </article>
  )
}
