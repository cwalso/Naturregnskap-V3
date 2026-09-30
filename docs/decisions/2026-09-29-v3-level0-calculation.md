# Beslutning: Level0-beregning for beholdning i Oversikt

**Dato:** 2026-09-30  
**Status:** Implementert som prototype, autorisert Trondheim-kildefil gjenstår

## Formål

Oversikt skal først vise kommunens beholdning på Nivå 0:

- Natur
- Jordbruk
- Bebygd

Dette er beholdningen i det arealbaserte naturregnskapet. Historiske endringer
behandles separat som overganger mellom de samme hovedklassene og skal ikke
brukes til å konstruere dagens beholdning.

## Metodegrunnlag

Metodeutkast 0.2 sier at kjerneregnskapet føres på Nivå 0 med tre kategorier,
og definerer:

- Bebygd = bebygd og opparbeidet areal
- Jordbruk = dyrket mark og grasmark
- Natur = øvrige klasser

Koblingen mellom Grunnkart og Nivå 0 skal være entydig, dokumentert og
versjonert.

Den eldre prototypekoblingen fra `arealdekkeniva1` er derfor erstattet av
`okosystemtypeniva1`, fordi den verifiserte Grunnkart-klassifikasjonen her
svarer direkte til definisjonene i metodeutkastet.

## Versjonert Level0-regel

Metodeversjon: `level0-v0.3-prototype`.

| Grunnkart `okosystemtypeniva1` | Nivå 0 |
| --- | --- |
| `bebygdOpparbeidetAreal` | Bebygd |
| `dyrketmark` | Jordbruk |
| `grasmark` | Jordbruk |
| `skog` | Natur |
| `heiBuskmark` | Natur |
| `liteVegetertMark` | Natur |
| `vatmark` | Natur |
| `elverBekkerKanaler` | Natur |
| `innsjoerVannmagasiner` | Natur |
| `kyststrenderSvabergDyner` | Natur |
| `hav` | Ekskludert fra gjeldende regnskapsområde |

Arbeidsretningen for første versjon er land og ferskvann, ikke sjø. Hav er
derfor eksplisitt skilt ut fra den klassifiserte Level0-balansen i prototypen.
Endelig regnskapsområde og prosentnevner er fortsatt metodiske avklaringspunkter
som må bekreftes før metoden kan fastsettes.

Ukjente kildeklasser blokkerer beregningen. De blir aldri implisitt lagt til
Natur.

## Beregning

For hver kommune beregnes:

```text
Natur_m²     = sum areal for alle kildeobjekter mappet til Natur
Jordbruk_m²  = sum areal for alle kildeobjekter mappet til Jordbruk
Bebygd_m²    = sum areal for alle kildeobjekter mappet til Bebygd

klassifisert_level0_m² = Natur_m² + Jordbruk_m² + Bebygd_m²
```

Arealene presenteres i dekar i frontend, der 1 dekar = 1 000 m².

Prosentandeler publiseres ikke i gjeldende prototype. Metodeutkastet sier at
andel skal beregnes, men prosentnevneren er eksplisitt markert som et
avklaringspunkt. API-kontrakten beholder derfor feltet for andel, men verdien er
`null` inntil nevneren er metodisk bekreftet.

## Rekonsiliering

Før et resultat kan publiseres skal følgende stemme:

```text
geometriberegnet kildeareal
  = klassifisert Level0-areal
  + eksplisitt ekskludert areal
  + umappet areal
```

`umapped_area_m2` skal være null. En ukjent klasse stopper preparation.

Dette skiller mellom:

- arealet som faktisk inngår i regnskapsområdet
- eksplisitt ekskludert hav
- eventuelle feil eller nye klasser som må avklares

## Arealnøyaktighet

Det finnes to kontrollerte beregningsspor:

1. Kommunevis GeoParquet med validert metrisk `SHAPE_Area`.
2. Kommunevis GML der areal beregnes direkte fra polygongeometrien.

Parquet-sporet er tidligere kontrollert på 1 000 reelle polygoner i EPSG:25833.
Avviket mellom `SHAPE_Area` og direkte geometriberegning var på
flyttallsnivå.

GML-sporet:

- krever metrisk ETRS89 / UTM 32 eller 33
- leser alle `GrunnkartFlate`
- beregner ytterringer minus polygonhull
- summerer alle polygon-/MultiSurface-deler
- avviser geografisk CRS som EPSG:4258 som arealberegningsgrunnlag
- rekonsilerer hele kildearealet før prepared-resultat skrives

Det beregnes aldri regnskapsareal fra WMS, kartpiksler, skjermbilder eller
Web Mercator-BBOX.

## Hva «nøyaktig» betyr

Den **beregningsmessige** delen er deterministisk og reproduserbar ned på
kildegeometrien, med bare ordinær flyttallsavrunding.

Den **faglige** nøyaktigheten er ikke det samme. Resultatet arver usikkerhet i:

- Grunnkartets geometri
- klassifikasjonen av det enkelte arealet
- kildeversjonen
- den vedtatte koblingsregelen til Nivå 0
- geografisk avgrensning av regnskapsområdet

Regelsettet har derfor fortsatt status `prototype`. En senere metodeendring
skal gi ny metodeversjon, ikke skjult omkoding av eksisterende tall.

## Sporbarhet

Hvert prepared resultat lagrer:

- kommunenummer og periode
- Grunnkart-versjon
- fysisk kildefil
- SHA-256 av kildefilen
- kildeformat
- antall kildeobjekter
- arealmetode
- metodeversjon og metodestatus
- beregningstidspunkt
- klassifisert, ekskludert og umappet areal

## Trondheim 5001

Geonorges Atom-feed inneholder en egen GML-leveranse for Trondheim i
EPSG:25832. Den identifiserte filen krever Norge digitalt-rollen
`nd.filnedlasting`. Anonym nedlasting i GitHub Actions gir HTTP 403.

NIBIOs publiserte WMS er kontrollert, men WFS er ikke aktivert. WMS skal uansett
ikke brukes som analysegrunnlag.

Beregningen er derfor implementert, men Trondheim-tall publiseres ikke før en
autorisert 5001-kildefil er tilgjengelig. Når den foreligger er kjeden:

```text
5001 GML/GeoParquet
  -> inspect
  -> kontroll av sourceField og alle kildeklasser
  -> Level0 mapping v0.3
  -> metrisk arealberegning
  -> rekonsiliering
  -> prepared/5001.json
  -> FastAPI
  -> Oversikt
```

Dette er en datatilgangsgate, ikke en grunn til å erstatte Grunnkart med en
annen statistikkilde.
