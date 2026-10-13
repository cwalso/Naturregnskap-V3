# Planoverlapp for verdsatte naturtyper – leveranse og kontroll

Dato: 13.10.2026. Repo `cwalso/Naturregnskap-V3`, branch `feat/explore-analysis-map`, eksisterende PR #76. Start-HEAD `95db94558c1498699f997b1417715aec941efe1f`; main/base `a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`. Ingen merge eller endring av main.

## Resultat

**Trondheim: 119.38 daa, 70 unike berørte lokaliteter.** De to høyeste KU-kategoriene samlet: 41.98 daa og 38 lokaliteter.

Dette er et kontrollert prototypeuttrekk, ikke naturregnskap, naturtapsregnskap eller konsekvensutredning. Planavsetning og overlapp dokumenterer ikke faktisk utbygging eller naturtap. Registrerte naturtyper er ikke heldekkende kunnskap om naturverdier.

## Kort metode og avgrensning

[Godkjent metode og full teknisk kontrakt](../decisions/2026-10-13-v3-geometric-valued-nature-overlap.md).

«Geometrisk overlapp mot rasterbasert analyseavgrensning»: uendret DiBK-filter (arealbruksstatus 2, formål 1*/2*, laget kparealformalomrade) krysses med Natur og Jordbruk i Grunnkart nivå 0. Juridisk planstatus er ikke ytterligere verifisert. Nivå-9-sampling, alfagrenser og klassifisering deles med selvstendig planvisning; smale komponenter beholdes. Celler er 21,15625 m i EPSG:25833. Konturer spores romlig avgrenset; ingen heldekkende samling av individuelle cellepolygoner opprettes. Polygonunion/interseksjon/differanse gir delcelleareal og faktisk overlappsgeometri. Areal korrigeres med felles kommunefaktor 0.9994795816. Dette er ikke eksakt interseksjon med opprinnelige planpolygoner.

Mens analysen er åpen brukes den samme faste celleavgrensningen i plankartet, også på detaljzoom. Vanlig planpresentasjon gjenopprettes ved lukking; lagvalg, opasitet og øvrige filtre bevares.

## Lokalitetens identitet og full geometri

Kontrollert live REST-metadata dokumenterer OBJECTID som teknisk OID, KuverdiNaturtypeId som strengefelt og visningsfelt, og Faktaark/FaktaarkLokalitet som kildens referanser. 1 523 kommuneattribuerte Trondheim-objekter ble undersøkt: ingen duplikater i KU-ID eller originale faktaarkreferanser. Kilden omfatter Utvalgte naturtyper, NiN og HB13.

Faglig nøkkel er original-ID fra FaktaarkLokalitet, verifisert mot KU-ID og KU-faktaarket. Formatene VKU-<ID> og VKU-UN-<ID> kontrolleres eksplisitt. OBJECTID beholdes som sporbar objekt-ID; stabilitet over oppdateringer antas ikke. Nye/ukjente formater eller motstridende type/verdi stopper analysen.

Referanseuttrekket har 3737 kildeobjekter i analyse-envelope/global komplettering, også utenfor Trondheim. Bare positivt geometrisk treff mot kommunens gyldige maske gir berørt lokalitet. IDs hentes komplett; alle objekter for lokalitetene kontrolleres globalt uten geometri-filter. Geometrier hentes uten avrunding, forenkling eller romlig klipp. Eventuelle deler unioneres per faglig ID. Hele lokaliteten, inkludert deler utenfor kommunen, er arealnevner. Manglende ID, ufullstendige svar, ugyldige ringer, inkonsistent topologi eller nullareal gir utilgjengelig analyse, ikke feil prosent eller usynlig bortfall.

## KU-fordeling

Verdikategori brukes direkte; lokalitetskvalitet brukes ikke. Høyeste KU-verdi får fellesareal som godkjent analysekonvensjon. Lokalitetstall følger faktisk kategori, også når en kategori taper alt fellesareal. Toleranse for kategorisum er 0,01 m² før arealkorreksjon.

| KU-kategori | Unikt areal, daa | Lokalitetstall | Andel av total |
| --- | ---: | ---: | ---: |
| Svært stor verdi | 7.836562 | 8 | 6.5644 % |
| Stor verdi | 34.139379 | 30 | 28.5971 % |
| Middels verdi | 66.338679 | 29 | 55.5692 % |
| Noe verdi | 11.065784 | 3 | 9.2693 % |

## Naturtypefordeling

Hver rad er union innen naturtypen. Ulike typer kan overlappe, og radene skal **ikke summeres** til hovedtotalen. Alle forekommende KU-verdier vises.

| Naturtype | Unikt areal innen typen, daa | Lokalitetstall | KU-verdier |
| --- | ---: | ---: | --- |
| Viktig bekkedrag | 27.029877 | 10 | Middels verdi |
| Gråor-heggeskog | 19.923623 | 10 | Stor verdi, Middels verdi |
| Intakt lavlandsmyr i innlandet | 19.681149 | 2 | Middels verdi, Noe verdi |
| Gammel granskog med gamle trær | 19.675224 | 5 | Svært stor verdi, Stor verdi |
| Semi-naturlig eng | 13.835361 | 1 | Middels verdi |
| Ravinedal | 11.526694 | 3 | Stor verdi, Middels verdi |
| Sørlig nedbørsmyr | 9.712048 | 5 | Stor verdi, Middels verdi, Noe verdi |
| Gammel høgstaudegråorskog | 3.903614 | 12 | Svært stor verdi, Stor verdi |
| Naturbeitemark | 2.387004 | 6 | Stor verdi, Middels verdi |
| Gammel granskog med liggende død ved | 2.255706 | 2 | Stor verdi |
| Sørvendte berg og rasmarker | 1.208104 | 1 | Middels verdi |
| Høgstaudegranskog | 0.678811 | 1 | Stor verdi |
| Flomskogsmark | 0.663379 | 1 | Svært stor verdi |
| Parklandskap | 0.505923 | 2 | Middels verdi, Noe verdi |
| Gammel barskog | 0.447354 | 1 | Middels verdi |
| Rik edellauvskog | 0.213209 | 1 | Middels verdi |
| Gammel lågurtgranskog | 0.071146 | 1 | Stor verdi |
| Rik åpen sørlig jordvannsmyr | 0.068194 | 1 | Svært stor verdi |
| Rikmyr | 0.047839 | 1 | Stor verdi |
| Åpen grunnlendt kalkrik mark i sørboreal sone | 0.029894 | 1 | Stor verdi |
| Frisk lågurtedellauvskog | 0.016766 | 1 | Stor verdi |
| Hule eiker | 0.009008 | 1 | Stor verdi |
| Åpen flomfastmark | 0.005145 | 1 | Stor verdi |

## Sammenligning med 219 daa og 82 lokaliteter

Dagens originale v2-beregning ble kjørt på reelle tjenester og ga **219.203451 daa / 82 objekter**, som runder til det tidligere viste 219 daa / 82. Den historiske datatilstanden bak den opprinnelige visningen er ikke låst; dagens samsvar i avrundede tall beviser ikke identisk historisk dataversjon.

Ny metode gir **119.380403 daa / 70 lokaliteter**: omtrent -99.82 daa og -12 lokaliteter sammenlignet med dagens v2-kjøring.

For å skille effektene ble også begge representasjonene kontrollert mot **samme lagrede fulle kildegeometrier**:

| Beregning på samme kildeuttrekk | Areal, daa | Antall |
| --- | ---: | ---: |
| Gammel bred, stripebehandlet planmaske + midtpunkter | 218.756097 | 81 |
| Ny Natur/Jordbruk-maske uten stripefjerning + midtpunkter | 119.890867 | 41 |
| Ny Natur/Jordbruk-maske + geometrisk delcelleklipp | 119.380403 | 70 |

Klasse-/maskeendringen forklarer det store arealfallet. Geometrisk klipp endrer arealet videre med ca. -0.51 daa og tar med 29 små positive treff som midtpunktmetoden overser. Dagens originale v2-spørring bruker dessuten geometryPrecision=1, mens det nye uttrekket beholder full koordinatpresisjon; v2-kjøringen på full geometri gir derfor ett objekt og én celle færre enn originalspørringen. Ingen forskjell mot et ukjent historisk uttrekk tilskrives metode alene.

## Kilder, versjoner og datakvalitet

- Metode: `future-valued-nature-geometry-v3`.
- Hentet: `2026-10-13T07:30:03.172Z` (UTC).
- Grunnkart årsversjon 2025, raster hentet 05.10.2026, 1802 × 2048, ca. 19,7187 m kildeoppløsning, Git blob `5b4115ea557528963d2c17219307b075332e1590`.
- KU/DiBK er løpende tjenester, ikke en felles versjonslåst dataperiode.
- Komplett kildeuttrekk SHA-256: `f1550e2d4cb1e0b9a531b42c53c9d81ffba5fefb4d7746db72bc2d93561ef3b9`.
- Analysemaske SHA-256: `c2282443c935dc02485b7bb380d4395147012f0d562f4b1c28f365534a15a46f`.
- Andre/manglende KU-kategorier i dette uttrekket: 0. Ugyldige/manglende geometrier: 0. Disse tilstandene er likevel eksplisitt dekket av tester og feilstopp.
- Oslo (0301): `not_available`, klargjort raster mangler. Det er ikke null treff.

[Maskinlesbar oppsummering og alle 70 lokaliteter](2026-10-13-future-nature/summary.json), [komplett kildeuttrekk](2026-10-13-future-nature/source-features.json.gz), [beregninger og full-/overlapps-/maskegeometrier](2026-10-13-future-nature/result.json.gz), [lagmetadata](2026-10-13-future-nature/ku-layer-metadata.json), [tjenestemetadata](2026-10-13-future-nature/ku-service-metadata.json).

## Brukerflate og kartkobling

Kortet på Verdsatte naturtyper viser ny total og antall og åpner «Planoverlapp – naturtyper» i godkjent V2-kontekstpanel. Egen kartinngang er «Analyser planoverlapp» / mobil «Analyse». Panelet har oppsummering, verdigraf med areal/antall/andel, sorterbar naturtypetabell, søkbar/sorterbar lokalitetstabell, detaljer og metode.

Kategori viser vinnende overlappsgeometri. Naturtype viser union innen typen. Lokalitet viser egen faktiske overlappsgeometri og hele lokaliteten som svak, stiplet kontekst. Per-lokalitetsareal kan overlappe andre lokaliteter. Vanlig kategori-/typefilter endrer ikke kartutsnitt. Eksplisitt lokalitetsvalg kan zoome. «Vis hele analysen» nullstiller utvalg; «Vis hele kommunen» tilpasser utsnitt eksplisitt. Samme OpenLayers-instans og alle sju lagtilstander bevares. Den eldre generelle kryssanalysearbeidsflaten reaktiveres ikke.

## Tester og uavhengig kontroll

- 150 frontendtester / 25 filer bestått, inkludert 22 nye geometri-/kilde-/paneltester og oppdatert kortinngang.
- 30 backendtester bestått; eksisterende AnyIO-deprecation beholdes.
- ESLint: ingen feil, eksisterende Fast Refresh-advarsel i EcosystemPage. Ruff: bestått. TypeScript og Vite-build: bestått, eksisterende stor-bundle-advarsel.
- Beholdt kartanalyse-renderregresjon bestått.
- Sjulags-renderregresjon bestått, inkludert 128 kombinasjoner, opasitet, skravur, filtre, maskering, objektvalg, sene feil og cleanup.
- Reelle Chromium-kontroller: 1440×960, 900×900, 390×844 og 320×720. Ingen horisontal sideoverflow. Kartflate med panel: 828×712, 648×652, 390×270 og 320×186. Tabeller kan scrolles internt.
- Kategori/type bevarer senter, oppløsning, instans og alle lagtilstander. Lokalitetens kartgeometri kontrolleres numerisk mot lokalitetens beregnede areal. Kortinngang og manglende kommuneraster kontrollert. Ingen JavaScript-feil.
- Shapely 2.2.0 / GEOS bekrefter maskens topologi, alle 70 lokaliteters total- og overlappsareal, kategorier og naturtyper. Unik union: 119,38040306544056 daa; største lokalitetsavvik 2,644329200052198×10⁻¹² daa. [Kontrollresultat](2026-10-13-future-nature/geos-verification.json).
- Kjøringen bruker reelle kart-/kildetjenester gjennom eksisterende proxy, ikke fixtures. Eksisterende Unsplash-prototypebilde på temasiden fikk HTTP 403 i testmiljøet; alle nødvendige analyse- og kartkilder var tilgjengelige. Dette bildet er ikke analysekilde.

## Ytelse og minne

Referansekjøring: 12.91 sekunder totalt, hvorav 1.012 sekunder geometri/maskekonturer. Nettverk dominerer. Gjentatte live-kjøringer ga samme tall og innholdshash; totalen var ca. 8–13 sekunder. JS-heap observert rett etter beregning: ca. 66.0 MB, inkludert app og testinstrumentering; dette er ikke en portabel maksimal minnegaranti. Filter/søk/sortering beregner ikke geometri på nytt.

En tidlig kontroll av global komplettering med suffikssøk ble avbrutt fordi kildeoppslagene var for trege. Endelig implementasjon bruker eksakte KU-ID-oppslag, parallellitet maksimalt fire og gjenbruker allerede komplette kandidatobjekter. Denne optimaliseringen endrer ikke faglig gruppering eller arealmetode.

## Skjermbilder

| Bredde | Hele analysen | Valgt lokalitet |
| --- | --- | --- |
| 1440 | [Oppsummering](2026-10-13-future-nature/all-1440.png) | [Full lokalitet og overlapp](2026-10-13-future-nature/locality-1440.png) |
| 900 | [Oppsummering](2026-10-13-future-nature/all-900.png) | [Full lokalitet og overlapp](2026-10-13-future-nature/locality-900.png) |
| 390 | [Oppsummering](2026-10-13-future-nature/all-390.png) | [Full lokalitet og overlapp](2026-10-13-future-nature/locality-390.png) |
| 320 | [Oppsummering](2026-10-13-future-nature/all-320.png) | [Full lokalitet og overlapp](2026-10-13-future-nature/locality-320.png) |

[Temasidens kort](2026-10-13-future-nature/theme-card-1440.png), [browserkontroller](2026-10-13-future-nature/browser-checks.json), [metodesammenligning](2026-10-13-future-nature/method-comparison.json), [nettverksstatus](2026-10-13-future-nature/network.json).

## Endrede filer og publisering

Ny modulgruppe `apps/web/src/features/future-analysis/` (mask, source, geometry, model, AnalysisPanel). App, ThematicDataPage, ExploreThemesWorkspace/CSS og exploreThemeMap kobler kort, panel og kart. futureDevelopmentDisplay eksporterer eksisterende sampling/dekoding for identisk gjenbruk. En liten polygon-clipping-avhengighet, nye tester/browserkontroll, metode-ADR, levende dokumentasjon og denne kontrollmappen er lagt til. Nivå-0-metode, DiBK-filter, sju kartkilder, andre analysemetoder og råflis-cache er uendret.

Push/Actions/deploy og eksakt leveranse-HEAD dokumenteres i PR #76 etter at sluttkontrollen er bestått. Ingen merge.

## Gjenværende begrensninger

Bare Trondheim har klargjort grunnlag. Kildene er løpende, rasteret er grovt og registreringene er ikke heldekkende. Detaljplanvisning utenfor aktiv analyse kan vise finere støtte enn analysens faste raster. ID-/geometrikontrakten kontrolleres og feiler lukket ved kildeendringer. Ingen autoritative kommunale regnskapstall eller faktisk naturtap påstås.
