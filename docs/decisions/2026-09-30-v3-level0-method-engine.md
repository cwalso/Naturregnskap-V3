# Beslutning: Prototype for Nivå 0-beregning

**Dato:** 2026-09-30  
**Status:** Implementert som teknisk prototype. Metodiske avklaringspunkter gjenstår.

## Formål

Leveranse B etablerer en etterprøvbar beregningsmotor for beholdning på Nivå 0.
Den endrer ikke brukerflaten og inneholder ikke kommunevise produksjonstall.

Metodeutkast 0.2 legger til grunn at kjerneregnskapet føres med tre kategorier:

- Natur
- Jordbruk
- Bebygd

Bebygd er definert som bebygd og opparbeidet areal. Jordbruk er dyrket mark og
grasmark. Natur er øvrige klasser. Koblingen fra Grunnkart skal være entydig,
dokumentert og versjonert.

## Metodisk status

Metodeutkastet sier samtidig at gjeldende klasseinndeling i Grunnkart og den
endelige koblingstabellen til Nivå 0 fortsatt må harmoniseres. Regelsettet under
er derfor en prototypekobling, ikke fastsatt metode.

Metodeversjon i kode: `level0-v0.3-prototype`.

## Prototypekobling

Kildeegenskap: `okosystemtypeniva1`.

| Grunnkart | Nivå 0 |
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
| `hav` | Eksplisitt ekskludert i arbeidsretningen land + ferskvann |

Mappingen er case-sensitiv. En kildeklasse som ikke finnes i tabellen blokkerer
beregningen. Den legges aldri automatisk til Natur.

## Beregning

For hver kommune summeres areal for alle kildeobjekter som er mappet til hver
Nivå 0-kategori.

```text
Natur_m²    = sum(kildeareal -> Natur)
Jordbruk_m² = sum(kildeareal -> Jordbruk)
Bebygd_m²   = sum(kildeareal -> Bebygd)
```

Prepared-resultatet rekonsileres slik:

```text
kildeareal =
  klassifisert Nivå 0-areal
  + eksplisitt ekskludert areal
  + umappet areal
```

`umapped_area_m2` skal være null. Ukjent klasse stopper preparation.

## Arealberegning

To kontrollerte innganger støttes:

1. GeoParquet med eksplisitt validert metrisk arealfelt, for eksempel
   `SHAPE_Area`.
2. GML i metrisk ETRS89 / UTM 32 eller 33, der polygonareal beregnes direkte
   fra geometrien. Polygonhull trekkes fra og flerdelte geometrier summeres.

Geografiske koordinatsystemer som EPSG:4258 brukes ikke direkte til
arealberegning. WMS, kartbilder, skjermbilder og Web Mercator-BBOX brukes aldri
som regnskapsgrunnlag.

## Andeler

Metodeutkastet sier at areal og andel skal beregnes, men kommentaren til 4.1
viser at prosentnevneren ennå ikke er avklart. API-feltet for andel beholdes
derfor, men publiseres som `null` i denne prototypen. Leveranse B fastsetter
ikke nevneren.

## Sporbarhet

Hvert prepared-resultat lagrer:

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

Provider-laget avviser prepared-resultater fra andre metodeversjoner eller
resultater med umappet areal.

## Avklaringspunkter som ikke løses i Leveranse B

- endelig geografisk regnskapsområde, særlig sjø
- endelig harmonisert koblingstabell mot gjeldende Grunnkart-versjon
- prosentnevner
- oppdateringsfrekvens og referanseperioder
- regler for historiske overganger og metode-/datakorreksjoner

En endring i disse punktene skal gi ny metodeversjon, ikke skjult omkoding av
allerede publiserte tall.
