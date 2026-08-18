# Arkitekturoversikt – Kommunale naturregnskap V3

## Mål

V3 skal være en profesjonell, modulær prototype som kan utvikles trinnvis uten at kartvisning, datatilgang, analysemetode og UI blir tett koblet sammen.

## Prinsipiell arkitektur

```text
Webapp
  React + TypeScript + Vite
  OpenLayers
        |
        | HTTP/JSON
        v
Analyse-API
  FastAPI + Python
  domene
  analyse
  datakildeadaptere
  rapportgrunnlag
        |
        +--> eksterne WMS/WFS/REST/API
        +--> forhåndsprosesserte/lokale data ved behov
```

## Ansvarsdeling

### Frontend

Frontend har ansvar for:

- brukerflyt
- kommunevalg
- kartvisning
- visning av aktive lag
- presentasjon av analyseresultater
- sammenligning av scenarier
- opplasting/initiering av analyse
- visning av metadata, usikkerhet og datamangler

Frontend skal ikke eie faglige beregningsregler eller autoritative arealberegninger.

### Presentation architecture

Frontendens presentasjonskjede er eksplisitt lagdelt:

```text
domain/data
    ↓
typed view model
    ↓
presentational components
    ↓
layout
    ↓
theme
```

Presentasjonskomponenter mottar ferdige view data via props og kjenner ikke API-endepunkter, datakilder eller beregningsmetode. Layout styrer plassering og responsiv oppførsel, mens semantiske design tokens kobler komponentene til et separat theme. Dermed kan fagmodellen og datakontraktene være stabile når uttrykket itereres gjennom brukertesting, og et redesign kan i hovedsak gjennomføres ved å bytte theme, layout eller presentasjonskomponenter.

### Analyse-API

Backend har ansvar for:

- analyse- og domenelogikk
- geometriske operasjoner
- normalisering av opplastede geografiske data
- adaptere mot eksterne datakilder
- eksakt klipping når resultatet presenteres som arealtall
- versjonering/sporbarhet for analysegrunnlag
- felles resultatmodell for kart, statistikk og rapport

## Kart og analyse er to forskjellige behov

Samme datasett kan ha ulike tekniske kilder:

- `visualSource`, for eksempel WMS for rask kartvisning
- `analysisSource`, for eksempel WFS, REST, vektordata eller forhåndsprosesserte data

WMS-bilder skal ikke brukes som grunnlag for autoritative arealberegninger.

## Domenemoduler

Frontend og backend skal så langt det er hensiktsmessig organiseres rundt følgende domener:

- `account`
- `nature-status`
- `historical-loss`
- `future-analysis`
- `thematic-data`
- `reporting`
- `map`
- `datasets`

## Datakilder

Eksterne tjenester skal isoleres bak adaptere. Analysemoduler skal ikke kjenne detaljer om GeoServer, ArcGIS REST eller en konkret WFS dersom dette kan unngås.

Et lite sentralt datasettregister er innført for de datasettene som faktisk er
koblet til løsningen. Registeret konkretiseres trinnvis og holder informasjon om:

- identifikator
- navn
- kategori
- dataeier
- visualiseringskilde
- analysekilde
- versjon/gyldighetsdato
- metadata
- eksplisitt skille mellom visualiseringskilde og eventuell analysekilde

Felt for dekningsgrad og analysemuligheter innføres først når implementert
funksjonalitet trenger dem.

## Geometri

BBOX kan brukes til grov filtrering eller ytelsesoptimalisering.

Når et resultat presenteres som arealtall for en kommune, plan eller annet analyseområde, skal beregningen bygge på eksplisitt definert geometri og korrekt klipping/interseksjon.

## Plananalyse

Gjeldende og foreslått KPA skal modelleres med samme underliggende scenariomodell. Sammenligning skal skje mellom standardiserte analyseresultater, ikke gjennom separat spesiallogikk i UI.

## Sporbarhet

Et analyseresultat skal etter hvert kunne peke tilbake på:

- kommune/analyseområde
- datakilder og dataversjoner
- metode-/regelsettversjon
- tidspunkt for beregning
- eventuell usikkerhet eller datamangler

## Foreslått repo-struktur

```text
apps/
  web/
    src/
      app/
      features/
        account/
        nature-status/
        historical-loss/
        future-analysis/
        reporting/
      components/
      datasets/
      api/
      map/
      styles/
    tests/

  api/
    app/
      api/
      domain/
      adapters/
      analysis/
      services/
      datasets/
      reporting/
    tests/

docs/
  architecture/
  decisions/
  product/
  data/

samples/
  plans/
```

Strukturen er et utgangspunkt. Den skal ikke fylles med tomme abstraksjoner før funksjonalitet krever dem.
