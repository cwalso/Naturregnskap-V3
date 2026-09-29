interface ExploreNaturePageProps {
  readonly municipalityName?: string
}

const supplementalThemes = [
  'Verdsatte naturtyper',
  'Verneområder',
  'Villreinområder',
  'Inngrepsfri natur',
  'Bynatur',
] as const

export function ExploreNaturePage({ municipalityName }: ExploreNaturePageProps) {
  const place = municipalityName ? ` i ${municipalityName}` : ''

  return (
    <section className="content-page" aria-labelledby="explore-nature-title">
      <header className="content-page__intro">
        <p className="content-page__eyebrow">Dagens natur</p>
        <h1 id="explore-nature-title">Utforsk naturen{place}</h1>
        <p>
          Her skal regnskapsgrunnlaget kunne utforskes mer detaljert og suppleres
          med andre naturdata. Det skal være tydelig hva som er del av selve
          naturregnskapet, og hva som er supplerende innsikt.
        </p>
      </header>

      <section className="content-page__section" aria-labelledby="account-basis-title">
        <div className="section-heading">
          <p className="section-heading__kicker">Regnskapsgrunnlag</p>
          <h2 id="account-basis-title">Heldekkende informasjon om dagens natur</h2>
        </div>
        <div className="info-card info-card--wide">
          <span className="status-tag">Neste datautvidelse</span>
          <h3>Mer detaljert naturinndeling</h3>
          <p>
            Dagens prototype viser Level0-kategoriene Natur, Jordbruk og Bebygd.
            Videre detaljering skal bygge på et heldekkende og versjonert
            grunnlag, med dokumentert kobling mellom klassifikasjoner.
          </p>
          <p className="info-card__note">
            Naturkart og andre nye datakilder kan bidra til mer detaljert
            naturinformasjon, men rollen i selve regnskapsgrunnlaget må avklares.
          </p>
        </div>
      </section>

      <section className="content-page__section" aria-labelledby="themes-title">
        <div className="section-heading">
          <p className="section-heading__kicker">Supplerende innsikt</p>
          <h2 id="themes-title">Temadata som kan gi mer kontekst</h2>
          <p>
            Temalag kan være viktige i arealplanlegging, men er ikke automatisk
            en del av det heldekkende regnskapsgrunnlaget.
          </p>
        </div>
        <div className="theme-grid">
          {supplementalThemes.map((theme) => (
            <article className="theme-card" key={theme}>
              <span className="status-tag status-tag--muted">Ikke koblet til ennå</span>
              <h3>{theme}</h3>
              <p>
                Datadekning, versjon og riktig bruk må beskrives når temaet
                kobles til løsningen.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="future-panel" aria-labelledby="future-nature-title">
        <p className="future-panel__label">Videreutvikling</p>
        <h2 id="future-nature-title">Tilstand og økosystemtjenester</h2>
        <p>
          Tilstand og økosystemtjenester er viktige deler av naturregnskap på
          sikt, men skal ikke framstilles som ferdige kommunale regnskapsdeler i
          denne første versjonen.
        </p>
      </section>
    </section>
  )
}
