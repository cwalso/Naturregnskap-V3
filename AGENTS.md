# AGENTS.md – Kommunale naturregnskap V3

Dette dokumentet gir varige instrukser til Codex og andre kodeassistenter som arbeider i repoet.

**Sist oppdatert: 09.10.2026**

## 1. Formål og faglig ramme

V3 er en teknisk prototype for kommunale naturregnskap. Løsningen er et virkemiddel; verdien ligger i et felles og etterprøvbart kunnskapsgrunnlag, dokumentert metode, sporbarhet, analyser, veiledning og riktig bruk i kommunal arealforvaltning.

Kode og brukerflate skal alltid skille mellom:

1. **selve naturregnskapet** – felles metode, heldekkende datagrunnlag, versjonering og sammenlignbarhet
2. **supplerende temadata** – relevant naturinformasjon som ikke automatisk inngår i regnskapet
3. **analyse- og beslutningsstøtte** – overlay, plananalyse og andre avledede analyser
4. **veiledning og formidling** – nødvendig for riktig forståelse og bruk

Første versjon skal omtales nøkternt som et arealbasert/utbredelsesbasert naturregnskap. Tilstand, økosystemtjenester og avansert scenarioanalyse er ikke en avklart del av regnskapskjernen.

## 2. Faglige hovedregler

1. Regnskapsgrunnlag og supplerende temadata skal ikke blandes uten eksplisitt metodisk beslutning.
2. Grunnkart for arealanalyse er sentralt heldekkende grunnlag og mulig felles «fasit» for areal- og naturtypeinndeling.
3. Overordnet nivå 0 i prototypen er **Bebygd, Jordbruk og Natur**.
4. Økosystemtype er en annen klassifikasjon enn nivå 0 og skal ikke forveksles med nivå 0.
5. Verdsatte naturtyper/NiN, verneområder, villreinområder og inngrepsfri natur er supplerende temadata/indikatorer, ikke automatisk regnskapsgrunnlag.
6. Manglende tematreff betyr ikke manglende naturverdi. Skill mellom null treff, ukjent/ikke kartlagt og teknisk feil.
7. Bynaturen/grå arealer er ikke en egen økosystemtype i regnskapet. Temaet brukes som analyse- og beslutningsstøtte rundt den utbygde delen av kommunen.
8. Historiske tidsserier skal ikke konstrueres fra skiftende årsversjoner av Grunnkart uten metode for å skille reell endring fra datakorrigering.
9. Fremtidig utbygging og tegnede områder er analyseområder. Resultatene er beslutningsstøtte og endrer ikke naturregnskapet.
10. «Hva skjer hvis vi bygger her?» skal ikke omtales som ferdig avansert scenarioanalyse. Dagens prototype viser enkle overlayanalyser.

## 3. Temasider som gjelder nå

Det skal ikke opprettes nye temasider uten eksplisitt beslutning. Gjeldende temasider er:

- **Myr (våtmark)**
- **Skog**
- **Verdsatte naturtyper**
- **Verneområder**
- **Villreinområder**
- **Inngrepsfri natur**
- **Bynaturen (grå arealer)**

Skog og Myr/våtmark bygger på heldekkende Grunnkart. Verdsatte naturtyper, verneområder, villrein og inngrepsfri natur er supplerende temadata/indikatorer. Bynaturen kombinerer regnskapskontekst med supplerende innsikt om grå arealer.

Temadata på temasidene skal visuelt avgrenses til valgt kommune. Ikke vis temaflater utenfor kommunegrensen.

## 4. Offentlig prototype og branding

Den offentlige prototypen kjører på GitHub Pages:

`https://cwalso.github.io/Naturregnskap-V3/`

Prototypen er offentlig, men er ikke en profilgodkjent Miljødirektoratet-tjeneste. Headeren skal derfor være nøytral og vise **Kommunale naturregnskap** og teststatus. Ikke legg inn Miljødirektoratets logo eller annen offisiell avsenderprofil uten eksplisitt godkjenning.

Bilder fra Unsplash i dagens temasider er midlertidige prototypebilder. Ikke legg til nye eksterne bilder uten kilde-/rettighetsvurdering. På sikt bør bilder lagres kontrollert med kjent kilde, fotograf/kreditering og bruksrett.

## 5. Dagens demoarkitektur

Offentlig runtime er frontend-only:

```text
offentlige data- og karttjenester
        +
forhåndsprosesserte/statiske prototypefiler
        ↓
React + TypeScript + OpenLayers
        ↓
GitHub Pages
```

- `apps/web` er den offentlige demoen.
- `apps/api` med FastAPI/Python beholdes for preparation, domenelogikk, tester og mulig framtidig arkitektur, men er ikke runtime-avhengighet for GitHub Pages.
- Regnskapskritiske/autoritative resultater skal fortsatt kunne flyttes til versjonert preparation/backend. Frontend-analysene er prototypeanalyser.

## 6. Kart, raster og beregning

Det gamle absolutte prinsippet «WMS er bare visualisering» er for grovt for dagens prototype.

Gjeldende regel er:

- WMS/kartbilder kan brukes direkte til **prototypevisualisering**.
- Klassifiserte WMS-rasterfliser brukes også i enkelte **prototypeanalyser i nettleseren**, blant annet framtidig utbygging, tegnet polygon og økosystemfordeling.
- Slike resultater skal være tydelig merket som prototypeanslag/metodebundet beslutningsstøtte.
- WMS-avledede nettleserberegninger skal ikke omtales som autoritative regnskapstall uten metodisk beslutning, versjonering og validering mot godkjent analysekilde.
- Kart og analyser skal så langt mulig bruke samme råfliser/klassifisering for å unngå visuell og numerisk inkonsistens.

Grunnkart-raster og analyser bruker EPSG:25833. Plan-/polygonanalysen bruker et fast rutenett på ca. **21,16 meter** per analysepiksel. Mer detaljert økosystemklassifisering kan bruke finere rutenett der implementert.

## 7. Utforsk i kart – selvstendige temaer

Gjeldende branch viser tre selvstendige karttemaer i `#utforsk-i-kart`:

1. Grunnkart nivå 0 – heldekkende regnskapsgrunnlag; standard ved åpning.
2. Verdsatte naturtyper – supplerende registrerte lokaliteter.
3. Framtidig utbygging – planavsetninger fra kommuneplanens arealdel.

Bare ett tema er aktivt. Temabytte rydder filtre og lokalitetsvalg, men
beholder senter/oppløsning. Bare kommunevalg og «Vis hele kommunen» tilpasser
utsnittet. Ingen kryssanalyse startes ved åpning eller temabytte.

`ExploreThemesWorkspace`, `exploreThemeMap` og et lite `mapThemes`-register
eier denne visningen. Registeret gir navn, faglig rolle, kilde, beskrivelse
og tegnforklaring. Ikke bygg generell GIS-klient eller lagkatalog.

Naturtypelisten hentes mot hele kommunepolygonet fra REST-kilden. Den er
uavhengig av plan og viser bare registrerte naturtyper. WMS bruker kildens
fire verdidelag; filtrering viser kildens polygoner, med samme verdifarger.
Manglende data/registrering skal skilles fra feil og fravær av naturverdi.

Planvisningen bruker det eksisterende status-2/formål-1000/2000-filteret.
Den selvstendige visningen viser bare dagens Natur og Jordbruk innenfor
planformålene. Bebygd, vann og ugyldige piksler skjules. Pikselvis sammenstilling
bruker eksisterende klasser, EPSG:25833 og råflispipeline; grove utsnitt
aggregerer treff på nivå 9 med svakere farge for små felt. Smale treff beholdes
i kartpresentasjonen. Analysemetode, grid, stripebehandling og cache er uendret.

Nivå 0 gjenbruker kommuneoversiktsraster og eksisterende klassifiserte
WMS-fliser på detaljnivå. Bare Trondheim har klargjort oversiktsraster nå.
WMS-laget har maksimal målestokk 1:50 000; et transparent bilde ved et grovere
utsnitt er ikke dokumentert fravær av data.

Analyseverkstedet, polygonverktøyene og metodene beholdes i kode og tester,
men monteres ikke på Utforsk-ruten. De skal først kobles tilbake i en egen
oppgave etter manuell godkjenning av de selvstendige kartvisningene.
Ingen metode, analyse-ID, nevner, UTM-korreksjon eller resultatcache endres.

## 8. Tegnet polygon

Eget polygon skal behandles som et analyseområde på samme måte som framtidig utbygging, ikke som en separat analysefamilie.

Den beholdte implementasjonen støtter følgende; kontrollene er midlertidig
skjult i den nye offentlige kartflyten:

- start tegning
- punkter/hjørner i kart
- angre siste punkt
- ferdig
- avbryt
- tegn på nytt
- fjern område

Polygonet rasteriseres og bruker samme overordnede overlaypipeline som øvrige
analyser. Dagens beregning begrenses til gyldige, ikke-transparente piksler i
det klargjorte kommunevise oversiktsrasteret; den utfører ikke en separat eksakt
vektorinterseksjon med kommunegrensen. Denne forskjellen skal beskrives dersom
klippemetoden omtales.

Ved endringer i polygonanalysen skal følgende verifiseres eksplisitt:

- at arealet gjelder hele analyseområdet
- at prosentnevneren er riktig
- at gammel cache/overlay ikke gjenbrukes etter områdebytte
- at tall og kart gjelder samme analyseidentitet og gyldige avgrensning; kartet kan vise kildegeometri som klippes mot analysemasken

## 9. Ytelse og flispipeline

`apps/web/src/map/sharedImageRequests.ts` er felles request-/cachelag for rasterbilder.

Gjeldende prinsipper:

- maks **4 samtidige nettverkskall per datakilde**
- identiske pågående kall deles
- råbilder caches med begrenset cache (400 elementer per kilde i dagens prototype)
- samme råflis skal gjenbrukes mellom kart og analyse når URL/datagrunnlag er identisk
- unngå store heldekkende bilder når flisbasert analyse er mulig
- aborter eller ignorer stale resultater ved kommune-/analysebytte; dagens delte
  requestlag avbryter ikke selve nettverkskallet etter at det er startet, men
  avbrutte konsumenter bruker ikke resultatet
- lukk `ImageBitmap` og frigjør object URLs/Canvas-ressurser der det er relevant

Resultatcache for økosystemfordeling og Verdsatte naturtyper bruker
`analysisId`. Tegnede polygoner får `drawn:<UUID>` fra `crypto.randomUUID()`
ved fullført tegning, uavhengig av kartinstans. ID-en beholdes når samme område
analyseres mot et annet datagrunnlag. Resultater skal bare vises når både
analyseidentitet og kommune stemmer med aktiv analyse; dette gjelder også
kartmasker og delresultater. Områdebytte og avbrutte forespørsler skal fortsatt
dekkes av regresjonstester.

## 10. Domeneskille i kode

Begreper og moduler skal skille mellom:

- `account` – selve naturregnskapet
- `nature-status` – naturen i dag
- `historical-loss` – dokumentert historisk endring
- `future-analysis` – fremtidig arealbruk og tegnede analyseområder
- `thematic-data` – supplerende temadata
- `reporting` – presentasjon/rapportering av allerede beregnede resultater
- `map` – kartinteraksjon og visning
- `datasets` – datakildekontrakter og register

Ikke bruk generiske navn som gjør at disse domenene flyter sammen.

## 11. Datamangler og usikkerhet

Datamangler er førsteklasses informasjon. Resultater skal kunne skille mellom:

- registrert verdi/treff
- ingen registrerte treff
- ikke kartlagt/ukjent
- teknisk feil eller manglende datatilgang

Ingen av disse skal presenteres som samme tilstand.

## 12. Utviklingsprinsipper

1. Bygg små, vertikale og testbare steg.
2. Ikke implementer funksjonalitet som ikke er eksplisitt etterspurt.
3. Ikke opprett nye temasider eller analysefamilier uten faglig avklaring.
4. Ikke innfør nye rammeverk eller tunge avhengigheter uten konkret behov.
5. Legg fagregler og analysemetode utenfor presentasjonskomponenter.
6. Kart, tall og tabeller for samme analyse skal bygge på samme resultat, identitet og gyldige avgrensning. Beregningsgrid og kartgeometri holdes adskilt. I det beholdte analyseverkstedet vises Verdsatte naturtyper som ordinær WMS-kontekst, beregnet treff som grense/fyll fra eksisterende rastermaske og valgt lokalitet som kildegeometrisk omriss. Ikke kall rastertreffet eksakt naturtypegeometri.
7. Kjør relevante tester, lint og build før avslutning.
8. Oppdater levende dokumentasjon og legg til ADR når en reell arkitekturbeslutning tas.
9. Gamle ADR-er er historikk og skal normalt ikke omskrives.
10. Prototypens teknologistack er ikke automatisk produksjonsarkitektur.

## 13. Dokumentasjon som skal leses før arbeid

Start med:

1. `AGENTS.md`
2. `docs/README.md`
3. `docs/utviklingsplan.md`
4. relevant produkt-/arkitekturdokumentasjon
5. relevante ADR-er for området som endres

Ved konflikt gjelder nyere eksplisitte beslutninger og dagens kode foran historiske ADR-er. Dokumentasjonsavvik skal korrigeres i samme PR når de oppdages.

## 14. Arbeidsform med Codex

Før implementering skal Codex:

1. lese dokumentene over
2. kontrollere dagens `main`
3. identifisere om oppgaven gjelder regnskap, temadata, analyse eller formidling
4. beskrive kort hvilke eksisterende regler/mønstre som berøres

Ved avslutning skal Codex oppgi:

1. hva som er endret
2. hvilke filer som er endret/opprettet
3. hvilke tester/lint/build som er kjørt og resultat
4. metodiske antakelser og begrensninger
5. hvilken dokumentasjon/ADR som er oppdatert

## 15. Kostnads- og utviklingsmiljø

Arbeidsflyten skal kunne gjennomføres fra nettleser med GitHub/Codex uten å være avhengig av en bestemt lokal PC eller nye betalte runtime-tjenester. Ikke innfør infrastruktur med løpende kostnader uten eksplisitt beslutning.
