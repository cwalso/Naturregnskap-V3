# Arkitekturoversikt – Kommunale naturregnskap V3

**Sist oppdatert: 13.10.2026**

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
og identitet. Beregningsgrid og kildegeometri skilles. Den beholdte
analyseflyten viser WMS-kontekst, beregnet grid-treff og valgt kildegeometrisk
omriss som forskjellige ting, uten å beregne nye tall.

## Uavhengige kartlag i Utforsk i kart

`ExploreThemesWorkspace` er koblet til App-ruten. `exploreThemeMap` har én
OpenLayers-instans for sju lag, inkludert vern, INON, villrein og Grå arealer. Et lite typet
lagregister styrer velger, faglig rolle, kildebeskrivelse, tegnforklaring,
filtertype, standard synlighet/opasitet og zIndex. Synlighet/opasitet lagres
uavhengig per implementert ID. FKB-Grønnstruktur-ID er reservert uten montert kilde eller aktiv kontroll, fordi offentlig bruksrett er uavklart.
Grunnkart ligger på zIndex 10, Grå arealer 11, INON 12, Villrein 15, plan 20,
naturtype-WMS 30, kildegeometri 31 og verneområder 40.
Kommunemasken og grensen ligger på 1000/1001. Gjennomsiktighet gjelder alle
fysiske deler av samme logiske lag. Nivå 0 starter med opasitet 0,7,
INON med 0,65, Grå arealer med 0,75, øvrige med 1.
Grunnkart/plan kan skjules uten å endre naturtypefilter eller objektvalg.
Naturtypelaget skjult fjerner objektvalg; filteret bevares. REST-kall avbrytes
ved skjuling/kommunebytte, og sene svar får ikke ny eier. Status eies per lag
og kommune; skjulte lag viser ikke feil. Rasterstatus leser aktuelle fliser
fra OpenLayers-rendererens eksisterende cache, uten å opprette statusfliser.
Ingen request- eller resultatcache er endret.
Tre nye ImageWMS-kilder er definert i samme register og koblet til samme kart.
De bruker EPSG:25833, egne klasse-navn, synlighet/opasitet/status og samme
kommunemaske. Bare vedtatt, klasseinndelt vern vises. INON `status` er januar
2023; Villrein viser biologiske leveområder. Kildens GetLegendGraphic brukes.
Dekodet, transparent WMS gir `empty`, ikke `error`. En WeakMap over selve
image-wrapperen memoiserer kun denne visuelle statusen; det er ingen ny
resultatcache. Image/lag/kommune-eier kontrolleres mot gjeldende viewport.
App sender allerede eksisterende kommunevise registreringsstatus til panelet.
Villrein kan dermed vise bekreftet null registreringer, treff eller ukjent
registreringsdekning uten nye query-/areal-/overlappsberegninger.
Godkjent V2-layout legger paneltilstand og fokusretur rundt samme karttarget,
med kompakt lagliste og ett kontekstpanel. `RegisteredNaturePanel` og
`RegisteredNatureDetails` er presentasjonskomponenter over eksisterende
kommunedata/filter. ResizeObserver bevarer senter/oppløsning ved panelendring.
Kommune-/filterdata, kartkilder, lagregister og analyse-/cachemoduler er uendret.
[Panelbeslutning](../decisions/2026-10-12-v3-explore-design-v2.md).
Tidligere kart-/analysekomponenter er beholdt og monteres ikke på ruten.

Nivå 0 gjenbruker `loadOverviewRaster` og `loadAccountDisplayTileBlob`.
Kommuneoversikten gjelder Trondheim; detaljene bruker de samme råflisene,
klassifiseringen og request-cachen som øvrige Grunnkart-visninger.
Det finnes ingen ny nivå-0-klassifisering.

`municipalValuedNature` henter alle objekt-ID-er med romlig interseksjon
mot kommunepolygonet og deretter attributter/geometri i grupper. Fire
arbeidere begrenser samtidige kall; avkortede svar deles og kontrolleres.
Bare fullførte, ikke-avbrutte resultater caches, for maksimalt 16 kommuner.
Dette er en kildeoversikt, uten analyse-ID, overlappraster eller arealtall.
Alle-visningen bruker kildens fire verdidelag i WMS. Filtrert visning bruker
EPSG:25833-kildepolygoner med samme kategori-/verdifarger.

Plantemaet bruker `futureDevelopmentDisplay` for pikselvis sammenstilling.
Filter/fyllstil, planrutenett, rå klassefarger, klassifisering og requestlag
gjenbrukes uendret fra V3. Bare Natur/Jordbruk får farge. På nivå 9 samples
kommuneoversikten med nærmeste piksel; grovere fliser aggregerer nivå-9-treff
med dominerende klasse og dekningsavhengig alfa. Nærmere utsnitt bruker rå
Grunnkart- og planfliser med identisk bbox/pikselrutenett. Smale felt beholdes
uten analysegridets stripefjerning. Dette er visningsfliser, uten arealtall,
analyse-ID, analysemasker eller ny resultatcache. Grove utsnitt krever fortsatt
klargjort kommuneoversikt (foreløpig Trondheim). Ved kommunebytte/destruksjon
avbrytes konsumenten og sene fliser ignoreres.
Planlagets isolerte canvas får mørk grønn/gul diagonalskravur i `postrender`
fra `futureDevelopmentSymbology`. Eksisterende klasse/alfapiksler bevarer
plasseringen; mellom linjene brukes 24 % tintalfa. 8-pikslers periode og
2-pikslers linjebånd følger skjermens pixelRatio, ikke kildeflisens zoom.
Lagenes eksisterende opasitet skalerer både linjer og tint. Samme symboldata
lager CSS-gradient i legend. Ingen kilde-/visningsfliscache endres.
Masken utenfor kommunen og kommunegrensen ligger over aktive lag.
Med alle lag av eller helt gjennomsiktige skjules masken; bakgrunnskartet
og grensen vises. Kommunevalg/reset tilpasser utsnitt;
lag/opasitet/filter/objekt/resize gjør det ikke.

Se [gjeldende beslutning](../decisions/2026-10-09-v3-concurrent-map-layers.md) og
[lagkontroll med reelle data](../validation/2026-10-09-concurrent-map-layers.md).
[Korreksjon av planpresentasjonen](../decisions/2026-10-09-v3-future-development-display.md)
og [reell Trondheim-kontroll](../validation/2026-10-09-future-development-display.md)
dokumenterer den siste endringen. Testpublisering skjer fra PR-branchen uten merge.

## Dagens datatilgang

V3 bruker en hybridmodell.

### Regnskaps-/oversiktsdata

Oversikt-forsiden fra 13.10.2026 mottar eksisterende `AccountOverviewData`
og kommunevis `ThematicCoverageResponse` som props. `features/overview`
inneholder rene presentasjonskomponenter for oppsummering, bilder og temakort;
datahenting og hash-navigasjon ligger fortsatt i App/eksisterende adaptere.
Kartet gjenbruker App sin `MunicipalityMap`/OpenLayers-kontroller og
kommunegrense. Bare den eksisterende Grunnkart-visningen aktiveres; ingen
geografisk historisk endring, nasjonal rangering eller ny analyse beregnes på forsiden.
Ved manglende kommunegrense skjules kartflaten, slik at et generelt utsnitt
ikke fremstilles som valgt kommune. Kommuneeier kontrolleres før statistikk
og tematreff presenteres. Bildelenker og kreditering ligger i et lite
innholdsregister; bildeutforming og feiltilstand er et eget presentasjonslag.

Fra 14.10 deler Oversikt og Naturtapet kommuneeide historiske demodata gjennom
`features/historical-loss`. Domenemodell, demokilde, framtidig SSB-mapping og
presentasjon er adskilt. Statistikk summeres kun innen valgt illustrativ periode;
ingen geografisk analyse eller kobling til beholdningsberegninger innføres.
Adapteren har ingen antatt ekstern SSB-kontrakt. Se
[intern kontrakt og avklaringer](../product/historical-loss-pages.md).

`features/plan-area` gjenbruker fra 14.10 den etablerte planmasken for en egen
heldekkende arealfordeling. Modell/klassifikator, delt kildehenting, panel og
forhåndsvisning er adskilt. Oversikt og kartpanel mottar samme metodeversjonerte
resultat fra en avgrenset cache på 16 kommuner. Samtidige konsumenter deler
preparation; avbrutte konsumenter kan ikke publisere et sent resultat. Råbilder
gjenbruker eksisterende request-pools/cache. Ingen ny analyseplattform innføres.
Kartkontrolleren har separate areal-/naturverdigeometrier og aktiverer bare
den valgte analysens markering. Samme kartinstans og sju lagtilstander bevares.
Ingen separat beregningsmodell eller hardkodede planverdier lages på Oversikt.

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

Gjeldende brukerflyt er kommune → ett eller flere kartlag → eventuell
naturtypefiltrering og lokalitetsinformasjon. Ingen automatisk kryssanalyse.

Den beholdte analyseflyten er område → datagrunnlag → resultat →
stedfesting. Den skal kunne reaktiveres senere uten å endre metodene
beskrevet nedenfor.

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

Den nye kartflyten skiller tre representasjoner:

- `explorePlanArea.ts`: hele gyldige `analysisMask` som blått statisk
  rasterbilde og separat kant over temakartet. Begge bruker original extent.
- Verdsatte naturtyper: vanlig `ImageWMS` med kildens symbolikk, uavhengig av
  REST-analyse og feil i beregning. Ingen Canvas-renderklipp.
- Treff: `buildValuedNatureMapOverlay` bruker eksisterende mask/utvalg og
  `exploreOverlapGeometry.ts` følger maskens ytre cellekanter. Sammenhengende
  ruter blir flater, hull bevares og interne cellestreker utelates. Lilla
  fyll/lys kant er en visuell markering; den endrer ikke overlappsarealet.

Natur/Jordbruk bruker samme grensevisning fra `overlay.cleaned`, separat for
klasse 1 og 2. Klassifisering, grid og nevner er uendret. Grensen er beregnet
grid-geometri, ikke en eksakt naturtypegrense eller ny vektorinterseksjon.
`valuedNaturePresentation.ts` filtrerer eksisterende objekter for listen;
valgt lokalitet får et kildegeometrisk omriss og kan velges i kart eller liste.
Temakartet viser fortsatt registrerte lokaliteter som kontekst; filteret
endrer treff og liste, ikke WMS-tjenestens innhold eller hovedtallene.

Kartet validerer kommune, `planned:<kommunenummer>` og analyseområdetype før
plan brukes, og kommune/analysisId før verdsatt-natur-resultat brukes.
Filter/objektvalg er eid av kommune + analyse + grunnlag og nullstilles ved
bytte. Nye resultat eller utvalg kan ikke fit/zoome kartet. Bare kommune og
«Vis hele kommunen» gjør det. Resize bevarer brukerens utsnitt.

Plan-/treffgeometri gjenbygges bare ved endret resultatreferanse/utvalg.
Ingen ny resultatcache eller analysepipeline innføres. Vanlig temakart bruker
OpenLayers WMS-lasting; den delte flispipelinen for beregning er uendret.
Ved destruksjon frigjøres kilder, map, lyttere og ResizeObserver. Den eldre
`valuedNatureMap.ts` med Canvas/flisvisning beholdes, men brukes ikke i den
nye arbeidsflaten.

## Tegnet polygon

OpenLayers `Draw` er beholdt for eget analyseområde. Inngangen er midlertidig
skjult i den nye arbeidsflaten; beskrivelsen nedenfor gjelder den beholdte
metode-/kartkoden, ikke aktive nye kontroller.

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

Grå arealer er koblet inn via NIBIOs offisielle `graastruktur`-WMS, med
`graa_arealer`, `andel_uten_vegetasjon` og `andel_med_vegetasjon` bak én
avkryssing. Framstillingsvalg bevarer lag, opasitet, filter/valg og utsnitt.
Kildens estimater og GetLegendGraphic brukes direkte; ingen egen prosent-
eller arealberegning. Testversjon 1 har sammensatt kildegrunnlag og er ikke
lik nivå-0-klassen Bebygd. Kildens målestokkgrense 1:250 000 håndteres som
`out-of-scale`, med forklaring og uten automatisk zoom. FKB-Grønnstruktur
er teknisk kontrollert, men publiseres ikke før Norge digitalt-bruksrett
for denne offentlige prototypen er dokumentert. Gråareal-WMS-en har egne
tjenestevilkår uten begrensninger; nedlastbare data har annen lisens.
Se [kilde-/kartkontroll](../validation/2026-10-12-grey-areas.md).

## Geometrisk planoverlapp (13.10.2026)

`features/future-analysis` skiller maskehenting, kildekontrakt, geometri, resultatmodell og presentasjon. Masken gjenbruker `futureDevelopmentDisplay` sin eksakte nivå-9-sampling; geometriunion/interseksjon/differanse utføres én gang per analyse. `ExploreThemesWorkspace` åpner `AnalysisPanel` i V2-panelet; `exploreThemeMap.setFutureNature` viser samme geometrier uten ny kartinstans. Full lokalitet er svak/stiplet, overlapp sterk. Planlaget bruker resultatets faste cellemaskekonturer mens analysen er aktiv, slik at innzooming ikke bytter geografisk avgrensning. De ordinære lagtilstandene bevares og vanlig planvisning gjenopprettes ved lukking. Ny metodecache er isolert fra v2 og avgrenset til 16 fullførte resultater. [Detaljert kontrakt](../decisions/2026-10-13-v3-geometric-valued-nature-overlap.md).
