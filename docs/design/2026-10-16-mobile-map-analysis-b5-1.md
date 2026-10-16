# B5.1 – Design av mobil kart- og analyseopplevelse

16.10.2026. Status: **designforslag for vurdering, ikke godkjent implementering**.
[PR #76](https://github.com/cwalso/Naturregnskap-V3/pull/76),
[Issue #77](https://github.com/cwalso/Naturregnskap-V3/issues/77).
Lokalt og remote start-HEAD: `5ef16ed7a1b1be5c1797f61faee55c40ee31afef`;
ren arbeidskopi. Main: `a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`.
Siste Pages-kjøring ved oppstart: [38745126365](https://github.com/cwalso/Naturregnskap-V3/actions/runs/38745126365),
vellykket med samme start-SHA. Ingen Pages-publisering inngår i B5.1.

**Anbefaling: A – Kart først**, med den eksplisitte Utvid-visningen for lange
resultatlister. A gir stor kartflate og synlig utvalg samtidig. Den utvidede
visningen henter Bs fordel ved detaljlesing, men er et aktivt valg, ikke et
permanent tekstpanel. C gir for liten praktisk kartflate ved 320 px.

[Last ned selvstendige prototyper](2026-10-16-mobile-map-analysis-b5-1/prototypes.zip) ·
[Kjørbar sammenligning](2026-10-16-mobile-map-analysis-b5-1/index.html),
[A](2026-10-16-mobile-map-analysis-b5-1/app.html?alternative=A),
[B](2026-10-16-mobile-map-analysis-b5-1/app.html?alternative=B),
[C](2026-10-16-mobile-map-analysis-b5-1/app.html?alternative=C),
[lokal kjøring og reproduksjon](2026-10-16-mobile-map-analysis-b5-1/README.md).
GitHub viser HTML som kildekode; start den lokale serveren i README for å prøve.

## 1. Behov og dagens begrensninger

Brukeren må forstå resultatet, finne det geografisk og vite hvordan hen kan
endre utvalg eller gå tilbake. Designet bygger på
[UX-gjennomgangen](../validation/2026-10-15-user-journey-review.md) og
[B1–B4](../validation/2026-10-15-ux-improvements-b1-b4.md), samt faktisk
`ExploreThemesWorkspace`, CSS, PlanAreaPanel, AnalysisPanel og V2-beslutningen.

Dagens dokumenterte kartcanvas er 320×122 og 390×210 px med analysepanelet
åpent. Ved 320 px gir «Vis kart» 446 px høyde, men resultatene forsvinner.
Kategorier, tilpassing og nullstilling ligger under innledning/summer i intern
scroll. Naturverdier har 70 lokaliteter, brede tabeller og metode nederst.
B1–B4 rettet konsistens/kommunevalg/kontrast/informasjonsstruktur, men ikke dette.

Skissene bruker samme sjøgrønne farger, nøytrale avsender, typografiske fallback,
kommunevalg og desktopprinsipp. Ingen offisiell avsenderprofil innføres.

## 2. Databruk og avgrensning

Dette er kjørbare interaksjonsskisser under `docs/design`, uten produksjons-
importer, API-kall, OpenLayers, analysegeometri eller nye beregninger.
Kartbakgrunnen er egen SVG og er merket **«Illustrasjon – ikke beregnet geografi»**.
Markeringer og pan/zoom viser bare samspillet i designet. De viser ikke hvor
Trondheim-arealene faktisk ligger eller hvordan reelle fliser vil tegnes.

`reference-data.js` gjengir felter fra eksisterende
[planresultat](../validation/2026-10-14-plan-area/final-result.json) og
[naturverdiresultat](../validation/2026-10-13-future-nature/result.json.gz), uten
geometrier. Kontrollen sammenligner feltene med disse uttakene: uendrede
analyseidentiteter, arealer, verdifordeling, 23 naturtyper og alle 70 lokaliteter.
Ingen summering av nye geografiske resultater.

| Referanse i skissen | Dokumentert verdi |
| --- | ---: |
| Natur / jordbruk i planområder | 2 788,80 /832,08 daa |
| Samlet natur og jordbruk | 3 620,88 daa |
| Identifisert skog / våtmark | 2 032,22 /12,64 daa |
| Ufordelt natur | 706,71 daa |
| Registrerte naturverdier | 119,38 daa /70 unike lokaliteter |
| Tanemsmyra, **BN00109936** | 19,61 daa overlapp; 38,33 daa hele lokaliteten |

Det finnes også en annen Tanemsmyra-ID i uttaket; ID vises for å skille dem.
Planavsetning er ikke faktisk eller forventet naturtap. Registrerte verdier er
supplerende data og skal ikke summeres med heldekkende planarealer. Manglende
Oslo-grunnlag er ikke null treff. Null identifisert kategori er ikke dokumentert
fravær av naturtypen. Metode og kildeforbehold er tilgjengelige i innholdsvelgeren.

## 3. Tre forskjellige arbeidsflyter

### A – Kart først

Åpner analysen med stor kartflate og fast oppsummering: analysekontekst, valgt
kategori/lokalitet, areal og en native utvalgsvelger. «Resultater» åpner en
skuff på 45 % av flaten mellom verktøylinje og oppsummering; kart og utvalg
forblir synlige. «Tilpass kart» ligger på kartet, og «Nullstill» står fast i
resultathodet. Ingen automatisk tilpassing ved valg.

«Utvid» bruker hele arbeidsflaten til detaljer/lister, med bevart oppsummering.
«Delt» går tilbake til skuffen. «Mer kart» gir stor kartflate igjen med samme
utvalg og utsnitt. Det er tre eksplisitte lesetilstander, uten dragging eller
modal. Naturverdienes faste innholdsvelger gir direkte tilgang til lokaliteter,
samlet resultat, KU-verdi, naturtyper og metode. Den bruker ikke 70 rader som
inngangsvei til informasjonen.

**Styrke:** kort vei fra kategori til praktisk kartarbeid.
**Avveining:** søk i liten skuff krever noe intern rulling; Utvid koster én
handling og skjuler kartet under lesing. Anbefalt hovedkonsept.

### B – Resultat først

Starter med resultatoversikt i hele arbeidsflaten, med utvalg fast nederst.
«Se kart» åpner stor kartvisning med samme oppsummering og utvalgsvelger.
«Resultater» returnerer til resultatene; kartposisjonen beholdes. Dette gjør
forskjellen fra dagens «Vis kart» konkret: valget og arealet følger brukeren,
og kategori kan endres direkte fra kartvisningen.

**Styrke:** best plass til tekst, lister og metode uten første utvidelse.
**Avveining:** ingen samtidig kartflate i startvisningen. Ett ekstra skifte
før karttilpassing, og flere kart/resultat-skifter ved stedfesting av flere treff.

### C – Delt arbeidsflate

Starter med kart og panel samtidig. Tre native knapper gir Mer kart, Delt
og Mer resultat. Ingen justerbart drahåndtak. Delt gir kartet 46 % av gjenværende
midtflate; Mer resultat gir 28 %. Mer kart lukker resultatområdet, men beholder
oppsummering og utvalgsvelger. Alle tilstander beholder samme utsnitt.

**Styrke:** resultat og geografi er synlige uten først å åpne skuffen.
**Avveining:** faste størrelsesknapper bruker en ekstra rad. Ved 320 px blir
kartet bare 157 px høyt i Delt, med mye av flaten bundet av kontroller. Det
fungerer teknisk, men gir liten gevinst over dagens problem. Ikke anbefalt som
standard. Denne vurderingen gjelder også at Mer resultat gjør kartet enda mindre.

Ved 900/1440 px går alle tre til samme kjente sidepanelprinsipp: kart og
resultater side om side, med separat lagliste ved stor desktop. Mobilens
størrelsesknapper vises ikke. Ingen ny desktoparbeidsflyt foreslås.

## 4. Tilstander og interaksjonskontrakt

Fire uavhengige tilstander holdes adskilt:

| Tilstand | Betyr | Skal ikke implisitt endre |
| --- | --- | --- |
| Analyse og geografisk utvalg | Aktiv analysetype + valgt kategori/KU/type/lokalitet | Kartutsnitt eller ordinære lag |
| Utsnitt | Senter/oppløsning eller illustrasjonens posisjon | Valgt resultat, søk eller lag |
| Ordinære kartlag | Sju synlighetsvalg og innstillinger | Analyseutvalg, analysetype eller utsnitt |
| Panel | Skjult, resultatskuff, utvidet eller lagpanel | Aktiv analyse, resultatidentitet eller utsnitt |

| Brukerhandling | Konkret respons i skissen / foreslått B5.2 |
| --- | --- |
| Åpne Utforsk | Ordinært kart, ingen aktiv analyse, tydelig Start Arealfordeling. Skissens to kommunevalg erstatter ikke produksjonens kommunesøk. |
| Start Arealfordeling | A kompakt kart, B resultatoversikt, C delt. Samlet natur/jordbruk, eksisterende resultatgrunnlag. |
| Velg Skog | Samme kommune/analyse; 2 032,22 daa og valgt kategori synlig; oppdater markering, behold utsnitt. |
| Tilpass kart til utvalget | Bare eksplisitt handling tilpasser utvalget. I skissen er dette kun en illustrert skalering. |
| Panorer bort | Utvalget beholdes. Utsnitt flyttet vises; Tilpass kart finner utvalget igjen. Det hevdes ikke at et valgt treff er synlig i utsnittet. |
| Åpne resultater igjen | Samme utvalg, analyse og utsnitt; lag åpnes ikke samtidig. Resultatskuffen er ikke modal. |
| Nullstill kartutvalg | Samlet resultat og tomt lokalitetssøk; utsnitt og lag beholdes. Denne tydeliggjøringen er et designforslag, ikke en rettelse i dagens produksjon. |
| Bytt analysetype | Ny types samlede resultat, gammelt kategori-/lokalitetsvalg og søk nullstilles; utsnitt og lag beholdes. |
| Søk og velg lokalitet | Søk på navn/type/ID/verdi, sorter og velg. Navn, faglig ID og overlapp vises; valgt lokalitet får eget detaljinnhold. Ingen tvungen zoom i forslaget. |
| Bytt kommune | Behold formål/analysetype og panelnivå, fjern gamle tall/utvalg/søk, vis ny kommune. Oslo har mangelstatus og deaktivert tilpassing, uten Trondheim-tall. |
| Åpne ordinære lag | Ett lagpanel erstatter skuffen; oppsummering og analysemarkering beholdes. Returner til forrige paneltilstand. Laglisten kan rulles uten å panorere kartet. |
| Lukk analysen | Fjern analysemarkering/oppsummering og gyldig kommuneutvalg; behold ordinære lag og utsnitt. Fokus til startkontrollen. |

Escape returnerer fokus til resultatsnarvei eller lagåpner. Tab/Shift+Tab følger
native kontroller uten fokusfelle. Innholdsbytte og lokalitetsvalg har definert
fokusretur; elementet som nettopp ble fjernet fra DOM beholder ikke fokus.
Piltaster panorerer når kartet har fokus; de betjener select/range ellers.

Viktig faktisk kodeavvik for senere implementering: `chooseAnalysis` sender i
dag fit=true ved lokalitetsvalg. Forslaget gjør også dette til eksplisitt
karttilpassing, uten å endre selve kartmotoren. Dette er ikke implementert nå.

## 5. Skjermbilder og mål

Alle seks etterspurte tilstander er vist for hvert alternativ ved begge
mobilmål. Bildene er faktiske Chromium-opptak av skissene. De er ikke faktiske
Trondheim-kart eller skjermbilder av publisert app.

[Sammenligning 390](2026-10-16-mobile-map-analysis-b5-1/evidence/comparison-390.png) ·
[Sammenligning 320](2026-10-16-mobile-map-analysis-b5-1/evidence/comparison-320.png).

| Tilstand | A 390 | A 320 | B 390 | B 320 | C 390 | C 320 |
| --- | --- | --- | --- | --- | --- | --- |
| Arealfordeling – alle arealer | [A 390](2026-10-16-mobile-map-analysis-b5-1/evidence/A-area-all-390.png) | [A 320](2026-10-16-mobile-map-analysis-b5-1/evidence/A-area-all-320.png) | [B 390](2026-10-16-mobile-map-analysis-b5-1/evidence/B-area-all-390.png) | [B 320](2026-10-16-mobile-map-analysis-b5-1/evidence/B-area-all-320.png) | [C 390](2026-10-16-mobile-map-analysis-b5-1/evidence/C-area-all-390.png) | [C 320](2026-10-16-mobile-map-analysis-b5-1/evidence/C-area-all-320.png) |
| Skog – 2 032,22 daa | [A 390](2026-10-16-mobile-map-analysis-b5-1/evidence/A-forest-390.png) | [A 320](2026-10-16-mobile-map-analysis-b5-1/evidence/A-forest-320.png) | [B 390](2026-10-16-mobile-map-analysis-b5-1/evidence/B-forest-390.png) | [B 320](2026-10-16-mobile-map-analysis-b5-1/evidence/B-forest-320.png) | [C 390](2026-10-16-mobile-map-analysis-b5-1/evidence/C-forest-390.png) | [C 320](2026-10-16-mobile-map-analysis-b5-1/evidence/C-forest-320.png) |
| Registrerte naturverdier – samlet | [A 390](2026-10-16-mobile-map-analysis-b5-1/evidence/A-nature-all-390.png) | [A 320](2026-10-16-mobile-map-analysis-b5-1/evidence/A-nature-all-320.png) | [B 390](2026-10-16-mobile-map-analysis-b5-1/evidence/B-nature-all-390.png) | [B 320](2026-10-16-mobile-map-analysis-b5-1/evidence/B-nature-all-320.png) | [C 390](2026-10-16-mobile-map-analysis-b5-1/evidence/C-nature-all-390.png) | [C 320](2026-10-16-mobile-map-analysis-b5-1/evidence/C-nature-all-320.png) |
| Tanemsmyra – BN00109936 | [A 390](2026-10-16-mobile-map-analysis-b5-1/evidence/A-locality-390.png) | [A 320](2026-10-16-mobile-map-analysis-b5-1/evidence/A-locality-320.png) | [B 390](2026-10-16-mobile-map-analysis-b5-1/evidence/B-locality-390.png) | [B 320](2026-10-16-mobile-map-analysis-b5-1/evidence/B-locality-320.png) | [C 390](2026-10-16-mobile-map-analysis-b5-1/evidence/C-locality-390.png) | [C 320](2026-10-16-mobile-map-analysis-b5-1/evidence/C-locality-320.png) |
| Panorert / stor kartflate | [A 390](2026-10-16-mobile-map-analysis-b5-1/evidence/A-pan-390.png) | [A 320](2026-10-16-mobile-map-analysis-b5-1/evidence/A-pan-320.png) | [B 390](2026-10-16-mobile-map-analysis-b5-1/evidence/B-pan-390.png) | [B 320](2026-10-16-mobile-map-analysis-b5-1/evidence/B-pan-320.png) | [C 390](2026-10-16-mobile-map-analysis-b5-1/evidence/C-pan-390.png) | [C 320](2026-10-16-mobile-map-analysis-b5-1/evidence/C-pan-320.png) |
| Oslo – manglende grunnlag | [A 390](2026-10-16-mobile-map-analysis-b5-1/evidence/A-missing-390.png) | [A 320](2026-10-16-mobile-map-analysis-b5-1/evidence/A-missing-320.png) | [B 390](2026-10-16-mobile-map-analysis-b5-1/evidence/B-missing-390.png) | [B 320](2026-10-16-mobile-map-analysis-b5-1/evidence/B-missing-320.png) | [C 390](2026-10-16-mobile-map-analysis-b5-1/evidence/C-missing-390.png) | [C 320](2026-10-16-mobile-map-analysis-b5-1/evidence/C-missing-320.png) |

Tillegg: [A utvidet 390](2026-10-16-mobile-map-analysis-b5-1/evidence/A-expanded-results-390.png),
[A utvidet 320](2026-10-16-mobile-map-analysis-b5-1/evidence/A-expanded-results-320.png).
Desktopkontroll for alle tre alternativer, både Skog og registrerte naturverdier:
[A 900](2026-10-16-mobile-map-analysis-b5-1/evidence/A-forest-900.png),
[B 900](2026-10-16-mobile-map-analysis-b5-1/evidence/B-forest-900.png),
[C 900](2026-10-16-mobile-map-analysis-b5-1/evidence/C-forest-900.png),
[A 1440](2026-10-16-mobile-map-analysis-b5-1/evidence/A-forest-1440.png),
[B 1440](2026-10-16-mobile-map-analysis-b5-1/evidence/B-forest-1440.png),
[C 1440](2026-10-16-mobile-map-analysis-b5-1/evidence/C-forest-1440.png).
Alle tolv desktopopptak finnes i evidenskatalogen.

Kartcontainerens mål, avrundet til hele CSS-piksler:

| Tilstand | 390×844 | 320×720 |
| --- | ---: | ---: |
| Dagens dokumenterte kartcanvas med panel | 390×210 | 320×122 |
| A kompakt / stor kartflate | 390×520 | 320×396 |
| A med resultatskuff åpen | 390×286 | 320×218 |
| A Utvid / B resultatvisning | Ingen samtidig kartflate | Ingen samtidig kartflate |
| B stor kartflate | 390×520 | 320×396 |
| C Delt | 390×214 | 320×157 |
| C Mer kart | 390×466 | 320×342 |

A har 178/122 px innvendig rullehøyde i åpen skuff; Utvid gir 464/340 px.
C har 196/129 px i Delt. Ved 900×900 gir alle kart 560×639 og resultatpanel
340 px bredde. Ved 1440×960 er kartet 826×699, laglisten 274 og resultatpanelet
340 px bredt. Paneler skjuler eller erstatter hverandre på 900 px.

Målene inkluderer kartkontroller og illustrasjonsmerking, og skissene har en
44 px designlinje som ikke skal overføres til produktet. Det er ikke en garanti
for samme pikselgevinst i OpenLayers eller fysisk nettleser med verktøylinjer.
Ingen sideoverflow i de 50 individuelle opptakene. Desktop→mobil→desktop
beholder utvalg og illustrert utsnitt uten å opprette en ny kartkomponent.

## 6. Ekspertbasert oppgavekontroll

Chromium **151.0.7922.173**, lokal HTTP, fire faste viewportmål. Ingen eksterne
kartkall. 36 oppgaveregistreringer (seks oppgaver × tre alternativer × to
mobilmål), to ekstra A-flyter, 50 individuelle opptak og to sammenligningsbilder.
[Rå målinger](2026-10-16-mobile-map-analysis-b5-1/evidence/checks.json).

Tabellen viser **handlinger / intern rulledistanse 390–320**. En select-endring,
et klikk eller innskriving av ett søk telles som én handling. Oppgavene kjøres
i rekkefølge fra Utforsk uten aktiv analyse; tabellen er ikke seks uavhengige
starter. «Se hvor» inkluderer eksplisitt Tilpass kart, men bekrefter bare
interaksjonsflyten i illustrasjonen, ikke geografisk korrekthet.

| Oppgave | A | B | C |
| --- | --- | --- | --- |
| Finn skog | 2 / 0–0 px | 2 / 0–0 px | 2 / 0–0 px |
| Se hvor skogarealet ligger | 1 / 0–0 px | 2 / 0–0 px | 1 / 0–0 px |
| Bytt til våtmark | 1 / 0–0 px | 1 / 0–0 px | 1 / 0–0 px |
| Finn registrert lokalitet | 4 / 58–134 px | 4 / 0–0 px | 3 / 41–127 px |
| Tilbake til samlet resultat | 1 / 0–0 px | 1 / 0–0 px | 1 / 0–0 px |
| Åpne kartlag, slå på Grå arealer, returner | 3 / 292–324 px | 3 / 271–308 px | 3 / 299–333 px |

As alternative oppgave 4 med Utvid bruker **5 handlinger /0 px** ved begge
mål. Det koster én ekstra handling, men gir søk/listelesing god plass. Direkte
søk bruker den kjente ID-en BN00109936; naturlig utforskning uten kjent navn/ID
kan kreve langt mer scrolling. Å slå på Grå arealer krever rulling ned i de sju
lagene i alle alternativene. Resultatsammendraget bevares under lagbetjening.

Målingen summerer faktisk vertikal rulling av resultat-/lagområdet i det
skriptede forløpet, inkludert kontrollert scrollIntoView før klikk. Den er
ikke antall fingersveip eller en brukerobservasjon. Side-scroll er null;
begrenset intern scrolling er tilsiktet. Ingen tidsmåling eller påstand om
brukernes forståelse/hastighet. Dette er **ekspertevaluering, ikke brukertest
med kommunale planleggere**.

Kontrollen bekrefter også uendret utsnitt ved kategori-/analysevalg,
nullstilling og panelskift; valgt lokalitet gjennom lagpanel; gjennomsiktighet
med tastatur; Oslo uten gamle tall; analysetype beholdt ved kommunevalg;
separate valg/lag/utsnitt ved lukking. Emulert touch panorerer kartillustrasjonen,
mens hjulrulling i panelet ikke gjør det. Dette beviser ikke samspill med
OpenLayers-touch eller en faktisk telefon.

## 7. Tilgjengelighet

50 målrettede axe-core 4.14.0-kontroller med WCAG A/AA-tags uten registrerte
regelbrudd. Ikke full WCAG-godkjenning. Verktøyet har ufullførte automatiske
fargekontroller ved SVG, klippede/rullbare flater og symbolknapper; disse
framgår i checks.json. Zoomgruppen fikk eksplisitt group-rolle etter manuell
oppfølging av et aria-label-varsel i første skisse.

Native lister, knapper, select, søk, range og details; ingen dragavhengighet,
modal eller fokusfelle. Alle tre alternativer er prøvd med Tab, Enter,
select-taster, Escape/fokusretur og kartets piltaster ved begge mobilmål.
Tydelig 3 px fokusmarkering og 44 px kontroller. Normal, hover, valgt og fokus
er kontrollert på relevante primærkontroller; Oslo-tilpassing og utvalgsvelger
er deaktivert ved manglende grunnlag.

Målte tekstkontraster: Tilpass kart **7,61:1** i normal/hover/fokus;
valgt Delt **7,61:1**, ved hover **10,26:1**; oppsummering **11,68:1**.
Symbolene +/− har eksplisitte tilgjengelige navn. Ingen påvist kontrolloverlapp
som hindret de testede handlingene. C har likevel lite praktisk kartrom.

Gjenstår før produksjonsaksept: fysisk iOS/Android, skjermleser, 200/400 % zoom,
mykt tastatur over søk, safe-area/dynamiske nettleserlinjer, landskap og reell
OpenLayers-pinch/panorering. Svært lave viewporter er ikke dekket av disse
målene. Dette er verifiseringskrav, ikke dokumenterte feil i dagens app.

## 8. Sammenligning og anbefaling

| Kriterium | A – Kart først | B – Resultat først | C – Delt |
| --- | --- | --- | --- |
| Brukervennlighet | Direkte stedfesting; krever at Resultater/Utvid forstås | Tydelig les→kart-sekvens, men ekstra skifter | Umiddelbar sammenstilling, men trang betjening |
| Kartplass | 396/520 px kompakt; 218/286 med skuff | 0 i resultat, 396/520 i kart | 157/214 px i standard Delt |
| Oversikt | Utvalg og areal følger alle paneler | Samme oppsummering følger kartet | Samtidig, men mer konkurrerende innhold |
| Navigasjon | Én fast resultatsnarvei + innholdsvelger | To hovedvisninger, gjentatte returer | Tre størrelsesvalg + innholdsvelger |
| Tilgjengelighet | Native kontroller og fokusretur; fysisk test gjenstår | God leseflate; samme native betjening | Native størrelsesknapper, ingen drag; svært liten kartflate |
| Teknisk kompleksitet | Middels: skille aktiv analyse fra panel, responsive tilstander | Middels: samme separasjon og to visninger | Middels–høy: flere resize-/innholdskombinasjoner |
| Regresjonsrisiko | Middels: levetid/overlay/fokus ved skjult panel | Middels: samme levetidsbehov | Middels–høy: flere størrelser og kart-/scrollflater |
| Fleksibilitet | Begge analyser; Utvid for lange lister | Begge analyser, god detaljlesing | Begge analyser, men lokaliteter presser 320 px |

**Velg A med den konkrete Utvid-funksjonen som allerede finnes i skissen.**
Standard er stor kartflate + oppsummering; Resultater åpner den delte skuffen;
Utvid gir full resultatlesing; Delt går tilbake, Mer kart går til kompakt kart.
Ingen automatisk størrelsesendring ved kategori-/lokalitetsvalg. C sine tre
permanente størrelsesknapper tas ikke med. Bs gode leseflate brukes kun som
brukerstyrt detaljmodus. Dette er et presist forslag til beslutning, ikke en
implisitt godkjenning av B5.2 eller en ny gjeldende ADR.

## 9. Implementeringsomfang og reell risiko i B5.2

Foreløpig estimat: **4–6 utviklingsdager inkludert målrettet testing**, ved én
utvikler kjent med løsningen. Det er et usikkert arbeidsestimat, ikke en plan
eller tidsforpliktelse. Ingen ny kilde-/analyse- eller kartmotorutvikling inngår.

| Arbeidspakke | Omfang / risiko |
| --- | --- |
| Aktiv analyse skilt fra synlig panel | Viktigste endring. I dag avhenger activeAnalysis/areaResult og enkelte lasteløp av `panel === analysis`; lagåpning kan trekke markering tilbake. Resultateier, cache og eksisterende controller må fortsatt brukes. Middels risiko for gamle/sene svar. |
| Kompakt oppsummering og responsive paneler | Ett stabilt karttarget; mobil skuff/Utvid og eksisterende desktop. Ingen remount eller ny OpenLayers-instans. ResizeObserver må bevare senter/oppløsning. |
| Felles handlinger og resultatinnhold | Pinned utvalg/tilpassing/nullstilling; native innholdsvelger. Gjenbruk eksisterende tall, sortering, metode og sju lag. Ikke overfør SVG- eller hardkodet referansedata fra skissen. |
| Fokus, scrolling og fysisk mobil | Middels risiko ved skifte mellom liste/detalj, skjult panel, mykt tastatur og berøring. Fokus, scrollposisjon og tilgjengelige meldinger må testes med reell app. |
| Korrekthets- og desktopregresjon | Identiske analysetall/ID-er og utvalgsgeometrier; samme lag/opasitet; ingen utilsiktet fit eller requestdobling. Reelle fliser, kommune-/late-svar og 900/1440 px inngår. |

Forslaget trenger derfor mer enn en CSS-endring, men ingen endring av metode,
klassifikasjon, beregningsgrid, geometri, kildeversjon, kartmotor eller rutemodell.
B5.1 har ikke gjort disse endringene. B1–B4 og publisert app står urørt.

## 10. Foreslåtte krav og akseptansekriterier for B5.2

Kriteriene gjelder først etter valg/godkjenning av designretning:

1. **Omfang:** implementer As tre mobile lesetilstander på eksisterende Utforsk-
   rute. Gjenbruk kommunevelger, aktiv analyse, data og controller. Ingen ny
   hovedside, kartmotor, analysemetode eller kilde. Desktop beholdes funksjonelt.
2. **Kompakt kart:** ved 320×720 minst 360 px og ved 390×844 minst 480 px reell
   kartcanvas med synlig utvalg, areal og resultatsnarvei. Åpen normal skuff
   gir minst 200/260 px kart. Mål i faktisk app uten designlinje; kontroller og
   overlays skal ikke dekke nødvendige handlinger. Avvik begrunnes før aksept.
3. **Utvid:** ett tastatur-/touchbetjent valg gir stor resultatleseflate, samme
   utvalg og oppsummering; ett valg returnerer. Ingen dragkrav eller fokusfelle.
4. **Uavhengige tilstander:** kategori/KU/type/lokalitet, innholdsvisning,
   utsnitt, lag og panel testes separat. Åpne/lukke resultat og lag beholder
   analysemarkering, resultatidentitet og utsnitt. Lukk analyse fjerner bare
   analysemarkering/-kontekst; ordinære lag og utsnitt beholdes.
5. **Eksplisitt fit:** kategori, analysetype, lokalitetsvalg, nullstilling,
   lagendring og panelresize flytter ikke kartet. Tilpass kart til utvalget og
   eksisterende Hele kommunen virker; kommunevalg tilpasser ny kommune. Test
   senter/oppløsning før/etter panorering og hvert valg i reell OpenLayers.
6. **Primærhandlinger:** kategoriendring, resultatsnarvei og Tilpass kart krever
   ingen intern scrolling i kompakt kart. Nullstill står fast i resultathodet.
   Søk, KU, type og metode kan nås uten å passere 70 rader. All eksisterende
   filtrering/sortering, lokalitetsdetaljer, andeler og faglige ID-er beholdes.
7. **Nullstilling:** vis samlet resultat og tøm geografisk utvalg og lokalitets-
   søk. Behold lag/opasitet og utsnitt. Hvis søk skal beholdes, må det være en
   separat navngitt handling som er avklart før implementering.
8. **Korrekthet:** Skog 2 032,22, Våtmark 12,64, ufordelt natur 706,71 og natur-
   verdi 119,38 daa/70 skal være uendret for samme referanse/ID. Faktisk kart-
   geometri må være fra samme resultat. Ikke koble skissens illustrasjoner
   eller snapshots til produksjon. Planavsetning omtales aldri som naturtap.
9. **Kommune og mangler:** Trondheim→Oslo→Trondheim beholder side/analysetype,
   fjerner gamle tall/utvalg umiddelbart og avviser sene svar. Manglende grunnlag,
   identifisert null, delvis fordeling, lasting og teknisk feil er separate
   tilstander. Eksisterende URL/reload og alle kommuner beholdes.
10. **Kartlag:** alle sju lag, opasitet, kildestatus, målestokk, framstillingsvalg
    og kildelegender virker som før. Analyseutvalg forklares som egen markering.
    Tjenestefeil kan fortsatt oppdages uten ustabile lagrader.
11. **Tilgjengelighet/mobil:** minst 44 px mål på nye primærkontroller, tekst-
    kontrast minst 4,5:1, synlig fokus, gyldig semantikk, native kontroller,
    Escape/fokusretur og piltaster. Ingen sideoverflow ved de fire målbreddene.
    Test reelt mykt tastatur, safe-area, iOS/Android og skjermleser. Panelscroll
    må ikke panorere; kartpan/pinch må ikke styre resultatskuffen.
12. **Regresjonsport:** frontendtester, lint/build, relevante backend-/felles-
    tester, reelle Chromium-opptak ved 320/390/900/1440, alle 128 lagkombinasjoner,
    riktig kategori-/lokalitetsgeometri og samme kartinstans gjennom oppgavene.
    Tilgjengelighetsfunn følges opp manuelt, ikke bare axe. Eventuell publisering
    må bestilles særskilt; denne oppgaven autoriserer ingen B5.2-publisering.

## 11. Kjørt kontroll og levering

`check-design.mjs` fullført: 50 individuelle skjermbilder/axe-audits, to
sammenligningsbilder, seks tastaturforløp, emulert touch, state-/scrollkontroller
og uendrede referansedata. Ingen registrerte JavaScript-feil eller sideoverflow.
Visuell ekspertgjennomgang av blant annet 320 px A-skuff/Utvid, B-resultat,
C-lokalitet og 900/1440 desktop, samt sammenligningsbildene.

`npm test`: **192/192**, `npm run lint`: **0 feil**, `npm run build`: vellykket.
Eksisterende Fast Refresh-varsel og stor Vite-chunk er uendret; byggets CSS/JS-
filnavn er de samme som B1–B4. `node --check` på skisse/kontrollverktøy og
`git diff --check` består. Backend og geografiske beregningsmoduler er urørt;
ingen ny backend- eller geografisk kildevalidering hevdes.

Leveransen inneholder bare rapport, isolerte HTML/CSS/JS-prototyper,
referansepresentasjon, kontrollverktøy/evidens og dokumentasjonslenke. Eksisterende
branch/PR #76 brukes. Ingen main-endring, merge, workflowendring eller Pages-
publisering. Ny commit/PR-status rapporteres i sluttsvaret. **Stopp etter B5.1;
B5.2 avventer vurdering og godkjenning av designretning.**
