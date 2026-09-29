interface NaturtapetPageProps {
  readonly municipalityName?: string
}

export function NaturtapetPage({ municipalityName }: NaturtapetPageProps) {
  const place = municipalityName ? ` i ${municipalityName}` : ''

  return (
    <section className="content-page" aria-labelledby="naturtapet-title">
      <header className="content-page__intro">
        <p className="content-page__eyebrow">Historisk endring</p>
        <h1 id="naturtapet-title">Naturtapet{place}</h1>
        <p>
          Her skal du kunne se dokumentert nedbygging og naturtap over tid på det
          detaljeringsnivået datagrunnlaget faktisk støtter.
        </p>
      </header>

      <aside className="status-panel" aria-labelledby="naturtapet-status-title">
        <p className="status-panel__label">Datastatus</p>
        <h2 id="naturtapet-status-title">Tallgrunnlaget er ikke koblet til ennå</h2>
        <p>
          SSB har varslet første publisering av den nye naturregnskapsstatistikken
          25. november 2026. Denne prototypen viser derfor ikke naturtapstall før
          datagrunnlag og metode for kommunal visning er avklart og integrert.
        </p>
      </aside>

      <div className="insight-grid">
        <article className="info-card">
          <span className="status-tag">Kommer med datagrunnlag</span>
          <h2>Hvor mye natur er tapt?</h2>
          <p>
            Visningen skal oppsummere dokumentert naturtap for valgte perioder,
            med tydelig kilde, referanseperiode og metode.
          </p>
        </article>

        <article className="info-card">
          <span className="status-tag">Metode må avklares</span>
          <h2>Hvilken natur er tapt?</h2>
          <p>
            Dette vises bare dersom tilgjengelige data gir en natur- eller
            økosysteminndeling som kan brukes på en etterprøvbar måte.
          </p>
        </article>

        <article className="info-card">
          <span className="status-tag status-tag--muted">Ikke forutsatt</span>
          <h2>Stedfesting</h2>
          <p>
            Naturtap-visningen skal ikke forutsette stedfestede
            utbyggingspolygoner. Aggregert statistikk og kartfestet
            endringsgrunnlag er to ulike dataproblemer.
          </p>
        </article>
      </div>

      <section className="content-page__section" aria-labelledby="naturtapet-scope-title">
        <h2 id="naturtapet-scope-title">Hva visningen ikke skal blande inn</h2>
        <p>
          Naturtapet skal ha naturen i sentrum. Siden skal ikke vise hvilke
          utbyggingsformål tapte arealer har gått til, og den skal ikke brukes
          til å framstille planlagt framtidig utbygging.
        </p>
      </section>
    </section>
  )
}
