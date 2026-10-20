# Renderkontroll av kart og beholdte analyser

Kjøres fra `apps/web` etter `npm ci`:

```sh
npx playwright install chromium
npm run test:browser
npm run test:browser:layers
npm run test:browser:plan-area:live
npm run test:browser:design
```

Ved behov for Linux-systembiblioteker: `npx playwright install --with-deps chromium`.
En allerede installert Chromium kan velges med `CHROMIUM_PATH`.
`BROWSER_OUTPUT` velger outputmappe; standard er den ignorerte
`.browser-results/`. Skriptene starter/lukker egne Vite-servere: 5182 for
analysefixtures, 5181 for trinnvis analyselive-kontroll, 5184 for offentlig
App-rute med de opprinnelige tre lagene, 5187 for seks reelle lag og 5186 for lagfixtures.

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
alle lag av, sen feil fra deaktivert lag og opprydding. Planlagets mørke
linjer og transparente tint leses fra faktisk sammensatte skjermpiksler.
Gjentatt tegning og skjermratio 1/2 kontrolleres; `BROWSER_DPR=2` velger 2.
Kontrollen monterer også den reelle React-lagvelgeren med produksjons-CSS
og måler panel/slider ved 1440, 1000, 900 og 390 px. Den bruker kontrollerte
WMS-bilder og kjøres i Quality Gate sammen med beholdte analyserender-tester.

`test:browser:themes` og aliaset `test:browser:workspace` åpner den faktiske
App-ruten med ekte Trondheim-tjenester. De kontrollerer A–L: alle åtte
lagkombinasjoner, opasitet 50/100 %, rekkefølge, verdi-/naturtypefilter,
kart-/listevalg, ingen automatisk zoom, manuell pan/zoom/reset og 390 px
med åpen/lukket velger. Flere detaljbilder viser plan alene, med basis,
alle lag og planets gjennomsiktighet 0/25/50/75 %. Panelmål dokumenteres
ved fire bredder. Skjermbilder og results.json lagres. En ytterligere
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

`test:browser:six:live` kontrollerer nye lag alene/med Grunnkart, flere nye,
alle seks, ingen, egen opasitet, INON-år/kildelegend, naturtypefilter, manuell
navigasjon, 390 px og kommunebytte. Dovre har faktisk villreinkart, Trondheim
har gyldig tomt bilde og null registreringer. Source-canvas, et punkt innenfor
kommunepolygonet og faktisk sammensatt skjermpiksel sammenlignes mot base.
Reelle karttjenester og browser-screenshots er akseptgrunnlag; kontrollerte
fixtures brukes separat til regresjon av 128 kombinasjoner, WMS-tomstatus,
sen feil fra skjult lag, maskering, opasitet, rekkefølge og opprydding.

`npm run test:browser:grey:live` bruker port 5188 og reelle tjenester i
Trondheim/Dovre: tre kildeframstillinger, Grå arealer med basis/plan/alle sju,
opasitet, filter/objektvalg, mobil 390 px, navigasjon og kommunebytte.
FKB-Grønnstruktur er ikke koblet inn fordi offentlig bruksrett er uavklart.

## V2-design i offentlig rute

`test:browser:design` starter Vite på 5194 og kjører A/B/C mot faktisk App-rute
og reelle karttjenester. Ingen datakall erstattes med syntetiske data. Trafikken
følger miljøets HTTPS-proxy. Den må ha nettverkstilgang også i kommandosandkassen.
Kontrollen inkluderer fire skjermbredder, faktiske geografiske piksler innenfor
kommunen, sju lag, Dovre/Trondheim, filtre, objekter, gråarealprodukter, hjulzoom
ved pekeren, tastatur, touch og 200 % reflow. `DESIGN_GATE=A` eller `B` velger
avgrensede testporter; `C_ONLY` gjentar sluttkontrollen etter bestått B.

Valgfri `AXE_SCRIPT` peker på en lokalt installert `axe-core/axe.min.js` for
automatiske WCAG 2.2 AA-relaterte kontroller. Axe er testverktøy, ingen ny
produksjonsavhengighet. Det erstatter ikke manuell skjermleser-/enhetsrevisjon.

Tidligere offentlig-rute-skript for tre/seks/sju lag dokumenterer layouten før
V2 og er beholdt som historikk. Bruk `test:browser:design` for ny UI-aksept.
Beholdte analyse-/lagfixtures med `test:browser` og `test:browser:layers`
kontrollerer fortsatt uendret kart-/analysemetode; de er ikke live akseptbevis.

## Geometrisk planoverlapp

`BROWSER_OUTPUT=.browser-results/future-nature-live node tests/browser/check-future-nature-live.mjs` bruker system-Chromium (`CHROMIUM_PATH` kan overstyre), reelle tjenester gjennom eksisterende proxy og samme app/moduler. Kontrollerer gammel/ny metode, fire bredder, kategori/type/lokalitet, lagtilstander, korrekt geometri, kortinngang og manglende kommuneraster. Source-audit-instrumentering finnes bare i testens Vite-plugin. Komprimerte referanseuttrekk og beregninger ligger i `docs/validation/2026-10-13-future-nature/`.

Uavhengig GEOS-kontroll: pakk ut `result.json.gz`, installer Shapely i et separat kontrollmiljø og kjør `python tests/browser/verify-future-nature-geos.py /sti/til/result.json`. Shapely er ikke en app- eller backend-runtimeavhengighet.
## Oversikt-forsiden

`CHROMIUM_PATH=/usr/bin/chromium npm run test:browser:overview` kontrollerer
den faktiske App-ruten ved 1440, 900, 390 og 320 px med kontrollerte eksterne
svar. Det omfatter hoved-/temalenker, kommunebytte, kartets størrelse/levetid,
tastaturinteraksjon, bildeavkoding, kilde-/bildefeil og ingen sideoverflow.
Kontrollerte bilde-responser er kun renderfixtures, ikke Unsplash-fotografi.

`OVERVIEW_LIVE=1 BROWSER_OUTPUT=.browser-results/overview-live npm run test:browser:overview`
bruker reelle kilder via miljøets eksisterende HTTPS-proxy. Den lagrer faktisk
side, hero, naturtap, fortellinger og temakort samt kilde-/bildeutfall.
Domenepolicy kan blokkere `images.unsplash.com`; da dokumenteres reell
fallback i skjermbildene. Skjermbilder fra kontrollerte bildesvar skal ikke
presenteres som validering av faktisk Unsplash-leveranse.

## Hovednavigasjon og analyseinngang

Etter `npm run build`: `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser:navigation`.
Kontrollen bruker det faktiske produksjonsbygget og kontrollerte eksterne svar
for å teste permanent desktopnavigasjon, mobilmeny/Escape, aktiv side,
analyseinngang, laglistens scrolling og bredder 1440, 900, 832, 701, 700, 390
og 320 px. Dette er en UI-kontroll, ikke live datavalidering eller Pages-kontroll.
Valgfritt `PAGES_ARTIFACT` peker på en utpakket Pages-artefakt og kontrollerer
at den gamle knappen rendres, men kan rulles helt bort ved 1440 × 720 px.
`check-future-nature-live.mjs` kontrollerer de reelle beregningene og kartkoblingen.

`test:browser:plan-area:live` bruker port 5200 og eget Vite-cacheområde.
Den lagrer rå økosystem-PNG-er, plan-/resultatmasker, hasher og JSON-resultat,
og kontrollerer hver kategoris areal og faktiske geometri i OpenLayers.
Den åpner deretter den reelle App-ruten: Kommuneoversikt → primær arealanalyse,
alle kategorier/utvalg, eksplisitt fit, mobil resultat/kart, supplerende
naturverdi-analyse, kommunebytte og kontrollert HTTP 503. Fire skjermbredder
kontrolleres. En testinjeksjon prøver én aggregert historisk periode; den inngår
ikke i produksjonsdata. Live-kjøringen er avhengig av kildetjenestene og ligger
utenfor den kontrollerte CI-regresjonen.

Uavhengig kontroll kjøres med `python tests/browser/verify-plan-area.py <output>`
i et miljø med Pillow, NumPy og Shapely. Den bruker råbilder og GEOS-radstriper,
ikke produksjons-JS-klassifikatoren. Lagret `reference-inputs.zip` i
`docs/validation/2026-10-14-plan-area/` kan pakkes ut i samme outputmappe som
referansens `result.json` for å gjenta kontrollen uten nye kildeforespørsler.

## Indikatorer og UX B1–B4

`UX_STAGE=all UX_AXE_PATH=/sti/axe.min.js node tests/browser/check-ux-improvements.mjs`
kontrollerer reelle indikatorer, kommunevalg, kontrast/axe og Naturtema ved fire
bredder. `UX_STAGE=regression` kontrollerer faktisk kartinstans, kategoriutvalg,
lag/opasitet, naturverdi-referanse og demomerking. Krever system-Chromium,
port 5220 og tilgang til faktiske kilder; axe er separat testverktøy. Se
[full reproduksjon og lagrede resultater](../../../../docs/validation/2026-10-15-ux-improvements-b1-b4/README.md).

## Aktiv analyse og delt mobilflate – B5.2a–b

Fra `apps/web`:

```sh
SPLIT_STAGE=b CHROMIUM_PATH=/usr/bin/chromium UX_AXE_PATH=/sti/axe.min.js \
BROWSER_OUTPUT=/sti/til/resultater node tests/browser/check-mobile-split-view.mjs
```

Stage `a` kontrollerer reell analyse/panelisolasjon ved 1440 px. Stage `b` legger
til 320×720, 390×844, 900×900 og 1440×960, mål av canvas i alle moduser,
keyboard/fokus, senter/oppløsning, faktisk analyse-ID, geometrihash, konsumentkall
og antall kartopprettelser gjennom resize/paneler. Alle skjermtilstander kan
axe-kontrolleres via separat testverktøy. Vite-observasjon endrer ikke produksjon.
Port 5240; HTTPS-proxy brukes ved behov. Valgfri `SPLIT_HTTP_CACHE` gjenbruker
kun HTTP 200-svar fra faktiske kilder, med URL-/body-hash og hentetid. Ingen
fiksturer eller prototypetall brukes i denne kontrollen; cache beholdes utenfor
repoet. Kjør uten variabelen for nye tjenestesvar.
Se [rapport og lagret evidens](../../../../docs/validation/2026-10-19-mobile-split-view-b5-2ab.md).

## B5.2c – valg, eksplisitt fit, innhold og nullstilling

Bruk samme `check-mobile-split-view.mjs` med `SPLIT_STAGE=c4` og eventuelt
`UX_AXE_PATH`. `mobile-analysis-interactions.mjs` legger til begge analyser ved
fire bredder/alle mobile moduser, reell overlap-extent kontra fit-oppløsning,
tastatur og CDP-berøringspanorering, innholdsnavigasjon, lokalitetsdetaljer,
nullstilling/søk, ordinære lag/opasitet og mobile/desktop-overganger.
`c1`, `c2` og `c3` avgrenser tidligere trinn; hovedverktøyet har fortsatt
separat B5.2a/b-kontroll. Innhold og nullstilling krever dagens produksjonskode.
HTTP-cache fra faktiske tjenester er valgfri og skal ikke sjekkes inn.
[Kontrollrapport og reproduksjon](../../../../docs/validation/2026-10-20-mobile-map-b5-2c.md).
