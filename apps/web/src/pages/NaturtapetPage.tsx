interface NaturtapetPageProps {
  readonly municipalityName?: string
}

export function NaturtapetPage({ municipalityName }: NaturtapetPageProps) {
  const place = municipalityName ? ` i ${municipalityName}` : ''

  return (
    <section className="content-page" aria-labelledby="naturtapet-title">
      <header className="content-page__intro">
        <span className="prototype-note">PROTOTYPE · datagrunnlag ikke koblet til</span>
        <p className="content-page__eyebrow">Naturregnskap / Naturtapet</p>
        <h1 id="naturtapet-title">Naturtapet{place}</h1>
        <p>
          Her skal vi vise dokumentert nedbygging av naturareal over tid.
          Nedbygging er én av flere årsaker til tap og forringelse av natur,
          og denne visningen skal derfor ikke tolkes som alt naturtap i kommunen.
        </p>
      </header>

      <div className="design-kpis" aria-label="Nøkkelinformasjon">
        <article className="design-kpi design-kpi--historic">
          <p className="design-kpi__label">Naturareal bygget ned</p>
          <p className="design-kpi__value">XX dekar</p>
          <p className="design-kpi__meta">
            Tall vises når et dokumentert kommunalt datagrunnlag er integrert.
          </p>
        </article>
        <article className="design-kpi design-kpi--context">
          <p className="design-kpi__label">Hvilken natur er bygget ned?</p>
          <p className="design-kpi__value">Ikke avklart</p>
          <p className="design-kpi__meta">
            Naturtypefordeling vises bare dersom kildedata og metode gir et
            etterprøvbart grunnlag.
          </p>
        </article>
      </div>

      <div className="method-note">
        <span className="method-note__icon" aria-hidden="true">△</span>
        <div>
          <strong>Viktig å vite:</strong> Historisk nedbygging kan bli tilgjengelig
          som statistikk for kommunen uten at løsningen får stedfestede
          utbyggingspolygoner. Kart og statistikk må derfor ikke blandes sammen.
        </div>
      </div>

      <section className="content-page__section" aria-labelledby="historic-title">
        <div className="section-heading">
          <span className="section-tag">Historisk · datakilde avklares</span>
          <h2 id="historic-title">Natur som er bygget ned</h2>
          <p>
            Når datagrunnlaget er klart, skal denne delen vise omfang og utvikling
            over tid på det detaljeringsnivået statistikken faktisk støtter.
          </p>
        </div>

        <div className="insight-grid">
          <article className="info-card">
            <span className="status-tag">Kommer med data</span>
            <h3>Omfang</h3>
            <p>
              Samlet dokumentert nedbygging for en tydelig definert periode,
              med kilde, versjon og metode.
            </p>
          </article>
          <article className="info-card">
            <span className="status-tag">Metode må avklares</span>
            <h3>Naturfordeling</h3>
            <p>
              Fordeling på natur- eller økosystemtyper vises bare dersom
              klassifikasjonen kan kobles metodisk til regnskapsgrunnlaget.
            </p>
          </article>
          <article className="info-card info-card--soft">
            <span className="status-tag status-tag--muted">Ikke forutsatt</span>
            <h3>Hvor skjedde nedbyggingen?</h3>
            <p>
              Det kan ikke vises dersom datagrunnlaget bare består av aggregert
              kommunestatistikk. Vi skal ikke konstruere kartfesting som kilden
              ikke støtter.
            </p>
          </article>
        </div>
      </section>

      <section className="content-page__section" aria-labelledby="interpret-title">
        <div className="section-heading">
          <p className="section-heading__kicker">Avgrensning</p>
          <h2 id="interpret-title">Hvordan skal siden forstås?</h2>
        </div>
        <div className="info-card info-card--wide info-card--soft">
          <p>
            Naturtapet skal ha naturen i sentrum. Siden skal ikke vise hvilke
            utbyggingsformål tapte arealer har gått til. Framtidig natur i
            områder som i vedtatte planer er avsatt til utbygging er et eget
            kunnskapsgrunnlag og skal først inn når metode og datagrunnlag er
            avklart.
          </p>
        </div>
      </section>
    </section>
  )
}
