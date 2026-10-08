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
vises som kontekst, mens separat rasteroverlapp følger analysemasken.

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
  └─ framtidig utbygging (fast område i arbeidsflaten)
        ↓
analysegrunnlag
  ├─ Natur og jordbruk
  └─ Verdsatte naturtyper (ett tema om gangen)
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

`utmArea.ts` eier felles UTM33-målestokkskorreksjon ved kommunemidtpunktet
for projiserte nettleserarealer på tvers av analyse og temasider. Ferdige
SSB-arealer korrigeres ikke på nytt. Se data-/metodedokumentet for formel,
versjoner og avgrensningen mot preparation.

Gyldig `analysisMask` vises som rolig blått område med tydelig kant.
Natur/Jordbruk bruker dempet Grunnkart-bakgrunn og sterke treff fra
`overlay.cleaned`. Verdsatte naturtyper bruker ordinær WMS til temakontekst,
REST-kildepolygoner i et vanlig vektorlag til berørte objekter, et separat
rasterlag fra beregnede pixelindekser til lilla overlapp, og eget vektorlag til
valgt objekts outline. Lagrekkefølgen er bakgrunn → tema → plan → berørte
kildepolygoner → overlapp → planområdets kant → objektvalg → kommunemask/grense.

`valuedNaturePresentation.ts` filtrerer de samme objektene for liste og kart.
`valuedNatureMap.ts` bruker ingen `prerender`/`postrender`-klipping eller
koordinat-til-render-pixel-transformasjoner. Kildegeometriene beholdes, inkludert
hull og multipart. Vektorlagene har separate kilder for kontekst og valgt objekt.
Ved verdifilter følger rastertreff kategoriens vinnende ruter; naturtypefilter
bruker union av registrerte ruter. Tall/metode endres ikke.

Appen holder plananalyse og ett tema aktive. Resultat-/objektvalg og temabytte
flytter ikke kartutsnittet. `Vis hele kommunen` er eksplisitt navigasjon.
Områdemask og treff bruker ordinær `TileImage`-pipeline: bare forespurte
256 × 256 Canvas-fliser tegnes, med nabopiksler fra hele masken. Fliscachen
har målstørrelse 32 og tømmes ved bytte/destruksjon; ingen heldekkende PNG-er
eller nye object URLs. Request-versjon per lag verner mot sene statussvar.

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

Tegne- og polygonanalysemodulene er bevart, men Appen eksponerer dem ikke i
dagens faste plananalyse. Tidligere øktstilstand og tegnehandlinger i Appen er
fjernet sammen med automatisk zoom. Gjeninnføring er en framtidig produktoppgave.

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
