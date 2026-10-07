interface NaturtapetPageProps {
  readonly municipalityName?: string
}

export function NaturtapetPage({ municipalityName }: NaturtapetPageProps) {
  const place = municipalityName ? ` i ${municipalityName}` : ''

  return (
    <section className="content-page naturtap-page" aria-labelledby="naturtapet-title">
      <nav className="thematic-breadcrumb" aria-label="Brødsmuler">
        <span>Kommuneoversikt</span>
        <span aria-hidden="true">›</span>
        <span>Naturtapet</span>
      </nav>

      <header className="naturtap-hero">
        <p className="content-page__eyebrow">Historisk endring</p>
        <h1 id="naturtapet-title">Naturtapet{place}</h1>
        <p>
          Her skal vi vise dokumentert nedbygging av naturareal over tid.
          Nedbygging er én av flere årsaker til tap og forringelse av natur,
          og siden skal derfor ikke tolkes som alt naturtap i kommunen.
        </p>
      </header>

      <section className="naturtap-kpis" aria-label="Nøkkeltall">
        <article>
          <span className="naturtap-kpis__heading">
            <strong>Naturareal bygget ned</strong>
            <span>Periode avklares</span>
          </span>
          <span className="naturtap-kpis__value">XX dekar</span>
          <span className="naturtap-kpis__meta">
            Tall vises når dokumentert kommunestatistikk er koblet til.
          </span>
        </article>
        <article>
          <span className="naturtap-kpis__heading">
            <strong>Andel av naturarealet</strong>
            <span>Periode avklares</span>
          </span>
          <span className="naturtap-kpis__value">–</span>
          <span className="naturtap-kpis__meta">
            Andel vises først når både periode og prosentnevner er metodisk avklart.
          </span>
        </article>
      </section>

      <aside className="thematic-warning naturtap-warning">
        <span className="thematic-warning__icon" aria-hidden="true">△</span>
        <div>
          <strong>Kart og statistikk må holdes adskilt</strong>
          <p>
            Historisk nedbygging kan bli tilgjengelig som statistikk for kommunen
            uten stedfestede utbyggingspolygoner. Løsningen skal ikke konstruere
            geografisk presisjon som kildedataene ikke støtter.
          </p>
        </div>
      </aside>

      <section className="thematic-insight-row naturtap-insight" aria-labelledby="naturtap-development-title">
        <div className="thematic-insight-row__text">
          <h2 id="naturtap-development-title">Utvikling over tid</h2>
          <p>
            Når datagrunnlaget er klart, skal denne delen vise dokumentert
            nedbygging på det detaljeringsnivået kilden faktisk støtter.
          </p>
          <p className="thematic-insight-row__source">Kilde og periode avklares</p>
        </div>
        <div className="thematic-chart-placeholder" role="status">
          <span>Tidsserie vises når datagrunnlaget er koblet til.</span>
        </div>
      </section>

      <div className="thematic-questions thematic-questions--wide naturtap-questions">
        <details>
          <summary>Hvilken natur er bygget ned?</summary>
          <p>
            Fordeling på natur- eller økosystemtype vises bare dersom historiske
            data kan kobles metodisk til regnskapsgrunnlaget.
          </p>
        </details>
        <details>
          <summary>Hvor skjedde nedbyggingen?</summary>
          <p>
            Dette kan bare vises dersom kilden inneholder stedfestede data.
            Aggregert kommunestatistikk er ikke tilstrekkelig for kartfesting.
          </p>
        </details>
        <details>
          <summary>Hva regnes som naturtap her?</summary>
          <p>
            Denne siden gjelder dokumentert nedbygging av naturareal. Den dekker
            ikke alle former for tap eller forringelse av natur.
          </p>
        </details>
      </div>
    </section>
  )
}
