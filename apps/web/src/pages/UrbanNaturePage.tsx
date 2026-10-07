import type { ReactNode } from 'react'

import type { AccountOverviewData } from '../features/account-overview/model'

interface UrbanNaturePageProps {
  readonly municipalityName: string
  readonly accountData?: AccountOverviewData | null
  readonly accountState?: 'idle' | 'loading' | 'error'
  readonly onBack: () => void
  readonly mapContent?: ReactNode
}

const areaFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })

function dekar(areaKm2: number): string {
  return `${areaFormatter.format(areaKm2 * 1000)} dekar`
}

export function UrbanNaturePage({
  municipalityName,
  accountData,
  accountState = 'idle',
  onBack,
  mapContent,
}: UrbanNaturePageProps) {
  const built = accountData?.metrics.find((metric) => metric.id === 'built')
  const builtArea = built?.areaKm2 ?? null

  return (
    <section className="content-page thematic-page thematic-page--editorial urban-nature-page" aria-labelledby="urban-nature-title">
      <nav className="thematic-breadcrumb" aria-label="Brødsmuler">
        <button type="button" onClick={onBack}>Kommuneoversikt</button>
        <span aria-hidden="true">›</span>
        <span>Bynaturen (grå arealer)</span>
      </nav>

      <header className="thematic-hero">
        <div className="thematic-hero__content">
          <div className="thematic-hero__title-row">
            <span className="thematic-hero__icon urban-nature__icon" aria-hidden="true">▦</span>
            <h1 id="urban-nature-title">Bynaturen (grå arealer)</h1>
          </div>
          <p className="thematic-hero__lead">
            Grå arealer er områder som allerede er tatt i bruk eller sterkt
            påvirket av bygge- og anleggsaktivitet. I denne prototypen brukes
            bebygd og opparbeidet areal fra Grunnkartet som en enkel inngang til
            temaet.
          </p>

          <div className="thematic-questions">
            <details>
              <summary>Hva er grå arealer?</summary>
              <p>
                Begrepet omfatter blant annet bebyggelse, veger, parkeringsplasser
                og andre permanente eller sterkt opparbeidede flater.
              </p>
            </details>
            <details>
              <summary>Hvorfor er dette relevant for naturregnskapet?</summary>
              <p>
                Oversikt over allerede utbygde og opparbeidede arealer kan støtte
                vurderinger av fortetting og gjenbruk, og dermed redusere presset
                på natur- og jordbruksarealer.
              </p>
            </details>
            <details>
              <summary>Hva viser prototypen nå?</summary>
              <p>
                Kart og hovedtall bruker foreløpig bebygd og opparbeidet areal i
                Grunnkart for arealanalyse. Det landsdekkende Kart over grå
                arealer kan senere gi mer detaljert innsikt i blant annet andel
                grønt og grått innenfor de grå arealene.
              </p>
            </details>
          </div>
        </div>

        <div className="thematic-hero__image urban-nature__hero" role="img" aria-label="Illustrasjon av by og bebygde arealer" />
      </header>

      <section className="thematic-kpis" aria-label="Nøkkeltall for grå arealer">
        <article>
          <span>Bebygd og opparbeidet areal i {municipalityName}</span>
          <strong>
            {accountState === 'loading'
              ? '…'
              : accountState === 'error'
                ? 'Ikke tilgjengelig'
                : builtArea === null
                  ? '–'
                  : dekar(builtArea)}
          </strong>
          <small>Foreløpig inngang fra Grunnkart / arealbasert kommuneoversikt</small>
        </article>
        <article>
          <span>Kart over grå arealer</span>
          <strong>Supplerende innsikt</strong>
          <small>
            Eget landsdekkende datasett med mer detaljert informasjon om grå,
            grønne og bebygde flater.
          </small>
        </article>
      </section>

      <aside className="urban-nature__note">
        <span aria-hidden="true">i</span>
        <div>
          <strong>Bynaturen er ikke en egen økosystemtype i regnskapet</strong>
          <p>
            Siden samler kunnskap om den utbygde delen av kommunen. Det bør
            skilles mellom regnskapets bebygde/opparbeidede areal og supplerende
            analyser av grå og grønne flater i byområdene.
          </p>
        </div>
      </aside>

      {mapContent && (
        <section className="thematic-map-section" aria-labelledby="urban-map-title">
          <div className="thematic-section-heading">
            <h2 id="urban-map-title">Grå arealer i {municipalityName}</h2>
            <p>
              Prototypen viser foreløpig bebygd og opparbeidet areal fra
              Grunnkart for arealanalyse, avgrenset til kommunen.
            </p>
          </div>
          {mapContent}
        </section>
      )}

      <section className="thematic-insight-row">
        <div className="thematic-insight-row__text">
          <h2>Videre bruk i arealplanlegging</h2>
          <p>
            Kart over grå arealer kan brukes som supplerende beslutningsstøtte
            for å identifisere allerede påvirkede arealer og undersøke muligheter
            for gjenbruk eller fortetting.
          </p>
        </div>
        <div className="urban-nature__facts">
          <strong>Videre utvikling</strong>
          <p>Aktuelle videre steg er kommunevise nøkkeltall for:</p>
          <ul>
            <li>andel grått areal</li>
            <li>andel grønt innenfor grå arealer</li>
            <li>andel bebygd areal</li>
          </ul>
        </div>
      </section>
    </section>
  )
}
