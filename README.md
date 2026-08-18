# Kommunale naturregnskap V3

V3 er en modulær prototype for et felles, etterprøvbart grunnlag for kommunale
naturregnskap og framtidig analyse- og beslutningsstøtte. Dette repoet inneholder
foreløpig bare det tekniske fundamentet. Naturregnskap, GIS-analyser og reelle
datakilder er ikke implementert.

## Arkitektur

- `apps/web`: React, TypeScript i strict mode og Vite. OpenLayers er installert
  for senere kartfunksjonalitet, men brukes ikke ennå.
- `apps/api`: FastAPI og Pydantic. API-et tilbyr foreløpig bare
  `GET /api/health`.

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
