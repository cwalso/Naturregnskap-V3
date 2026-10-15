# Dokumentasjon – Kommunale naturregnskap V3

**Sist oppdatert: 12.10.2026**

Denne siden viser hvilke dokumenter som er levende styringsdokumenter og hvilke
som er historiske beslutningslogger.

## Leserekkefølge for Codex og utviklere

1. [AGENTS.md](../AGENTS.md)
2. [Utviklingsplan](utviklingsplan.md)
3. [Produktprinsipper](product/principles.md)
4. [Analysebrukerhistorier](product/analysis-user-stories.md)
5. [Designføringer](product/design-guidelines.md)
6. [Arkitekturoversikt](architecture/overview.md)
7. relevante data-/metodedokumenter
8. relevante ADR-er

## Levende dokumenter

Disse skal oppdateres når dagens løsning eller retning endres:

- `../AGENTS.md`
- `../README.md`
- `utviklingsplan.md`
- `product/principles.md`
- `product/analysis-user-stories.md`
- `product/design-guidelines.md`
- `architecture/overview.md`
- `architecture/domain-model.md`
- `architecture/development-model.md`
- `architecture/v3-target-architecture-demo-reference.md`
- `data/grunnkart-2025-analysis-source.md`

## Historiske beslutninger

Dokumenter under `decisions/` er ADR-er.

De skal normalt **ikke omskrives** når retningen senere endres. Lag heller en ny
ADR som:

- beskriver ny beslutning
- peker på hva den erstatter eller presiserer
- forklarer konsekvensene

Dette gjør historikken etterprøvbar.

## Research

Dokumenter under `research/` beskriver undersøkelser på et gitt tidspunkt.

De skal ikke automatisk behandles som gjeldende arkitektur eller metode dersom
senere beslutninger har endret retningen.

## Viktige nye ADR-er per 08.10.2026

- analyseverkstedet i Utforsk i kart
- tegnet polygon som analyseområde
- delt request-/flispipeline
- temasidesett og kommuneavgrensning
- kildegeometri, objektvalg og høyeste verdi ved overlapp i analyseverkstedet

Se `decisions/`.

Gjeldende Utforsk-rute viser sju uavhengige kartlag uten automatisk kryssanalyse.
Se [seks lag og kildevalg](decisions/2026-10-12-v3-six-explore-layers.md),
[reell Trondheim-/Dovre-kontroll](validation/2026-10-12-six-explore-layers.md) og
[samtidige kartlag](decisions/2026-10-09-v3-concurrent-map-layers.md) og
[A–L-kontroll med skjermbilder](validation/2026-10-09-concurrent-map-layers.md). De tidligere tre
kartvisningene og korrigert planvisning er manuelt godkjent.

Tidligere overgang til selvstendige karttemaer er dokumentert i [tidligere beslutning](decisions/2026-10-09-v3-independent-map-themes.md)
og [validering med skjermbilder](validation/2026-10-09-independent-map-themes.md).
Denne beslutningen erstatter den aktive kartflyten i
`2026-10-09-v3-explore-analysis-map.md`; analysemetoden og verkstedet beholdes.
[Korrigert planpresentasjon](decisions/2026-10-09-v3-future-development-display.md)
presiserer at bare Natur/Jordbruk innenfor planformålene vises.
[Ny Trondheim-kontroll](validation/2026-10-09-future-development-display.md)
inkluderer råpikselkontroll, referansesammenligning og faktiske skjermbilder.
Pages-testpublisering gjøres fra PR-branchen uten merge.
Kommuneoversikt og Naturtapet deler fra 14.10 tydelig merkede historiske demodata;
se [struktur/SSB-avklaringer](product/historical-loss-pages.md) og
[tester og skjermbilder](validation/2026-10-14-historical-loss.md).
Planområdenes heldekkende arealfordeling er primæranalyse fra 14.10, adskilt fra
registrerte naturverdier. Se [metode](decisions/2026-10-14-plan-land-cover-area.md)
og [A/B/C-kontroller](validation/2026-10-14-plan-area.md).
[Undersøkelse av ufordelt natur](validation/2026-10-14-unclassified-plan-nature.md)
skiller bildeavvisning fra nivå-0-/detaljkonflikt og vurderer direkte geodata.
Den foreslår en valideringspilot; ingen produksjonsmetode er endret.
[Direkte Grunnkart-pilot: tilgang og kjørbart lokalt oppsett](validation/2026-10-14-direct-grunnkart-pilot.md)
stopper reell geometriundersøkelse inntil korrekt 2025-fil og bruksrett er bekreftet.
[Grå arealer i Trondheim, leveranse A](validation/2026-10-14-grey-areas-trondheim.md)
kontrollerer Issue #78, vektortilgang, tre separate bruksrettigheter og firekategori-
modellen. A består ikke; geografisk B og implementering C er ikke gjennomført.
[Brukerreise- og UX-kontroll 15.10](validation/2026-10-15-user-journey-review.md)
følger scenario A–F fra Issue #77 i reell Chromium ved fire bredder, med
faktiske skjermbilder og fem prioriterte tiltak. Kun undersøkelse; ingen
produksjonsendring eller ny Pages-publisering.
[Differanseanalyse av økosystemoverlapp 15.10](validation/2026-10-15-ecosystem-overlap-differences.md)
reproduserer temaside-/planarealtall og forklarer forskjellene ved sampling,
smalfeltfilter og fargeregel, med uavhengig offline- og geografisk kontroll.
Ingen produksjonsrettelse eller metodebeslutning er implementert.
[Visuell korreksjon 12.10](validation/2026-10-12-layer-panel-and-plan-hatch.md)
dokumenterer lagpanel uten horisontal overflow og planlagets nye skravur.

ADR-en `2026-10-08-v3-public-prototype-branding.md` erstatter den tidligere
føringen i `2026-08-18-v3-2-3-header-logo-and-map-legend.md` om bruk av
Miljødirektoratets logo. Den eldre ADR-en beholdes uendret som historikk og er
ikke en gjeldende UI-regel.

## Vedlikeholdsregel

Når en PR endrer faglig rolle, analysemetode, brukerflyt, arkitektur,
ytelsesstrategi eller offentlig presentasjon, skal relevant dokumentasjon
vurderes i samme PR.

Hvis dokumentasjonen ikke oppdateres fordi endringen er ren refaktorering eller
feilretting uten endret kontrakt, bør dette være bevisst.

Grå arealer er koblet inn via NIBIOs offisielle `graastruktur`-WMS, med
`graa_arealer`, `andel_uten_vegetasjon` og `andel_med_vegetasjon` bak én
avkryssing. Framstillingsvalg bevarer lag, opasitet, filter/valg og utsnitt.
Kildens estimater og GetLegendGraphic brukes direkte; ingen egen prosent-
eller arealberegning. Testversjon 1 har sammensatt kildegrunnlag og er ikke
lik nivå-0-klassen Bebygd. Kildens målestokkgrense 1:250 000 håndteres som
`out-of-scale`, med forklaring og uten automatisk zoom. FKB-Grønnstruktur
er teknisk kontrollert, men publiseres ikke før Norge digitalt-bruksrett
for denne offentlige prototypen er dokumentert. Gråareal-WMS-en har egne
tjenestevilkår uten begrensninger; nedlastbare data har annen lisens.
Se [kilde-/kartkontroll](validation/2026-10-12-grey-areas.md).

## Utforsk-design V2

[Godkjent panelstruktur](decisions/2026-10-12-v3-explore-design-v2.md) og
[implementeringskontroll](validation/2026-10-12-explore-design-v2.md) beskriver
A/B/C, reelle kartkontroller, faktiske screenshots og visuell sammenligning.

[Sluttverifikasjon før ny publisering](validation/2026-10-12-explore-design-v2-final.md)
viderefører start-HEAD f9a2eba med ny fokusregresjon, 128 frontendtester og
reelle A/B/C-kontroller. Kartmotor og datametoder er beholdt.

## Geometrisk planoverlapp, 13.10.2026

- [Godkjent prototypekonvensjon og teknisk kontrakt](decisions/2026-10-13-v3-geometric-valued-nature-overlap.md)
- [Reell Trondheim-kontroll, sammenligning med gammel metode og skjermbilder](validation/2026-10-13-future-nature.md)
