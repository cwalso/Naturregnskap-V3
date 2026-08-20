# Research gate: AR5-endringer som polygonkilde

**Dato:** 2026-08-19

## Avgrensning

Researchen skiller nå mellom (1) eksistens og faglig semantikk, som er
verifisert eksternt mot offisielle NIBIO-kilder, og (2) maskinlesbar
vektortilgang og skjema, som fremdeles ikke er verifisert. Dette skillet er
avgjørende: et synlig kartlag er ikke i seg selv en dokumentert analysekilde.

## Verifisert: eksistens og semantikk

Ekstern kontroll mot NIBIOs [Arealressurskart AR5](https://www.nibio.no/tema/jord/arealressurser/arealressurskart-ar5)
og kartportalen [Kilden](https://kilden.nibio.no/) bekrefter at:

- NIBIO publiserer egne kartlag med AR5-endringer i Kilden;
- periodebaserte kartlag viser alle endringer av arealtype i AR5 i den angitte
  perioden;
- kartlaget «NIBIO – Periodisk» finnes;
- ved periodisk ajourhold sammenlignes AR5 før og etter ajourhold, og endrede
  arealer lagres som et eget kartlag.

Kartlagene dokumenterer endringer i kartbasen mellom ajourholdstilstander. De
gir ikke nødvendigvis tidspunktet da en fysisk arealendring skjedde. Endringer
kan også skyldes ajourhold, feilretting eller endret klassifikasjon. Lagene skal
derfor ikke uten videre omtales som datofestet fysisk naturtap.

## Ikke verifisert: teknisk vektortilgang og skjema

Følgende er fortsatt ikke dokumentert eller reprodusert i prosjektet:

| Krav | Status |
| --- | --- |
| Konkret WFS-, Atom- eller nedlastings-URL | Ikke verifisert |
| Autoritativt layer-/datasettnavn for vektoruttrekk | Ikke verifisert |
| Støttede perioder/årsversjoner i maskinlesbar tjeneste | Ikke verifisert |
| Polygongeometri, CRS og encoding | Ikke verifisert |
| Feltstruktur og datatyper | Ikke verifisert |
| Representasjon av fra- og til-klasse | Ikke verifisert |
| Arealfelt, enhet og kommuneidentifikator | Ikke verifisert |
| Faktiske vektorpolygoner for Indre Fosen 5054 | Ikke verifisert |

NIBIOs tjenesteverter for [WMS](https://wms.nibio.no/) og
[WFS](https://wfs.nibio.no/) samt [Geonorge-kartkatalogen](https://kartkatalog.geonorge.no/)
er fortsatt naturlige autoritative innganger. Direkte oppslag ble blokkert av
arbeidsmiljøets HTTP-proxy (HTTP 403), og ga derfor ikke et verifiserbart
`GetCapabilities`, skjema eller kommuneuttrekk.

## Vurdering

AR5-endringslagene finnes og kan være en relevant fremtidig testadapter, men en
adapter kan ikke implementeres før vektorendepunkt, skjema, kodeverdier og
dekning for 5054 er verifisert. Denne leveransen gjetter derfor ingen AR5-felt,
koder eller mapping.

V3.6A fortsetter i stedet med et eksplisitt syntetisk fixture merket
`dataset = synthetic-change-fixture` og `purpose = architecture_test`.
Fixturet tester bare den generiske kjeden polygon → overgang → arealstatistikk →
API → kart. Det er ikke AR5-data, SSB-data eller reelle endringer i Indre Fosen.

Før en AR5-adapter senere innføres, må et offisielt kommuneuttrekk lagres
utenfor Git, alle observerte kodeverdier inspiseres uten fuzzy matching, og
semantikken avklares mot NIBIOs dokumentasjon.
