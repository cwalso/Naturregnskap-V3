# B5.2c – forbedret kart- og analyseinteraksjon

20.10.2026. Branch `feat/explore-analysis-map`, [PR #76](https://github.com/cwalso/Naturregnskap-V3/pull/76).
Start-HEAD lokalt/remote: `7ce5dfd0c4735b415a75206504956d89fa47eccc`, ren arbeidskopi.
Main ved oppstart: `a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`.
[Beslutning](../decisions/2026-10-20-analysis-interaction.md).
Ingen Pages-publisering eller B5.2d inngår.

## C1 – eksplisitt karttilpassing

Lokalitetsvalg bruker ikke lenger `fit=true`. Kategori, KU-verdi, naturtype og
lokalitet endrer utvalg/markering, uten å endre senter/oppløsning. Begge analysetyper
har eksplisitt fit også på desktop. På mobil ligger handlingen i eksisterende
oppsummering og krever ikke ekstra permanent kontrollrad.

Før var eksplisitt naturverdi-fit begrenset til lokaliteter og brukte hele
lokalitetsgrensen. Nå bruker den analysehandlingens allerede tegnede overlappsflate
for alle utvalg. Dette krever én avgrenset endring i kartadapterens analysehandling;
OpenLayers, generell kommunetilpassing og kilder/lag/beregninger er uendret.
Ingen geometri kopieres, omformes eller erstattes. Eksisterende analysegeometri
valideres kun som et endelig, ikke-degenerert polygonutsnitt før fit aktiveres.
Kommune, metode og ikke-tom analyse-ID kontrolleres også; manglende/tom geometri
deaktiverer handlingen med forklaring.

C1 kontrollert før C2: 199/199 full frontendkjøring og 26/26 målrettede tester
(inkludert tre nye), lint uten feil og build består. Reell Chromium fullført: 22
skjermtilstander, fire bredder, alle mobilmoduser, begge analyser. Senter/oppløsning
beholdes ved alle utvalg; eksplisitt fit samsvarer med utvalgets tegnede extent og
36 px eksisterende padding. Kartinstans/ID/konsumentkall beholdes. 22 axe-kontroller
uten rapporterte brudd. [Kontrollfil](2026-10-20-mobile-map-b5-2c/c1-checks.json).
Ved 900 px bruker testen eksisterende tilbake-til-lag/resumer-analyse-flyt, siden
laglisten og analysepanelet deler sideplassen; ingen ny desktopstruktur er innført.

## C2 – direkte tilgang til eksisterende innhold

En native innholdsvelger i resultatpanelet gir direkte tilgang til Samlet resultat,
KU-verdi, Naturtyper, Lokaliteter og søk, og Metode/datagrunnlag. Arealfordeling har
Samlet arealfordeling, Økosystemtype, Ufordelt natur og Metode/forbehold. Valg flytter
fokus til relevant overskrift, søkefelt, eksisterende ufordelt-rad eller åpnet
metodefold. Utvalg, søk/sortering, analyse-ID, kartutsnitt og konsument beholdes.
Tabeller og resultatkomponenter finnes bare én gang og gjenbrukes uten nye analyser.

Velgeren ligger i den eksisterende resultatplassen, over et internt rulleområde.
Ingen ny rad legges til over kartet eller i den faste oppsummeringen. Delt-kartets
mål er derfor uendret. De første kontrollene av en sticky velger avdekket en delvis
tildekket knapp ved innholdshopp; endelig løsning har velger og rulleinnhold som
søsken i panelet, slik at innhold ikke ruller bak primærkontrollen. Desktop beholder
sidepanelprinsippet, analysetypevalget og samme resultater.

C2 kontrollert før C3: 204/204 frontendtester og 32/32 målrettet etter justert
rulleområde, lint uten feil (kun eksisterende varsel) og build består. Reell
Chromium fullført: 30 skjermtilstander, 30 axe-kontroller uten rapporterte brudd.
Direkte hopp til søk, KU og åpnet metode bevarer utvalg, søketekst, kartgeometri,
utsnitt, ID og konsumentkall. Delt-kart er fortsatt 208,55/270,55 px.
[Kontrollfil](2026-10-20-mobile-map-b5-2c/c2-checks.json).

## C3 – lokalitetsnavn, identitet og overlapp

Valgt lokalitet viser nå faglig ID og registrert KU-verdi i den eksisterende
kompakte oppsummeringslinjen. Arealet merkes «overlapp». Detaljer-knappen ligger
i eksisterende handlingsrad, ved siden av utvalgsvelgeren og Tilpass kart.
Den åpner den samme lokalitetsseksjonen med fullt navn og ID. Fra Mer kart er
«Detaljer» et eksplisitt valg av Mer resultat; fra Delt/Mer resultat beholdes
modusen. Lokalitetens valg i seg selv endrer fortsatt verken modus eller utsnitt.
Desktop har også direkte «Valgt lokalitet» i innholdsvelgeren, uten ny panelstruktur.

Detaljene merker overlapp med framtidig planavsetning separat fra hele lokaliteten
og oppgir hva overlappsandelen har som nevner. Manglende valgfrie metadata merkes
Ikke oppgitt; like navn skilles på ID. Lange navn vises fullt i detaljene og har
fullt tilgjengelig navn på detaljknappen. Positive lokalitetsoverlapp under 0,01 daa
vises som <0,01 daa i stedet for å avrundes til null. Tallverdien endres ikke.
Oppsummeringen fjerner lokalitetsinformasjonen ved lasting, feil og kommune-/typebytte.

C3 kontrollert før C4: 206/206 frontendtester, 27/27 målrettede etter statusvern,
lint uten feil og build består. Lange/like navn med forskjellige ID-er, manglende
metadata, lite positivt areal og manglende geometri er dekket. Reell Chromium:
38 skjermtilstander/axe-kontroller uten rapporterte brudd, eksplisitt detaljåpning
med fokus og samme resultat/geometri/utsnitt. Tanemsmyra BN00109936 viser fortsatt
19,61 daa overlapp og 38,33 daa hele lokaliteten, lest fra faktiske data.
[Kontrollfil](2026-10-20-mobile-map-b5-2c/c3-checks.json).

## C4 – nullstilling og navigasjon

Nullstill utvalg ligger nå sammen med innholdsvelgeren i eksisterende resultatplass.
Handlingen finnes også i mobilens hurtigvelger, inkludert Mer kart. Den går til
samlet resultat og tømmer lokalitetssøk selv om kartutvalget allerede er samlet.
Gyldig sorteringspreferanse beholdes. Ingen komponent remountes for å nullstille.
Det gamle «Vis hele analysen», som bare fjernet kartutvalget, er erstattet med den
eksplisitte, konsistente handlingen. Ordinære lag, opasitet, aktiv analysetype,
visningsmodus og kartutsnitt beholdes. Hele lokalitetens kontekstmarkering erstattes
av samlet analysemarkering; analysen avsluttes ikke.

| Handling | Endrer | Beholder |
|---|---|---|
| Valg av kategori/KU/type/lokalitet | Analyseutvalg og markering | Utsnitt, lag, type, modus og resultat |
| Innholdsvelger | Fokus og rulleposisjon i resultatet | Utvalg, utsnitt, identitet og resultat |
| Detaljer | Åpner eksisterende lokalitetsseksjon; Mer kart → Mer resultat ved eksplisitt åpning | Utvalg, geometri, utsnitt og ID |
| Nullstill utvalg | Samlet utvalg, tømmer lokalitetssøk | Type, modus, utsnitt, lag, opasitet og resultat |
| Tilpass kart | Utsnitt til gyldig aktiv analysegeometri | Utvalg, resultat, ID, lag og opasitet |
| Vis hele kommunen | Utsnitt til kommune | Aktiv analyse, utvalg, resultat og lag |
| Skjul resultater / modus / midlertidige kartlag | Presentasjon | Analyse, utvalg, resultat, utsnitt og lag |
| Avslutt analyse | Fjerner aktiv analyse, utvalg og analysemarkering | Utsnitt, ordinære lag og opasitet |
| Kommunevalg | Kommune, tall, ugyldige utvalg, karttilpassing etter eksisterende regel | Side, analysetype, modus og ordinære lag |

Resultatkonsumentene avviser nå også svar som oppgir feil kommune eller mangler
gyldig metode/identitet før tall kan presenteres eller fit aktiveres. Eksisterende
AbortController og eiervern mot sene svar beholdes. Dette endrer ikke datakildene
eller analyseberegningene. Oppsummeringens «overlapp» står på samme linje som arealet;
C3s ekstra linjebryting er fjernet, slik at kartflaten ikke mister plass.

Nullstilling viser også oppsummeringen i panelet og flytter fokus dit ved den
synlige handlingen. I Mer kart nullstilles det skjulte panelets rulleposisjon uten
å åpne resultatene. Valgt modus beholdes.

## Samlet kontroll og faktisk kartstørrelse

C4 fullført lokalt før commit/push: **209/209 frontendtester i 36 testfiler**, lint
uten feil og TypeScript/Vite build består. Kun eksisterende Fast Refresh-varsel i
EcosystemPage og varsel om stor JS-chunk. Backend **30/30**, Ruff uten feil; ett
eksisterende Starlette/AnyIO-deprekasjonsvarsel. Kart-, 128-lagkombinasjons-,
navigasjons- og oversiktsregresjonene består. Ingen testforventning er fjernet for
å akseptere tap av resultat, utvalg, geometri, utsnitt eller kommuneisolasjon.

Den reelle Chromium-kontrollen er fullført ved 320×720, 390×844, 900×900 og
1440×960. **72 skjermtilstander og 72 axe-kontroller uten rapporterte brudd.**
Axe har uavklarte kontroller for `color-contrast` og `th-has-data-cells`; dette er
ikke full WCAG-godkjenning. Nye kontrollfarger er også kontrollert som CSS-par:
#005e5d/hvitt 7,61:1, #005e5d/#e5eeee 6,45:1, #536661/hvitt 6,10:1.
Ingen horisontal sideoverflow; vertikal sideforskjell er 0–1 px avrunding. Resultater
og brede tabeller har tilsiktet intern scrolling. Nye primærkontroller er minst
44×44 px og har avdekket klikkpunkt; eksisterende desktop-attribution er ikke
endret eller omtalt som en ny primærkontroll.

| Viewport | Delt – reell canvas | Mer kart – reell canvas | Mer resultat – reell canvas |
|---|---:|---:|---:|
| 320 × 720 | 320 × 208,55 px | 320 × 417,11 px | 320 × 100 px |
| 390 × 844 | 390 × 270,55 px | 390 × 541,11 px | 390 × 100 px |

Delt-målene gjelder også valgt lokalitet og åpne lokalitetsdetaljer. Ingen
funksjoner er skjult for å nå målene; i 100 px kart beholdes B5.2bs bevisste
skjuling av zoom/reset, med tilgjengelig eksplisitt fit utenfor kartet.
Desktop bruker eksisterende sideplass: Arealfordeling har 560×604 px kart ved
900 og 746×664 ved 1440; Registrerte naturverdier har 648×604 og 828×664.
Mobilmodusknappene finnes ikke i desktopens synlige grensesnitt.

### Kontrollerte brukerhandlinger

- Begge analyser, alle mobile moduser og desktop: kategori/KU/type/lokalitet,
  innholdshopp, scroll, midlertidige kartlag og nullstilling bevarer utsnittet.
- **40 eksplisitte fit-kontroller** stemmer med både senter og oppløsning for
  eksisterende tegnede analysegeometri, med eksisterende 36 px padding. 38 flytter
  utsnittet; to er gyldige gjentakelser av samme fit. Testen krever korrekt
  geometrisk mål, ikke at en allerede riktig tilpassing må flytte seg.
- Berøringspanorering er utført med Chromium/CDP i alle tre mobile kartstørrelser.
  Tastaturpanorering, native innholdsvalg med bokstavtast, Enter på Nullstill,
  fokus i søk/detaljer og Escape/retur fra laginnstillinger er kontrollert.
- Nullstill etter kategori → fit → pan beholder panorerte utsnitt og ordinære
  lag/opasitet. Lokalitetssøk tømmes også når samlet resultat allerede er aktivt.
- Filtrert Tanemsmyra BN00109936 → reset → Tanemsmyra NINFP2210081697 skiller
  faktisk like navn på ID; sistnevnte har 9,13 daa overlapp i dette uttaket.
- Grå arealer kan aktiveres og Grunnkart-gjennomsiktighet settes til 65 % under
  aktiv analyse. Retur beholder utvalg, geometri, resultat, søk og visningsmodus.
- Vis hele kommunen endrer utsnitt uten å endre analyseutvalg. Avslutt analyse
  tømmer begge analysemarkeringer, men bevarer utsnitt, ordinære lag og opasitet.
- Mobil → 900 → 1440 → mobil bevarer samme kartinstans, geometri, utvalg og ID.
  Kontrollverktøyet venter på faktisk OpenLayers-resize og fokus etter animation
  frame før det sammenligner. Dette avviser målinger av uferdige UI-overganger.
- Oslo fjerner alle gamle tall/lokaliteter og deaktiverer fit, med bevart analysetype
  og mobilmodus. Eksisterende og nye enhetstester dekker sene svar og feil eier/ID.
  Kontrollerte HTTP-feil og tomme WMS-svar dekkes i eksisterende regresjoner.

### Uendrede tall, identiteter og geometrier

| Trondheim-referanse | Lest fra faktisk app |
|---|---:|
| Natur i planområdene | 2 788,80 daa |
| Jordbruk i planområdene | 832,08 daa |
| Skog | 2 032,22 daa |
| Våtmark | 12,64 daa |
| Ufordelt natur | 706,71 daa |
| Registrerte naturverdier | 119,38 daa / 70 lokaliteter |

Dette er prototypekontrollreferanser, ikke endelig faglig godkjente
naturregnskapstall eller faktisk/forventet naturtap. Numeriske verdier er ikke
hardkodet i produksjon. Rendering av referansene er kontrollert mot lagret bodytekst.

Skog- og lokalitetsgeometrihash, begge analyse-ID-er, utvalg, kartopprettelsesteller
og initiale konsumentkall er identiske med B5.2a–b-baselinen. `planned-land-cover-area-v1`
og `future-valued-nature-geometry-v3` beholdes. StrictMode gir to innledende
kartopprettelser; telleren forblir **2** gjennom hele kontrollen. Panel, utvalg,
reset, fit, innholdshopp og resize starter ikke nye analysekonsumenter. Type-/
kommunevalg kan fortsatt aktivere eksisterende konsument/cache etter gjeldende regel.

[Verifikasjonsfil](2026-10-20-mobile-map-b5-2c/verification.json) bekrefter
identitet/geometri mot start-HEAD, renderte referansetall, kontrastpar og uendrede
metode-/kilde-/datafiler. Den kontrollerer også at hele kartadapterfilen er identisk
med start-HEAD bortsett fra den ene eksplisitte fit-linjen med kommentar. Ingen
OpenLayers-oppgradering, generell fit-/kartmotorendring eller ny beregningsmetode.

## Evidens, skjermbilder og reproduksjon

[Fullført kontrollfil, 72 tilstander](2026-10-20-mobile-map-b5-2c/c4-checks.json),
[frontendtester](2026-10-20-mobile-map-b5-2c/c4-tests.log),
[lint](2026-10-20-mobile-map-b5-2c/c4-lint.log),
[build](2026-10-20-mobile-map-b5-2c/c4-build.log),
[backend/Ruff](2026-10-20-mobile-map-b5-2c/backend.log),
[kart](2026-10-20-mobile-map-b5-2c/regression-map.log),
[128 lagkombinasjoner](2026-10-20-mobile-map-b5-2c/regression-layers.log),
[navigasjon](2026-10-20-mobile-map-b5-2c/regression-navigation.log),
[oversikt](2026-10-20-mobile-map-b5-2c/regression-overview.log).

| Tilstand | 320 px | 390 px | 900 px | 1440 px |
|---|---|---|---|---|
| Arealfordeling / Delt | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-area-split-320.png) | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-area-split-390.png) | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-area-desktop-900.png) | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-area-desktop-1440.png) |
| Valgt lokalitet | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-locality-split-320.png) | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-locality-split-390.png) | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-locality-desktop-900.png) | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-locality-desktop-1440.png) |
| Åpne detaljer | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-details-split-320.png) | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-details-split-390.png) | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-details-desktop-900.png) | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-details-desktop-1440.png) |
| Innholdsvelger / metode | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-nature-contents-320.png) | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-nature-contents-390.png) | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-nature-contents-900.png) | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-nature-contents-1440.png) |
| Nullstilt naturverdiutvalg | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-nature-reset-split-320.png) | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-nature-reset-split-390.png) | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-nature-reset-desktop-900.png) | [Bilde](2026-10-20-mobile-map-b5-2c/screens/c4-nature-reset-desktop-1440.png) |

Alle tre mobilmoduser: [320 Mer kart](2026-10-20-mobile-map-b5-2c/screens/c4-area-map-320.png),
[320 Delt](2026-10-20-mobile-map-b5-2c/screens/c4-area-split-320.png),
[320 Mer resultat](2026-10-20-mobile-map-b5-2c/screens/c4-nature-reset-results-320.png),
[390 Mer kart](2026-10-20-mobile-map-b5-2c/screens/c4-area-map-390.png),
[390 Delt](2026-10-20-mobile-map-b5-2c/screens/c4-area-split-390.png),
[390 Mer resultat](2026-10-20-mobile-map-b5-2c/screens/c4-nature-reset-results-390.png).
Oslo uten grunnlag: [320](2026-10-20-mobile-map-b5-2c/screens/c4-oslo-320.png),
[390](2026-10-20-mobile-map-b5-2c/screens/c4-oslo-390.png),
[1440](2026-10-20-mobile-map-b5-2c/screens/c4-oslo-1440.png).

Kjør fra `apps/web`:

```sh
SPLIT_STAGE=c4 CHROMIUM_PATH=/usr/bin/chromium UX_AXE_PATH=/sti/axe.min.js \
BROWSER_OUTPUT=/sti/resultater node tests/browser/check-mobile-split-view.mjs
```

Valgfri `SPLIT_HTTP_CACHE` gjenbruker HTTP 200-svar fra faktiske tjenester.
Denne kontrollen bruker faktiske råsvar hentet 19.–20.10, uten produksjonsendring
eller innsetting av prototypens tall/SVG/geometri. Cache ligger utenfor repoet;
kaldlasting og fersk kildeytelse er ikke målt. Testinstrumentering eksponerer kun
kartreferanse/resultatidentitet og konsumentteller i separat Vite-kontroll.
De separate kartregresjonene bruker kontrollerte WMS-svar og skal ikke omtales
som live kildevalidering. Unsplash ga miljøets 403; analysesvarene fullførte.

## Avvik fra C, kjente begrensninger og B5.2d

C-strukturen, de tre modusene og kartmålene beholdes. Innholdsvelger og nullstilling
bruker eksisterende resultatplass. Valgt lokalitet får Detaljer i eksisterende
oppsummeringsrad. Fulgt desktopprinsipp er uendret. Ingen nye temasider, ruter,
global tilstandsmodell eller analyser er lagt til.

Lange navn kan fortsatt avkortes i den native hurtigvelgeren; fulltekst og ID er
tilgjengelig via navngitt Detaljer-knapp og i den eksisterende detaljseksjonen.
Brede naturverditabeller har intern horisontal scroll. Små overlapp kan være under
visuell skjermoppløsning selv med korrekt geometri; omriss og eksplisitt fit er
prototypestøtte, ikke mer nøyaktig avgrensning. Eksisterende metode-/dekning-/
ufordelt-forbehold beholdes. Ingen automatisk lokalitets-fit gjenstår i denne flyten.

B5.2d skal bestilles separat og særlig kontrollere fysisk iOS/Android, dynamisk
nettleserhøyde og skjermtastatur, VoiceOver/NVDA og native velgere, zoom/tekstforstørring,
fulle fokusrekkefølger, langsomme/feilende tjenester og kaldlasting. Reelle planleggere
bør kontrollere forståelsen av hele lokaliteten kontra overlappsflaten. Denne
leveransen starter verken B5.2d eller Pages-publisering.

## Filer og leveransestruktur

- C1 `7969401`: workspace/fit-vern, liten geometrisjekk for presentasjon og én
  avgrenset fit-endring i `map/exploreThemeMap.ts`-adapteren, tester og ny ADR.
- C2 `b31c413`: `analysis-ui/AnalysisContents` med intern scroll/fokus og eksisterende
  `PlanAreaPanel`/`AnalysisPanel`, uten duplisering av tabeller eller nye analyser.
- C3 `7e3ccc8`: `MobileAnalysisControls`, eksisterende lokalitetsseksjon og liten
  formatter for positivt areal under 0,01 daa, tester for navn/ID/metadata.
- C4 (denne commit): felles nullstilling, resultatvern, samlet nettleserkontroll,
  dokumentasjon og evidens. Levert på eksisterende branch/PR, uten merge/main/Pages.

Levende AGENTS, README, dokumentindeks, utviklingsplan, arkitekturoversikt og
nettlesertestens README er oppdatert. Historiske B5.1/B5.2a–b-rapporter/ADR-er er
beholdt som historikk. Beregningsmodeller, kilder/integrasjoner, UTM-faktor,
klassifikasjon, kommune-/rutemodell og historiske data er uendret.
