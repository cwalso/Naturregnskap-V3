import { useState } from 'react'

import {
  thematicDatasets,
  type ThematicDatasetId,
} from '../datasets/registry'

interface ExploreNaturePageProps {
  readonly municipalityName?: string
  readonly onOpenThematicLayer?: (datasetId: ThematicDatasetId) => void
}

type ThemeId = 'valued' | 'protected' | 'reindeer' | 'infrastructure-free' | 'urban'

interface ThemeDefinition {
  readonly id: ThemeId
  readonly name: string
  readonly icon: string
  readonly description: string
  readonly use: string
  readonly limitation: string
}

const supplementalThemes: readonly ThemeDefinition[] = [
  {
    id: 'valued',
    name: 'Verdsatte naturtyper',
    icon: '◫',
    description: 'Kartlagte og verdsatte naturtyper som supplerende innsikt.',
    use: 'Kan gi mer detaljert kunnskap om naturverdier i konkrete områder og støtte videre planfaglige vurderinger.',
    limitation: 'Er ikke heldekkende og skal ikke uten metodisk avklaring brukes som selve regnskapsgrunnlaget.',
  },
  {
    id: 'protected',
    name: 'Verneområder',
    icon: '◆',
    description: 'Verneområder og relevante avgrensninger.',
    use: 'Kan synliggjøre områder med formelt vern og gi viktig kontekst i arealplanlegging.',
    limitation: 'Beskriver ikke naturen utenfor verneområdene og er et tematisk supplement til regnskapet.',
  },
  {
    id: 'reindeer',
    name: 'Villreinområder',
    icon: '⌁',
    description: 'Villreinområder og relevante temadata.',
    use: 'Kan gi relevant arealkontekst der kommunen berører villreinområder eller funksjonsområder.',
    limitation: 'Er geografisk relevant bare for enkelte kommuner og inngår ikke som heldekkende regnskapskategori.',
  },
  {
    id: 'infrastructure-free',
    name: 'Inngrepsfri natur',
    icon: '◎',
    description: 'Inngrepsfri natur og utvikling i relevante soner.',
    use: 'Kan gi innsikt i avstand til tyngre tekniske inngrep og utvikling i inngrepsfrie soner.',
    limitation: 'Er en tematisk indikator og må ikke blandes sammen med økosystemtype eller naturtilstand.',
  },
  {
    id: 'urban',
    name: 'Bynatur',
    icon: '○',
    description: 'Supplerende data om natur i tettbygde og bynære områder.',
    use: 'Kan gi bedre innsikt i grønnstruktur og natur i områder der grov arealklassifisering alene gir lite detalj.',
    limitation: 'Datagrunnlag og definisjon må avklares før dette kan presenteres sammenlignbart mellom kommuner.',
  },
] as const

export function ExploreNaturePage({ municipalityName, onOpenThematicLayer }: ExploreNaturePageProps) {
  const place = municipalityName ? ` i ${municipalityName}` : ''
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>('valued')
  const selectedTheme = supplementalThemes.find((theme) => theme.id === selectedThemeId) ?? supplementalThemes[0]
  const selectedDataset = thematicDatasets.find((dataset) => dataset.themeId === selectedTheme.id)

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

      <section className="nature-basis" aria-labelledby="account-basis-title">
        <div className="nature-basis__main">
          <span className="section-tag">Regnskapsgrunnlag</span>
          <h2 id="account-basis-title">Heldekkende informasjon om dagens natur</h2>
          <p>
            Første versjon bygger på et felles, heldekkende og etterprøvbart
            arealgrunnlag. Mer detaljert naturinndeling må kunne kobles til dette
            grunnlaget uten å svekke sammenlignbarhet og sporbarhet.
          </p>
        </div>
        <aside className="nature-basis__status">
          <span className="status-tag">Neste datautvidelse</span>
          <strong>Mer detaljert naturinndeling</strong>
          <p>
            Dagens prototype viser Natur, Jordbruk og Bebygd. Neste detaljnivå
            kobles inn når heldekkende datagrunnlag og klassifikasjon er avklart.
          </p>
        </aside>
      </section>

      <section className="content-page__section" aria-labelledby="themes-title">
        <div className="section-heading">
          <span className="section-tag">Supplerende innsikt</span>
          <h2 id="themes-title">Se nærmere på naturen</h2>
          <p>
            Temadata kan gi viktig innsikt i arealplanlegging og naturforvaltning,
            men inngår ikke nødvendigvis i selve regnskapsgrunnlaget. Velg et tema
            for å se hvordan det er tenkt brukt.
          </p>
        </div>

        <div className="theme-explorer">
          <div className="theme-grid" role="list" aria-label="Naturtema">
            {supplementalThemes.map((theme) => {
              const isSelected = theme.id === selectedTheme.id
              const dataset = thematicDatasets.find((item) => item.themeId === theme.id)
              return (
                <button
                  type="button"
                  className={isSelected ? 'theme-card theme-card--selected' : 'theme-card'}
                  key={theme.id}
                  onClick={() => setSelectedThemeId(theme.id)}
                  aria-pressed={isSelected}
                >
                  <div className="theme-card__icon" aria-hidden="true">{theme.icon}</div>
                  <strong>{theme.name}</strong>
                  <span>{theme.description}</span>
                  <span className={dataset ? 'status-tag' : 'status-tag status-tag--muted'}>
                    {dataset ? 'Koblet til kart' : 'Ikke koblet til ennå'}
                  </span>
                </button>
              )
            })}
          </div>

          <article className="theme-detail" aria-live="polite">
            <div className="theme-detail__header">
              <div className="theme-card__icon" aria-hidden="true">{selectedTheme.icon}</div>
              <div>
                <p className="theme-detail__eyebrow">Supplerende temadata</p>
                <h3>{selectedTheme.name}</h3>
              </div>
            </div>
            <dl>
              <div>
                <dt>Hva kan dette bidra med?</dt>
                <dd>{selectedTheme.use}</dd>
              </div>
              <div>
                <dt>Viktig avgrensning</dt>
                <dd>{selectedTheme.limitation}</dd>
              </div>
              <div>
                <dt>Status</dt>
                {selectedDataset ? (
                  <dd>
                    <strong>Koblet til kartvisningen.</strong> Kilde: {selectedDataset.publisher}.
                    Dekning: {selectedDataset.coverage.label}. Treff
                    {municipalityName ? ` i ${municipalityName}` : ' i valgt kommune'} er ikke
                    automatisk evaluert i prototypen.
                  </dd>
                ) : (
                  <dd>Datakilde, dekning, versjon og presentasjon er ikke koblet til prototypen ennå.</dd>
                )}
              </div>
              {selectedDataset && (
                <div>
                  <dt>Kilde og videre bruk</dt>
                  <dd>
                    <a href={selectedDataset.metadataUrl} target="_blank" rel="noreferrer">
                      Se metadata hos Miljødirektoratet
                    </a>
                    {onOpenThematicLayer && (
                      <button
                        type="button"
                        className="theme-detail__map-action"
                        onClick={() => onOpenThematicLayer(selectedDataset.id)}
                      >
                        Vis {selectedTheme.name.toLowerCase()} i kart <span aria-hidden="true">→</span>
                      </button>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </article>
        </div>
      </section>

      <section className="classification-note" aria-labelledby="classification-title">
        <div>
          <p className="classification-note__label">Metodisk kobling</p>
          <h2 id="classification-title">Grunnkart, Naturkart og andre datakilder må henge sammen</h2>
        </div>
        <p>
          Grunnkart for arealanalyse er det sentrale heldekkende grunnlaget i
          første versjon. Naturkart og andre kilder kan gi mer detaljert
          naturinformasjon, men koblingen mellom klassifikasjoner, versjoner og
          oppdateringsregimer må være dokumentert før dataene brukes i selve
          regnskapet.
        </p>
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
