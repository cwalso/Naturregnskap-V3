# Arbeidslogg: teknisk fundament for V3.0

**Dato:** 2026-08-18  
**Utgangspunkt:** `4491bd0` (`Add initial V3 domain model`)

## Relevante regler før implementering

- Frontend og analyse-API skal være modulære og kommunisere med HTTP/JSON;
  faglige beregninger skal ikke ligge i React-komponenter.
- Kartvisning, datatilgang og server-side analyse er separate ansvar. OpenLayers
  installeres som teknisk retning, men kart eller GIS-analyse implementeres ikke.
- Domenene `account`, `nature-status`, `historical-loss`, `future-analysis`,
  `thematic-data` og `reporting` skal holdes atskilt. Dette fundamentet innfører
  ingen domenelogikk og endrer derfor ikke disse skillene.
- Løsningen skal bygges i små, testbare steg uten tomme framtidsabstraksjoner,
  reelle datakilder eller tjenester med løpende kostnader.
- Datamangler, dataversjoner og metodeversjoner er viktige senere krav, men det
  etableres ingen analyseresultatmodell i denne grunnmuren.

## Gjennomføring og valg

- Et minimalt React-/TypeScript-/Vite-skall bruker et separat, typet API-lag for
  helsesjekken. Vite videresender `/api` uendret til FastAPI.
- Et minimalt FastAPI-endepunkt returnerer en eksplisitt Pydantic-modell.
- Python-avhengigheter styres med enkle requirements-filer; prosjektet pakkes ikke.
- Vitest og Testing Library tester frontendens statusflyt. Pytest og FastAPIs
  testklient tester backendkontrakten.

## Avgrensning

Ingen naturregnskapsfunksjoner, data, kart, kommunevalg, plananalyse, GIS,
rapportering, autentisering, database, containere eller skytjenester er innført.
