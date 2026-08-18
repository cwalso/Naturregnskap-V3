# Kommunale naturregnskap V3

V3 er en modulær prototype for et felles, etterprøvbart grunnlag for kommunale
naturregnskap og framtidig analyse- og beslutningsstøtte. Dette repoet inneholder
det tekniske fundamentet og en første kartflyt. Brukeren kan velge en norsk
kommune, se kommunegrensen og få kartet tilpasset kommunen. Naturregnskap,
naturdata og GIS-analyser er ikke implementert.

## Arkitektur

- `apps/web`: React, TypeScript i strict mode, Vite og OpenLayers. Kartmodulen
  viser Kartverkets topografiske bakgrunnskart og en valgt kommunegrense.
- `apps/api`: FastAPI og Pydantic. API-et tilbyr helsesjekk og egne endepunkter
  for kommuneliste og kommunegrense. Kartverkets Administrative enheter API er
  skjult bak en adapter.

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
`GET /api/municipalities/{municipality_number}/boundary`. Backend må kjøre for
at kommunevelgeren skal fungere. Bakgrunnskartet lastes direkte fra Kartverket
som en ren visualiseringskilde.

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
