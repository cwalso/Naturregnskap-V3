# Renderkontroll av analysekart

Kjøres fra `apps/web` etter `npm ci`:

```sh
npx playwright install chromium
npm run test:browser
npm run test:browser:live
npm run test:browser:workspace
```

Ved behov for Linux-systembiblioteker: `npx playwright install --with-deps chromium`.
En allerede installert Chromium kan velges med `CHROMIUM_PATH`.
`BROWSER_OUTPUT` velger outputmappe; standard er den ignorerte
`.browser-results/`. Skriptene starter/lukker egne Vite-servere: 5182 for
fixtures, 5181 for trinnvis live-kontroll og 5183 for offentlig App-rute.

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

`test:browser:workspace` åpner den faktiske App-ruten med ekte tjenester og
kontrollerer temabytte, verdi-/naturtypefilter, lokalitetsvalg, ingen automatisk
fit, 390 px, skjult tegneinngang og feiltilstander. Den tar egne skjermbilder.
Testserverens Vite-plugin eksponerer kartet bare under kontrollkjøring; ingen
debug-globaler legges i produksjonskoden.

Live HTTPS bruker `HTTPS_PROXY` dersom miljøet har den. TLS-verifikasjon
beholdes; sett `NODE_EXTRA_CA_CERTS` til godkjent proxy-CA ved behov. Metode,
URL, query og body videresendes uendret; ingen svar erstattes med fixtures.
Nødvendige nettverksdomener følger frontendens konfigurerte kilder.

Status 09.10.2026: DiBK ga HTTP 200/PNG for frontendens faktiske forespørsler.
A–E og App-ruten er kontrollert med reelle data, inkludert navigasjon og mobil.
Tidligere DiBK-blokkering var miljøets proxy. Ny offentlig UI-kobling ligger
på branchen; Pages endres først etter merge og vellykket deploy.
