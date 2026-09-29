# Beslutning: første reelle supplerende temadata i V3

Dato: 2026-09-29

## Status

Besluttet for V3-prototypen.

## Beslutning

V3 kobler inn to reelle supplerende temadatasett i første trinn:

- Naturvernområder, Miljødirektoratet
- Villreinområder, Miljødirektoratet

Begge registreres i det sentrale dataset-registeret og kan visualiseres som WMS-lag i
«Utforsk i kart». De samme metadataene brukes i «Utforsk naturen».

Dette endrer ikke regnskapsgrunnlaget. Datasettene har kategorien `thematic` og
skal ikke brukes som Level0-regnskapsgrunnlag eller blandes inn i arealberegningene.

## Datakilder

### Naturvernområder

- Datasettside: https://kartkatalog.miljodirektoratet.no/Dataset/Details/0
- WMS: https://kart.miljodirektoratet.no/arcgis/services/vern/mapserver/WMSServer
- Kartlag: `naturvern_omrade`
- Oppgitt dekning i kartkatalogen: Norge, Svalbard og Jan Mayen

### Villreinområder

- Datasettside: https://kartkatalog.miljodirektoratet.no/Dataset/Details/25
- WMS: https://kart.miljodirektoratet.no/arcgis/services/villrein/MapServer/WMSServer
- Kartlag: `villrein_leveomrade`
- Oppgitt dekning i kartkatalogen: Sør-Norge
- Ved publisering skal kildekravet fra kartkatalogen ivaretas.

## Statusmodell for dekning og treff

V3 har nå en egen analyseflyt for kommunespesifikk treffstatus. Kommunegrensen
fra Kartverket brukes som spørringsgeometri mot Miljødirektoratets ArcGIS
feature-lag. WMS-bildet brukes ikke til denne vurderingen.

Følgende statuser brukes:

- `hit`: ett eller flere registrerte objekter i kilden krysser kommunegrensen
- `no_hit`: spørringen lyktes, men fant ingen registrerte objekter som krysser kommunegrensen
- `unavailable`: kilden kunne ikke evalueres teknisk; dette skal aldri tolkes som null treff

For regionale kilder, som villrein, betyr `no_hit` bare at den aktuelle kilden
ikke inneholder objekter som krysser kommunegrensen. Det skal ikke omtales som
en generell vurdering av temaets relevans eller som dokumentasjon på full
geografisk dekning.

Et tomt eller mislykket WMS-bilde skal fortsatt ikke brukes til å trekke
konklusjoner om treffstatus.

## Arkitektur

WMS brukes kun som `visualSource`.

Kartlagene opprettes generisk fra dataset-registeret. Brukerflaten skal derfor
ikke eie URL-er, kartlagsnavn eller dekningsmetadata. Dette gjør det mulig å
legge til flere temadata uten å duplisere kildekunnskap i komponentene.

Datasettene har nå en egen `analysisSource` gjennom backend-API-et for
kommunespesifikk treffstatus. Denne bruker ArcGIS REST Query mot polygonlagene.
WMS-bildet brukes fortsatt ikke til arealberegning eller treffanalyse.

## Konsekvens

«Utforsk naturen» kan nå skille mellom tema som faktisk er koblet til kart og
tema som fortsatt bare er planlagte innganger. «Utforsk i kart» kan vise de to
reelle temalagene, samtidig som skillet mot heldekkende regnskapsgrunnlag
bevares.


## Kartinteraksjon

Aktive temalag kan identifiseres ved klikk i kartet gjennom WMS
`GetFeatureInfo`. Dette er et kartoppslag for å vise objektattributter fra
kildetjenesten, ikke en analyse av kommunen og ikke en del av
regnskapsberegningen.

Teknisk tilgjengelighet skal skilles fra faglig fravær. WMS-kildenes
`imageloadstart`, `imageloadend` og `imageloaderror` brukes derfor til å
vise om kartlaget laster, er tilgjengelig eller har teknisk feil. En teknisk
feil skal ikke kunne tolkes som at datasettet er kontrollert og ikke har treff.


Objektinformasjon presenteres som en liten boks over kartet. Objektnavn hentes
fra relevante attributter når tjenesten returnerer dette. URL-er fra
WMS-responsen gjøres klikkbare bare når de bruker `http` eller `https`.

WMS `GetFeatureInfo` garanterer ikke at objektgeometrien returneres. V3 skal
derfor ikke late som det valgte polygonet er fremhevet når vi bare har
attributter fra kartoppslaget. Eksakt fremheving av valgt polygon krever en
vektorkilde eller annen kilde som returnerer geometri.
