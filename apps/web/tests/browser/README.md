# Renderkontroll av kart og beholdte analyser

Kjøres fra `apps/web` etter `npm ci`:

```sh
npx playwright install chromium
npm run test:browser
npm run test:browser:layers
npm run test:browser:themes
npm run test:browser:live
npm run test:browser:workspace
```

Ved behov for Linux-systembiblioteker: `npx playwright install --with-deps chromium`.
En allerede installert Chromium kan velges med `CHROMIUM_PATH`.
`BROWSER_OUTPUT` velger outputmappe; standard er den ignorerte
`.browser-results/`. Skriptene starter/lukker egne Vite-servere: 5182 for
analysefixtures, 5181 for trinnvis analyselive-kontroll, 5184 for offentlig
App-rute med samtidige lag og 5186 for lagfixtures.

`test:browser` bruker ekte OpenLayers og Chromium med kontrollerte WMS-bilder,
plan-/treffmasker og lokalitetsgeometri. Den leser piksler fra det sammensatte
skjermbildet, ikke bare lag-state eller eget Canvas. Den kontrollerer tema,
hele gyldige planmasken, overlapp, Natur/Jordbruk, kommuneavgrensning,
identitet, temarydding, filter/objektvalg uten fit, manuell zoom/pan og
opprydding. Kontrollen er i GitHub Quality Gate og krever ikke eksterne
karttjenester. Fixtures er ikke faglig kildevalidering eller visuell aksept
av reelle data.

`test:browser:live` bruker reell Trondheim-grense, naturtype-WMS og uendret
plan-/naturtypeanalyse. A–E tas i samme kartinstans: naturtyper alene, plan
alene, plan + tema uten trefflag, plan + tema + overlapp og Natur/Jordbruk.
Alle trinn får manuell zoom inn/ut og pan. Deretter kontrolleres temarundtur og
390 px. `results.json` dokumenterer navigasjon og HTTP-status/PNG-signatur for
reelle DiBK-kall. Visuell godkjenning krever også manuell bildekontroll.

`test:browser:layers` kontrollerer faktisk sammensatte piksler i den nye
kartmotoren: uavhengig synlighet/opasitet, fast tegnerekkefølge, naturtypefilter
uten påvirkning på andre lag, kildegeometrisk valg, kommunemaske med hull,
alle lag av, sen feil fra deaktivert lag og opprydding. Den bruker kontrollerte
WMS-bilder og kjøres i Quality Gate sammen med beholdte analyserender-tester.

`test:browser:themes` og aliaset `test:browser:workspace` åpner den faktiske
App-ruten med ekte Trondheim-tjenester. De kontrollerer A–L: alle åtte
lagkombinasjoner, opasitet 50/100 %, rekkefølge, verdi-/naturtypefilter,
kart-/listevalg, ingen automatisk zoom, manuell pan/zoom/reset og 390 px
med åpen/lukket velger. Skjermbilder og results.json lagres. En ytterligere
råpikselkontroll sammenligner 262 144 piksler i en reell innzoomet planflis
mot identisk DiBK/Grunnkart-bbox. Det skjer ingen kildeendring i live-kjøringen.
Testserverens Vite-plugin eksponerer kartet bare under kontrollkjøring; ingen
debug-globaler legges i produksjonskoden.

Live HTTPS bruker `HTTPS_PROXY` dersom miljøet har den. TLS-verifikasjon
beholdes; sett `NODE_EXTRA_CA_CERTS` til godkjent proxy-CA ved behov. Metode,
URL, query og body videresendes uendret; ingen svar erstattes med fixtures.
Nødvendige nettverksdomener følger frontendens konfigurerte kilder.

Status 09.10.2026: Reelle tjenester og A–L er kontrollert på oppgavebranchen.
Se docs/validation/2026-10-09-concurrent-map-layers.md. Visuell vurdering av
faktiske screenshots inngår; fixtures er ikke kildevalidering. Pages kan
testpubliseres fra samme PR-branch med eksisterende workflow, uten merge.
