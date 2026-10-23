# Visuell korreksjon: lagpanel og planlagets skravur

Dato: 12.10.2026. Repo cwalso/Naturregnskap-V3, samme branch
feat/explore-analysis-map og PR #76. Lokal/ekstern start-HEAD var
`bb459d012e5ef0e871c70e24ede9b7af120dff50`; main var
`a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`.

## Scrollbar: årsak og korreksjon

Laglisten bruker `overflow-y: auto`. CSS gjør derfor horisontal overflow
scrollbar når innholdet faktisk er bredere. Range-kontrollene hadde `width:
100%` og `box-sizing: border-box`, men nettleserens standardmargin på **2 px
på hver side** var fortsatt aktiv. Resultatet var 4 px bredere innhold enn
listen, også når panelet ikke trengte vertikal scrollbar.

Produksjons-CSS setter nå bare range-kontrollene til `margin: 0` og
`display: block`. Bredden passer i innholdsboksen; ingen `overflow-x: hidden`
eller avklipping brukes. Eksisterende tekstwrapping, panelets bredde, sliderens
44 px treffhøyde og vertikal scrolling er beholdt.

| Vindusbredde | Panel/listens clientWidth | Før: scrollWidth | Etter: scrollWidth |
| --- | ---: | ---: | ---: |
| 1440 px | 296 | 300 | 296 |
| 1000 px | 296 | 300 | 296 |
| 900 px | 770 | 774 | 770 |
| 390 px | 332 | 336 | 332 |

Alle sliderne ligger innenfor panelgrensen etter rettingen. Dokumentets
scrollWidth er lik vindusbredden. Tegnforklaring og hjelpetekst er ikke klippet.
Se [målinger før](2026-10-12-plan-hatch/before-layout.json) og
[sluttkjøringens breddekontroll M](2026-10-12-plan-hatch/checks.json).

[Før desktop](2026-10-12-plan-hatch/before-1440.png) og
[før mobil](2026-10-12-plan-hatch/before-390.png) er fra faktisk kjørende app på
start-HEAD. [Etter desktop](2026-10-12-plan-hatch/G-all.png) og
[etter mobil, åpen velger](2026-10-12-plan-hatch/L-mobile-open.png) viser rettingen.

## Hatch implementert – ingen fallback

Planlaget beholder Natur = grønn og Jordbruk = gul. Vanlig heldekkende fyll er
nå erstattet med:

- Natur: mørk grønn `#28643B`, diagonalskravur `/`.
- Jordbruk: mørk gul/oker `#967000`, diagonalskravur `\`.
- Mellom linjene: eksisterende grønn/gul tint med **24 %** av kildepikselens alfa.
- 8 px repetisjonsperiode langs skjermens x/y-akser, 2 px linjebånd.

Skravuren legges i `postrender` på planlagets allerede separate Canvas 2D.
`futureDevelopmentSymbology` leser den eksisterende klasse-/dekningsmasken og
endrer bare RGB/alfa på de samme skjermpikslene. Tomme piksler får ingen farge;
linjer beholder opprinnelig dekning/alfa, mens bakgrunnen dempes. Kildens
EPSG:25833-fliser, dominerende klasse ved grov målestokk, dekningsalfa,
klassifisering, koordinater og små/smale felters geografiske støtte er uendret.

Skjermens pixelRatio holder mønsterets størrelse lik ved zoom og på skjermer
med ratio 1/2. Det er skjermskravur over geografisk korrekt maske, ikke et
nytt rutenett. Eksisterende lagopasitet skalerer både linjer og tint. Også med
helt ugjennomsiktig Grunnkart er skravuren synlig. Samme symboldefinisjon lager
legendens CSS-gradients med tilsvarende farger, retninger, avstand og tint.

Hatch fungerte stabilt i kontrollerte Chromium-renderinger, ved gjentatt
tegning, faktisk zoom/pan og reelle Trondheim-data. **Ingen flatefallback**
er brukt. Det er ingen ny lagtype, kilde, cache eller beregningsmotor.

## Visuell kontroll av reelle Trondheim-data

Ordinær App-rute ble åpnet i Chromium mot reelle tjenester. Miljøets HTTPS-
proxy videresendte identisk metode/URL/query/body; ingen fixtures erstattet
svardata. Bare testserveren eksponerte kart/state for assertions. Skjermbildene
er uredigerte fullsidebilder fra den faktisk kjørende appen etter rendering.
Både automatiske kontroller og visuell gjennomgang inngår.

| Krav | Resultat og skjermbilder |
| --- | --- |
| 1. Panel uten horisontal scrollbar | Fire vindusbredder har scrollWidth = clientWidth; sliderne og siden har ingen overbredde. Før/etter over. |
| 2. Desktop | [Alle lag/velger](2026-10-12-plan-hatch/G-all.png), [detalj med alle](2026-10-12-plan-hatch/N-detail-all.png). |
| 3. Mobil 390 px | [Åpen](2026-10-12-plan-hatch/L-mobile-open.png), [lukket](2026-10-12-plan-hatch/L-mobile-closed.png), [alle](2026-10-12-plan-hatch/L-mobile-all.png), [innzoomet Grunnkart + plan](2026-10-12-plan-hatch/L-mobile-close-base-plan.png). |
| 4. Plan alene | [Kommuneoversikt](2026-10-12-plan-hatch/B-future.png), [desktop detalj](2026-10-12-plan-hatch/N-detail-future.png), [mobil detalj](2026-10-12-plan-hatch/L-mobile-close-plan-alone.png). Bebygde felt er tomme i planlaget. |
| 5. Grunnkart + plan | [Oversikt](2026-10-12-plan-hatch/D-level0-future.png), [detalj](2026-10-12-plan-hatch/N-detail-base-future.png), [helt ugjennomsiktig Grunnkart](2026-10-12-plan-hatch/N-detail-opaque-base.png). Skravur skiller plan fra samme klasse i basislaget. |
| 6. Alle tre | [Oversikt](2026-10-12-plan-hatch/G-all.png) og [detalj](2026-10-12-plan-hatch/N-detail-all.png); naturtypeflater og kommunegrense beholder rekkefølgen. |
| 7. Legend | To skraverte symboler, Natur/Jordbruk, med samme farger og motsatt retning som kartet. Synlig i plan-/kombinasjonsbildene. |
| 8. Planets gjennomsiktighet | [25 %](2026-10-12-plan-hatch/N-detail-plan-transparency-25.png), [50 %](2026-10-12-plan-hatch/N-detail-plan-transparency-50.png), [75 %](2026-10-12-plan-hatch/N-detail-plan-transparency-75.png), [mobil 50 %](2026-10-12-plan-hatch/L-mobile-close-plan-50.png), [oversikt med alle lag/50 % plan](2026-10-12-plan-hatch/I-opacity-future-development.png). 0/100 % kontrolleres også. |

Alle tidligere A–L-kontroller samt M (panelbredder) og N (detaljskravur) passerte.
34 faktiske screenshots ble tatt; 19 relevante før/etterbilder er versjonert
her. Ingen JavaScript-feil. Alle **604 eksterne kall svarte HTTP 200**:
Kartverket, NIBIO, DiBK, Miljødirektoratet og SSB.
[Full kontroll-/HTTP-logg](2026-10-12-plan-hatch/checks.json).

En reell detaljflis med 262 144 piksler ble fortsatt sammenlignet med identisk
DiBK/Grunnkart-bbox. Kilde-/visningsflisen før skravur hadde **0 avvik**:
4 103 Natur, 4 784 Jordbruk; 57 254 Bebygd, 24 vann, 126 ukjente og 195 853
utenfor plan var fortsatt transparente. Dette kontrollerer at de geografiske
klassene og utelatelsene er bevart; hatch på skjerm kontrolleres separat.

## Tester, avgrensning og publisering

- `npm test`: **122 tester / 22 filer**, bestått. Tre nye kontroller gjelder
  skravur/tint med uendret tom maske, dekningsalfa, pixelRatio og legend.
- `npm run lint`: bestått, 0 feil; eksisterende Fast Refresh-advarsel beholdt.
- `npm run build`: bestått; eksisterende bundle-størrelsesadvarsel beholdt.
- `npm run test:browser`: beholdt analyse-renderregresjon, bestått.
- `npm run test:browser:layers`: bestått ved DPR 1 og 2. Faktiske sammensatte
  piksler kontrollerer mørk skravur/transparent tint, opasitet, gjentatt tegning,
  rekkefølge, filterisolasjon, kommunemaske/hull, valg, sen skjult feil og cleanup.
  Den monterer også faktisk React-panel med produksjons-CSS og kontrollerer
  slider/panel ved fire bredder. Denne kontrollen inngår allerede i Quality Gate.
- `npm run test:browser:themes`: reell sluttkjøring beskrevet ovenfor, bestått.

Bare visuell presentasjon og relevante kontroller/dokumentasjon er endret.
DiBK-filter, Grunnkart-klassifisering, analysemetode/grid/verdiregler, nevnere,
UTM, cache, filterlogikk, lagstruktur, av/på, zIndex og Pages-oppsett er uendret.
Historiske ADR-er er beholdt; levende symbologi-/arkitekturdokumentasjon er
presisert. Ingen ny arkitekturbeslutning eller analysemotor er innført.

Ny HEAD og endelig CI/Pages-deployment oppgis i eksisterende PR #76 og
leveransemeldingen. Samme workflow brukes fra samme branch; ingen merge,
main-endring eller ny PR. Ved fortsatt Pages-proxyblokkering verifiseres
publisert SHA med GitHub Actions/deployment-API.

Svært små felter på 1–2 skjermpiksler kan ikke romme en hel skravurperiode.
I kommuneoversikt ses de derfor som korte mørke markeringer eller svak tint;
zoom gir lesbar skravur. Feltene er ikke utvidet eller fjernet for å tilpasse
mønsteret. Høy gjennomsiktighet gjør laget svakere som forventet; naturtyper
øverst kan fortsatt dekke planfelter der de overlapper visuelt.
