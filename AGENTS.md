# AGENTS.md – Kommunale naturregnskap V3

Dette dokumentet gir varige instrukser til Codex og andre kodeassistenter som arbeider i repoet.

**Sist oppdatert: 19.10.2026**

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

## 7. Utforsk i kart – uavhengige kartlag

Gjeldende branch viser sju uavhengige kartlag i `#utforsk-i-kart`:

1. Grunnkart nivå 0 – heldekkende regnskapsgrunnlag; standard ved åpning.
2. Verdsatte naturtyper – supplerende registrerte lokaliteter.
3. Framtidig utbygging – planavsetninger fra kommuneplanens arealdel.
4. Verneområder – vedtatt vern, kildens fem verneformklasser; forslag skjules.
5. Inngrepsfri natur (INON) – status januar 2023, tre avstandssoner.
6. Villrein – registrerte biologiske leveområder, uten undertemavalg.
7. Grå arealer – offisielt kartprodukt testversjon 1, med kildebaserte vegetasjonsandeler.

Avkryssing tillater 0–7 aktive lag; alle 128 kombinasjoner er kontrollert. Alle av viser bakgrunnskartet. Hvert aktivt
lag har egen gjennomsiktighet. Fast rekkefølge er bakgrunn → nivå 0 → Grå arealer → INON →
Villrein → plan → naturtyper/lokalitetsvalg → verneområder → kommunemaske/grense.
Nivå 0 starter med 30 %, INON med 35 %, Grå arealer med 25 %, øvrige lag med 0 % gjennomsiktighet. Grunnkart-klassifisering og farger er uendret.
Planlaget har mørk grønn/gul diagonalskravur og transparent tint; legend matcher.
Skravuren legges på planlagets isolerte canvas i skjermpiksler etter rendering,
uten å endre kildefliser, geografisk støtte, analysemasker eller cache.
Range-kontroller har null margin og blokkvisning, slik at 100 % bredde passer
i laglisten uten horisontal scrolling.
Lagvalg, gjennomsiktighet, filter, objektvalg og resize bevarer utsnittet.
Bare kommunevalg og «Vis hele kommunen» tilpasser det. Andre lagvalg bevarer
naturtypefilter og valgt objekt. Å skjule naturtypelaget fjerner objektvalg,
men bevarer filteret. Ingen kryssanalyse startes ved lagvalg.

`ExploreThemesWorkspace`, `exploreThemeMap` og et lite `mapThemes`-register
eier denne visningen. Registeret gir navn, faglig rolle, kilde, beskrivelse
og tegnforklaring, standard synlighet/opasitet, tegnerekkefølge og filtertype.
Bare implementerte lag vises. FKB-Grønnstruktur har fortsatt reservert ID, men offentlig bruksrett er uavklart; ingen aktiv kontroll eller kilde monteres. Nye lag bruker
verifisert WMS i EPSG:25833 og kildens GetLegendGraphic. INON-år vises alltid
ved aktiv legend. Transparente, dekodede WMS-bilder er gyldige tomme utsnitt.
Villrein gjenbruker eksisterende kommunevise registreringsstatus; ingen nye
areal-/overlappsberegninger eller resultatcacher startes. Lag, image-eier og
kommuneeier må stemme før sene svar får status. Regional/ufullstendig dekning
skal forklares separat fra tomt bilde og kildefeil. Mobilvelgeren kan
lukkes over kartet. Ikke bygg generell GIS-klient eller lagkatalog.

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
oppgave. De tre kartvisningene og korrigert planvisning er manuelt godkjent;
den nye lagstyringen leveres for videre brukertest, uten å reaktivere analyse.
Ingen metode, analyse-ID, nevner, UTM-korreksjon eller resultatcache endres.

### Godkjent V2-panelstruktur

`ExploreThemesWorkspace` bruker nå godkjent designprototype V2: kompakt
lagliste, sentralt OpenLayers-kart og ett kontekstavhengig detaljpanel.
Desktop har 274/338 px paneler; ved 900 px erstatter detaljer laglisten i
252 px sideplass. Mobil har ett 260–300 px bunnpanel med egen kartflate over,
intern scrolling, Escape og fokusretur. Lave skjermer bruker vertikal reflow.
`RegisteredNaturePanel` og `RegisteredNatureDetails` viser eksisterende data;
ingen ny filter-/kart-/analysemotor innføres. Kartklikk og lokalitetsliste
åpner samme objektpanel, uten fit eller endring av øvrige lag og filtre.
Alle sju lag, kildelegender og forbehold beholdes. Headerens kommunevalg
beholdes. Fra 13.10 står hovednavigasjonen permanent horisontalt på desktop
(over 52 rem), med menyknapp på mindre skjermer. Planoverlappinngangen står
fast over den rullbare laglisten og heter Planoverlapp i mobilkontrollene.
Se [kontrollrapport](docs/validation/2026-10-13-navigation-analysis-entry.md).
Se [beslutning](docs/decisions/2026-10-12-v3-explore-design-v2.md) og
[kontrollrapport](docs/validation/2026-10-12-explore-design-v2.md).

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
Se [kilde-/kartkontroll](docs/validation/2026-10-12-grey-areas.md).

## 16. Godkjent geometrisk analyse av planoverlapp (13.10.2026)

«Analyser planoverlapp» åpner et eget V2-kontekstpanel i samme OpenLayers-instans. Temasidens kort bruker nå `future-valued-nature-geometry-v3`. Den gamle analysearbeidsflaten er fortsatt skjult; dette er en separat, eksplisitt autorisert videreutvikling. Natur/Jordbruk-masken deles med planpresentasjonen, delceller klippes geometrisk, høyeste KU-verdi vinner og naturtypeareal unioneres innen typen. Under analyse brukes den faste masken i plankartet, mens vanlig detaljvisning gjenopprettes ved lukking. OBJECTID er ikke faglig nøkkel; kildens originale faktaark-ID verifiseres. Hele geometriunionen er lokalitetsnevner. Ugyldig/ufullstendig kilde eller motstridende attributter stopper tall. Manglende kommuneraster er ikke null treff. Se [metodebeslutning](docs/decisions/2026-10-13-v3-geometric-valued-nature-overlap.md) og [kontrollrapport](docs/validation/2026-10-13-future-nature.md). Øvrige analyser, sju kartlag, nivå-0-metode, DiBK-filter og råflis-cache beholdes.

## 17. Oversikt – ny forside (13.10.2026)

Oversikt er formidling og videre inngang: tre oppsummeringskort, eksisterende
Grunnkart-kart, korte forklaringer, to fortellende seksjoner, naturtypeliste
og seks bildekort til eksisterende temaer. Tallene gjenbruker eksisterende
SSB-adapter; kartet viser Grunnkart og forklares som et annet datagrunnlag.
Manglende faktiske andeler/endringer skal ikke utledes eller bli eksempeltall.
Fra 14.10 er separate, tydelig merkede Trondheim-demodata eksplisitt autorisert
for historisk nedbygging på Naturtapet og i Oversikts forhåndsvisning.
De bruker egen domenemodell/kilde og illustrativ periode 2016–2025, og skal
aldri presenteres som offisielle statistikker eller Grunnkart-beholdning.
Andre kommuner får mangelstatus. SSBs forventede novemberleveranse har uavklart
klassifikasjon/variabler; ingen API-kontrakt eller historiske kartpolygoner antas.
Nasjonale rangeringer er ikke klargjort. Supplerende tematreff er
kildeobjekter, ikke automatisk unike lokaliteter. Ved feil i kommunegrensen
skal ikke et generelt kartutsnitt fremstilles som kommunen. Unsplash-motiver
har dokumentert gratis kilde, fotograf, illustrasjonsstatus og feiltilstand.
Se [leveranse-/kontrollrapport](docs/validation/2026-10-13-overview-redesign.md).
Se [felles historisk struktur og SSB-avklaringer](docs/product/historical-loss-pages.md).

## 18. Planområder × arealfordeling (14.10.2026)

`planned-land-cover-area-v1` er en eksplisitt autorisert primæranalyse i samme
Utforsk-kontekstpanel. Den gjenbruker uendret `loadFutureNatureMask`/nivå-9-støtte
og eksisterende NIBIO-nivå-1-fliser. Natur/Jordbruk er disjunkte; Bebygd/vann
inngår ikke. Fem dokumenterte naturtyper identifiseres konservativt fra eksakte
SLD-farger på 10,578125 m delruter. Transparente/blandede/ukjente piksler blir
ufordelt natur, aldri en forholdsmessig fordeling. Jordbruk beholdes samlet.
Kartvalg bruker de samme delrutene som tallene, i egen metode/identitet/cache.
Kilde-/grid-/versjonsforbehold er dokumentert. Bare Trondheim er klargjort.

Panelet skiller Arealfordeling fra Registrerte naturverdier. Sistnevnte beholder
119,38 daa /70 lokaliteter og skal ikke summeres med heldekkende planarealer.
Utvalg bevarer utsnitt/lag; fit er eksplisitt. Mobil kan vise kartet med bevart
utvalg og returnere til resultater. Oversikt gjenbruker samme arealresultat og
lenken åpner riktig analyse direkte. Ingen forventet/historisk naturtap utledes.

SSBs forventede første historiske periode er 2017–2024, mulig som ett aggregert
periodetall. Modell og visning skal ikke forutsette årlige observasjoner.
Dagens illustrative 2016–2025-demo beholdes. Se
[metode](docs/decisions/2026-10-14-plan-land-cover-area.md) og
[A/B/C-kontroll](docs/validation/2026-10-14-plan-area.md).

## 19. Felles prototypeindikatorer (15.10.2026)

Skog og Myr/våtmarks planindikatorer bruker nå samme `calculatePlanArea`-resultat
som Oversikt og Arealfordeling. Eldre indikatorløp kjøres ikke på disse sidene;
beregningsmodulene beholdes. Beholdningstall er uendret. Vis identifisert delareal,
ufordelt og separate mangel-/feiltilstander. Ikke konstruer en andel fra ny
delvis fordeling og eldre beholdning. Lenken åpner riktig kategori uten fit.
Dette er konsistens i prototypen, ikke endelig metodegodkjenning.
Se [beslutning](docs/decisions/2026-10-15-common-plan-indicators.md).

Kommunevalg beholder side og åpen analysetype. URL-parameteren `kommune` valideres
mot kommunelisten og gjenopprettes ved reload; gamle resultater og geografiske
utvalg skal aldri lekke mellom kommuner. Ingen lokal lagring.
Naturtema viser eksisterende økosystemfordeling fra Grunnkart 2025, separat fra
planoverlapp/historikk. Bynatur ligger under beslutningsstøtte, ikke regnskaps-
grunnlag. Alle sju temasider beholdes. Bruk native lister, lesbare aktive/hover-
tilstander og tastaturtilgjengelige rulleområder.
Se [samlet B1–B4-kontroll](docs/validation/2026-10-15-ux-improvements-b1-b4.md).

## 20. Aktiv analyse og mobil delt flate (19.10.2026)

Oppdragsgiver har valgt C, ikke B5.1-rapportens anbefalte A. Aktiv analyse er
uavhengig av synlig panel. Å vise lag/innstillinger/legend eller skjule resultater
skal ikke trekke tilbake resultat, utvalg eller markering eller starte ny analyse.
Kommuneeier og sene svar kontrolleres fortsatt. Bytte av type/kommune resetter
ugyldige valg; Avslutt analyse fjerner analysemarkering, men beholder lag/utsnitt.
Se [beslutning](docs/decisions/2026-10-19-mobile-split-view.md).

Mobil aktiv analyse (≤700 px) bruker samme karttarget og tre lokale visningsmoduser:
Mer kart, Delt (standard) og Mer resultat. Midlertidige lag/detaljer returnerer til
forrige modus med fokus på synlig åpner. Oppsummering/hurtigvalg/fit er tilgjengelig
også i Mer kart. Mer resultat skjuler zoom/reset fra 100 px kartflate. Kommunevalg
beholder modus, men fjerner gamle data. Desktop har eksisterende sidepaneler.
Lokalitetsvalgets eksisterende auto-fit er foreløpig tillatt og skal vurderes i B5.2c;
ikke start c/d automatisk. Se [kontrollrapport](docs/validation/2026-10-19-mobile-split-view-b5-2ab.md).
