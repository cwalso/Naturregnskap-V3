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

At en datakilde er koblet til kartvisningen betyr ikke at V3 har evaluert om den
valgte kommunen har objekter i datasettet.

Før en faktisk romlig kontroll er implementert, skal status være
`municipalityEvaluation: not_evaluated`.

Følgende skal ikke sluttes fra et tomt kartutsnitt:

- at kommunen er kontrollert mot datasettet
- at kommunen ikke har treff
- at naturverdien eller temaet er fraværende

En senere analyseflyt kan innføre eksplisitte statuser som `covered_hit`,
`covered_no_hit`, `not_covered` og teknisk feil, men bare når statusen er
beregnet mot godkjent geometri og datakilde.

## Arkitektur

WMS brukes kun som `visualSource`.

Kartlagene opprettes generisk fra dataset-registeret. Brukerflaten skal derfor
ikke eie URL-er, kartlagsnavn eller dekningsmetadata. Dette gjør det mulig å
legge til flere temadata uten å duplisere kildekunnskap i komponentene.

Eventuell senere arealanalyse mot disse datasettene krever egen godkjent
`analysisSource`; WMS-bildet skal ikke brukes til arealberegning eller
treffanalyse.

## Konsekvens

«Utforsk naturen» kan nå skille mellom tema som faktisk er koblet til kart og
tema som fortsatt bare er planlagte innganger. «Utforsk i kart» kan vise de to
reelle temalagene, samtidig som skillet mot heldekkende regnskapsgrunnlag
bevares.
