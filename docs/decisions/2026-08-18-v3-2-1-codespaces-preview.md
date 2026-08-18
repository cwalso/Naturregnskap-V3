# V3.2.1: Browser-preview med GitHub Codespaces

**Dato:** 2026-08-18  
**Utgangspunkt:** `19a19d9` (V3.2: dataset registry og Grunnkart-visualisering)

## Formål og beslutning

GitHub Codespaces brukes som et enkelt utviklingsmiljø slik at V3 kan prøves fra
en nettleser uten oppsett på en bestemt lokal maskin. Dette er kun en midlertidig
utviklingspreview mens Codespace-et kjører, ikke produksjonsdeployment eller en
del av sluttarkitekturen for Kommunale naturregnskap.

En standard devcontainer med Python og Node installerer eksisterende backend- og
frontendavhengigheter ved opprettelse. Ingen nye runtime-avhengigheter eller
containerbygg innføres.

## Porter og oppstart

- Port 5173 brukes av Vite og videresendes som «Naturregnskap V3 preview».
- Port 8000 brukes av FastAPI og videresendes som «Naturregnskap V3 API».
- Portene beholder Codespaces sin standard private synlighet.

`./.devcontainer/start-preview.sh` starter `uvicorn app.main:app` på
`0.0.0.0:8000` og Vite på `0.0.0.0:5173`. Begge kjører under det samme
foreground-scriptet og avsluttes samlet ved signal eller dersom én prosess
stopper. Frontend bruker uendret Vite-proxy for `/api` mot backend på port 8000.

## Arkitektur og avgrensning

Eksisterende React/OpenLayers-frontend, FastAPI-backend, kommuneadapter,
dataset registry og WMS-visualisering endres ikke. Codespaces-konfigurasjonen er
bare utviklingsverktøy og innfører ingen hosting, analysefunksjonalitet eller ny
produktfunksjonalitet.

## Verifikasjon

Oppsett-scriptet, eksisterende frontend- og backendkontroller, oppstart av begge
servere, direkte helsesjekk, Vite-respons og frontendens `/api/municipalities`-
proxy ble testet i Codex-miljøet. Samlet nedstenging med signal ble også testet.
Selve opprettelsen av et GitHub Codespace og GitHubs port-forwarding må
verifiseres i GitHub.
