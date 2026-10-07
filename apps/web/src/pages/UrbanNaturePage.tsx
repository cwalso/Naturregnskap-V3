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
const percentFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })

function dekar(areaKm2: number): string {
  return `${areaFormatter.format(areaKm2 * 1000)} dekar`
}

function percent(value: number): string {
  return `${percentFormatter.format(value)} %`
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
  const classifiedArea = accountData?.metrics.reduce(
    (sum, metric) => sum + (metric.areaKm2 ?? 0),
    0,
  ) ?? 0
  const builtShare = builtArea !== null && classifiedArea > 0
    ? builtArea / classifiedArea * 100
    : null

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
            påvirket av bygge- og anleggsaktivitet. Temaet er særlig relevant når
            kommunen skal vurdere fortetting, transformasjon og gjenbruk framfor
            ny nedbygging av natur- og jordbruksarealer.
          </p>

          <div className="thematic-questions">
            <details>
              <summary>Hva er grå arealer?</summary>
              <p>
                Grå arealer omfatter blant annet bebyggelse, veger, gater,
                parkeringsplasser, konstruksjoner og andre permanente eller sterkt
                opparbeidede flater.
              </p>
            </details>
            <details>
              <summary>Hva viser Kart over grå arealer?</summary>
              <p>
                Det landsdekkende datasettet viser hvor de grå arealene ligger.
                Det har også egenskaper for andel grønt, andel grått og andel
                bygninger innenfor de grå polygonene.
              </p>
            </details>
            <details>
              <summary>Hvordan skiller dette seg fra naturregnskapet?</summary>
              <p>
                Naturregnskapets bebygde og opparbeidede areal og Kart over grå
                arealer er beslektede, men ikke identiske størrelser. Gråarealkartet
                bør derfor brukes som supplerende innsikt og beslutningsstøtte.
              </p>
            </details>
          </div>
        </div>

        <div className="thematic-hero__image urban-nature__hero" role="img" aria-label="Illustrasjon av by og bebygde arealer" />
      </header>

      <section className="thematic-kpis" aria-label="Nøkkeltall for bynaturen">
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
          <small>
            Kommuneoversiktens arealkategori. Dette er ikke det samme som samlet
            areal i Kart over grå arealer.
          </small>
        </article>
        <article>
          <span>Andel av klassifisert kommuneareal</span>
          <strong>
            {accountState === 'loading'
              ? '…'
              : builtShare === null
                ? '–'
                : percent(builtShare)}
          </strong>
          <small>
            Beregnet fra natur, jordbruk og bebygd/opparbeidet areal i
            kommuneoversikten.
          </small>
        </article>
      </section>

      <details className="thematic-source-accordion">
        <summary>Hva bygger Kart over grå arealer på?</summary>
        <p>
          Hovedkilden er Grunnkart for arealanalyse. Informasjon om vegetasjon
          kommer fra FKB-Grønnstruktur, mens informasjon om bygninger bygger på
          SSBs bygningsdata. Første versjon er et eget landsdekkende datasett og
          skal ikke blandes direkte med regnskapets bebygde areal.
        </p>
      </details>

      <aside className="urban-nature__note">
        <span aria-hidden="true">i</span>
        <div>
          <strong>Bynaturen er analyse- og beslutningsstøtte rundt den utbygde delen av kommunen</strong>
          <p>
            Det sentrale er å synliggjøre hvor arealer allerede er påvirket, og
            hvor det kan være aktuelt å undersøke fortetting, transformasjon eller
            gjenbruk. Dette er ikke en egen økosystemtype i naturregnskapet.
          </p>
        </div>
      </aside>

      {mapContent && (
        <section className="thematic-map-section" aria-labelledby="urban-map-title">
          <div className="thematic-section-heading">
            <h2 id="urban-map-title">Bebygd og opparbeidet areal i {municipalityName}</h2>
            <p>
              Kartet viser foreløpig regnskapsgrunnlagets bebygde og opparbeidede
              areal. Visningen er avgrenset til valgt kommune.
            </p>
          </div>
          {mapContent}
        </section>
      )}

      <section className="urban-nature__metrics" aria-labelledby="grey-map-contents-title">
        <div className="thematic-insight-row__text">
          <h2 id="grey-map-contents-title">Hva kan Kart over grå arealer fortelle?</h2>
          <p>
            Det separate gråarealkartet er laget for å beskrive allerede påvirkede
            arealer mer detaljert enn naturregnskapets overordnede bebygd-kategori.
          </p>
        </div>
        <div className="urban-nature__metric-grid">
          <article>
            <strong>Andel grønt</strong>
            <p>Hvor stor del av et grått område som har bakke-, busk- eller trevegetasjon.</p>
          </article>
          <article>
            <strong>Andel grått</strong>
            <p>Hvor stor del av området som er vegetasjonsløst eller har permanente overflater.</p>
          </article>
          <article>
            <strong>Andel bygg</strong>
            <p>Hvor stor del av det grå området som er dekket av bygningsgrunnflate.</p>
          </article>
        </div>
      </section>

      <section className="thematic-insight-row">
        <div className="thematic-insight-row__text">
          <h2>Bruk i kommunal arealplanlegging</h2>
          <p>
            Kartet kan brukes til å lete etter allerede påvirkede arealer før nye
            natur- eller jordbruksarealer vurderes for utbygging. Det kan være
            relevant i planvask, rullering av kommuneplanens arealdel og tidlige
            vurderinger av transformasjons- og fortettingsmuligheter.
          </p>
          <p className="thematic-insight-row__source">
            Kilde: Miljødirektoratet, Kart over grå arealer
          </p>
        </div>
        <div className="urban-nature__facts">
          <strong>Det kommunen kan undersøke videre</strong>
          <ul>
            <li>hvor de grå arealene ligger</li>
            <li>hvilke områder som har stor andel grått eller liten andel grønt</li>
            <li>om arealene kan være aktuelle for gjenbruk eller transformasjon</li>
            <li>hvordan de ligger i forhold til planreserve og framtidige utbyggingsområder</li>
          </ul>
        </div>
      </section>

      <div className="thematic-questions thematic-questions--wide">
        <details>
          <summary>Er alt bebygd areal et grått areal?</summary>
          <p>
            Ikke nødvendigvis. Kart over grå arealer følger egne utvalgsregler og
            kombinerer flere egenskaper. Kommuneoversiktens bebygd-kategori må
            derfor ikke brukes som direkte erstatning for gråarealkartet.
          </p>
        </details>
        <details>
          <summary>Viser kartet planstatus eller eierskap?</summary>
          <p>
            Nei. Første versjon av Kart over grå arealer inneholder ikke
            informasjon om planstatus eller eierskap. Slike vurderinger krever
            kobling mot andre datakilder.
          </p>
        </details>
      </div>

      <section className="thematic-faq" aria-labelledby="urban-source-title">
        <h2 id="urban-source-title">Kilder og metode</h2>
        <details>
          <summary>Hvor finner jeg Kart over grå arealer?</summary>
          <p>
            <a
              href="https://www.miljodirektoratet.no/ansvarsomrader/overvaking-arealplanlegging/arealplanlegging/kart-over-gra-arealer/"
              target="_blank"
              rel="noreferrer"
            >
              Les om Kart over grå arealer hos Miljødirektoratet
            </a>
          </p>
        </details>
        <details>
          <summary>Hvor finner jeg datasettet?</summary>
          <p>
            <a
              href="https://kartkatalog.geonorge.no/metadata/uuid/c5f09d79-1546-495c-8b36-91efd4008bd7"
              target="_blank"
              rel="noreferrer"
            >
              Se datasettet i Geonorge
            </a>
          </p>
        </details>
      </section>
    </section>
  )
}
