# Grå arealer – kildekontroll, tilgang og kartaksept

Dato: 12.10.2026. PR #76, feat/explore-analysis-map. Lokal/ekstern start-HEAD
bekreftet: `0931d0d7e317fd69676e39d691c209f05c7575e4`. Main bekreftet:
`a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`.

## Offisielt gråarealprodukt og tilgang

Utgangspunktet er [Miljødirektoratets kartprodukt](https://www.miljodirektoratet.no/ansvarsomrader/overvaking-arealplanlegging/arealplanlegging/kart-over-gra-arealer/).
[Geonorge datasett c5f09d79](https://kartkatalog.geonorge.no/metadata/uuid/c5f09d79-1546-495c-8b36-91efd4008bd7)
og [offisiell høstet katalog](https://data.norge.no/nb/datasets/1ff3e9eb-3e9d-37f1-b592-cccf977e6fd6/kart-over-gra-arealer)
identifiserer produktet og GPKG-distribusjon. Landet/fylker/kommuner er
beskrevet som nedlastingsinndeling. Nedlasting er begrenset/Norge digitalt.
Det betyr ikke at visningstjenesten har samme vilkår.

[WMS-metadata bf6d3270](https://kartkatalog.geonorge.no/Metadata/uuid/bf6d3270-0930-4a23-8809-a883f6442472),
[høstet API-metadata](https://data.norge.no/nb/data-services/f241d863-8e66-3b23-b740-bfe6f1a5af80/kart-over-gra-arealer-wms-testversjon-1)
og direkte capabilities bekrefter **WMS for kart over Grå arealer**,
`https://wms.nibio.no/cgi-bin/graastruktur`. API-lisens er
`noConditionsApply`; capabilities har Fees `no conditions apply` og
AccessConstraints `none`. Offentlig WMS-visning kan brukes; ingen vektordata
lastes ned eller distribueres av appen. Full kildekreditering beholdes.
Ingen WMTS, WFS eller ArcGIS-endpoint ble dokumentert i de kontrollerte
produkt-/tjenestekildene. De er ikke antatt eller implementert.

| Lag | Hva appen viser |
| --- | --- |
| `graa_arealer` | Kildens avgrensede gråarealobjekter, med offisiell grå flate og svart omriss. |
| `andel_uten_vegetasjon` | Kildens estimat i prosent innenfor hvert objekt, fem offisielle intervaller. |
| `andel_med_vegetasjon` | Kildens estimat i prosent innenfor hvert objekt, fem offisielle intervaller. |
| `andel_med_bygninger` | Verifisert i capabilities, ikke implementert i denne leveransen. |

Offisielle prosentklasser i legend: 0–1, 1–25, 25–50, 50–75 og 75–100 %.
Grå- og grønnandel benevnes presist som uten/med vegetasjon. Kilden deler
arealbruk/arealdekke og kan inkludere tilhørende grønt, hager og vegkanter i
selve avgrensningen. Dette er ikke en ny økosystemklasse eller nivå-0-Bebygd.
Appen beregner ingen nye prosentandeler, arealer, overlapp eller fortetting.
[Offisiell utvalgstabell, versjon 20260429](https://register.geonorge.no/nasjonale-standarder-og-veiledere/dokumentasjon-og-metode/kart-over-gr%C3%A5-arealer-utvalg-fra-grunnkartet)
skiller arealdekke, hoved-/underklasse for arealbruk og med/ikke med.
Bebyggelse/samferdsel inngår i viste tabellrader; jordbruk og vann gjør ikke det.
Dette dokumenterer kildeklassifikasjonen, som appen ikke utfører på nytt.

Produktet er versjon 1, WMS heter testversjon 1. [Kildens sluttrapport](https://dokument.geonorge.no/nasjonale-standarder-og-veiledere/dokumentasjon-og-metode/kart-over-gr%C3%A5-arealer-sluttrapport/1/kart-over-gr%C3%A5-arealer-sluttrapport.pdf)
er datert 15.12.2025 og beskriver Testversjon 2 av Grunnkart (april/juni 2025)
som grunnlag, supplert med FKB-Grønnstruktur og SSB-bygg. Vegetasjonsandelene
er estimater. Det er ikke status 2026 eller en versjonert kopi av Grunnkart
årsversjon 2025. Kildene har ulik alder. Katalogens metadataoppdatering er
ikke en observasjonsdato. Native GetMetadata returnerer blant annet `2011`
og manglende felter; dette er åpenbart ikke et dokumentert referanseår for
produktet lansert i 2025 og brukes ikke i UI. Metadata kan endres over tid.

Capabilities støtter EPSG:25833, som brukes i samme kommunekart. Utstrekningen
er nasjonal (omtrent 4,07–31,3 øst / 57,87–72,20 nord). Detaljlagene har
MaxScaleDenominator 250000: appen forklarer grovere utsnitt med `out-of-scale`,
uten å vise dette som null data eller feil og uten automatisk zoom.
WMS kan tegne i ønsket bildeoppløsning; dette er ikke kildepresisjon eller
analysegrid. CORS `*` og faktisk PNG-dekoding/lesbare canvas i Chromium bekreftet.

Direkte GetMap 1024² over reelle kommune-bokser i EPSG:25833 ga synlig innhold:

| Lag | Trondheim 5001 | Dovre 3431 |
| --- | ---: | ---: |
| Grå avgrensning | 186832 piksler | 50146 piksler |
| Uten vegetasjon | 141452 piksler | 32114 piksler |
| Med vegetasjon | 141452 piksler | 32114 piksler |

GetLegendGraphic krever `SLD_VERSION=1.1.0`. Uten parameteren var HTTP-status
200, men innholdet XML-feil. Dette ble rettet før integrasjon; faktiske PNG-
legender er kontrollert, henholdsvis 112×22 og 108×90. GetFeatureInfo er
queryable i capabilities, men klikkinspektør er vurdert og ikke implementert:
den krever en egen objektdetaljflyt og skal ikke forstyrre naturtypevalg.
Kontrollkallet returnerte et objekt uten attributter; dette er ikke dokumentasjon
på ferdig objektinformasjon i appen.

## FKB-Grønnstruktur: teknisk mulig, ikke publisert

[Datasett 86d6201a](https://kartkatalog.geonorge.no/metadata/uuid/86d6201a-4e0b-4f61-a1dc-c94164cfd160),
[oppgitt datasettkatalog](https://data.norge.no/nb/datasets/d72c5c41-dc6a-318f-a2b5-2395700caa6e/fkb-gronnstruktur)
og [WMS-metadata](https://data.norge.no/nb/data-services/ad203709-8199-38ab-a238-d554254b469e/fkb-gronnstruktur-wms)
er kontrollert. Endepunkt: `https://wms.nibio.no/cgi-bin/gronnstruktur`.
Capabilities har `arealtype` og `sjikthoyder`, EPSG:25833 arvet fra hovedlaget,
MinScaleDenominator 100 / MaxScaleDenominator 500000, GetMap/GetLegendGraphic
og CORS. Privat teknisk GetMap-kontroll ga faktisk innhold i Dovre for begge
lag og i Trondheim for sjikthøyde. Første grove Trondheim-arealtypekall fikk
40 s timeout; et detaljkall på 512² rundt byområdet lykkes (206149 synlige
arealtypepiksler, 57599 sjikthøydepiksler). Dette er ikke offentlig appaksept.

[NIBIOs fagbeskrivelse](https://www.nibio.no/tema/jord/arealressurser/gronnstruktur)
skiller bunnsjikt under 1 m, busksjikt 1–3 m og tresjikt over 3 m. Andre
arealtyper er grått, veg, vann, bygning og jordbruk. Sjikthøyde, arealtype og
prosentvis grønnandel er forskjellige egenskaper. Dekningen gjelder bebygde
områder/hyttefelt/næringsområder, ikke hele naturarealet. Produktet er lansert
i 2024; periodisk satellitt-/høydeajourhold normalt hvert tredje år suppleres
med FKB-ajourhold. Et felles aktuelt referanseår for alle objekter er ikke
bekreftet. Tilpasset målestokk fra 1:1000; oppløsning varierer med grunnlagsdata.
[NIBIOs beskrivelse av 2024-etableringen](https://www.nibio.no/nyheter/nye-temakart-hjelper-bergen-kommune-med-klimaomstilling)
angir satellittbilder fra 2021 i 2×2/4×4 m og høydemodell fra 2024 i 1×1 m,
sammen med FKB 2024. Dette beskriver etableringsgrunnlaget, ikke et bekreftet
nytt 2026-skjæringstidspunkt for dagens WMS.

**Både nedlastings- og WMS-metadata angir Norge digitalt-lisens**, til forskjell
fra gråareal-WMS. [Lisensen](https://www.kartverket.no/geodataarbeid/norge-digitalt/partsinformasjon/avtaler-og-vilkar/norge-digitalt-lisens)
gir avtalepartene adgang til eksterne visningstjenester. Det er ikke dokumentert
at denne offentlige prototypen drives under slik parts-/oppdragsgiverrett.
Derfor publiseres ikke laget, kontroll eller kartbilder. `green-structure`
reserveres fortsatt uten montert kilde. Ingen tokens/tilgangsomgåelse.

**Gjenstående avklaring:** Bekreftelse fra Geovekst/Kartverket eller relevant
Norge digitalt-part om rett for denne konkrete offentlige Pages-prototypen,
inkludert eventuell oppdragsgiver-/underleverandørtilknytning og kildekrav.
Brukeren ble ikke bedt om å avklare dette underveis; Grå arealer ferdigstilles.

## Reell automatisk og visuell aksept

Vanlig App i Chromium, reelle tjenester i Trondheim og Dovre. Miljøets proxy
videresender identiske URL/metode/query/body; ingen syntetiske kartdata.
Kildens fargede viewport-canvaspiksel innenfor kommunepolygonet sammenlignes
med faktisk sammensatt skjermpiksel og samme bakgrunnspunkt med laget av.
Dermed dokumenteres synlig, geografisk riktig kartobjekt, ikke bare HTTP 200.
Trondheim: 91743 synlige viewportpiksler, kildepunkt `[260751.55,7044889.69]`,
skjerm `[62,62,62]` mot bakgrunn `[197,197,197]`. Dovre: 30180 synlige piksler,
`[216597.17,6913950.11]`, skjerm `[14,14,14]` mot bakgrunn `[58,58,58]`.
Alle åtte grupperte gates bestått. 0 JavaScript-feil. HTTP-loggen i kontrollfilen
viser ett forbigående 503-svar fra verne-WMS ved mobilutsnitt (senere utsnitt
viste laget uten feil), øvrige kart-/datakall og tre eksisterende Unsplash-illustrasjoner på
kommuneoversikten blokkert av miljøets proxy (403); ingen kartkilde ble byttet ut.
27 skjermbilder er fra faktisk kjørende app, uredigerte. Bilder/legender
er ferdig dekodet og malt før screenshot.

| Krav | Resultat / skjermbilde |
| --- | --- |
| 1. Grå alene | [Trondheim](2026-10-12-grey-layers/1-grey-alone.png), [Dovre](2026-10-12-grey-layers/7-Dovre-grey.png). Faktiske objekter innenfor kommunene. |
| 2. Grå + nivå 0 | [Sammen](2026-10-12-grey-layers/2-grey-level0.png). |
| 3. Grå + plan | [Sammen](2026-10-12-grey-layers/2-grey-future-development.png). Godkjent planskravur uendret. |
| 4. Framstillingsvalg | [Uten vegetasjon](2026-10-12-grey-layers/3-andel_uten_vegetasjon.png), [med vegetasjon](2026-10-12-grey-layers/3-andel_med_vegetasjon.png). Native legend, kildepiksler, utsnitt og andre lag bevart. |
| 5–6. FKB alene/begge | Ikke kjørt i offentlig app: ingen publiseringsrett bekreftet, ingen kontroll/kilde montert. Privat teknisk status dokumentert over. |
| 7. Alle tilgjengelige | [Sju](2026-10-12-grey-layers/2-all-seven.png), [nedre panel](2026-10-12-grey-layers/2-all-seven-panel-bottom.png). |
| 8. Alle av | [Desktop](2026-10-12-grey-layers/4-none.png), [mobil](2026-10-12-grey-layers/6-mobile-none.png). |
| 9. Gjennomsiktighet | 0/50/75/100 %, andre lag/utsnitt bevart. [50 %](2026-10-12-grey-layers/4-grey-opacity-50.png). |
| 10. Legend/kilde | Alle tre native PNG-legender; versjon, semantikk og forbehold synlige. [Målestokkgrense](2026-10-12-grey-layers/1-grey-scale-limit.png). |
| 11. Kommunebytte | [Dovre](2026-10-12-grey-layers/7-Dovre-supplemental.png) → [Trondheim igjen](2026-10-12-grey-layers/8-Trondheim-return.png), riktig eier/utsnitt og kildeinnhold. |
| 12. Navigasjon | [Zoom/pan](2026-10-12-grey-layers/6-detail-pan.png), eksplisitt reset; ingen fit ved lag/framstilling/opasitet. |
| 13–14. Mobil/overflow | [Åpen 390 px](2026-10-12-grey-layers/6-mobile-open.png), [nedre panel](2026-10-12-grey-layers/6-mobile-panel-bottom.png), [lukket](2026-10-12-grey-layers/6-mobile-closed.png). Ingen horisontal overflow/avklipping. |
| 15. Seks lag regresjon | Eksisterende reell Trondheim/Dovre-kontroll bestått; Villrein positiv i Dovre og gyldig tom i Trondheim. Originale tre lag kontrollert separat. |
| 16. Filter/objektvalg | [Naturtypefilter og valgt objekt](2026-10-12-grey-layers/5-filter-and-selection.png) bevares ved framstilling og av/på. |
| 17. Stale/JS | Alle av fjerner lag. Kommunebytte rydder. Ingen JavaScript-feil. Tomt bilde og sene skjulte feil kontrolleres også i renderregresjon. |

## Tester og dokumentasjon

- Frontend: 125 tester / 22 filer bestått, inkludert 128 kombinasjoner og
  framstilling/legend/utsnitt, målestokkstatus og ingen FKB-kontroll.
- Backend: 30 pytest-tester og Ruff bestått. AnyIO-depresieringsadvarsel beholdt.
- Lint: 0 feil, eksisterende Fast Refresh-advarsel. Build bestått med eksisterende
  bundle-størrelsesadvarsel.
- Beholdt analyse-renderkontroll bestått. Lag-renderkontroll DPR 1 og 2 bestått:
  128 kombinasjoner, fysisk komposisjon/rekkefølge/opasitet, kildevalg/målestokk,
  kommunemaske/hull, filter/objektvalg, tomt WMS, sene skjulte feil og cleanup.
- Reelle browserkontroller for originale tre, eksisterende seks og Grå arealer
  kjørt på ny kode. FKB-aksept er ikke fremstilt som bestått.

[Maskinlesbar ny kontroll](2026-10-12-grey-layers/checks.json),
[sekslagsregresjon](2026-10-12-grey-layers/six-regression.json),
[trelagsregresjon](2026-10-12-grey-layers/three-regression.json),
[kildeoversikt](2026-10-12-grey-layers/sources/notes.json).
[Ny ADR](../decisions/2026-10-12-v3-grey-areas-and-fkb-access.md), AGENTS/README,
arkitektur, produktføringer og utviklingsplan oppdatert. Filter-/kartproblemet
beholdes som åpent UX-punkt; ingen større redesign. Analysemetode, nivå 0,
DiBK-filter, planskravur, nevnere/grid/UTM/verdiregler og resultatcache uendret.

Endelig SHA/CI/Pages dokumenteres i PR #76 og leveransemeldingen. Samme branch,
PR og workflow brukes; ingen merge/main-endring. CONNECT 403 for Pages
håndteres med Actions/deployment-API-verifikasjon av eksakt publisert SHA.

## Begrensninger

Gråareal-WMS er en løpende testtjeneste uten låst datafil, med kilder av ulik
alder. Vegetasjonsandel mangler i enkelte objekter, mens avgrensningen finnes;
0 % skal ikke gjettes fra manglende symbol. Store lag kan visuelt overlappe;
standardopasitet og plasseringen under plan/naturtyper/vern gjør viktige tema
lesbare. Gamle grove nivå-0-/planoversikter er fortsatt Trondheim-klargjorte;
Dovre-testen gjelder relevante WMS-lag. Panelet har vertikal scrolling, og
naturtypefilter langt nede er fortsatt et åpent UX-punkt.
