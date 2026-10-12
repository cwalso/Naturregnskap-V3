# Grå arealer og avgrenset FKB-tilgang

Dato: 12.10.2026. Status: implementert på feat/explore-analysis-map i PR #76.
Utvider [seks lag](2026-10-12-v3-six-explore-layers.md).

## Beslutning

Integrer Miljødirektoratets offisielle Kart over grå arealer via NIBIOs WMS
`https://wms.nibio.no/cgi-bin/graastruktur`. Tjenesten er verifisert direkte,
med faktisk kartinnhold, EPSG:25833, CORS, GetLegendGraphic og tjenestevilkår.
WMS oppgir ingen begrensninger, og offisiell API-metadata oppgir
`noConditionsApply`. Nedlastbare GPKG-data har andre tilgangs-/lisensvilkår;
leveransen bruker bare visningstjenesten og lager ikke en egen klassifikasjon.

Én avkryssing, egen opasitet og tre framstillinger:
`graa_arealer`, `andel_uten_vegetasjon`, `andel_med_vegetasjon`.
Kildens navn, estimater og prosentklasser brukes uten egne beregninger.
Bygningsandel finnes i capabilities, men inngår ikke i dette undertemavalget.
Klikkinformasjon er vurdert og utsettes: det krever en separat objektflyt og
må ikke overta naturtypelagets eksisterende klikkinformasjon.

Grå arealer er supplerende temadata. Testversjon 1 har sammensatte grunnlagsår,
er ikke identisk med nivå-0-klassen Bebygd og dokumenterer ikke ledig areal,
fortettingspotensial, naturtap eller tilstand.

## FKB-Grønnstruktur

WMS `gronnstruktur` har `arealtype` og `sjikthoyder`; faktisk kartinnhold og
CORS er kontrollert. Datasettsiden og **WMS-metadata** angir Norge digitalt-
lisens. Lisensen tillater eksterne visningstjenester for avtalepartene; repoet
og sessionen dokumenterer ikke at denne offentlige GitHub Pages-prototypen
brukes under en slik parts/oppdragsgivers rettigheter.

Teknisk lesetilgang er derfor ikke tilstrekkelig. Behold `green-structure`
som reservert ID, uten avkryssing, montert kilde eller offentlig dataarkiv.
Publiser Grå arealer alene. Ingen tokens, innlogging eller tilgangsomgåelse.
Før senere integrasjon må Geovekst/Kartverket eller relevant Norge digitalt-
part bekrefte rett for denne konkrete offentlige prototypen og eventuell
oppdragsgiver-/underleverandørtilknytning, med nødvendige kilde-/datakrav.

## Eksisterende arkitektur

Én OpenLayers-instans, eksisterende register/panel og kommunemaske beholdes.
Sju lag gir 128 kombinasjoner. Grå arealer ligger på zIndex 11, mellom nivå 0
og INON. Standard 25 % gjennomsiktighet og av ved åpning. Øvrig rekkefølge,
planskravur, filtre, analyser og cacher er uendret.

Framstilling er et enkelt kilde-LAYERS-valg i samme ImageWMS, med matching
service-legend. Synlighet/opasitet/filter/objektvalg og utsnitt bevares.
Servicelegend bruker dokumentert `SLD_VERSION=1.1.0`; uten dette returnerer
MapServer XML-feil selv med HTTP 200.

Kildens maksimale målestokknevner er 250 000. EPSG:25833 i meter med OGCs
0,28 mm skjermpiksel gir 70 m/piksel. `maxResolution=70` og `out-of-scale`
skiller grovt utsnitt fra tomt bilde eller kildefeil, uten automatisk zoom.
Dette er en visningsgrense, ikke et nytt analysegrid.

[Validering, kilder, begrensninger og skjermbilder](../validation/2026-10-12-grey-areas.md).
Samme branch, PR og Pages-workflow brukes; ingen merge eller main-endring.
