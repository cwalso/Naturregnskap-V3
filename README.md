# Kommunale naturregnskap V3

V3 er en teknisk prototype for å prøve ut et felles og etterprøvbart grunnlag
for kommunale naturregnskap. Prototypen utvikles trinnvis. Første versjon
handler først og fremst om et arealbasert naturregnskap, datagrunnlag,
sporbarhet og forståelig bruk i kommunal arealforvaltning.

Den offentlige testflaten ligger på:

https://cwalso.github.io/Naturregnskap-V3/

## Enkel demoarkitektur

GitHub Pages er den eneste runtime-komponenten som trengs for den offentlige
demoen.

```text
offentlige datakilder
        +
offline preparation / beregning
        ↓
statiske, versjonerte resultater
        ↓
React / Vite
        ↓
GitHub Pages
```

Brukerflaten:

- henter kommuneliste og kommunegrense direkte fra Kartverket
- bruker NIBIOs WMS for visualisering av Grunnkart for arealanalyse
- spør relevante offentlige ArcGIS-tjenester direkte for supplerende temadata
- viser foreløpige Natur / Dyrket mark / Bebygd-tall direkte fra SSB tabell 09594
- bruker samme SSB-gruppering som den tekniske Publicdemorepo-demonstratoren

SSB-tallene er en prototypevisning for å få en testbar brukerflate med reelle
kommunetall. De skal ikke forveksles med det endelige Grunnkart-baserte
regnskapsgrunnlaget. Tunge regnskapsberegninger skal ikke gjøres i nettleseren.

## Dataskille

Prototypen skiller mellom:

1. **Regnskapsgrunnlag** – heldekkende og metodebundet grunnlag for selve
   naturregnskapet.
2. **Supplerende temadata** – relevante kartlag som gir ekstra innsikt, men som
   ikke automatisk inngår i regnskapet.
3. **Analyse- og beslutningsstøtte** – videre bruk av regnskap og andre data.
4. **Veiledning og formidling** – nødvendig for riktig forståelse og bruk.

WMS brukes som visualiseringskilde, ikke som beregningsgrunnlag.

## Repo

- `apps/web`: React, TypeScript, Vite og OpenLayers. Dette er den offentlige
  demoen som deployes til GitHub Pages.
- `apps/api`: FastAPI/Python-kode, domenelogikk, adaptere, tester og
  preparation-skript. Denne delen er nyttig for utvikling og databehandling,
  men er ikke en runtime-forutsetning for dagens Pages-demo.
- `docs`: metode-, arkitektur-, beslutnings- og produktdokumentasjon.
- `.data`: lokale analysedata. Mappen versjoneres ikke i Git.

## Foreløpige arealtall fra SSB

Prototypevisningen følger samme enkle gruppering av SSB tabell 09594 som
Publicdemorepo:

- **Bebygd:** arealklasse 01–14
- **Dyrket mark:** arealklasse 15–16
- **Natur:** arealklasse 17, 18, 19, 20, 21 og 24
- **Ferskvann:** 22.01 og 22.02 hentes, men inngår ikke i de tre hovedtallene

Nyeste tilgjengelige årgang hentes med `Tid=top(1)`. Dette er en eksplisitt
prototypemetode. Når et godkjent Grunnkart-basert Level0-resultat foreligger,
skal det kunne erstatte SSB-visningen uten at domenekategoriene i brukerflaten
må endres.

## Trondheim-oversiktsraster

For Trondheim (5001) ligger et prototype-raster fra samme demonstrasjonsløp som
Publicdemorepo under:

```text
apps/web/public/data/grunnkart/2025/overview/5001.png
```

Metadata og geografisk utstrekning ligger i `overview/index.json`. Rasteret er
ca. 19,72 meter per piksel i EPSG:25833 og kan brukes som oversiktsgrunnlag for
kart- og pikselbasert prototypeanalyse. Det brukes **ikke** som kilde til de tre
hovedtallene i dagens visning; disse hentes foreløpig fra SSB tabell 09594.

## Lokal frontend

Krav: Node.js og npm.

```bash
cd apps/web
npm install
npm run dev
```

Frontend er da tilgjengelig på `http://localhost:5173`.

## Python/FastAPI for utvikling og preparation

Krav: Python 3.11 eller nyere.

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

FastAPI-koden beholdes som utviklings- og teststøtte og for eksisterende
preparation-/domenelogikk. Den offentlige GitHub Pages-demoen skal ikke være
avhengig av at denne prosessen kjører.

## GitHub Codespaces

Codespaces kan fortsatt brukes når frontend, Python-verktøy og lokale
preparation-løp skal testes samlet:

```bash
./.devcontainer/start-preview.sh
```

For vanlig funksjonell test av den publiserte brukerflaten skal det ikke være
nødvendig å starte et Codespace.

## Tester og kvalitetskontroll

Frontend:

```bash
cd apps/web
npm test
npm run lint
npm run build
```

Backend/preparation:

```bash
cd apps/api
source .venv/bin/activate
pytest
ruff check .
```

Pull requests og `main` kjøres gjennom GitHub Actions quality gate. Endringer
i frontend deployes automatisk til GitHub Pages etter merge til `main`.

## Førende dokumentasjon

Instruksjonene i [`AGENTS.md`](AGENTS.md) og dokumentasjonen under
[`docs/`](docs/) er førende kontekst for videre utvikling.

[Utviklingsplan for V3-prototypen](docs/utviklingsplan.md)
