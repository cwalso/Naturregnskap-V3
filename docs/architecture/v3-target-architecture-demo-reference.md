# V3 målbilde – teknisk referanse fra Publicdemorepo

**Dato:** 08.10.2026  
**Status:** Levende teknisk referanse; flere mønstre er nå implementert i V3

## Utgangspunkt

Publicdemorepo brukes som funksjonell og teknisk referanse for en enkel
dataflyt:

```text
kommunevalg
  -> data/kartkilde
  -> kommuneavgrensning
  -> enkel analyse/klassifisering
  -> tall + kart + objekter
```

V3 skal beholde denne enkelheten uten å kopiere demonstratorens monolittiske
struktur.

Repoet brukes som referanse for mønstre, ikke som kilde for ukritisk kodekopi.

## Faglig ramme

V3 skal alltid skille mellom:

1. naturregnskap
2. supplerende temadata
3. analyse- og beslutningsstøtte
4. veiledning og formidling

Publicdemorepo kan være teknisk enklere enn dette skillet. V3 skal ikke ofre
faglig presisjon for å ligne demonstratoren.

## Mønstre som er tatt inn i V3

Per 08.10.2026 er følgende mønstre implementert eller delvis implementert:

| Mønster fra referansen | Status i V3 | Implementasjon |
| --- | --- | --- |
| Kommune som felles kontekst | Implementert | Kommunevalg og kommunegrense deles på tvers av sider |
| Oversiktsraster ved grov zoom | Implementert for prototypekommune | Prepared Grunnkart-raster + detaljerte fliser |
| Flisbasert analyse | Implementert for prototypekommune | Fast rastergrid for plan/polygonoverlay; tall krever klargjort raster som nå bare finnes for Trondheim |
| Tegne eget polygon | Implementert, analyse for prototypekommune | OpenLayers Draw er generell; tall/overlay krever klargjort raster |
| Gjenbruk av data mellom kart/analyse | Implementert delvis | Felles råfliser der URL/datagrunnlag er identisk |
| Begrenset samtidighet | Implementert | Maks 4 kall per datakilde |
| Deling av pågående identiske kall | Implementert | `sharedImageRequests.ts` |
| Begrenset browsercache | Implementert | 400 råbilder per kilde i dagens prototype |
| Kart + tall fra samme analysemask | Implementert i prototypeanalysen | Overlayresultater bruker felles rastermask for klargjort kommune |
| Objektinformasjon | Implementert for relevante temalag | Feature info / temadata |

## Dagens analyseverksted

`Utforsk i kart` er ikke lenger tenkt som en generell lagvelger.

Primærflyten er:

```text
1. velg analyseområde
   ├─ framtidig utbygging
   └─ eget polygon

2. kryss området med
   ├─ Natur og jordbruk
   └─ Verdsatte naturtyper

3. les resultat

4. finn resultatet i kartet
```

Dette mønsteret skal beholdes dersom flere analyser legges til.

Rasterbaserte tall og overlay er per 08.10.2026 bare klargjort for Trondheim
(5001). Dette er en eksplisitt prototypebegrensning, ikke nasjonal dekning.

## Fremtidig utbygging

DiBKs kommuneplantjeneste brukes i prototypen for å identifisere områder med
framtidig arealbruk etter dagens tekniske filter.

Denne analysen er:

- beslutningsstøtte
- prototype
- ikke et eget naturregnskap
- ikke en naturfaglig konsekvensutredning
- ikke en garanti om at arealet faktisk bygges ut

Målet er å undersøke hvilken natur som ligger i analyseområdet, ikke å bygge en
generell planreserveapplikasjon.

## Tegnet område

Brukerdefinert polygon er implementert som samme konseptuelle type
analyseområde som framtidig utbygging.

Det betyr at:

- analyseområdet har eksplisitt geometri
- rasterisering skjer på samme grid
- samme analysemotor kan gjenbrukes
- resultatcache nøckles på `analysisId`; dagens lokale tegnede ID-er kan
  gjenbrukes etter at kartinstansen opprettes på nytt, så isolasjon ved
  kontekstbytte må fortsatt valideres
- kart og tall skal bruke samme område/mask

Dette er et viktig designprinsipp for senere områdebaserte analyser.

## Ytelsesstrategi

Referanseimplementasjonen viste at nettleseranalyse kan fungere dersom
datatilgangen holdes enkel og kontrollert.

V3 bruker derfor:

- fliser i stedet for store heldekkende bilder når mulig
- begrenset samtidighet
- deduplisering av identiske requests
- delt cache
- gjenbruk av råfliser
- prepared oversiktsraster ved grov målestokk

Dette skal ikke føre til at faglig metode gjemmes i ytelseskode.

## Kartmotor og analysegrunnlag

Et datasett kan ha ulike tekniske roller:

- visningskilde
- analysekilde
- prepared/prosessert grunnlag

I dagens prototype brukes klassifiserte WMS-rasterfliser også i enkelte
nettleserbaserte overlayanalyser. Dette er en pragmatisk prototypeløsning.

Regnskapskritiske/autoritative tall skal fortsatt kunne produseres fra en
versjonert, kontrollert analysekilde.

## Temasider

Gjeldende temasider er:

- Myr (våtmark)
- Skog
- Verdsatte naturtyper
- Verneområder
- Villreinområder
- Inngrepsfri natur
- Bynaturen (grå arealer)

Ikke alle har samme faglige rolle eller datadekning.

Temadata skal visuelt avgrenses til valgt kommune.

## Fire hovedflater

### Kommuneoversikt

Svar på:

> Hva har kommunen i dag på et overordnet nivå?

Skal prioritere forståelige hovedtall og kompakt kart.

### Naturtapet

Svar på:

> Hva er dokumentert bygget ned over tid?

Skal ikke konstruere stedfestet naturtap fra statistikk som ikke er stedfestet.

### Naturtema

Svar på:

> Hva vet vi mer om naturen og den utbygde delen av kommunen?

Skal tydelig skille heldekkende regnskapsgrunnlag og supplerende temadata.

### Utforsk i kart

Svar på:

> Hva overlapper et valgt område, og hvor ligger resultatet?

Dette er analyse- og beslutningsstøtte.

## Datakildekontrakt

Koblede datakilder bør beskrive minst:

- identifikator
- faglig rolle
- hvilke sider/analyser de brukes i
- dataeier
- visningskilde
- analysekilde
- versjon/status
- geografisk dekning
- begrensninger

## Hva som fortsatt ikke er løst av referansemønsteret

Publicdemorepo løser ikke alene:

- autoritativ regnskapsføring
- tidsserier og metodebrudd
- versjonert produksjonsberegning
- eierskap og forvaltning etter prosjektperioden
- nasjonal skalerbarhet
- dokumentert datakvalitet
- produksjonsarkitektur

Disse må løses som egne styrings-, fag- og arkitekturspørsmål.

## Videre teknisk retning

Før flere analysefunksjoner bygges bør V3 prioritere:

1. stabilitet og validering av eksisterende overlayberegninger
2. kontroll av prosentnevnere og arealrekonsiliering
3. kart/resultat-samsvar
4. måling av request/cache-effekt
5. dokumentasjon av metodeversjoner
6. nye temaanalyser først etter faglig avklaring

Det sentrale er ikke å kopiere én demonstrator, men å gjenbruke gode mønstre
uten å miste sporbarhet og faglig presisjon.
