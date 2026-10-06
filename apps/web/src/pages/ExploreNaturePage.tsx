import { useState } from 'react'

import type {
  ThematicCoverageResponse,
  ThematicDatasetEvaluation,
} from '../api/thematicCoverage'
import {
  thematicDatasets,
  type ThematicDatasetId,
} from '../datasets/registry'

interface ExploreNaturePageProps {
  readonly municipalityName?: string
  readonly thematicCoverage?: ThematicCoverageResponse | null
  readonly thematicCoverageState?: 'idle' | 'loading' | 'error'
  readonly onOpenThematicLayer?: (datasetId: ThematicDatasetId) => void
}

type ThemeId = 'valued' | 'protected' | 'reindeer' | 'infrastructure-free'

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
] as const

function evaluationLabel(
  evaluation: ThematicDatasetEvaluation | undefined,
  state: 'idle' | 'loading' | 'error',
): string {
  if (state === 'loading') return 'Vurderer…'
  if (state === 'error') return 'Kunne ikke vurderes'
  if (!evaluation) return 'Koblet til kart'
  if (evaluation.status === 'hit') return 'Treff i kommunen'
  if (evaluation.status === 'no_hit') return 'Ingen registrerte treff'
  return 'Kunne ikke vurderes'
}

export function ExploreNaturePage({
  municipalityName,
  thematicCoverage,
  thematicCoverageState = 'idle',
  onOpenThematicLayer,
}: ExploreNaturePageProps) {
  const place = municipalityName ? ` i ${municipalityName}` : ''
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>('valued')
  const selectedTheme = supplementalThemes.find((theme) => theme.id === selectedThemeId) ?? supplementalThemes[0]
  const selectedDataset = thematicDatasets.find((dataset) => dataset.themeId === selectedTheme.id)
  const selectedEvaluation = selectedDataset
    ? thematicCoverage?.results.find((item) => item.datasetId === selectedDataset.id)
    : undefined

  return (
    <section className="content-page" aria-labelledby="explore-nature-title">
      <header className="content-page__intro">
        <p className="content-page__eyebrow">Naturregnskap / Dagens natur</p>
        <h1 id="explore-nature-title">Hva slags natur har vi{place}?</h1>
        <p>
          Start med det heldekkende regnskapsgrunnlaget, og bruk temadata for å
          se nærmere på registrerte naturverdier og andre relevante forhold.
          Regnskapsgrunnlag og supplerende temadata holdes tydelig adskilt.
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
          <h2 id="themes-title">Supplerende kunnskap om naturen</h2>
          <p>
            Disse datasettene kan gi viktig innsikt i arealplanlegging og
            naturforvaltning, men inngår ikke nødvendigvis i selve
            regnskapsgrunnlaget. Velg et tema for å se hva som er registrert,
            hvor godt kilden dekker kommunen og hvordan informasjonen kan brukes.
          </p>
        </div>

        <div className="theme-explorer">
          <div className="theme-grid" role="list" aria-label="Naturtema">
            {supplementalThemes.map((theme) => {
              const isSelected = theme.id === selectedTheme.id
              const dataset = thematicDatasets.find((item) => item.themeId === theme.id)
              const evaluation = dataset
                ? thematicCoverage?.results.find((item) => item.datasetId === dataset.id)
                : undefined
              const statusLabel = dataset
                ? dataset.sourceStatus === 'visual-only'
                  ? 'Kartlag tilgjengelig'
                  : evaluationLabel(evaluation, municipalityName ? thematicCoverageState : 'idle')
                : 'Ikke koblet til ennå'
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
                  <span
                    className={
                      dataset && evaluation?.status === 'hit'
                        ? 'status-tag'
                        : 'status-tag status-tag--muted'
                    }
                  >
                    {statusLabel}
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
                    {selectedDataset.sourceStatus === 'visual-only' ? (
                      <>
                        <strong>Kartlaget er koblet til.</strong> Kommuneareal og
                        treffstatus beregnes ikke i denne versjonen. Dette er
                        supplerende visualisering, ikke regnskapsgrunnlag.
                      </>
                    ) : !municipalityName ? (
                      <>
                        <strong>Koblet til kartvisningen.</strong> Velg kommune for å vurdere
                        registrerte treff mot kommunegrensen.
                      </>
                    ) : thematicCoverageState === 'loading' ? (
                      <>
                        <strong>Vurderer registrerte treff.</strong> Kommunegrensen kontrolleres
                        mot kildens feature-lag.
                      </>
                    ) : thematicCoverageState === 'error' ? (
                      <>
                        <strong>Treffstatus kunne ikke hentes nå.</strong> Dette skal ikke tolkes
                        som at kommunen mangler registrerte objekter.
                      </>
                    ) : selectedEvaluation?.status === 'hit' ? (
                      <>
                        <strong>
                          {selectedEvaluation.featureCount === 1
                            ? `1 registrert lokalitet i ${municipalityName}.`
                            : `${selectedEvaluation.featureCount ?? 'Flere'} registrerte objekter i ${municipalityName}.`}
                        </strong>{' '}
                        {selectedEvaluation.note}
                      </>
                    ) : selectedEvaluation?.status === 'no_hit' ? (
                      <>
                        <strong>Ingen registrerte treff i {municipalityName}.</strong>{' '}
                        {selectedEvaluation.note}
                      </>
                    ) : selectedEvaluation?.status === 'unavailable' ? (
                      <>
                        <strong>Kunne ikke vurderes nå.</strong> {selectedEvaluation.note}
                      </>
                    ) : (
                      <>
                        <strong>Koblet til kartvisningen.</strong> Treffstatus er foreløpig
                        ikke tilgjengelig.
                      </>
                    )}
                    {' '}{selectedDataset.attribution}. Dekning: {selectedDataset.coverage.label}.
                    {' '}{selectedDataset.coverage.note}
                    {selectedDataset.analysisSource && thematicCoverage?.warnings.length ? (
                      <span className="theme-detail__provenance">
                        {' '}Datastatus: {thematicCoverage.warnings.join(' ')}
                      </span>
                    ) : null}
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
