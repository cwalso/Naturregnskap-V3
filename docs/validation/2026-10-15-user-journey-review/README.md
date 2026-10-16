# Evidens og reproduksjon, 15.10.2026

Hovedrapport: [brukerreisekontroll](../2026-10-15-user-journey-review.md).
[Issue #77](https://github.com/cwalso/Naturregnskap-V3/issues/77).

## Faktisk evidens

Rotmappen inneholder **45 originale PNG-skjermbilder** fra Chromium 151 mot
uendret produksjonsbygg av publisert SHA
`b13670daf12b6b9ac276e1eb2200846912827c97`. Hvert bilde har en `.txt` med faktisk
synlig sidetekst (og innhold i rullbare paneler), med avsluttende
blanktegn på linjer fjernet ved arkivering. Ingen mockup eller bearbeidet
skjermbilde brukes. Filnavnet angir scenario, tilstand og viewportbredde.
Loggen har 46 opptak: `C-area-all-1440` tas to ganger, og den siste
bildefilen beholdes. Supplementets seks bilder gir totalt 51 unike PNG-filer.
`review.json` har målinger, nettleserhandlinger, fullføringsstatus,
JavaScript-feil, axe-core 4.14.0-resultater og nettverkstelling per vert/status.
Nettverksloggens lange, gjentatte WMS-URL-er er aggregert ved arkivering;
ingen kart-/beregningsdata er konstruert for å erstatte feilede reelle kall.
`published.json` dokumenterer publisert SHA og deployment.

Hovedgjennomgangens nettverk inneholder 806 forespørsler: 783 HTTP 200,
hvorav 258 gjenbruker uendret svar fra samme sesjon, og 23 HTTP 403 til
`images.unsplash.com`. Dette gir ikke et ytelsesmål. Kontrollert DiBK 503
utføres etterpå og logges separat i `controlledFailures`; den passerer ikke
den ordinære nettverkstelleren. `F-controlled-plan-error-1440.png` er derfor
en uttrykkelig simulert tjenestefeil, med øvrige data reelle.

`supplement/` er en **separat kildekjøring**, ikke det uendrede produksjonsbygget:

- Midlertidig Vite-hook gir kontrollverktøyet lesetilgang til eksisterende
  OpenLayers-instans; ingen kartalgoritme erstattes. Panorert senter
  `[276717.3598666664, 7030867.505]` og oppløsning `67.30648333333743` beholdes
  ved kategorivalg, analysebytte, lukking og seks lag av/på.
- En annen hook gir historikkmodellen **ett syntetisk, uttrykkelig demomerket
  samlet intervall 2017–2024**. Verdiene 1 030/255/1 285 er summer av demoen,
  ikke en SSB-leveranse, og brukes ikke som faglige resultater. Faktisk vist
  diagram har én periodegruppe og hver periodevelger ett alternativ, ved
  1440/390/320 px. Etterfølgende arealbruk er satt til `not-in-delivery`.
- Datasettoverstyringen fjernes før Myr-/skog-/kartkontrollene. Myrbildet viser
  faktisk kildeberegnet beholdning/økosystemfordeling, ikke syntetiske arealtall.
  Skogkortets faktiske knapp åpner kartet, men åpner ikke analysepanelet.
- `supplement.json`: fullført, seks skjermbilder, ingen JavaScript-feil eller
  sidebredde-overflow. Myrbildet tas etter fullført fordeling, ikke under lasting.

To tidligere forsøk på hovedverktøyet og første supplementforsøk stoppet på
feil i kontrollskriptets locator/antakelse (responsiv lukkeknapp,
kommunevalg etter reload, knapp kontra lenke). Disse er rettet før de
fullførte kjøringene; de regnes ikke som produktfeil og deres avbrutte
skjermbilder inngår ikke i evidensen.

## Slik gjentas kontrollen

Kjør fra `apps/web` i kontrollbranchen. Bruk et separat checkout/worktree av
publisert SHA som testobjekt, med sine installerte avhengigheter og et
vellykket `npm run build`. Ingen produksjonsfil skal redigeres for kontrollen.
Node/Chromium og tilgang til de offentlige data-/karttjenestene må finnes.
Eksempel med absolutte kataloger satt av den som kjører:

```bash
# UX_REVIEW_ROOT: apps/web i worktree ved b13670d, ferdig bygget.
# REVIEW_OUTPUT: egen skrivbar katalog utenfor kildegrunnlaget.
# AXE_SCRIPT: isolert installasjon av axe-core@4.14.0/axe.min.js.
CHROMIUM_PATH=/usr/bin/chromium \
UX_REVIEW_ROOT="$PUBLISHED_WEB_ROOT" \
UX_AXE_PATH="$AXE_SCRIPT" \
BROWSER_OUTPUT="$REVIEW_OUTPUT/production" \
node tests/browser/review-user-journeys.mjs

CHROMIUM_PATH=/usr/bin/chromium \
UX_REVIEW_ROOT="$PUBLISHED_WEB_ROOT" \
BROWSER_OUTPUT="$REVIEW_OUTPUT/supplement" \
node tests/browser/review-user-journeys-supplement.mjs
```

`UX_AXE_PATH` utelatt betyr at axe ikke kjøres; den var satt i denne leveransen.
Axe ble installert isolert uten endring av repoets `package.json`/lockfil.
Verktøyene bruker miljøets eksisterende `HTTPS_PROXY` til eksterne tjenester;
de forsøker ikke å omgå nettverkspolicy. De trenger nettverkstillatelse også
for lokale Chromium-/Vite-sockets i et begrenset Codex-miljø.
Lokal produksjons-preview er bygget med standard base `/`; Pages bygger med
`--base=/Naturregnskap-V3/`. Kildecommit er identisk; serverte artefaktbytes
er ikke kontrollert via Pages. Node v24.19.0 og Chromium 151.0.7922.173 ble brukt.
Portene er 5215 for produksjonsbygget og 5216 for supplementet; kjør sekvensielt.
Tjenesteinnhold kan endres senere, så arkiverte målinger gjelder kontrollens dato.

Faktisk kjørt i tillegg: `npm test` (178/178), `npm run lint` (0 feil,
ett eksisterende varsel), `npm run build` (vellykket med eksisterende
chunkstørrelsesvarsel), `node --check` for begge verktøy og `git diff --check`.
Ingen backend-/ny metodevalidering, skjermlesertest eller fysisk mobiltest.
