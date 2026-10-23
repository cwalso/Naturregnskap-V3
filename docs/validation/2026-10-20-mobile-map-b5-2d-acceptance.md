# B5.2d – sluttkontroll og akseptansevurdering

> Oppfølging 23.10.2026: D-01–D-03 er rettet og målrettet kontrollert. Se
> [leveransestatus](../utviklingsplan.md). C-vurderingen nedenfor er historisk,
> fra før rettelsene. D-04 er ikke fulgt opp. Ingen Pages-publisering er utført.

**C – ikke klar for publisering.** Ordinære kart-/analyseoppgaver fungerer ved de fire normalstørrelsene, og regresjonstestene består. Den faste mobilflaten mister likevel kart og praktisk resultatplass ved lav effektiv viewporthøyde. Kontrollert tekstforstørring gir også overlapping. Dette bør følges opp før publisering. Ingen produksjonsrettelser er utført.

**Funn:** 0 kritiske, 1 høy og 2 middels påviste feil; i tillegg 1 lavt prioritert forbedringsforslag. Manglende testdekning og faglige avklaringsbehov er ikke telt som påviste feil.

Kontrollen startet **21.10.2026** og ble fullført **22.10.2026**. Filnavnet følger oppdraget. Ekspertbasert gjennomgang, uten deltakende kommunale planleggere. Teknisk prototypeaksept, faglig metodegodkjenning og klarhet for ordinær kommunal bruk er forskjellige beslutninger. Denne rapporten gir ikke full WCAG- eller metodegodkjenning.

## Omfang, versjon og gjennomføring

Oppstarts-HEAD lokalt og på GitHub var `9aa220a1c3cbb5ba8c9b4002e263d49bbdcb4963`, branch `feat/explore-analysis-map`, ren arbeidskopi, [PR #76](https://github.com/cwalso/Naturregnskap-V3/pull/76). Main var `a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`. Alle nyere endringer er beholdt. Ingen produksjonskode, kilder, metoder, geometrier, beregninger eller analyseidentiteter er endret.

AGENTS.md, dokumentasjonsoversikten, utviklingsplanen, B5.1, beslutningene om C og analyseinteraksjon, B5.2ab/c-kontrollene samt brukerreise- og økosystemdifferanserapportene fra 15.10 er lest. Dette er en kontroll av valgt alternativ C, ikke en ny designutredning.

Først blokkerte lokal sandkasse både nettverk og Chromium (`setsockopt: Operation not permitted`). En isolert, skrivebeskyttet [Actions-kontroll](https://github.com/cwalso/Naturregnskap-V3/actions/runs/39656956892) kjørte på `1dc22bc43dc2a24acea43a1467ba0bb7a2f52463`, som bare la til kontrollverktøy og midlertidig kontrollworkflow. Produksjonskode var identisk med oppstarts-HEAD. Mobilregresjonen fullførte 72 tilstander, men den nye driveren hadde en tvetydig tabellvelger, og artefaktsteget utelot skjulte filer. Den første kjøringen var derfor ikke tilstrekkelig akseptansebevis.

Etter innvilget nettverkstilgang ble den korrigerte kontrollen **fullført lokalt i Chromium 151**. Den uavhengige hovedkontrollen bruker produksjonsbygget; kartobservasjon i supplement og eksisterende regresjon bruker isolert Vite-transform som eksponerer kartreferansen uten å endre produksjonsfilen. Nye skjermbilder og komplette JSON-/axe-filer er bevart. Den midlertidige workflowen er fjernet etter kontrollen; eksisterende workflows er uendret.

### Etterprøvbart materiale

- [Samlet kontrollfil, brukerreiser, mål, fokus, statuser og forespørsler](2026-10-20-mobile-map-b5-2d-acceptance/acceptance.json).
- [Gyldig tomt WMS, nullresultat og forsinkede svar](2026-10-20-mobile-map-b5-2d-acceptance/fault-followup.json).
- [Uendret B5.2c-regresjon: 72 tilstander, 40 eksplisitte fit-kontroller](2026-10-20-mobile-map-b5-2d-acceptance/regression-checks.json).
- [Uavhengig fontskalering, beregnede farger, pinch og mobil tilbake](2026-10-20-mobile-map-b5-2d-acceptance/supplement.json).
- [Naturtema-rundreiser og liten positiv lokalitet](2026-10-20-mobile-map-b5-2d-acceptance/navigation-supplement.json).
- [Skjermbilder, axe-filer og reproduksjon](2026-10-20-mobile-map-b5-2d-acceptance/README.md).
- [Ny Quality gate: frontend, backend, kart, lag, navigasjon og Oversikt](https://github.com/cwalso/Naturregnskap-V3/actions/runs/39656956768).

Kontrollverktøyene er `apps/web/tests/browser/review-mobile-acceptance.mjs` og `review-mobile-acceptance-supplement.mjs`. Tidlige testdriverfeil og feilaktige fontstresstestobservasjoner er skilt fra det endelige kontrollgrunnlaget; de er ikke behandlet som produktfeil. Den første fontdriveren forsterket arvede skriftstørrelser trinnvis. Disse bildene/målingene er utelatt; supplementet fryser alle opprinnelige computed-størrelser før skalering.

## Brukerreiser A1–A5

Alle fire normalstørrelsene er kontrollert: 320 × 720, 390 × 844, 900 × 900 og 1440 × 960. Oppgavene ble gjennomført på nytt; tidligere grønne tester alene er ikke grunnlaget for vurderingen.

Handlingstall er **ekspertens handlingsgrupper**, ikke menneskelige ytelsesmålinger. Et velgervalg regnes som én gruppe, selv om åpning og valg kan kreve to trykk. Automatiseringens tellere inkluderer tilleggskontroller og skal ikke tolkes som minimum antall trykk.

| Scenario | Resultat og forståelighet | Handlinger / vesentlig scrolling |
|---|---|---|
| A1: Trondheim → Utforsk → Arealfordeling → Skog → fit → panorer → Våtmark → nullstill | Fullført ved alle fire størrelser. Skog og Våtmark endrer markering uten automatisk fit. Eksplisitt fit gjør utvalget synlig. Nullstilling går til samlet resultat og beholder utsnitt. | Ca. 10–11 grupper fra kommunevalg. Hurtigvalg gjør lang resultatscrolling unødvendig. Metode og ufordelt natur nås direkte. |
| A2: naturverdier → samlet resultat → søk Tanemsmyra → BN00109936 → detaljer → fit → lag → nullstill | Fullført ved alle størrelser. 119,38 daa / 70 lokaliteter; BN00109936 viser 19,61 daa overlapp og 38,33 daa hele lokaliteten. Samme navn skilles fra NINFP2210081697, som har 9,13 daa overlapp. Fokus går til detaljer og tilbake til Kartlag etter lukking av laglisten. | Ca. 9 grupper fra aktiv Arealfordeling. Direkte innholdsvalg unngår gjennomrulling av tabellene. Detaljene ved 320 krever noe intern scrolling for hele arealforklaringen. |
| A3: Delt / Mer kart / Mer resultat | Fullført. Type, utvalg, søk, kartutsnitt, ordinære lag og analyseidentitet beholdes. Detaljer fra Mer kart velger eksplisitt Mer resultat. | Ett valg per modusskifte. Mer resultat gir tydelig mer leseplass; Delt er trang ved 320. |
| A4: Trondheim → Oslo → Trondheim | Fullført under aktiv naturanalyse. Side/analysetype beholdes; Trondheim-tall fjernes og Oslo får «Analysegrunnlag mangler – ikke null treff». Retur gir Trondheim-resultatet igjen. Forsinket DiBK-svar etter panel- og kommunevalg gir ikke gamle Trondheim-tall i Oslo. | 6 grupper for de tre kommunevalgene, i tillegg til analyseoppstart. Mangelstatus krever ikke gjennomrulling. |
| A5: Kommuneoversikt / Naturtema → skog og våtmark → analyse → tilbake | Fullført med eksisterende temainnganger og mobil nettleserhistorikk. Skog 2 032,22 daa og Våtmark 12,64 daa åpner riktig kategori. Tilbake returnerer til tema med Trondheim beholdt. Eksisterende seks Oversikt-temakort består regresjonen. | Fra Oversikt: temakort → analysehandling → tilbake, tre hovedgrupper. Naturtema krever tilsvarende kortvalg. Kortene/indikatorene kan kreve siderulling; kartanalysen åpner direkte med riktig utvalg. |

[Skog i plananalysen](2026-10-20-mobile-map-b5-2d-acceptance/A5-Skog-analysis.png), [Våtmark](2026-10-20-mobile-map-b5-2d-acceptance/A5-Våtmark-analysis.png), [Tanemsmyra-detaljer ved 320](2026-10-20-mobile-map-b5-2d-acceptance/A2-details-320.png), [Oslo uten gamle resultater](2026-10-20-mobile-map-b5-2d-acceptance/A4-oslo.png).

Arbeidsflyten er forståelig ved normalhøyde når brukeren vet at analysen gjelder planavsetninger. Eksplisitt fit, Detaljer og Nullstill har avgrensede roller. Den lukkede innholdsvelgerens tastaturoppførsel er mindre forutsigbar, se D-02. Dette er en ekspertvurdering; ingen faktisk planlegger har validert effektiviteten eller standardvalget Delt.

## Mobil og responsivitet

Nye mål fra faktisk kartcontainer, bekreftet i både uavhengig kontroll og regresjon:

| Viewport | Delt | Mer kart | Mer resultat |
|---|---:|---:|---:|
| 320 × 720 | 208,55 px | 417,11 px | 100 px |
| 390 × 844 | 270,55 px | 541,11 px | 100 px |

Minimum 200/260 px er oppfylt, også i lokalitetsflyten. Ingen horisontal sideoverflyt ved normalstørrelsene. Nye primærkontroller er minst 44 × 44 px i eksisterende, nykjørt regresjon. Zoom, fit, lag og tegnforklaring er tilgjengelige i de tilsiktede modiene. Mer resultat har bevisst begrenset kartflate og skjuler interne zoom-/helkommune-kontroller; fit finnes utenfor kartet. Brede tabeller og resultatinnhold har separate rulleregioner. Lange navn får full identitet i detaljene, selv om hurtigvelgeren er kompakt.

| Ekstra viewport, Delt der mobiloppsett gjelder | Ny observert kartflate | Side-overflyt x/y |
|---|---:|---:|
| 360 × 640 | 360 × 168,55 px | 0 / 0 px |
| 700 × 650 | 700 × 173,55 px | 0 / 0 px |
| 701 × 650 | 361 × 402 px | 0 / 1 px |
| 844 × 390, landskap | 504 × 310 px | 0 / 217 px |
| 390 × 500, redusert høyde | 390 × 98,55 px | 0 / 0 px |
| 320 × 400 | 320 × 48,55 px | 0 / 0 px |
| 720 × 480, 200 % reflow-ekvivalent fra 1440 × 960 | 380 × 310 px | 0 / 79 px |
| 360 × 240, 400 % reflow-ekvivalent | 360 × **0 px** | 0 / 0 px |

Reflow-ekvivalent betyr redusert CSS-viewport, **ikke native nettleserzoom**. I laveste variant får resultatets interne rulleregion bare 6 px klienthøyde, og den faste oppsummeringen faller utenfor skjermen. Ingen siderulling gjør arbeidsflaten tilgjengelig. Ved landskap over 700 px brukes desktop-/nettbrettoppsett med siderulling, som gjør den større kartflaten tilgjengelig.

[Delt ved 320](2026-10-20-mobile-map-b5-2d-acceptance/A3-Delt-320.png) er praktisk til enkel orientering, men begrenset til lengre resultatlesing. [Mer resultat](2026-10-20-mobile-map-b5-2d-acceptance/A3-Mer-resultat-320.png) fungerer bedre til dette. 200 px-minimum er ikke bevis på at Delt er beste standard for planleggere.

Berøring/panorering og emulert pinch er gjennomført. Pinch endret kartets oppløsning fra 67,30648 til 29,44659 i samme kartreferanse. Mobil tilbake er kontrollert gjennom nettleserhistorikk ved 390 px. Fysisk iOS/Android, faktisk mykt tastatur, dynamiske nettleserlinjer, safe-area og fysisk tilbakegest gjenstår. Høydereduksjon er en stresstest av plassbehov, ikke en verifisering av disse plattformfunksjonene.

## Tilgjengelighet

**80 automatiske axe-kontroller uten rapporterte brudd:** 72 i uendret mobilregresjon og 8 nye, fullstendig eksporterte kontroller av full/tom lokalitetstabell ved fire størrelser. Automatiske funn suppleres med tastatur, beregnede stiler, skjermbilder og browserens tilgjengelighetstre. Ingen faktisk skjermleser er tilgjengelig; ingen full WCAG-konklusjon gis.

Den nye tastatursekvensen registrerte 26 fokusmål med DOM-boks og `:focus-visible`: analysetype, lag/avslutt, moduser, hurtigvalg, kart/kartkontroller, resultatrulling, innholdsvelger og kategoriutvalg. Regresjonen bekrefter at skjult resultatinnhold i Mer kart ikke er aktivt tilgjengelig som synlige kontroller, og at lag-/panelskifter ikke mister analysen. Ny lokalitetskontroll bekrefter synlig fokusretur til Kartlag. Dette beviser ikke alle tenkelige fokus-/scrollkombinasjoner. Innholdsvelgerens piltastproblem er dokumentert separat.

### Uavklarte axe-regler undersøkt

`color-contrast` gjelder i de nye eksportene **symboltegn**: mobilens ☰, kommunesøkets × og legendens ▧/■. Axe oppgir henholdsvis «only non-text characters» og «too short». Det er ikke et skjult, bekreftet tekstkontrastbrudd. Gjengitte farger er kontrollert mot faktisk bakgrunn: menyikon hvitt/#337e7d **4,75:1**, × #005e5d/#b8d1d0 **4,74:1**, legendsymboler #536661/hvitt **6,10:1**. Hovedtekst #005e5d/hvitt **7,61:1**, velgertekst mot #e5eeee **6,45:1**. Dette avklarer disse konkrete incomplete-nodene, ikke hele applikasjonens kontrast.

Kontrollkanter er varierende: #91ada7/hvitt er **2,40:1**, under 3:1. Mørk native pil, tekst og ikoner identifiserer kontrollene i de inspiserte tilstandene; de lyse kantene alene er ikke dokumentasjon på tilstrekkelig komponentkontrast. Markert modus har mørk flate og tekstlig/semantisk `aria-pressed`, og valgte kategorier har navn. Fokus er synlig; innholdsfokusets orange #af4810/hvitt er **5,59:1**. Det gjenstår bredere komponent-/kartkontrastkontroll med hjelpemidler; ingen blanket-godkjenning settes.

`th-has-data-cells` gjelder **bare den tomme lokalitetstabellen etter søk** i de åtte nye kontrollene. Caption sier «0 av 70 lokaliteter», overskriftene beholdes og `tbody` er tomt. Ved fullt resultat forsvinner denne incomplete-regelen. [Tilgjengelighetstreet](2026-10-20-mobile-map-b5-2d-acceptance/table-accessibility-tree.json) viser navngitte tabeller, rader, kolonneoverskrifter og celler ved treff. Naturverditabellene mangler eksplisitt `scope`, men browseren eksponerer kolonneoverskriftene i denne enkle strukturen. Tomt søkeresultat er derfor ikke behandlet som dokumentert tap av tabellrelasjoner. Reell skjermleserannonsering av tom tilstand og rulling gjenstår.

### Tekstforstørring og reflow

Kontrollert fontskalering ved **200 og 400 %** er gjennomført ved 390 × 844. Opprinnelige computed-størrelser fryses før skalering, slik at arvede størrelser ikke forsterkes flere ganger. Ved 200 % overlapper kommunevelgeren sidetittelen; ved 400 % klippes kontroller og resultatplassen blir svært liten. [200 %](2026-10-20-mobile-map-b5-2d-acceptance/font-only-200.png) og [400 %](2026-10-20-mobile-map-b5-2d-acceptance/font-only-400.png) viser faktiske gjengivelser etter denne isolerte stresstesten. De er ikke native browser-zoom.

Native nettleserzoom ble forsøkt gjennom en midlertidig testutvidelse; Chromium svarte «Loading of unpacked extensions is disabled by the administrator». Ingen omgåelse ble forsøkt. Native 200/400 % zoom gjenstår som separat kontroll. Reflow og fontskalering gir allerede grunnlag for D-01; manglende native kontroll er ikke i seg selv klassifisert som en produktfeil.

## Teknisk regresjon, identitet og data

| Kontroll | Resultat |
|---|---|
| Frontend `npm test` | **209/209**, 36 filer, lokalt og ny Quality gate |
| ESLint | 0 feil; ett eksisterende Fast Refresh-varsel i EcosystemPage |
| TypeScript/Vite build | Bestått; eksisterende varsel om stor JS-chunk |
| Backend `pytest` | **30/30**, både Actions og ny full lokal kjøring; ett eksisterende Starlette/AnyIO-varsel |
| Ruff | Bestått |
| Kartregresjon | Bestått i ny Quality gate |
| Sju lag / 128 kombinasjoner | Bestått i ny Quality gate |
| Hovednavigasjon / analyseinngang | Bestått |
| Oversikt / eksisterende temakort / stabile lagrader | Bestått |
| Uendret mobilregresjon | **72 tilstander, 72 axe-kontroller, 40 korrekte eksplisitte fit**, ingen JS-feil |
| Ny uavhengig hovedkontroll | Fullført, **59 skjermtilstander**, fire normalstørrelser, ekstra høyder, feilinjeksjon og 8 axe-kontroller |
| Målrettet feil-/tilgjengelighetssupplement | Fullført; gyldig tomt WMS, nullresultat, forsinkelse, fontskalering, farger, AX-tre, pinch og mobil historie |

[Frontendlogg](2026-10-20-mobile-map-b5-2d-acceptance/frontend.log), [backend](2026-10-20-mobile-map-b5-2d-acceptance/backend.log), [lint](2026-10-20-mobile-map-b5-2d-acceptance/lint.log), [build](2026-10-20-mobile-map-b5-2d-acceptance/build.log), [Ruff](2026-10-20-mobile-map-b5-2d-acceptance/ruff.log). Ingen eksisterende funksjonell testforventning er svekket.

Kartinstansen beholdes ved utvalg, panel/modus, scroll, lag og opasitet. De to oppstartsopprettelsene i utviklingsmodus skyldes React StrictMode; antallet øker ikke ved disse handlingene. Analyse-ID-er og geometrihasher er uendret mot B5.2c: Skog `601b9f3b…35a894`, BN00109936 `5aa53c60…6fcea` (fulle verdier i kontrollfilen). Areal-ID er fortsatt `planned-land-cover-area-v1:5001:c228…a46f:8308…d3e5`; natur-ID er `future-valued-nature-geometry-v3:5001:c228…a46f:f155…f3b9`.

Valg gir ingen automatisk fit. Alle 40 eksplisitte fit stemmer med tegnet overlappsgeometri, senter, oppløsning og eksisterende padding. Nullstilling beholder utsnitt/ordinære lag og tømmer søk/utvalg. Vis hele kommunen fungerer uten å nullstille utvalget. Avslutt analyse fjerner resultat/markering og beholder ordinære lag. Kommune-/analyseeierskap kontrolleres før resultater vises.

| Trondheim-resultat | Ny kontroll |
|---|---:|
| Natur i planområder | 2 788,80 daa (vises 2 788,8) |
| Jordbruk i planområder | 832,08 daa |
| Skog | 2 032,22 daa |
| Våtmark | 12,64 daa |
| Ufordelt natur | 706,71 daa |
| Registrerte naturverdier | 119,38 daa / 70 lokaliteter |

Alle referanser er bekreftet i nye UI-/regresjonskontroller. Skog- og våtmarkindikatorene bruker samme resultatområde som analyseinngangen. Dette er prototypereferanser, ikke ny metodegodkjenning.

### Feiltilstander og ytelse

- **DiBK HTTP 503:** teknisk feil, ikke null; ingen gyldig fit som om resultat forelå.
- **NIBIO klassifikasjon HTTP 503:** natur/jordbruk beholdes, fordelingen merkes utilgjengelig og natur vises ufordelt. Ingen konstruert fordeling.
- **Naturkildens timeout:** abort injisert mot riktig `naturtyper_kuverdi/MapServer/0/query`; resultat utilgjengelig og uttrykkelig «ikke null treff». Dette tester nettverksfeilsignal, ikke en server som aldri svarer uten tidsgrense.
- **Gyldig transparent WMS i riktig forespurt bildestørrelse:** tomt plankart gir 0 daa og forklaringen «Ingen natur- eller jordbruksruter treffer …». Tomt klassifikasjonsbilde gir delvis fordeling med 2 788,8 daa ufordelt natur, ikke et feilaktig fravær av natur.
- **Manglende kommuneraster:** Oslo viser mangelstatus, ikke 0 eller gamle Trondheim-tall.
- **Forsinket kilde:** fire DiBK-kall forsinket 7 sekunder; panel og kommune byttes mens de pågår. Etter sene svar gjelder fremdeles Oslo-mangelstatus. Retur til tidligere analysetype/panel beholder rett eier og data.

Første driverutgaver injiserte feil natur-endepunkt og en PNG med feil størrelse. De observasjonene er ikke brukt som bevis for korrekt timeout/tomt bilde; det målrettede supplementet dokumenterer de riktige testene.

Hovedkontrollen registrerte 1 783 HTTP-observasjoner på tvers av alle reiser og feilscenarier: 377 faktiske videresendinger, 1 272 replay fra vellykkede svar innen samme kjøring og 134 feil-/tom-bilde-injeksjoner. Dette er **kart-, side- og testtrafikk**, ikke 1 783 analyseberegninger. 17 miljøblokkerte bildeforespørsler ga 403 og korrekt bildefallback. Supplerende visningskontroll og lokal mobilregresjon bruker eksplisitt cachede tjenestesvar fra tidligere innhenting; CORS-header tilpasses den lokale testorigin, selve dataene endres ikke.

Konsumenttellere i regresjonen viser to Arealfordeling-kall ved utviklingsoppstart og ett naturanalyse-kall; panel/modus/utvalg utløser ikke nye konsumentkall. Kartets levetid og store 70-raders liste er kontrollert. Den første samlede uavhengige 320-reisen tok 17,37 s inklusive nettverk, beregning, UI, skjermbilder og axe; senere reiser bruker replay. Dette er **ikke** en kaldlastbenchmark eller menneskelig oppgavetid. Kaldlast under ulike nettverk, fysisk rulleflyt og store kommuner utover testgrunnlaget gjenstår.

## Faglig forståelighet

Grensesnittet skiller i hovedsak tilfredsstillende mellom dagens Grunnkart-/SSB-beholdning, framtidige planavsetninger, tydelig merkede historiske Trondheim-demodata og supplerende registrerte naturverdier. Planpanelene og indikatorene sier at planavsetninger ikke er faktisk eller nødvendigvis framtidig naturtap. Beholdning på skogsiden og økosystemfordeling har ulike avgrensninger, som forklares.

706,71 daa ufordelt natur er synlig og nås direkte. Det beskrives som usikkert klassifisert, uten skjønnsmessig fordeling. 0 identifiserte celler er ikke dokumentert fravær. Kartkontur gir synlighet til små felt; metodefolden forklarer rasterruter, delceller og at dette ikke er eksakt original planpolygonpresisjon. Oppgitt dato/versjon er ikke en felles låst årsdistribusjon.

Registrert lokalitet, lokalitetens hele areal og beregnet overlapp skilles tydelig i detaljene. Dette er svakere for svært små arealer i tabellen, se D-03. Supplerende naturverdi-overlapp skal ikke summeres med heldekkende planarealer. Manglende registrering betyr ikke fravær av naturverdi.

Naturtema beskriver uttrykkelig Grå arealer som kartgrunnlag, ikke beregnede tilgjengelige eller egnede utbyggingsarealer. Kartet dokumenterer ikke byggeegnethet, rettigheter eller planmessig adgang. Ingen ny analyse av utbyggingsmuligheter er innført eller godkjent.

Faglig avklaringsbehov før ordinær kommunal bruk består: versjonert regnskapsgrunnlag, juridisk planfortolkning, geografisk presisjon og validering mot egnet direkte geodata. Dette er kjente metodeforbehold, ikke nye påviste feil i mobiltilpasningen. Ingen ny formulering er innført i denne kontrolloppgaven.

## Funn og tiltak

### D-01 – lav reflow-høyde og forstørring bryter fast mobilflate – høy, påvist feil

**Reproduksjon:** aktiv Trondheim/Arealfordeling i Delt; reduser viewport til 360 × 240. Kontroller også 390 × 500 og 320 × 400, og kontrollert fontskalering ved 390 × 844.

**Faktisk:** 360 × 240 gir **0 px kart**, ca. **6 px intern resultatklienthøyde**, oppsummeringshandlinger utenfor skjermen og **ingen siderulling**. Ved 390 × 500 er kartet 98,55 px, ved 320 × 400 48,55 px. Ved 200 % fontskalering overlapper kommunevelgeren sidetittelen; 400 % klipper kontroller. Fast `100dvh`, `overflow:hidden`, to faste 48 px-rader og øvrig fast innhold prioriteres foran kart/resultatets `minmax(0,1fr)`.

**Forventet/konsekvens:** viktige kart-, resultat- og navigasjonshandlinger må være tilgjengelige ved sterk forstørring og redusert høyde. Brukeren kan ellers ikke gjennomføre den sentrale analyseoppgaven i den laveste tilstanden.

**Tiltak før publisering:** separat, avgrenset oppfølging av lavhøyde/reflow og tekstforstørring; ny kontroll av alle tre moduser, native 200/400 % zoom og fysisk mykt tastatur. Rapporten bestemmer ingen ny design eller implementering.

**Bevis:** [360 × 240](2026-10-20-mobile-map-b5-2d-acceptance/reflow-360-240.png), [200 % font](2026-10-20-mobile-map-b5-2d-acceptance/font-only-200.png), [400 % font](2026-10-20-mobile-map-b5-2d-acceptance/font-only-400.png), mål/scrollhøyder i kontrollfilene. Native zoom/fysisk enhet er ikke påstått utført.

### D-02 – lukket innholdsvelger flytter fokus på første piltast – middels, påvist feil

**Berørt/reproduksjon:** 390 × 844, fokuser «Gå til analyseinnhold» som lukket velger, trykk ArrowDown én gang.

**Faktisk:** fokus går straks til `<p data-analysis-section="summary" tabindex="-1">Prototypeanalyse · reelle kartdata</p>`. `onChange` navigerer før brukeren kan bla videre med flere piltaster i den lukkede kontrollen; verdien tilbakestilles til tom plassholder.

**Forventet/konsekvens:** forutsigbart tastaturvalg uten uventet fokusbytte under utforsking av alternativer. Brukeren må finne velgeren igjen eller kjenne native åpning/type-ahead. Oppgaven er mulig, derfor middels.

**Anbefalt tiltak:** kontroller et bevisst valgt tastaturmønster med åpne/velge/avbryte og skjermleser; ikke bruk bare programmatisk `selectOption` som bevis. Ingen automatisk retting her.

**Bevis:** [etter piltast](2026-10-20-mobile-map-b5-2d-acceptance/keyboard-closed-select-arrowdown.png), `keyboard-native-selector-and-focus.afterArrow` i acceptance.json, `AnalysisContents.tsx`.

### D-03 – små positive lokalitetsoverlapp vises som null i tabellen – middels, påvist feil

**Berørt/reproduksjon:** naturverditabellen ved alle bredder; åpne Trondheim-resultatet og gå til de minste arealene.

**Faktisk:** Søra, Steinåsen, Fossgrenda 2, Oddmyra, Leirfossan 4 og Ilen kirkegård inngår blant 70 overlappslokaliteter, men tabellen viser «0 daa». Noen andeler viser 0 %. Tabellen avrunder til maksimalt to desimaler; oppsummering/detaljer bruker separat `localityDaa` med «<0,01 daa» for små positive tall.

**Forventet/konsekvens:** et positivt beregnet overlapp må framstå som lite positivt og konsistent med detaljene. Ellers kan brukeren tro det ikke finnes treff eller at lokalitetsantallet er feil.

**Anbefalt tiltak:** avgrenset presentasjonsoppfølging for små arealer/andeler, uten å endre metode, toleranse eller tellegrunnlag. Ingen retting her.

**Bevis:** [Søra-tabell: 0 daa](2026-10-20-mobile-map-b5-2d-acceptance/tiny-overlap-table.png) mot [samme lokalitet: <0,01 daa](2026-10-20-mobile-map-b5-2d-acceptance/tiny-overlap-details.png), `tiny-overlap` i navigation-supplement.json og de to formatteringskallene i `AnalysisPanel.tsx`. Dette er et tallpresentasjonsfunn, ikke feil geografisk beregning.

### D-04 – Delt ved 320 gir liten sammenhengende leseplass – lav, forbedringsforslag

**Berørt/observert:** 320 × 720, lange tabeller og metode. Ca. 209 px kart oppfyller minimum, men faste kontrollrader tar mye plass. Direkte innholdsvalg og Mer resultat gjør oppgaven mulig.

**Forventning/konsekvens:** ingen påvist funksjonsfeil ved normalhøyde. Effektiviteten av Delt som standard er fortsatt ikke validert med planleggere.

**Anbefalt tiltak:** faktisk oppgavetest av eksisterende Delt/Mer kart/Mer resultat; ingen ny beslutning om å endre alternativ C. **Bevis:** nye modusbilder og målinger, særlig [Delt 320](2026-10-20-mobile-map-b5-2d-acceptance/A3-Delt-320.png). Dette er ekspertvurdering, ikke empirisk brukertest.

## Akseptanse og videre prosess

**C** begrunnes av D-01, en vesentlig høy feil i et sentralt tilgjengelighets-/reflow-forløp. Ingen kritisk datakorrupsjon eller feil planoverlappsgeometri er påvist. Grønne ordinære regresjoner opphever ikke funnet.

1. Gjennomgå rapporten og prioriter separat oppfølging av D-01 før eventuell publisering. D-02/D-03 bør inngå i rettelisten; D-04 er et forbedringsforslag.
2. Fullfør native nettleserzoom, fysisk iOS/Android med tastatur/dynamiske linjer/safe-area og faktisk skjermleser. Vurder også en kilde som aldri svarer, kaldlast og større kommuner. Disse gjenstående kontrollene er ikke påviste feil.
3. Kjør berørte regresjoner etter eventuelle separat godkjente rettelser og gjør en ny A/B/C-vurdering. Faglig metodegodkjenning og ordinær kommunal bruk krever eget grunnlag.

**Stoppunkt:** bare dokumentasjon, skjermbilder og isolerte kontrollverktøy er levert. Ingen produksjonsrettelser, main-endring, merge eller GitHub Pages-publisering. Publisering må vurderes etter gjennomgang av akseptanseresultatet.
