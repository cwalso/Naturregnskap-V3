# V3.3: Kommuneoversikt og utskiftbar presentasjonsarkitektur

**Dato:** 2026-08-18  
**Utgangspunkt:** `79ec054` (V3.2.3: header, offisiell logo og permanent kart-tegnforklaring)

## Beslutning og brukerflyt

Kommunevalg er inngangen til naturregnskapet. Før valg vises en enkel starttilstand med den søkbare kommunevelgeren og kartet over Norge, men ingen kommunespesifikk statistikk. Etter valg vises først en overordnet kommuneoversikt, før framtidige detaljtema, med statistikk og kart som én felles hovedflate. På brede skjermer ligger status til venstre og den større kartflaten til høyre; på smale skjermer kommer status før kart.

Regnskapets stabile nivå-0-kategorier modelleres som `nature`, `built` og `agriculture`. De brukerrettede etikettene Natur, Bebygd og Jordbruk ligger separat fra denne modellen. Presentasjonskomponentene mottar et typed view model via props og utfører ikke datainnhenting eller faglige beregninger.

## Tall og kartgrunnlag

Det finnes ennå ingen besluttet, autoritativ `analysisSource` for kommunevise arealtall. Runtime-modellen markerer derfor alle tre kategoriene som `not-calculated`, med nullverdier, og brukerflaten viser «Ikke beregnet ennå». Ingen eksempel-, prototype- eller estimerte tall vises.

Grunnkartets WMS er fortsatt bare `visualSource`. Et WMS-bilde er ferdig kartografi og gir ikke et etterprøvbart grunnlag for eksakt klassifisering og kommunevis arealberegning. WMS-et beholdes uendret som geografisk støtte og framstilles ikke som en ferdig Natur/Bebygd/Jordbruk-visualisering.

Et senere, separat metode- og arkitektursteg må beslutte en analysekilde, eksakt geometri-/klippemetode og sporbar resultatkontrakt. Et framtidig kommune-endepunkt kan da mappes direkte til det etablerte view model-et uten at presentasjonskomponentene trenger å kjenne endepunktet.

## Presentasjonsarkitektur

Visuell presentasjon er et utskiftbart arkitekturlag, ikke en del av fagmodellen:

```text
domain/data → typed view model → presentational components → layout → theme
```

Komponentene bruker semantiske tokens som `--color-surface`, `--color-text` og `--color-border`. Miljødirektoratets konkrete profilverdier ligger i et eget theme, mens grid, bredder, spacing og responsiv rekkefølge ligger i layoutlaget. Et redesign skal derfor kunne bytte theme, komponentutforming og layout uten endringer i kommune-API, kartlogikk og -kilder, dataset adapters, analysekontrakter eller fagmodell. Dette gjør designiterasjon gjennom brukertesting billigere uten å destabilisere faglogikken.
