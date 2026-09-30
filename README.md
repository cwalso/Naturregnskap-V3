# Kommunale naturregnskap V3

V3 er en modulær prototype for et felles, etterprøvbart grunnlag for kommunale
naturregnskap og framtidig analyse- og beslutningsstøtte. Brukeren kan søke etter
og velge kommune, se en overordnet Oversikt og utforske kart og supplerende
temadata.

Første regnskapskjerne er et arealbasert utbredelsesregnskap. Nasjonalt
grunnkart for arealanalyse, årsversjon 2025, brukes som heldekkende
regnskapsgrunnlag. Level0-balansen aggregerer Grunnkartets
`okosystemtypeniva1` til Natur, Jordbruk og Bebygd etter et eksplisitt,
versjonert regelsett. Brukerflaten følger godkjent designbaseline og presenterer
domenekategorien `agriculture` som «Dyrket mark», med forklaring om at
kategorien omfatter dyrket mark og grasmark.

WMS brukes fortsatt bare som `visualSource`. Autoritative arealtall beregnes
fra eksplisitt godkjente kommunevise kildefiler, ikke fra kartbilder.

Brukerflaten bruker Kartverkets gråtonekart som standard bakgrunnskart, en lys
profilheader med Miljødirektoratets offisielle logo og en permanent
kart-tegnforklaring som følger aktive faglag. Dette er en tidlig
profiltilpasning, ikke en ferdig eller profilgodkjent løsning.

## Arkitektur

- `apps/web`: React, TypeScript i strict mode, Vite og OpenLayers. Kartmodulen
  viser Kartverkets gråtonebakgrunn, Grunnkartets WMS-lag og en valgt
  kommunegrense. Et lite dataset registry holder metadata og kildekonfigurasjon.
- `apps/api`: FastAPI og Pydantic. API-et tilbyr kommuneliste,
  kommunegrense, Level0-oversikt og egne endepunkter for videre analyse.
  Kommunevise Grunnkart-filer forhåndsprosesseres til sporbare prepared-resultater
  med metodeversjon, kildehash og rekonsiliering. Kartverkets Administrative
  enheter API er skjult bak en adapter.

Frontend bruker samme `/api`-sti i utvikling og ved senere integrasjon. Vites
utviklingsserver videresender lokale kall til FastAPI på port 8000.

## Frontend

Krav: Node.js og npm.

```bash
cd apps/web
npm install
npm run dev
```

Frontend er da tilgjengelig på `http://localhost:5173`.

## Backend

Krav: Python 3.11 eller nyere.

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

API-et er da tilgjengelig på `http://localhost:8000`, og helsesjekken på
`http://localhost:8000/api/health`.

Kommunedata er tilgjengelig via `GET /api/municipalities` og
`GET /api/municipalities/{municipality_number}/boundary`.
Level0-beholdningen leses via
`GET /api/municipalities/{municipality_number}/account-overview`.
Backend må kjøre for at kommunevelger og regnskapsdata skal fungere.
Bakgrunnskart og Grunnkart-WMS lastes som visualiseringskilder; regnskapstall
kommer fra den separate analyse-/prepareringskjeden.

## Browser-preview med GitHub Codespaces

1. Åpne repoet i GitHub.
2. Velg **Code → Codespaces**.
3. Opprett et Codespace på `main`.
4. Vent til det automatiske oppsettet er ferdig.
5. Kjør fra roten av repoet:

   ```bash
   ./.devcontainer/start-preview.sh
   ```

6. Åpne port 5173 når GitHub tilbyr **Open in Browser**.

Previewen kjører bare mens Codespace-et er aktivt. Dette er en
utviklingspreview, ikke en produksjonsdeployment. Frontend bruker backend i det
samme Codespace-et gjennom den eksisterende `/api`-proxyen. Eksterne kilder fra
Kartverket og NIBIO brukes på samme måte som i V3.2.

## Tester og kvalitetskontroll

```bash
cd apps/web
npm test
npm run lint
npm run build
```

```bash
cd apps/api
source .venv/bin/activate
pytest
ruff check .
ruff format --check .
```

## Førende dokumentasjon

Instruksjonene i [`AGENTS.md`](AGENTS.md) og dokumentasjonen under [`docs/`](docs/)
er permanent og førende kontekst for utviklingen. Endringer skal være avgrensede,
reviewes før de tas inn og bevare de etablerte faglige domeneskillene.

[Utviklingsplan for V3-prototypen](docs/utviklingsplan.md)
