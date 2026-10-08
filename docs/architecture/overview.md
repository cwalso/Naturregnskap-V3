# Arkitekturoversikt – Kommunale naturregnskap V3

**Sist oppdatert: 08.10.2026**

## Mål

V3 skal være en modulær prototype som kan utvikles trinnvis uten at
kartvisning, datatilgang, analysemetode og presentasjon blir tett koblet sammen.

Dokumentet skiller mellom **dagens offentlige demoarkitektur** og et mulig
**målbilde for produksjon**. Prototypens teknologistack er ikke et bindende valg
for en senere forvaltningsløsning.

## Dagens offentlige demo

GitHub Pages er eneste runtime-komponent for den publiserte demoen.

```text
Kartverket / NIBIO / DiBK / Miljødirektoratet / SSB
                     +
          statiske/prepared filer
                     ↓
        React + TypeScript + OpenLayers
                     ↓
                GitHub Pages
```

`apps/api` med FastAPI/Python finnes fortsatt for preparation, domenelogikk,
tester og arkitekturarbeid, men er ikke nødvendig for å kjøre den publiserte
demoen.

## Faglig lagdeling

Arkitekturen skal speile fire faglige lag:

```text
Naturregnskap
  heldekkende, metodebundet, versjonert
        |
        +--> Supplerende temadata
        |      ekstra kunnskap, ulik dekning
        |
        +--> Analyse og beslutningsstøtte
        |      overlay og brukerdefinerte områder
        |
        +--> Veiledning og formidling
               forklaring, begrensninger, kilder
```

Analysefunksjonalitet skal ikke endre selve regnskapsgrunnlaget.

## Frontendansvar

Frontend har ansvar for:

- kommunevalg og felles kommunekontekst
- kartvisning
- temasider
- analysearbeidsflyt
- polygontegning
- presentasjon av analyseresultater
- metadata, usikkerhet og datamangler
- caching av dynamiske kart-/rasterkall i prototypen

Frontend kan utføre enkelte rasterbaserte **prototypeanalyser**. Disse er
beslutningsstøtte og skal ikke forveksles med autoritative regnskapstall.

## Presentasjonsarkitektur

Presentasjonskjeden skal være eksplisitt:

```text
data / analyse
    ↓
typed models
    ↓
presentasjonskomponenter
    ↓
layout
    ↓
theme
```

UI-komponenter skal ikke eie datakildekunnskap eller skjulte fagregler.

Kart, tabeller og nøkkeltall for samme analyse skal bygge på samme resultat
og identitet. Beregningsgrid og presentasjonsgeometri skilles; kildepolygoner
kan klippes visuelt til den gyldige analysemasken uten å beregne nye tall.

## Dagens datatilgang

V3 bruker en hybridmodell.

### Regnskaps-/oversiktsdata

Kan komme fra:

- forhåndsprosesserte resultater
- statiske prototypefiler
- åpne statistikkilder der dette eksplisitt er en prototypevisning

Slike tall skal ha tydelig kilde og metode.

### Kart og klassifiserte raster

NIBIOs Grunnkart brukes både til:

- kartvisualisering
- klassifiserte rasterfliser i enkelte prototypeanalyser

Dette er et bevisst prototypemønster. WMS-avledede nettleserberegninger er ikke
automatisk autoritative regnskapstall.

### Supplerende temadata

Temadata kan hentes dynamisk fra WMS/ArcGIS REST eller tilsvarende tjenester.

Samme datasett kan ha:

- `visualSource`
- `analysisSource`

Der analysekilden finnes bør beregning og treffstatus ikke utledes indirekte fra
kartbildet.

## Utforsk i kart

`Utforsk i kart` er et analyseverksted.

Gjeldende arbeidsflyt:

```text
analyseområde
  ├─ framtidig utbygging
  └─ eget tegnet polygon
        ↓
analysegrunnlag
  ├─ Natur og jordbruk
  └─ Verdsatte naturtyper
        ↓
resultat
        ↓
stedfesting i kart
```

Dette er ikke en generell GIS-lagvelger.

## Rasteranalyse

Plan-/polygonanalysen bruker:

- EPSG:25833
- fast rutenett
- ca. 21,16 meter per analysepiksel
- kommuneavgrensning
- samme analyseidentitet og gyldige avgrensning til kart og tall

Det forberedte Trondheim-rasteret har ca. 19,72 meters kildeoppløsning og samples
til 21,15625-metersgitteret. Natur/Jordbruk telles på dette gitteret.
Verdsatte naturtypers REST-geometrier rasteriseres mot den samme analysemasken.
Økosystemfordelingen hentes fra klassifiserte WMS-fliser med ca. 10,58 meters
klassifiseringspiksel.

Tallanalysene er per 08.10.2026 bare klargjort for Trondheim (5001), fordi det
bare finnes et kommunevis oversiktsraster for denne kommunen i repoet.

Se `docs/data/grunnkart-2025-analysis-source.md`.

## Delt request-/flispipeline

`apps/web/src/map/sharedImageRequests.ts` samler dynamiske rasterkall.

Gjeldende regler:

- maks 4 samtidige kall per datakilde
- identiske pågående kall deles
- råbilder caches med begrenset cache
- samme råflis gjenbrukes mellom kart og analyse når URL/datagrunnlag er identisk

Cachegrensen i requestlaget er 400 råbilder per kilde. Et abortsignal stopper en
konsument fra å bruke resultatet før eller etter lasting, men avbryter ikke et
delt nettverkskall som allerede er startet.

## Treffvisning i analyseverkstedet

I analyseverkstedet vises gyldig `analysisMask` som en dempet rasterramme.
Natur/Jordbruk-treff bygges fortsatt fra `overlay.cleaned` og vises med
`TileImage` på beregnet analysegrid, også ved nær zoom. Verdsatte naturtyper
beholder i stedet berørte kildepolygoner og attributter i `localities`.
`valuedNaturePresentation.ts` filtrerer de samme objektene for liste og kart;
`valuedNatureMap.ts` tegner svake hele lokaliteter og sterke kildepolygoner
klippet til gyldige masker på eget Canvas. Hele utvalget tegner høyeste verdi
øverst; ved verdifilter klippes sterkt fyll til kategoriens vinnende ruter.
Det er ikke eksakt vektorinterseksjon. Naturtypefilter viser registrerte
objekter, uten ny entydig fordeling mellom overlappende naturtyper. Det eldre
planens detaljlag er ikke aktivt i analyseverkstedet. Delresultatvalg filtrerer
bare presentasjonen; det beregner ikke nye tall eller endrer analysemasken.
Kartutsnitt beregnes fra aktiv rastermaske eller filtrerte kildegeometrier.
Objektvalg deles mellom kart og liste, knyttet til kommune og `analysisId`,
og er deaktivert under tegning. Grunnkart tones ned under synlige resultater. Bare forespurte visningsfliser på
256 × 256 piksler tegnes direkte i Canvas, med nabopiksler lest fra hele
masken for sømløs kantmarkering. Visningslagene
bruker OpenLayers sin fliscache (målstørrelse 32; kan økes for synlige fliser),
uten heldekkende PNG-er eller nye object URLs. Lokale visningsfliser venter
ikke på eksterne kartkall i nettverkskøen. Fliscachen tømmes ved bytte eller
destruksjon. Generering og statusmeldinger er beskyttet mot sene svar med en egen
request-versjon per visningslag, og visningsfeil formidles til brukerflaten.

## Tegnet polygon

OpenLayers `Draw` brukes for eget analyseområde.

Polygonet:

- tegnes i kartet
- lagres som eksplisitt analysegeometri
- rasteriseres til samme analysegitter
- begrenses til gyldige, ikke-transparente piksler i det klargjorte
  kommunevise oversiktsrasteret
- får egen `analysisId`
- bruker samme overordnede overlaypipeline som plananalysen

Den opprinnelige tegnede geometrien beholdes i appens tilstand i samme økt.
Ved ny kartinstans gjenopprettes den i et dempet vektorlag med transparent
fylling over trefflaget, slik at rammen også synes ved heldekkende treff.
Dette er visning og øktstilstand, ikke varig lagring eller en ny klippemetode.

Cache og resultater bruker `analysisId`. Fullført tegning får
`drawn:<UUID>` fra `crypto.randomUUID()`, uavhengig av kartinstans; planområdet
bruker `planned:<kommunenummer>`. Økosystemfordeling og verdsatt-natur-resultat
bærer samme ID som basisanalysen. Appen kontrollerer både ID og kommunenummer
før resultat eller treffmaske brukes, også i første rendering etter områdebytte.
Et verdsatt-natur-kall som er avbrutt mens det pågår, erstattes ved ny analyse;
sen feil fra det gamle kallet får ikke slette den nyere cacheoppføringen.
Ferdig beregnede resultater kan gjenbrukes selv om den tidligere konsumenten
senere avbrytes. Avbrutt tegning eller ødelagt kart publiserer ikke et utsatt
tegne-resultat.

## Kommuneavgrensning i kart

Temadata på temasider skal ikke vises utenfor valgt kommune.

Dagens strategi er:

- temalag tegnes normalt
- et visuelt maskelag dekker området utenfor kommunegrensen
- kommunegrensen ligger over
- aktive lag begrenses til kommunens extent der dette er hensiktsmessig

Tidligere direkte canvas-klipping gjorde lag ustabile/usynlige og skal ikke
gjeninnføres uten ny vurdering.

Maskeringen er visuell. WMS-kilden kan fortsatt levere piksler innenfor lagets
rektangulære extent utenfor den eksakte kommunegeometrien; maskelaget skjuler
dem. Objektspørring avvises eksplisitt utenfor kommunegeometrien.

## Dataset-register

Et sentralt datasettregister beskriver koblede datasett med blant annet:

- identifikator
- navn
- kategori/faglig rolle
- dataeier
- visualiseringskilde
- analysekilde
- versjon/status
- geografisk dekning
- metadata

Registeret er teknisk kontrakt mellom fag, data og presentasjon.

## Sporbarhet

Et analyseresultat bør kunne spores til:

- kommune
- analyseområde og `analysisId`
- datakilder
- dataversjon/status
- metodeversjon
- rasteroppløsning
- viktige begrensninger
- eventuell datamangel

## Produksjonsmålbilde

En produksjonsløsning kan flytte regnskapskritiske analyser til
Databricks/backend/ArcGIS eller annen forvaltet infrastruktur.

Kravene er viktigere enn teknologien:

- versjonering
- reproducerbarhet
- dokumentert metode
- datakvalitet
- sporbarhet
- kontrollert publisering
- felles resultatgrunnlag for kart, statistikk og rapport

Prototypens browseranalyse er derfor et verktøy for å teste brukerbehov,
dataflyt og metode, ikke en bindende produksjonsarkitektur.

## Repo-struktur

```text
apps/
  web/
    src/
      app/
      api/
      components/
      datasets/
      features/
      map/
      pages/
      styles/
    tests/

  api/
    app/
    tests/

docs/
  architecture/
  data/
  decisions/
  product/
  research/
```

Ikke fyll strukturen med abstraksjoner før funksjonalitet krever dem.
