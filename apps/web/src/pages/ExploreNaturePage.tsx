interface ExploreNaturePageProps {
  readonly municipalityName?: string
}

const supplementalThemes = [
  { name: 'Verdsatte naturtyper', icon: '◫', description: 'Kartlagte og verdsatte naturtyper som supplerende innsikt.' },
  { name: 'Verneområder', icon: '◆', description: 'Verneområder og relevante avgrensninger.' },
  { name: 'Villreinområder', icon: '⌁', description: 'Villreinområder og relevante temadata.' },
  { name: 'Inngrepsfri natur', icon: '◎', description: 'Inngrepsfri natur og utvikling i relevante soner.' },
  { name: 'Bynatur', icon: '○', description: 'Supplerende data om natur i tettbygde og bynære områder.' },
] as const

export function ExploreNaturePage({ municipalityName }: ExploreNaturePageProps) {
  const place = municipalityName ? ` i ${municipalityName}` : ''

  return (
    <section className="content-page" aria-labelledby="explore-nature-title">
      <header className="content-page__intro">
        <p className="content-page__eyebrow">Naturregnskap / Dagens natur</p>
        <h1 id="explore-nature-title">Utforsk naturen{place}</h1>
        <p>
          Her skal du kunne gå fra den overordnede arealfordelingen til mer
          detaljert kunnskap om naturen. Regnskapsgrunnlag og supplerende
          temadata skal hele tiden være tydelig skilt.
        </p>
      </header>

      <section className="content-page__section" aria-labelledby="account-basis-title">
        <div className="section-heading">
          <span className="section-tag">Regnskapsgrunnlag</span>
          <h2 id="account-basis-title">Heldekkende informasjon om dagens natur</h2>
          <p>
            Første versjon bygger på et felles, heldekkende og etterprøvbart
            arealgrunnlag. Mer detaljert naturinndeling må kunne kobles til dette
            grunnlaget uten å svekke sammenlignbarhet og sporbarhet.
          </p>
        </div>

        <article className="info-card info-card--wide">
          <span className="status-tag">Neste datautvidelse</span>
          <h3>Mer detaljert naturinndeling</h3>
          <p>
            Dagens prototype viser Natur, Jordbruk og Bebygd. Neste steg er å
            kunne utforske naturen mer detaljert når et egnet heldekkende
            datagrunnlag og kobling mellom klassifikasjoner er avklart.
          </p>
          <p className="info-card__note">
            Naturkart er et relevant bidrag til mer detaljert naturinformasjon,
            men rollen mot Grunnkart for arealanalyse og selve regnskapet må
            være tydelig dokumentert.
          </p>
        </article>
      </section>

      <section className="content-page__section" aria-labelledby="themes-title">
        <div className="section-heading">
          <span className="section-tag">Supplerende innsikt</span>
          <h2 id="themes-title">Se nærmere på naturen</h2>
          <p>
            Temadata kan gi viktig innsikt i arealplanlegging og naturforvaltning,
            men inngår ikke nødvendigvis i selve regnskapsgrunnlaget.
          </p>
        </div>

        <div className="theme-grid">
          {supplementalThemes.map((theme) => (
            <article className="theme-card" key={theme.name}>
              <div className="theme-card__icon" aria-hidden="true">{theme.icon}</div>
              <h3>{theme.name}</h3>
              <p>{theme.description}</p>
              <span className="status-tag status-tag--muted">Ikke koblet til ennå</span>
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
          første versjon. Datagrunnlag, metode og bruk må utvikles trinnvis.
        </p>
      </section>
    </section>
  )
}
