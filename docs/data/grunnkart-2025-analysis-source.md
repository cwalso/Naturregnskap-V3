# Grunnkart 2025 i V3-prototypen – datakilder og rasteranalyse

**Sist oppdatert: 08.10.2026**  
**Datasett:** Nasjonalt grunnkart for arealanalyse – årsversjon 2025  
**Metadata UUID:** `28c28e3a-d88f-4a34-8c60-5efe6d56a44d`

## Formål

Dette dokumentet beskriver hvordan Grunnkart 2025 faktisk brukes i V3 per
08.10.2026.

Det skiller mellom:

1. Grunnkart som faglig heldekkende grunnlag
2. kartvisualisering i prototypen
3. nettleserbasert rasteranalyse for beslutningsstøtte
4. autoritativ/versjonert regnskapsberegning

Disse rollene skal ikke blandes.

## Faglig rolle

Grunnkart for arealanalyse er sentralt heldekkende grunnlag og mulig felles
«fasit» for areal- og naturtypeinndeling i kommunale naturregnskap.

Overordnet nivå 0 i prototypen er:

- Bebygd
- Jordbruk
- Natur

Økosystemtype er en annen klassifikasjon enn nivå 0.

## Bekreftede nivå-1-klasser

Den offisielle kartografien for årsversjon 2025 omfatter blant annet:

1. Bebygd og opparbeidet areal
2. Dyrket mark
3. Grasmark
4. Skog
5. Hei og buskmark
6. Lite vegetert mark
7. Våtmark
8. Elver, bekker og kanaler
9. Innsjøer og vannmagasiner
10. Kyststrender, svaberg og dyner
11. Hav

I prototypeklassifiseringen grupperes blant annet:

- Bebygd og opparbeidet areal → Bebygd
- Dyrket mark + Grasmark → Jordbruk i den tekniske kartklassifiseringen
- Skog, Hei/buskmark, Lite vegetert mark, Våtmark og Kyst → Natur
- vannklassene vises separat i kartografien
- Hav holdes separat

Dette er teknisk prototypeklassifisering og skal ikke uten videre behandles som
endelig bokføringsregel.

## Koordinatsystem og grid

Kart- og rasteranalysene bruker:

- CRS: `EPSG:25833`
- felles origin: `[-2500000, 9045984]`
- oppløsningsserie: `21664 / 2^z`

Plan-/polygonanalysen bruker zoom 9 med dobbelt pikseloppløsning:

```text
ACCOUNT_RESOLUTIONS[9] = 42,3125 m
PLAN_PIXEL_METERS       = 21,15625 m
```

Resultater omtales derfor som omtrent **21,16 m rutenett**.

## Kartvisning

Ved detaljert kartvisning hentes klassifiserte Grunnkart-fliser fra NIBIO.

V3 bruker rå, entydige klassefarger i enkelte tile-forespørsler og fargelegger
dem lokalt i nettleseren til brukerrettet palett.

Dette gjør det mulig å:

- bruke samme råflis i kart og analyse
- redusere doble kall
- holde klassifisering og visning konsistent

## Oversiktsraster

For Trondheim (5001) finnes et forhåndsprosessert oversiktsraster:

`apps/web/public/data/grunnkart/2025/overview/5001.png`

Metadata ligger i:

`apps/web/public/data/grunnkart/2025/overview/index.json`

Rasteret er omtrent 19,72 meter per piksel og brukes ved grov kartmålestokk og
som grunnlag i enkelte prototypeberegninger.

Dette er ikke en generell nasjonal preparation-pipeline ennå.

## Framtidig utbygging

DiBKs kommuneplantjeneste brukes som prototypekilde for analyseområdet
«framtidig utbygging».

Dagens tekniske filter velger arealer med:

- `arealbruksstatus = 2`
- arealformål i 1000- og 2000-serien

Planmasken rasteriseres og krysses med klassifisert Grunnkart.

Resultatet er beslutningsstøtte, ikke et regnskapstall og ikke en
konsekvensutredning.

## Tegnet polygon

Brukeren kan tegne eget polygon i kartet.

Polygonet:

1. lagres som eksplisitt geometri
2. avgrenses mot valgt kommune
3. rasteriseres på samme plan-/analysegrid
4. krysses med Grunnkart
5. får egen `analysisId`
6. kan gjenbrukes mot Verdsatte naturtyper

Dette gjør framtidig utbygging og eget polygon til varianter av samme
analyseområde-konsept.

## Økosystemfordeling

Et analyseområde kan klassifiseres videre på økosystemtype nivå 1.

Denne klassifiseringen kan bruke finere rasteroppløsning enn hovedanalysen.

Økosystemfordeling er en detaljering av prototypeanalysen og skal ikke
automatisk behandles som et eget regnskap.

## Verdsatte naturtyper

Verdsatte naturtyper er supplerende temadata.

Overlay mot analyseområdet beregnes separat og caches per `analysisId`.

Dette er viktig fordi samme kommune kan ha flere samtidige/sekvensielle
analyseområder.

## Delt request-/cachepipeline

`apps/web/src/map/sharedImageRequests.ts` brukes for dynamiske rasterbilder.

Per datakilde:

- maks 4 samtidige nettverkskall
- identiske pågående kall deles
- råbilder caches
- dagens cachegrense er 400 elementer per kilde

NIBIO og DiBK får egne request-pools.

Målet er færre kall og gjenbruk av samme rådata mellom kart og analyse.

## Viktig metodeavgrensning

At V3 kan lese og klassifisere WMS-rasterfliser betyr **ikke** at WMS-baserte
nettleserresultater er autoritative regnskapstall.

Dagens bruk er akseptabel som prototype for:

- brukerflyt
- visuell kontroll
- overlaymetode
- beslutningsstøtte
- testing av datatilgang og ytelse

Før tall omtales som offisielt naturregnskap må de kunne knyttes til:

- godkjent og låst dataversjon
- dokumentert bokføringsregel
- validert analysekilde
- metodeversjon
- reproducerbar beregning
- usikkerhetsbeskrivelse
- rekonsiliering

## Prepared/vektorbasert spor

Repoet inneholder også FastAPI/Python og tidligere arbeid med
GeoParquet/prepared resultater.

Dette sporet er fortsatt relevant for et mer autoritativt eller skalerbart
regnskapsgrunnlag.

Browser-rasteranalyse og prepared/vektorbasert regnskapsberegning er derfor ikke
konkurrerende konsepter:

- browseranalyse tester brukerbehov og beslutningsstøtte
- prepared/backend-sporet er aktuelt for versjonert regnskapsproduksjon

## Historikk

Dokumentet startet som en research gate i august 2026 fordi direkte tilgang til
Geonorge-distribusjonen ikke var avklart i Codex-miljøet.

Senere arbeid etablerte:

- lokal GeoParquet/preparation for testkommune
- prepared resultatmodell
- WMS-basert visualisering
- oversiktsraster
- flisbaserte prototypeanalyser

Den opprinnelige stoppregelen gjelder derfor ikke lenger for all
prototypeimplementering, men kravet om kontrollert analysekilde gjelder fortsatt
for autoritative regnskapstall.

## Fortsatt behov for avklaring

Før produksjonsbruk må blant annet avklares:

- hvilken distribusjon som skal være offisiell analysekilde
- hvordan data versjoneres og låses
- hvordan datakorrigering skilles fra reell endring
- nasjonal preparation/skalerbarhet
- rekonsiliering mellom kommuner/nasjonalt nivå
- godkjente nivå-0-bokføringsregler
- kvalitet og usikkerhet
