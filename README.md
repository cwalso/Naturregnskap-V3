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
- leser ferdig beregnede Level0-resultater som statiske JSON-filer når de finnes

Tunge regnskapsberegninger skal ikke gjøres i nettleseren. Manglende publiserte
resultater vises som `not_available`, ikke som null eller eksempelverdier.

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

## Publiserte Level0-resultater

Frontend leser publiseringsindeksen:

```text
apps/web/public/data/account-overview/2025/index.json
```

En kommune skal bare legges i indeksen når et kontrollert prepared-resultat er
klart. Resultatet publiseres deretter som:

```text
apps/web/public/data/account-overview/2025/<kommunenummer>.json
```

Det skal ikke legges inn syntetiske eller tilnærmede regnskapstall for å fylle
demoen.

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
