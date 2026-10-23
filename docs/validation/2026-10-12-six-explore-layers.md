# Seks kartlag – kildekontroll og visuell aksept

Dato: 12.10.2026. Repo cwalso/Naturregnskap-V3, samme branch
feat/explore-analysis-map og PR #76. Kontrollert lokal/ekstern start-HEAD:
`7b7c8bcfec9b492257af1bee3107360fbd66a487`. Kontrollert main:
`a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`.

## Faktiske kilder, lagnavn og vilkår

Kilder ble kontrollert **før implementering**, med nye GetCapabilities,
aktuelle lag/style-navn, GetMap for faktiske kommunegrenser i EPSG:25833,
PNG-dekoding/alfa, native symboler/GetLegendGraphic, CORS og kildekatalog.
HTTP 200 alene brukes ikke som bevis for fungerende kart.

| Tema | Faktisk WMS og lag | Semantikk, dato og symboler |
| --- | --- | --- |
| Vern | [Miljødirektoratet WMS](https://kart.miljodirektoratet.no/arcgis/services/vern/mapserver/WMSServer), `naturvern_klasser_omrade` | Vedtatt vern. Fem offisielle klasser: annen fredning, landskapsvernområde, marint verneområde, nasjonalpark, naturreservat. Native skravur/omriss og GetLegendGraphic. Forslagslagene monteres ikke. Løpende kilde, uten publisert felles referansedato. |
| INON | [GeoServer WMS](https://kart.miljodirektoratet.no/geoserver/inngrepsfrinatur/wms), `status` | Januar 2023, som bekreftet i [offisiell katalog](https://kartkatalog.miljodirektoratet.no/MapService/Details/inngrepsfrinatur). Sone 2: 1–3 km; sone 1: 3–5 km; villmarkspreget natur: minst 5 km fra tyngre inngrep. Kildens tre grønnfarger. Katalogens tjenesteoppdatering er 30.04.2024; dette er ikke status 2026. |
| Villrein | [Villrein WMS](https://kart3.miljodirektoratet.no/arcgis/services/villrein/MapServer/WMSServer), `villrein_leveomrade` | Registrerte biologiske leveområder, native blå prikket flate/grense. Ikke dyrenes faktiske posisjon eller regionale planers soner. Regional dekning i Sør-Norge; løpende kilde uten felles referansedato. |

GetCapabilities bekrefter EPSG:25833 for alle tre. INONs aktuelle lag angir
EPSG:25833/CRS:84; ny lagdefinisjon bygger på dette, ikke antatte CRS-er fra
eldre registry. WMS/REST-svar har `Access-Control-Allow-Origin: *`; faktiske
bilder kunne dekodes og leses i Chromium uten canvas-taint/JavaScript-feil.

Vernetjenesten finnes i flere offisielle varianter. Katalogen peker på
kart3/eldre `aa`-lagnavn; leveransen gjenbruker V3s offisielle `kart`-endpoint,
med `a`-lagnavn verifisert direkte i dens GetCapabilities og aktuelle GetMap.
INON-capabilities har et eldre internt keyword `tbl_status_2018`. Referanseår
ble derfor kontrollert i katalogen, som eksplisitt identifiserer `status` som
2023; det interne keywordet brukes ikke som årsangivelse.

Katalog og tjenestemetadata oppgir **NLOD**. Kilde oppgis i map attribution,
legend/kildebeskrivelse og metadata-lenke. INON bruker «Miljødirektoratet –
inngrepsfri natur 01.2023»; Villrein «Villreinbasen, Miljødirektoratet».
Ingen kilder krever betalt tjeneste eller innlogging for denne visningen.

[Arkiverte capabilities, metadata, CORS-headers, legender og faktiske GetMap-bilder](2026-10-12-six-layers/sources/summary.json),
[katalognotater](2026-10-12-six-layers/sources/catalog-notes.json).
Katalog-HTML var blokkert av shell-proxyen, men ble lest fra de offisielle
URL-ene via web-verktøyet. WMS/REST/GetMap/legend ble hentet direkte fra
kart/kart3. [Dovre GetMap](2026-10-12-six-layers/sources/villrein-3431.png) har
106 125 synlige kildepiksler ved 1024×1024; [Trondheim GetMap](2026-10-12-six-layers/sources/villrein-5001.png)
er helt transparent. Disse er kildebilder, ikke app-screenshots.

## Implementert i eksisterende arkitektur

Tre nye ImageWMS-lag, samme OpenLayers-instans, lagregister og avkryssingspanel.
Alle seks kan være på samtidig i 64 kombinasjoner, med egen opasitet, legend,
referanse/kilde og faglig forklaring. Grå arealer og FKB-Grønnstruktur er
fortsatt bare reserverte ID-er, uten kontroller eller datakilder.

Fast rekkefølge fra bunnen er base → nivå 0 → INON → Villrein → plan →
naturtyper/lokalitetsvalg → verneområder → kommunemaske/grense.
INON starter med 35 %, nivå 0 med 30 %, øvrige med 0 % ekstra gjennomsiktighet.
Native mønstrede villrein-/verneflater og vern øverst gjør underliggende data
og viktige grenser lesbare. Original trelagsrekkefølge og godkjent planskravur
beholdes. Alle nye lag maskeres til kommunen med samme løsning som før.

Nye native legender hentes fra samme tjeneste med GetLegendGraphic. INON-år
vises uten å åpne «Om»-feltet. Villrein får ikke undertemavalg nå: trekk,
kalving og flere beitetema finnes og er kontrollert i capabilities, men
biologisk leveområde er hovedlaget i denne avgrensede integrasjonen.

Et dekodet transparent WMS-bilde betyr et gyldig tomt utsnitt. Lastefeil betyr
`error`; regional/manglende kartlegging har egne forbehold. Villrein gjenbruker
kommunevise registreringsstatus som App allerede henter ved kommunevalg,
med kommuneeierkontroll. Bekreftet null registreringer skilles dermed fra
ukjent registreringsdekning og fra feil i WMS-kartet. Svak image-referanse
memoiserer kun visuelt tom-status; eksisterende request-/resultatcache er uendret.

Ingen arealtall, overlapper, nye analyse-ID-er eller regnskapsberegninger
startes. DiBK-filter, Grunnkart-klassifisering, planpresentasjon, analysegrid,
UTM-korreksjon, nevnere, verdiregler og naturtypefilterets metode er uendret.
Filter/valg på naturtyper bevares når nye lag endres. Bare kommunevalg/reset
fit-ter kartet; av/på, opasitet, filter og objektvalg bevarer utsnittet.

## Reell browserkontroll – krav 1–17

Chromium åpnet ordinær App-rute med **ekte tjenester**. Miljøets proxy
videresendte identisk URL/metode/query/body; ingen synthetic map-data erstattet
kildesvar. Testplugin eksponerer bare kart/state i kontrollserveren, ikke i
produksjonskoden. **28 uredigerte app-screenshots** er lagret etter faktisk
rendering, med visuell gjennomgang av polygoner, geografisk plassering,
legend, kommunegrense og mobil. Panelets vertikale scrolling vises både i
øverste og nederste posisjon; ingen horisontal scrolling/tekstklipping.

For hvert positivt hovedlag velges en faktisk farget skjermpiksel fra lagets
Canvas innenfor kommunepolygonet. Posisjon/projeksjon og sammensatt screenshot-
piksel sammenlignes med samme bakgrunnspunkt med laget av. Dermed verifiseres
faktisk synlig polygon, ikke bare source-state eller HTTP-status.

| Krav | Bestått kontroll / faktisk screenshot |
| --- | --- |
| 1. Verneområder alene | [Trondheim vern](2026-10-12-six-layers/1-protected-alone.png), punkt `[264116.88,7044771.61]` i EPSG:25833. Faktisk rød vernepiksel `[175,0,0]`, forskjellig fra base `[118,118,118]`. |
| 2. INON alene | [Trondheim INON](2026-10-12-six-layers/2-INON-alone.png), punkt `[263762.63,7043708.87]` innenfor kommune. Kompositt `[204,222,156]`, base `[203,203,203]`. Referanse januar 2023 synlig. |
| 3. Villrein alene | [Trondheim: tomt/gyldig](2026-10-12-six-layers/3-villrein-empty-Trondheim.png), [Dovre: faktisk kart](2026-10-12-six-layers/12-Dovre-villrein.png). |
| 4. Hvert nytt lag + Grunnkart | [Vern](2026-10-12-six-layers/4-base-protected-areas.png), [INON](2026-10-12-six-layers/4-base-intact-nature.png), [Villrein i Trondheim](2026-10-12-six-layers/4-base-wild-reindeer.png). |
| 5. Flere nye samtidig | [Trondheim](2026-10-12-six-layers/5-new-layers.png), [Dovre](2026-10-12-six-layers/12-Dovre-new-layers.png). |
| 6. Alle seks | [Alle lag](2026-10-12-six-layers/6-all-six.png), [panel nedre del](2026-10-12-six-layers/6-all-six-panel-bottom.png). Seks aktive legender, uavhengige synligheter, uendret utsnitt. |
| 7. Alle av | [Base og kommunegrense](2026-10-12-six-layers/7-none.png), ingen hengende temalag/legender. |
| 8. Egen opasitet | [Vern 75 %](2026-10-12-six-layers/8-opacity-protected-areas-75.png), [INON 75 %](2026-10-12-six-layers/8-opacity-intact-nature-75.png), [Villrein 75 %](2026-10-12-six-layers/8-opacity-wild-reindeer-75.png). 50/100 % også kontrollert; andre lag/opasitet/utsnitt bevares. |
| 9. Legend og kildeår | Alle tre service-legender dekodet, naturlig bredde >0 og innenfor panel. INON-år synlig, øvrige tjenester merket løpende. |
| 10. Kommune med villrein | Dovre 3431. 46 015 synlige piksler på lagets viewport-canvas, valgt punkt `[201373.39,6925023.66]` innenfor kommunen. Faktisk kompositt `[0,169,230]`, base `[254,254,254]`. Geografisk plassering rundt Dovrefjell/Rondane samsvarer med kildens GetMap og base. |
| 11. Kommune uten villrein | Trondheim 5001. 0 synlige WMS-piksler og eksisterende registreringsquery med 0 treff. Forståelig tomstatus, ingen kildefeil. |
| 12. Kommunebytte/rensing | [Tilbake til Trondheim](2026-10-12-six-layers/13-back-to-Trondheim-empty.png): Dovre-polygonene borte, riktig tomstatus/eier. [Alle seks igjen](2026-10-12-six-layers/13-Trondheim-six-final.png). |
| 13. Pan/zoom/reset | Faktisk +zoom og muse-drag/pan, [seks lag i detalj](2026-10-12-six-layers/10-six-detail.png); bare eksplisitt reset gjenoppretter kommuneutsnitt. |
| 14. Mobil 390 px | [Åpen, øvre panel](2026-10-12-six-layers/11-mobile-open-six.png), [nedre panel](2026-10-12-six-layers/11-mobile-panel-bottom.png), [lukket](2026-10-12-six-layers/11-mobile-closed-six.png), [mobil reset](2026-10-12-six-layers/11-mobile-reset-six.png), [Dovre](2026-10-12-six-layers/12-Dovre-mobile-villrein-and-new.png). Ingen horisontal overbredde. |
| 15. Originale tre lag | Reell eksisterende A–L samt planens native råpikselkontroll kjørt på nytt. [Regresjonslogg](2026-10-12-six-layers/existing-three-checks.json), alle bestått. 262 144 rå DiBK/Grunnkart-piksler: 0 avvik. Godkjent hatch uendret. |
| 16. Naturtypefilter | [Filter + alle lag](2026-10-12-six-layers/9-filter-six.png). Frisk lågurtfuruskog/kildeobjekt bevart ved de tre nye lagene av/på, ingen fit. |
| 17. Ingen JS-feil/stale lag | 0 JavaScript-feil. Alle av fjerner temavisning; kommunebytte og returnert tomt bilde renses korrekt. Sene skjulte feil kontrolleres separat i renderregresjon. |

[Maskinlesbar kontroll, kompositt-/geografipunkter, lag/opasitet/zIndex og HTTP-logg](2026-10-12-six-layers/checks.json).
15 grupperte gates dekker kravtabellen. Av 517 eksterne forespørsler var alle
kart-/datakilder HTTP 200. Tre eksisterende Unsplash-illustrasjoner på
kommuneoversiktsruten ble blokkert av miljøets proxy (403); disse er ikke
karttjenester og er ikke erstattet eller endret i denne leveransen.

## Tester, dokumentasjon og publisering

- `npm test`: **124 tester, 22 filer**, bestått. Nye kontraktstester dekker alle
  64 avkryssingskombinasjoner, INON-år/native legend, opasitet, tomstatus,
  kommuneeier og uendret filter/valg. Eksisterende analyse-/cachetester beholdt.
- Backend: **30 pytest-tester**, bestått; `ruff check .` bestått.
- `npm run lint`: 0 feil; eksisterende Fast Refresh-advarsel.
- `npm run build`: bestått; eksisterende stor-bundle-advarsel.
- `npm run test:browser`: beholdt analyse-renderregresjon, bestått.
- `npm run test:browser:layers`: kontrollert renderregresjon ved DPR 1 og 2,
  bestått. Nye lag viser faktiske sammensatte piksler i engine-testen, 64 fysiske
  lagkombinasjoner, rett rekkefølge, transparent tomt WMS, sen deaktivert feil,
  maskering/hull, cleanup og reelt React-panel med produksjons-CSS ved fire
  bredder. Kontrollerte WMS-bilder er kun negative/regresjonstester, ikke
  erstatning for reelle tjenester i akseptkontrollen. Denne testen inngår
  allerede i Quality Gate; ingen workflowendring nødvendig.
- `npm run test:browser:themes`: originale tre lag, reell regresjon, bestått.
- `npm run test:browser:six:live`: nye lag/Trondheim/Dovre, bestått som ovenfor.

Ny [ADR](../decisions/2026-10-12-v3-six-explore-layers.md), levende arkitektur,
produktføringer, AGENTS/README og browserdokumentasjon er oppdatert.
Utviklingsplanen har et **åpent UX-punkt** for naturtypefilter langt nede på
siden der kartet forsvinner fra synsfeltet. Dette er bevisst ikke løst her.

Siste SHA, endelig CI og Pages-deployment rapporteres i eksisterende PR #76 og
leveransemeldingen. Samme branch/workflow/Pages brukes, uten merge eller main-
endring. Proxyens eventuelle CONNECT 403 for Pages hindrer ikke deploy;
Actions og deployment-API verifiserer publisert SHA.

## Begrensninger

INON-aliaset er dokumentert som januar 2023, men WMS-tjenestene er ikke låst
til en versjonert datafil. Vern/Villrein har ikke et felles dataskjæringsår,
og regional eller manglende kartlegging må ikke tolkes som naturkvalitet.
Villreinfunksjonsområder, grå arealer og FKB-Grønnstruktur er ikke koblet inn.

Grov Grunnkart-/planoversikt er fortsatt bare klargjort for Trondheim.
De nye tre WMS-lagene er kontrollert i begge kommunene og krever ikke dette
oversiktsrasteret. Dovre-kontrollen bruker de nye lagene; det er ingen påstand
om at alle gamle analyse-/oversiktsberegninger er nasjonalt klargjort.

Med seks aktive lag blir legend/filterpanelet langt, og laglisten har intern
vertikal scrolling. Sammenfall i kartet er vanlig visuell kombinasjon, ikke
beregnet påvirkning/naturtap. Nye symboler og opasitet gjør lagene tilgjengelige;
øverste verneflater kan likevel dekke enkelte underliggende markeringer.
