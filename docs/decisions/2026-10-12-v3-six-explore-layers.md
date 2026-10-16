# Seks uavhengige lag i Utforsk i kart

Dato: 12.10.2026. Status: implementert på feat/explore-analysis-map for test i PR #76.

Denne beslutningen utvider [lagstyringen](2026-10-09-v3-concurrent-map-layers.md)
med tre offisielle WMS-lag. [Godkjent planskravur](../validation/2026-10-12-layer-panel-and-plan-hatch.md),
filtermetodikk og analyseavgrensning beholdes.

## Kilder og rolle

Alle tre er **supplerende temadata**, uten arealtall, overlapp, analyse-ID eller
kobling til regnskaps-/analysemotor. Eksisterende dataset definitions gjenbrukes;
aktuelle kilder, lagnavn, symboler, EPSG:25833, CORS og offentlig NLOD-visning
ble kontrollert før integrasjon. Ingen nye tema-/analysesider legges til.

- Verneområder: eksisterende offisiell `kart.miljodirektoratet.no`-tjeneste,
  `naturvern_klasser_omrade`. Kildens fem verneformer vises uten ekstra filter.
  Foreslåtte verneområder er andre lag og monteres ikke.
- INON: GeoServer `inngrepsfrinatur/wms`, laget `status`. Offisiell katalog
  identifiserer dette som januar 2023, med tre avstandssoner. År er alltid
  synlig ved aktiv legend. Dette er ikke en ny endringsanalyse eller status 2026.
- Villrein: `kart3.miljodirektoratet.no`, `villrein_leveomrade`. Biologiske
  leveområder vises, ikke faktiske posisjoner til dyr eller regionale planers
  sonegrenser. Funksjonsområder finnes i tjenesten, men undertemavalg utsettes
  for å holde første integrasjon enkel.

Nye legender hentes med GetLegendGraphic fra samme kilde som kartet. Alt-tekst,
kilde, referanseår/dateringsforbehold og metadata-/NLOD-lenke er egne registerfelt.
En legendefeil beskrives separat fra feil i kartlaget.

## Integrasjon og interaksjon

Én OpenLayers-instans, ett typet lagregister og samme panel brukes. Nye lag er
ImageWMS med egne identiteter, livssyklus, status, opasitet og klasse-navn.
Alle 64 kombinasjoner støttes. Bare nivå 0 starter på; alle kan slås av.
Grå arealer og FKB-Grønnstruktur er fortsatt bare reserverte ID-er.

Fast rekkefølge: base → nivå 0 (10) → INON (12) → Villrein (15) → plan (20) →
naturtyper (30/31) → verneområder (40) → kommunemaske/grense (1000/1001).
INONs brede flater starter med 35 % gjennomsiktighet, nivå 0 med 30 %, øvrige
med 0 % ekstra gjennomsiktighet. De nye mønstrede lagene bevarer underliggende
lesbarhet; viktige vernegrenser ligger øverst. Original trelagsrekkefølge bevares.

Lag/opasitet/filter/objektvalg/resize bevarer utsnittet. Kommunevalg og eksplisitt
reset er fortsatt eneste fit. Naturtypefilter påvirker bare naturtypelaget.
Samme kommunemaskering gjelder også de nye WMS-bildene, inkludert hull.

Et dekodet WMS-bilde uten synlige piksler får `empty`, ikke `error`. En svak
image-wrapper-referanse memoiserer kun denne bilde-statusen; eksisterende
request-/resultatcache er uendret. Callback må gjelde aktivt lag og gjeldende
WMS-image/kommune. Skjulte lags sene feil overtar ingen status eller kartflate.
Villrein gjenbruker registreringsstatus App allerede henter ved kommunevalg,
med kommuneeierkontroll. Null registreringer, tomt utsnitt, regional/manglende
kartlegging og kildefeil har forskjellige forklaringer. Ingen nye query-/
areal-/overlappsberegninger startes ved avkryssing.

## Design, kontroll og publisering

Laglisten beholder vertikal scrolling ved mange aktive lag og null range-
marginer. Mobilvelger kan lukkes. Naturtypefilter langt nede på siden kan gjøre
kartet utilgjengelig i synsfeltet; dette er registrert som åpen UX-oppgave i
utviklingsplanen og løses ikke her.

[Validering](../validation/2026-10-12-six-explore-layers.md) skiller reelle
Trondheim-/Dovre-data og screenshot-aksept fra kontrollerte negative render-
tester. Dovre har synlige villreinpolygoner; Trondheim har gyldig tom visning.
Grunnkart/plan i grov målestokk er fortsatt bare Trondheim-klargjort.

Siste commit testpubliseres fra samme branch via eksisterende Pages-workflow.
PR #76 beholdes åpen, main endres ikke og ingen merge inngår.
