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

Dette er analysegridets oppløsning, ikke oppløsningen i alle inngående
datakilder. Det klargjorte oversiktsrasteret for Trondheim er ca. 19,72 meter
per piksel og samples til 21,16-metersgitteret. Økosystemtypeflisene som brukes
til detaljfordeling har ca. 10,58 meter per klassifiseringspiksel.

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

Konsekvensen er at rasteravhengige tall i dagens kode bare kan beregnes for
Trondheim (5001): framtidig utbygging, eget polygon, skogstatistikk,
våtmarks-/økosystemstatistikk og overlay mot Verdsatte naturtyper. Kartvisning
og direkte kommune-/tematjenester kan fungere for andre kommuner og må ikke
forveksles med denne beregningsdekningen.

## Framtidig utbygging

DiBKs kommuneplantjeneste brukes som prototypekilde for analyseområdet
«framtidig utbygging».

Dagens tekniske filter velger arealer med:

- `arealbruksstatus = 2`
- arealformål i 1000- og 2000-serien

Planmasken rasteriseres og krysses med klassifisert Grunnkart.

Resultatet er beslutningsstøtte, ikke et regnskapstall og ikke en
konsekvensutredning.

## Analyseareal og prosentnevner i dagens rastermetode

`analysisAreaKm2` er antall gyldige analysepiksler multiplisert med
`21,15625² / 1 000 000` km². Det er ikke Natur + Jordbruk eller det tegnede
polygonets uavgrensede geometriareal.

- **Framtidig utbygging:** gyldige Grunnkart-piksler med alpha ≥ 100 og
  planmaskepiksler med alpha ≥ 128. Den binære masken for hele området renses
  med dagens smalstripefilter. Alle gjenværende gyldige klasser teller i
  analysearealet, også Bebygd og vann. Natur/Jordbruk renses i en separat
  klassifisert maske med samme filter; dette er eksisterende prototypemetode.
- **Tegnet polygon:** polygonmaskepiksler med alpha ≥ 128 og gyldige
  Grunnkart-piksler med alpha ≥ 100 teller. Smalstripefilteret brukes ikke for
  tegnet polygon. Gyldige Bebygd- og vannpiksler teller også i analysearealet.

`natureShareOfAnalysisAreaPercent` og `agricultureShareOfAnalysisAreaPercent`
bruker henholdsvis Natur- og Jordbruk-pikslene delt på dette hele analysearealet.
Et tomt planområde får areal 0 og prosent `null`; et tegnet område uten gyldige
piksler returneres som utilgjengelig analyse. Disse andelene er forskjellige
fra plananalysens andeler av kommunens Natur/Jordbruk og fra
økosystemfordelingens andeler av analysert Natur.

Kontrollerte tester dekker begge områdetypene med Natur, Jordbruk, Bebygd,
vann og ugyldige piksler. Dette validerer tellingen under dagens metode, ikke
en autoritativ analysekilde eller nøyaktig vektoravgrensning.

## Tegnet polygon

Brukeren kan tegne eget polygon i kartet.

Polygonet:

1. lagres som eksplisitt geometri
2. begrenses til piksler med gyldige, ikke-transparente Grunnkart-data i det
   klargjorte kommunevise rasteret
3. rasteriseres på samme plan-/analysegrid
4. krysses med Grunnkart
5. får egen `analysisId`
6. kan gjenbrukes mot Verdsatte naturtyper

Dette gjør framtidig utbygging og eget polygon til varianter av samme
analyseområde-konsept.

Dagens kode utfører ikke en separat vektorinterseksjon mellom det tegnede
polygonet og kommunegrensen. Kommuneavgrensningen i beregningen avhenger av at
det klargjorte rasterets gyldige piksler allerede følger kommunen.

## Økosystemfordeling

Et analyseområde kan klassifiseres videre på økosystemtype nivå 1.

Denne klassifiseringen kan bruke finere rasteroppløsning enn hovedanalysen.

Økosystemfordeling er en detaljering av prototypeanalysen og skal ikke
automatisk behandles som et eget regnskap.

## Verdsatte naturtyper

Verdsatte naturtyper er supplerende temadata.

Overlay henter ArcGIS REST-geometri og bruker rutemidtpunkt innenfor den
gyldige plan-/polygonmasken på ca. 21,15625 m grid. Metodeversjon
`planned-valued-nature-v2` inkluderer bare Svært stor verdi, Stor verdi,
Middels verdi og Noe verdi. Ved overlapp får hver rute høyeste verdi.

- `uniqueOverlapAreaKm2`: union av berørte ruter, hver rute én gang.
- `valueMetrics`: gjensidig utelukkende ruter per vinnende verdi; arealene
  summerer til unikt areal. Andel har unikt areal som nevner.
- `registeredOverlapAreaKm2`: sum registrert overlapp per lokalitet; kan
  dobbelttelle og har et annet formål enn unikt areal.
- `typeMetrics`: registrert areal og andel av registrert sum; kan dobbelttelle.
  Ingen entydig regel for tilordning mellom naturtyper er vedtatt.
- Antall berørte lokaliteter teller kildeobjekter med minst ett rutemidtpunkt
  i masken, også når hele lokalitetens overlapp får en høyere verdi. Små
  geometriske treff uten et rutemidtpunkt kan derfor falle utenfor.
- `mapPixelIndices` per verdi beskriver vinnende ruter; per naturtype er det
  union av de registrerte objektenes ruter.

Kildegeometrien beholdes separat for kartet. Svake hele lokaliteter gir
kontekst; sterke polygonflater klippes med eksisterende rastermasker. Dette
gir faktiske konturer, men et omtrentlig klipp ved analyse-/verdigrensene.
Ingen polygonarealer brukes til å erstatte beregnede rastertall. Resultatcache
er begrenset til 16 fullførte analyser, med gjenbruk av nylig brukte resultater.

Dekningskilden er dekningsflatene for kartlegging etter Miljødirektoratets
instruks. Verkstedet gjenbruker union på gyldig analysegrid i
`getPlannedCoverageGap`, nå isolert per kommune og `analysisId`. Panelet
viser andel av hele gyldige analysemasken (inkludert bebygd/vann), **ikke**
kommunens kartleggingsgrad av SSB-landarealet. Ingen registrert dekning
betyr ukjent naturverdi; teknisk feil betyr at dekning ikke kan vurderes.
Dekning innebærer heller ikke at alle naturverdier er registrert.
Dekningslag i kartet er foreløpig ikke implementert.

Metodisk kontroll har bekreftet de fire kategoriene, høyeste verdi ved
overlapp og forskjellen mellom unik union og registrert sum. Følgende er
fortsatt begrensninger: V3 bruker projisert UTM-ruteareal uten målestokks-
korreksjon; naturtypefordeling er ikke entydig bokføring; rasterisert
kommuneavgrensning er ikke eksakt vektorklipp. Kommunale temasidestatistikker
er ikke endret av verkstedets nye verdifordeling.

Dette er viktig fordi samme kommune kan ha flere sekvensielle analyseområder.
Tegnet område får `drawn:<UUID>` ved fullført tegning, uavhengig av kartinstans.
Resultatet bærer samme `analysisId` som basisanalysen, og Appen sjekker ID og
kommune før tall og kart brukes. Regresjonstester dekker plan → polygon A →
polygon B → plan, sen respons etter områdebytte og erstatning av avbrutte
pågående kall. Grid, Natur/Jordbruk og DiBK-filter er uendret; verdiregelen
er oppdatert i metodeversjon v2.

## Delt request-/cachepipeline

`apps/web/src/map/sharedImageRequests.ts` brukes for dynamiske rasterbilder.

Per datakilde:

- maks 4 samtidige nettverkskall
- identiske pågående kall deles
- råbilder caches
- dagens cachegrense er 400 elementer per kilde

NIBIO og DiBK får egne request-pools.

Målet er færre kall og gjenbruk av samme rådata mellom kart og analyse.
Identiske kall betyr samme komplette URL. Requestlaget lagrer rå responsbytes
og flytter cachetreff bakerst før eldste element fjernes. Abortsignalet
kontrolleres før og etter det delte kallet; en allerede startet delt `fetch`
avbrytes ikke.

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
