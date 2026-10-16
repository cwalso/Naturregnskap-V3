# Brukerreise- og UX-kontroll – kommunal arealplanlegger

Dato: 15.10.2026. [Issue #77](https://github.com/cwalso/Naturregnskap-V3/issues/77),
[eksisterende PR #76](https://github.com/cwalso/Naturregnskap-V3/pull/76),
branch `feat/explore-analysis-map`.
Faktisk lokal og remote start-HEAD: `789a640d6cb2f0f05b93d243df766d7d645a5ca0`.
Main: `a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`.

## Testgrunnlag og begrensninger

GitHub Pages' siste vellykkede deployment er **`b13670daf12b6b9ac276e1eb2200846912827c97`**,
deployment `7063982503`, med status `success` fra 14.10.2026.
Se [Actions-kjøringen](https://github.com/cwalso/Naturregnskap-V3/actions/runs/38556320324)
og [registrert publiseringsgrunnlag](2026-10-15-user-journey-review/published.json).
Direkte tilgang til Pages gir miljøets proxy-403. Derfor er kontrollen gjennomført
i **reell Chromium mot en lokal produksjonsbygging av nøyaktig publisert commit**.
Applikasjonskode, public-filer og byggkonfigurasjon har ingen endringer mellom
denne commiten og start-HEAD. Lokalt bygg gir `index-D5lDvPv7.js` og
`index-CIdz38nE.css`. Lokal preview bruker rotsti `/`, mens Pages-workflowen
bygger med `--base=/Naturregnskap-V3/`. Dette er samme kildecommit, ikke en
påstand om byteidentitet med Pages-artefakten. Det serverte Pages-bundleinnholdet
kunne ikke hentes direkte.

Hovedgjennomgangen bruker uendret produksjonsbygg, faktiske offentlige tjenester
og faktisk klargjort Trondheim-grunnlag. HTTPS-kall videreformidles gjennom
miljøets proxy uten endring av innholdet. Identiske vellykkede svar gjenbrukes
innen samme kontrollsesjon; tjenesteytelse og kaldlasting er derfor **ikke** målt.
Unsplash gir proxy-403; observerte bildefallbacker er ikke dokumentert feil hos
vanlige Pages-brukere. Karttjenestene leverte data i hovedgjennomgangen.

Dette er en oppgavebasert ekspertgjennomgang med faktiske nettleserhandlinger,
**ikke en brukertest med rekrutterte kommunale planleggere**. Vi kan påvise
grensesnittets atferd og risiko for misforståelse, men ikke hvor mange brukere
som vil misforstå. Ingen produksjonsendring, datakildeendring, metodeendring,
ny side, ny PR, merge eller Pages-publisering er utført.

Tre evidenstyper holdes adskilt:

- **Nettleser:** hovedgjennomgang, 46 dokumenterte opptak (45 unike bildefiler), DOM-målinger,
  tastaturhandlinger og axe-core 4.14.0. [Kontrollogg](2026-10-15-user-journey-review/review.json).
- **Isolerte kontroller:** syntetisk samlet periode 2017–2024 og lesetilgang til
  OpenLayers-utsnitt via en midlertidig Vite-hook; separat verktøy og logg.
  Kontrollert DiBK HTTP 503 utføres først etter de ordinære brukerreisene og
  er merket i filnavn/logg. Ingen av disse tilstandene utgis for publiserte data.
- **Kode/dokumentasjon:** forklaring av hvorfor to skogindikatorer har ulike
  beregningsløp, kommunevalg og eksisterende modellstøtte for manglende verdier.
  Dette er ikke selvstendig nettleserbevis for datakvalitet.

## A. Overordnet vurdering

Kommuneoversikt fungerer godt som inngang til både historisk nedbygging,
planarealanalyse og etablerte naturtema. Den synlige hovednavigasjonen og den
direkte lenken «Åpne arealfordelingen i kart» gjør analysen tilgjengelig.
Natur/Jordbruk, historisk endring og supplerende registreringer er gjennomgående
bedre skilt enn en felles overskrift «naturtap» ville gjort. Demomerking,
706,71 daa ufordelt natur og manglende kommunegrunnlag er synlig informasjon.

Den største faglige risikoen er at **skog i framtidige utbyggingsområder oppgis
som 1 816 dekar på skogsiden og 2 032,22 daa i den nye plananalysen**. Begge
presenteres som overlapp med økosystemtype skog, uten at forskjellen mellom de
to beregningsløpene fremgår ved tallene. Det er ikke grunnlag her for å kåre
ett av tallene til korrekt eller endre beregningene.

De viktigste praktiske hindringene er at kommunevalg bryter den aktuelle
oppgaven, svært svak kontrast i enkelte tilstander og lite arbeidsrom til kart
og resultater på små skjermer. Naturtema-sidens plassering av bynatur sammen
med regnskapsgrunnlaget svekker ellers tydelige faglige skiller.

## B. Resultat per scenario

### A – Hva slags natur har kommunen? Delvis lett å løse

Fra Trondheim-oversikten er Natur **347 980**, Jordbruk **72 120** og Bebygget
**74 730 dekar** lette å finne. Kortene sier at andel av landarealet ikke er
oppgitt, fremfor å finne på en andel. Den synlige kildenoten skiller SSB 2026
fra kartets Grunnkart 2025; tall og kart lover dermed ikke identisk inndeling.
Skog- og våtmarkinngangene beholdes som egne tema, mens naturverdier og vern
er merket som supplerende. [Oversikten](2026-10-15-user-journey-review/A-overview-1440.png).

Hovednavigasjon til Naturtema og videre til Skog åpner riktig side og
kommuneavgrenset kart. Skogsiden viser **280 586 dekar arealdekke-skog** og
skogtypefordeling. Den forklarer uttrykkelig at arealdekke og økosystemtype
ikke må brukes som samme nevner. Dette er en god faglig presisering.
Full økosystemfordeling for dagens natur ligger på Myr/våtmark-siden under
«Fordeling av landbasert natur» / «Økosystemtypene i kommunen», en lite
selvforklarende vei for den som spør om all natur. Oversiktens lille
økosystemtabell gjelder derimot **historisk demonedbygging**, ikke dagens beholdning.
Se [Myr/våtmark og dagens fordeling, separat kontroll](2026-10-15-user-journey-review/supplement/A-wetland-entry-1440.png).

Naturtema skiller regnskapsgrunnlag fra supplerende tema, men plasserer
«Bynaturen (grå arealer)» under «Temasider fra regnskapsgrunnlaget».
Målsiden presiserer at bynatur er beslutningsstøtte og at 74 730 dekar ikke er
samlet gråareal. Presiseringen finnes, men inngangen gir en annen forventning.
Se [Naturtema](2026-10-15-user-journey-review/A-themes-1440.png) og
[Bynaturen](2026-10-15-user-journey-review/A-urban-role-1440.png).

### B – Hva er bygget ned? Gjennomført, med tydelig demoavgrensning

«Mer om naturtapet» fra oversikten åpner Naturtapet for Trondheim.
«Demodata – illustrasjon, ikke offisiell statistikk» står både ved innledningen
og diagram/fordelinger. Referansen er uttrykkelig **2016–2025, illustrativ**.
Natur **1 280**, jordbruk **320** og samlet nedbygging **1 600 dekar** er
adskilt; naturfordelingens og etterfølgende arealbruks ulike nevnere forklares.
Periodevalg virker, tabellalternativet kan åpnes med «Se tallene i tabell»,
og «Tilbake til Kommuneoversikt» går tilbake. Ingen historiske polygoner loves
av kommunetallene. [Diagram og åpnet tabell](2026-10-15-user-journey-review/B-loss-table-1440.png).

En **separat syntetisk nettleserkontroll** gir modellen én samlet periode
2017–2024: én periodegruppe og ett periodealternativ beholdes, også ved 390/320 px.
Ingen årstall eller trend interpoleres; ikke-levert etterfølgende arealbruk
skjules. Det viser at strukturen tåler en samlet leveranse, ikke at SSB er
integrert eller at testtallene er offisielle. To periodevelgere gir liten
nytte når bare én periode finnes, og «Utvikling over tid» beskriver da mer enn
diagrammet kan vise. Endelig ordlyd må følge leveransen som forventes
**25. november 2026**, og årlige observasjoner er fortsatt ubekreftet.
Se [syntetisk samlet periode, 390 px](2026-10-15-user-journey-review/supplement/B-synthetic-aggregate-390.png).

### C – Natur innenfor planavsetninger? Gjennomført, kartlesing krevende på mobil

Oversiktens planseksjon forklarer at planavsetning ikke er forventet naturtap.
Lenken åpner **Arealfordeling**, ikke den supplerende naturverdianalysen.
Resultatet viser natur **2 788,80 daa**, jordbruk **832,08 daa** og samlet
**3 620,88 daa**; **706,71 daa** er uttrykkelig ufordelt natur.
Natur, Jordbruk, Skog og nullstilling til Alle arealer lar seg velge.
Skogvalg fungerer også med tastatur ved alle fire bredder. Kategorien har
**2 032,22 daa**, i konflikt med temakortets tilsynelatende tilsvarende 1 816.

Kategorivalg beholder utsnittet; «Tilpass kart til utvalget» er en egen handling.
Dette gir forutsigbar kartkontroll, men første valg kan gi lite synlig endring
i et kart dominert av det ordinære Grunnkart-laget. Analyseresultatet kan vises
selv om vanlig «Framtidig utbygging»-lag er avkrysset av. Det er separate
visninger, men kartets generelle status «1 aktive kartlag / Supplerende
kartvisning» forklarer ikke denne forskjellen. På mobil ligger kategori og
tilpass-/nullstillhandlingene under resultatinnledning og summer i intern scroll.
Se [skogutvalg etter tilpassing](2026-10-15-user-journey-review/C-forest-fit-1440.png).

### D – Registrerte naturverdier? Gjennomført, begrep og nullstilling krever tolkning

Bytte til Registrerte naturverdier viser **119,38 daa unikt overlappsareal** og
**70 berørte lokaliteter**. Innledningen sier at det gjelder registrerte
naturtypelokaliteter som overlapper planområder, og at overlapp ikke er faktisk
utbygging eller nødvendigvis tap. Det reduserer risikoen for å lese tallet som
hele naturarealet i planavsetningene. Verdikategorier, naturtype og lokalitet
kan velges; «Viktig bekkedrag» og «Tanemsmyra / BN00109936» ble valgt i nettleseren.
Kartmarkeringen endres uten tvungen innzooming.

«KU-verdi» er en fagforkortelse uten kort forklaring ved første bruk.
Metodeinformasjonen er tilgjengelig, men ligger langt ned etter 70 lokaliteter.
Søk etter `___finnes_ikke___` gir korrekt 0 av 70 lokaliteter. Deretter trykker
«Vis hele analysen» bort kartutvalget, men **søket beholdes og listen viser
fortsatt 0 av 70**. Dette er observert ulikt omfang av nullstilling, ikke bevis
på feil i beregningen. Søket kan tømmes manuelt. Det inngår i den samlede
vurderingen av resultat-/kartarbeidsflyten, ikke som et sjette prioritert tiltak.
Se [utgangspunkt](2026-10-15-user-journey-review/D-values-all-1440.png) og
[etter nullstilling med søk](2026-10-15-user-journey-review/D-reset-with-search-1440.png).

### E – Kommunevalg og manglende data? Isolasjon virker, oppgaven brytes

Trondheim ble byttet til **Oslo (0301)** fra Utforsk i kart. Valget fungerer,
men ruten endres umiddelbart til `#oversikt`. Brukeren må selv finne tilbake
til kartet og åpne analysen. Dette er reprodusert i nettleser og samsvarer med
ubetinget `navigate('oversikt')` i `selectMunicipality` i App.tsx.

Oslo beholdes ved sidenavigasjon til kart, Kommuneoversikt og Naturtapet.
Arealanalysen sier **«Klargjort kommunevis Grunnkart mangler. Planarealer er ikke
beregnet; dette betyr ikke null treff.»** Naturtapet forklarer at historiske
data mangler for Oslo og at demoen bare gjelder Trondheim. Ingen av Trondheims
planresultater eller demotall vises som Oslo-resultater i de kontrollerte
visningene. Tilbakevalg til Trondheim gjenoppretter korrekt analyse.
Se [Oslo uten analysegrunnlag](2026-10-15-user-journey-review/E-oslo-analysis-unavailable-1440.png).

Ved full nettleserreload tømmes kommunevalget helt; det byttes ikke i skjul til
Trondheim. Manglende, nulltreff og teknisk feil fremstår som ulike tilstander
i disse kontrollene. Ingen reell kommune med et validert nullresultat i hele
plananalysen er testet; null kontra manglende støttes også av eksisterende
enhetstester, og dette må ikke omtales som nasjonal nettleserverifikasjon.

### F – Kartlag og navigasjon? Funksjonene virker, samlet arbeidsflate er tett

Grå arealer kan av/på ved alle fire bredder; kartets viewport-DOM beholdes.
Innstillinger for Grunnkart lar gjennomsiktighet endres til **65 % med tastatur**.
Tegnforklaring åpner, analysepanel åpner/lukker, analyser byttes og kartet kan
flyttes med piltaster. Ved 900 px heter returen «Tilbake til kartlag» i stedet
for desktopens lukkeknapp. På mobil fungerer meny, bunnkontroller og «Vis kart».

En separat kontroll med lesetilgang til OpenLayers sammenligner faktisk senter
og oppløsning etter panorering, kategori-/analysebytte, panellukking og seks
uavhengige temalag/planlag av/på. Dette skilles fra hovedgjennomgangens enklere
DOM-observasjon. Detaljer i supplementloggen. Ingen generell kontroll av alle
128 lagkombinasjoner eller kartmotorregresjon hevdes for denne undersøkelsen.

En **kontrollert DiBK HTTP 503** på ny innlasting gir både manglende resultat
på oversikten og tydelig rødt feilvarsel i analysepanelet: ikke null treff.
Vanlige lagrader har ikke de gamle kortvarige statustekstene.
[Kontrollert feiltilstand](2026-10-15-user-journey-review/F-controlled-plan-error-1440.png).
Dette er ikke en målt ordinær tjenestefeil eller en simulering av alle WMS-feil.

## C. Fem prioriterte forbedringer

### 1. Avklar og samordne skogindikatoren i planavsetninger

- **Type:** faglig konsistensproblem med metodisk avhengighet.
- **Problem/sted:** skogsiden sier 1 816 dekar, Oversikt/Arealfordeling sier
  2 032,22 daa. Begge omtales som økosystemtype skog i framtidige planområder.
- **Reproduksjon:** Trondheim → Naturtema → Skog, les overlappskortet;
  gå til Oversikt → Åpne arealfordelingen i kart → Skog. Se bildene i B/A og B/C.
- **Konsekvens:** planleggeren kan bruke ulike tall for samme tilsynelatende
  spørsmål og mister tillit til koblingen mellom temaside, nøkkeltall og kart.
- **Forslag:** bestem hvilken eksisterende analyse indikatoren skal vise.
  Gjenbruk deretter den beslutningens resultat/proveniens og åpne riktig
  analyse med Skog valgt fra kortet. Hvis indikatorene skal ha ulike formål,
  må navn, avgrensning og metodeforskjell stå ved begge tallene.
- **Prioritet:** høy. **Omfang:** middels.
- **Avhengigheter:** faglig eier må avklare indikatorenes sammenlignbarhet.
  Koden bruker eldre `calculatePlannedDevelopment`/`plannedNatureBreakdown`
  for temasiden og nyere `calculatePlanArea` for primæranalysen. Denne rapporten
  validerer ikke hvilket tall som er riktig; ikke utjevn differansen i frontend.
  Myr/våtmark viser samme type utfordring: temakortet sier 17 dekar i
  planavsetninger, primæranalysen 12,64 daa. Avklaringen må derfor omfatte
  de tilsvarende eksisterende økosystemindikatorene, ikke bare skogetiketten.

### 2. Behold brukerens oppgave ved kommunevalg

- **Type:** UX-forbedring i navigasjonsatferd.
- **Problem/sted:** kommunevalg fra kart/åpen analyse tvinger fram Kommuneoversikt;
  full reload mister også valget.
- **Reproduksjon:** åpne Trondheims analyse, velg Oslo i headeren; observer
  `#oversikt`. Gå tilbake til kartet, åpne analysen og last siden på nytt.
- **Konsekvens:** sammenligning av kommuner krever unødvendig gjenfinning av
  side og analyse, selv når riktig utfall bare er en forklaring om manglende data.
- **Forslag:** behold aktiv side/analysens formål ved nytt kommunevalg;
  tøm kommuneavhengige resultater og vis den nye kommunens loading-/mangelstatus
  i samme kontekst. Avklar eksplisitt om valg også skal gjenopprettes etter reload.
- **Prioritet:** høy. **Omfang:** middels.
- **Avhengigheter:** ingen nye data. Eksisterende kommune-/analyseeierskap,
  avbrutte forespørsler og regelen om aldri å vise gamle kommunetall må beholdes.

### 3. Rett påviste kontrast- og semantikkfeil i navigasjonen

- **Type:** tilgjengelighetsfeil.
- **Problem/sted:** valgt analyseknapp under peker har hvit tekst på `#e5eeee`,
  **1,18:1**; produktnavnet på Naturtema har hvitt på `#dbe9e9`, **1,24:1**.
  Tekststørrelsene krever minst 4,5:1. Naturtemagruppenes `role=list` har
  direkte `button`-barn uten gyldig listeelementstruktur.
- **Reproduksjon:** åpne Naturtema; åpne deretter plananalysen og klikk valgt
  analyseknapp uten å flytte pekeren bort. Se axe-noder i kontrolloggen og
  bildene A-themes-1440, D-values-900 og C-area-all-320.
- **Konsekvens:** sidetittel/valgt analyse er vanskelig å lese; hjelpeverktøy
  får en ugyldig listestruktur. Dette er funksjonell tilgang, ikke smak om farger.
- **Forslag:** bruk konsistente tekst-/bakgrunnsfarger i normal, valgt,
  hover og fokusert tilstand; bruk gyldig listestruktur rundt temainngangene.
  Kontroller etterpå kontrast, tastatur og tilgjengelighetstre på aktuelle sider.
- **Prioritet:** høy. **Omfang:** lite.
- **Avhengigheter:** ingen faglig/datamessig avhengighet. Berører felles styling
  og navigasjonssemantikk; relevante regresjonskontroller må kjøres ved retting.

### 4. Gjør resultat → kart til en praktisk arbeidsflyt på mobil

- **Type:** UX-forbedring i eksisterende analysepanel.
- **Problem/sted:** ved 320×720 er arealkartet 122 px høyt. Naturverdipanelets
  198 px høye rulleområde rommer 7 216 px innhold. Valg, karttilpassing,
  søk/nullstilling og metode konkurrerer om plass og oppmerksomhet.
- **Reproduksjon:** åpne begge analyser ved 390 og 320 px; finn Skog eller en
  lokalitet, gå til kartet, tilpass og gå tilbake. Sammenlign kartstatus,
  vanlig lagliste og analysekategori. Søk uten treff → Vis hele analysen
  demonstrerer at kartnullstilling ikke tømmer lokalitetssøket.
- **Konsekvens:** det blir krevende å se hvilket areal statistikken gjelder,
  spesielt når Grunnkartet visuelt dominerer og valgt kategori ligger utenfor
  det lille kartutsnittet. Detalj-/metodetekst skyver primærhandlingene unna.
- **Forslag:** vis kompakt valgt kategori/resultat og «Vis kart / Tilpass»
  nær hverandre, prioriter mer kartplass og gjør lokalitetsdetaljer/metode
  trinnvis tilgjengelig. Merk analyseresultatet særskilt fra avkryssede
  bakgrunns-/temalag; presiser om nullstilling gjelder kartutvalg eller også søk.
  Behold eksplisitt tilpassing og muligheten til å se resultat og kart sammen.
- **Prioritet:** middels. **Omfang:** middels.
- **Avhengigheter:** ingen nye beregninger eller datakilder. Eksisterende
  utvalg, analyseidentitet, kartinstans og uendret utsnitt ved vanlige valg
  må verifiseres ved eventuell implementering.

### 5. Tydeliggjør inngangen til beholdning, økosystemfordeling og bynatur

- **Type:** faglig formidling/UX.
- **Problem/sted:** dagens fullstendige økosystemtabell finnes via Myr/våtmark,
  mens en historisk demotabell er mer synlig på Oversikt. Bynatur/grå arealer
  plasseres samtidig i Naturtema-gruppen «Regnskapsgrunnlag».
- **Reproduksjon:** spør «hva slags natur har kommunen?» fra Oversikt, følg
  Naturtema → Myr og sammenlign med Bynaturen og Oversikts historiske tabell.
- **Konsekvens:** brukeren må forstå sidestrukturen på forhånd for å finne
  dagens økosystemfordeling, og kan gi gråarealvisningen samme regnskapsrolle.
- **Forslag:** gi en tydelig inngang/henvisning til den eksisterende fordelingen
  av dagens natur, med kilde og klassifikasjon. Skill Bynaturen ut med rollen
  «Analyse- og beslutningsstøtte» og merk hva den eksisterende kartvisningen
  faktisk viser. Behold alle etablerte temaer; ikke opprett nye sider.
- **Prioritet:** middels. **Omfang:** lite.
- **Avhengigheter:** ingen ny kilde eller gråarealanalyse. Ikke utgi
  SSB-kort, Grunnkart-fordeling og gråareal-WMS for ett identisk grunnlag.

## D. Faglig og språklig kvalitet

Følgende ordlyd presiserer de fem tiltakene og eksisterende forbehold;
dette er ikke en ekstra forbedringsbacklog.

| Sted / nåværende formulering | Konkret forslag / vurdering |
| --- | --- |
| Skogkortets «Skog i områder satt av til framtidig utbygging» | «Identifisert økosystemtype skog i planområdene – [valgt analyse og versjon]». Bare bruk dette når tiltak 1s indikatorbeslutning er tatt; oppgi eldre metode uttrykkelig om den beholdes. |
| «Fordeling etter KU-verdi» | «Fordeling etter KU-verdi (verdisetting brukt i konsekvensutredninger)». Forklar at dette er lokalitetens registrerte verdi, ikke en konsekvensgrad beregnet for planen. |
| «Unikt overlappsareal / Berørte lokaliteter» | «Registrert naturtypeareal som overlapper planområdene / Registrerte lokaliteter med overlapp». Behold presiseringen om unionert areal og at overlapp ikke er tap. |
| «Vis hele analysen» | «Vis alle karttreff» hvis bare kartutvalg nullstilles. Hvis alt skal nullstilles, må funksjon og navn samordnes i tiltak 4. |
| «Temasider fra regnskapsgrunnlaget» med bynatur | Behold Skog/Myr som Grunnkart-tema; merk Bynaturen «Analyse- og beslutningsstøtte – ikke egen økosystemtype». |
| «Utvikling over tid» når kun én periode leveres | «Nedbygging i perioden 2017–2024». Én periode dokumenterer et samlet volum, ikke en årlig utvikling. Dette er en betinget presisering før offisiell leveranse, ikke behov for ny historisk metode. |
| Naturtema mot Oversikts «Utforsk naturen»; Bebygget/Bebygd | Bruk samme hovednavn i inngang, navigasjon og tilbakevei. Bruk «Bebygd» konsekvent om den faglige nivå-0-klassen, uten å omklassifisere SSB-grupperingen. |
| Teknisk analyseinnledning | Vis først spørsmål, datarolle, enhet og begrensning. Behold DiBK-status/formålsfilter, EPSG:25833, rasterstørrelse, UTM-korreksjon og geometriunion i metodeinformasjonen. Ikke fjern faglige forbehold. |

Alvorligste risiko er indikatorforskjellen i tiltak 1; gjennomgangen beviser
ikke feil naturtapstall eller at 119,38 daa faktisk er mistolket av en bruker.
Forbeholdene ved demo, planavsetning, supplerende lokaliteter og ufordelt natur
skal bevares. Gråareal-WMS er fortsatt bare den eksisterende kartvisningen;
firekategori-analysen er ikke implementert. Direkte Grunnkart-geodata venter
fortsatt på datatilgang/rettigheter. Ingen frontendtekst kan løse disse
metodiske og rettighetsmessige avhengighetene.

## E. Visuell kvalitet og faktiske skjermbilder

Målingene gjelder viewportene **1440×960, 900×900, 390×844 og 320×720**, Chromium
151, standard skalering, musepeker og tastatur. Ingen sidebredde-overflow ble
målt ved de 46 hovedopptakene. Naturverditabellene har derimot bevisst **intern
horisontal scrolling** (minst 440 px tabellbredde), også i smalt desktop-panel.
Ingen horisontal scrolling på siden betyr derfor ikke at alle tabellkolonner
er samtidig lesbare. Mobilmenuen ble brukt ved sidenavigasjon.

| Bredde | Arealanalysens kartflate | Observerbar konsekvens |
| --- | --- | --- |
| 1440 | 746×664 px | God samtidig kart-/resultatflate, men resultatpanelet har intern scrolling. |
| 900 | 560×604 px | Arealpanelet er 340 px; naturverdipanelet er bare 252 px og får mange tekstlinjer. |
| 390 | 390×210 px | Analyseinnledning og summer fyller første panelutsnitt; kategorier krever intern scrolling. |
| 320 | 320×122 px | Svært liten geografisk arbeidsflate. «Vis kart» gir 320×446 px, men skjuler samtidig resultatpanelet. |

Faktiske bilder som dokumenterer hovedfunn og fungerende flyt:

| Kontroll | Skjermbilder |
| --- | --- |
| Oversikt ved alle bredder | [1440](2026-10-15-user-journey-review/A-overview-1440.png), [900](2026-10-15-user-journey-review/A-overview-900.png), [390](2026-10-15-user-journey-review/A-overview-390.png), [320](2026-10-15-user-journey-review/A-overview-320.png) |
| Datagrunnlag og skogindikator | [Naturtema](2026-10-15-user-journey-review/A-themes-1440.png), [Skog / 1 816](2026-10-15-user-journey-review/A-forest-1440.png), [Plananalyse / 2 032,22](2026-10-15-user-journey-review/C-forest-fit-1440.png) |
| Naturtapet og demo | [1440 med tabell](2026-10-15-user-journey-review/B-loss-table-1440.png), [390](2026-10-15-user-journey-review/B-loss-390.png), [320](2026-10-15-user-journey-review/B-loss-320.png) |
| Arealanalyse | [1440](2026-10-15-user-journey-review/C-area-all-1440.png), [900](2026-10-15-user-journey-review/C-area-all-900.png), [390](2026-10-15-user-journey-review/C-area-all-390.png), [320](2026-10-15-user-journey-review/C-area-all-320.png), [320 kun kart](2026-10-15-user-journey-review/C-map-only-320.png) |
| Registrerte verdier og svært smalt panel | [1440](2026-10-15-user-journey-review/D-values-all-1440.png), [900](2026-10-15-user-journey-review/D-values-900.png), [390](2026-10-15-user-journey-review/D-values-390.png), [320](2026-10-15-user-journey-review/D-values-320.png) |
| Lokalitet og nullstilling | [Tanemsmyra](2026-10-15-user-journey-review/D-locality-1440.png), [nullstilling med gjenværende søk](2026-10-15-user-journey-review/D-reset-with-search-1440.png) |
| Kommunevalg / Oslo / reload | [tvungen Oversikt](2026-10-15-user-journey-review/E-oslo-forced-overview-1440.png), [manglende analysegrunnlag](2026-10-15-user-journey-review/E-oslo-analysis-unavailable-1440.png), [Naturtapet uten demo](2026-10-15-user-journey-review/E-oslo-loss-1440.png), [etter reload](2026-10-15-user-journey-review/E-oslo-after-reload-1440.png) |
| Lagkontroll og feil | [mobil lagliste](2026-10-15-user-journey-review/F-grey-layers-390.png), [opasitet](2026-10-15-user-journey-review/F-opacity-1440.png), [tegnforklaring](2026-10-15-user-journey-review/F-legend-1440.png), [kontrollert HTTP 503](2026-10-15-user-journey-review/F-controlled-plan-error-1440.png) |

Axe-kontrollen fant de konkrete feilene i tiltak 3. Enkelte kontroller er
«incomplete» og krever menneskelig vurdering; ingen generell WCAG-godkjenning
hevdes. Tastaturvalg av analyse, kategorier, opacity og kart er kontrollert;
skjermleser, touch på fysisk telefon, 200/400 % zoom og en uttømmende
fokusrekkefølge er ikke testet. Små OpenLayers-standardkontroller finnes, men
det er ikke gjort en full vurdering av målestørrelsesunntakene i WCAG 2.2.

## F. Neste avgrensede utviklingsoppgave

Ingen av forslagene er implementert. Anbefalt rekkefølge for ny bestilling:

1. **Faglig avklaring av skogindikator** (tiltak 1): bestem analyse/formål og
   forventet overgang mellom temakort og kart. Deretter en avgrenset leveranse
   som gjenbruker valgt resultat og proveniens; ingen ny klassifikasjonsmetode.
2. **Tilgjengelighet og oppgavekontekst** (tiltak 2–3): behold side ved kommunevalg,
   rett dokumenterte kontraster og listestruktur. Verifiser Oslo/Trondheim,
   gamle/sene svar, tastatur og fire bredder.
3. **Eksisterende panel og faglige innganger** (tiltak 4–5): en liten panelprototype
   med mer kartrom og synlig utvalg/tilpassing; presiser rollene og henvis til
   eksisterende økosystemfordeling. Verifiser at tall, lag og utsnitt er uendret.

Deretter bør faktiske kommunale planleggere løse de samme oppgavene uten
instruksjon om hvor inngangene ligger. Det vil teste forståelse og gjenfinning
som denne ekspertgjennomgangen bare kan vurdere risikoen for.

### Faktisk kjørt og reproduksjon

- Lokal produksjonsbygging av publisert `b13670d`: vellykket.
- Hovedverktøy: `apps/web/tests/browser/review-user-journeys.mjs`, fullført,
  46 opptak / 45 bildefiler, fire bredder, ingen registrerte JavaScript-feil.
- Separat supplement: `apps/web/tests/browser/review-user-journeys-supplement.mjs`.
  Se [reproduksjonsbeskrivelse](2026-10-15-user-journey-review/README.md) for
  resultater, begrensninger, miljøvariabler og faktiske kontrollfiler.
- `npm test`: **178/178**, 32 testfiler. Inkluderer historisk periodelogikk,
  null/manglende, kommuneisolasjon, overlay og eksisterende komponenter.
- `npm run lint`: **0 feil**, ett eksisterende Fast Refresh-varsel i
  `EcosystemPage.tsx:30`. Ingen produksjonsendring gjort for å fjerne varselet.
- `npm run build`: vellykket; eksisterende varsel om JavaScript-chunk over 500 kB.
- `node --check` for kontrollverktøyene og `git diff --check`: bestått.
  Backend/data-preparation er ikke endret; ingen ny backend- eller metodevalidering
  hevdes i denne oppgaven.

Bare denne rapporten, evidens, reproduksjonsverktøy og dokumentasjonslenker
inngår i leveransen. Issue #77 kobles gjennom rapporten; PR #76 beholdes åpen.
