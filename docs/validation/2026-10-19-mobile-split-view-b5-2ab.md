# B5.2a–b – Delt kart- og analyseflate på mobil

19.10.2026. [PR #76](https://github.com/cwalso/Naturregnskap-V3/pull/76).
Start-HEAD lokalt/remote: `0e2aaba5528f16cd5a179b4375d3791b4d479a24`;
ren arbeidskopi. Main: `a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`.

Oppdragsgivers valg er **C – Delt arbeidsflate**, og erstatter anbefalingen av A
fra [B5.1](../design/2026-10-16-mobile-map-analysis-b5-1.md).
[Ny eksplisitt beslutning](../decisions/2026-10-19-mobile-split-view.md).
Ingen Pages-publisering inngår. Arbeidet deles i to commits; B5.2a fullføres
og kontrolleres før mobilpresentasjonen i B5.2b.

## B5.2a – Aktiv analyse uavhengig av panel

`ExploreThemesWorkspace` har nå en egen aktiv analysetype, uavhengig av valgt
kontekstpanel/lagvelger. Beregningskonsumentene har aktiv type, kommune og
kommunegrense som avhengigheter, uten panelavhengighet. Eksisterende moduler,
cache, eier- og abortkontroll beholdes. Panelet kan være skjult mens allerede
startet analyse fullføres; avsluttet/gammel konsument kan ikke publisere sent.

Kartets eksisterende setPlanArea/setFutureNature mottar samme resultatobjekt
og utvalg gjennom panelskift. Resultatpanelet beholdes montert når det skjules;
søk og sortering overlever midlertidig innstillinger/legend/lagvisning. Ny type
eller kommune nullstiller ugyldige valg, og typeskifte monterer nytt innhold.
«Avslutt analyse» er atskilt fra å skjule resultatene. Avslutning fjerner
markering og utvalg, men beholder ordinære lag/opasitet og utsnitt.

Automatiserte overganger dekker begge analyser, uendret konsument under skjult
panel, beholdt utvalg/søk, typebytte og sene kommunesvar. 197/197 frontendtester,
ESLint uten feil (ett eksisterende Fast Refresh-varsel) og TypeScript/Vite build
består. Eksisterende varsel om stor JS-chunk beholdes.

Reell Chromium-kontroll fullført med faktiske tjenester og OpenLayers ved
1440×960: Skog 2 032,22 daa, ufordelt 706,71 daa og naturverdier 119,38 daa.
Skog-/lokalitetsutvalg, analyse-ID, hash av faktisk kartgeometri, senter/oppløsning,
samme instans og antall analysekall er uendret gjennom innstillinger/legend og
retur. Søk etter BN00109936 beholdes; Oslo fjerner alle gamle tall/markeringer.
Avslutt analyse tømmer begge analysemarkeringer. 30/30 backendtester og Ruff består.
En første nettkjøring fikk timeout før naturverdier; den fullførte kjøringen har
begge faktiske resultater, uten produksjonsendring for å omgå kilde-/beregningsløpet.
[Kontrollfil](2026-10-19-mobile-split-view-b5-2ab/a/checks.json),
[Skog gjennom innstillinger](2026-10-19-mobile-split-view-b5-2ab/a/a-area-settings-1440.png),
[lokalitet etter retur](2026-10-19-mobile-split-view-b5-2ab/a/a-locality-return-1440.png),
[Oslo](2026-10-19-mobile-split-view-b5-2ab/a/a-oslo-no-old-results-1440.png).
Testens Vite-plugin eksponerer kartreferanse og teller konsumentkall; koden for
kartmotor, datakilder og beregninger er uendret. B5.2b dokumenteres i neste commit.

## B5.2b – C i den faktiske arbeidsflaten

B5.2a-commit: `11ab224e5a6f67983eaa4b21081f98c496a982b6`, opprettet etter
vellykket a-kontroll før implementering av b. B5.2b leveres som neste, separate
commit på samme branch/PR. Ingen Pages-dispatch, merge eller main-endring.

`MobileAnalysisControls` viser faktiske kommuneeide resultater, uten beregning.
Mobil har native analysevelger, Kartlag, Avslutt og tre knapper med `aria-pressed`.
Oppsummeringen viser valgt kategori/lokalitet og tilhørende areal, samt antall
lokaliteter for samlet naturverdiresultat. Hovedutvalg og «Tilpass kart» virker
også i Mer kart. Feil, lasting og manglende grunnlag gir status, ikke falske nuller.
Eksisterende fulle paneler beholder søk, sortering, KU-/type-/lokalitetslister,
kilder, metode og forbehold. Rulleområdene har tastaturfokus og tilgjengelig navn.

`MobileSplitView.css` fordeler samme karttarget og resultatpanel ved ≤700 px.
Introduksjonen er komprimert til 36 px; branding/teststatus, meny og kommunevalg
beholdes. Kontrollradene er 48 px med minst 44 px høye nye kontroller. Delt er
standard når en ny analyse åpnes. I Mer resultat er kartet 100 px; zoom, reset,
filterbrikke og lagvarsel skjules der. Kartattribution og eksplisitt fit utenfor
kartet beholdes. I større kartflater finnes zoom og Vis hele kommunen.

### Tilstandsmodell og overganger

| Tilstand | Eier/levetid | Ved midlertidig panel eller visningsbytte |
|---|---|---|
| Aktiv analysetype | Lokal React-state i eksisterende workspace | Beholdes; beregningskonsumenten fortsetter |
| Resultat/identitet | Eksisterende kommuneeier, abort og kildecache | Samme resultat/ID/geometri; ingen ny beregning |
| Analyseutvalg | Eksisterende kommuneeid kategori/KU/type/lokalitet | Beholdes uavhengig av panelets synlighet |
| Søk/sortering | Eksisterende monterte analysepanel | Beholdes mens panelet er skjult |
| Ordinære lag/opasitet/utsnitt | Eksisterende workspace/controller/OpenLayers | Beholdes; ingen remount eller automatisk fit |
| Visningsmodus | Lokal `map/split/results`, standard `split` | Midlertidige lag/detaljer returnerer til forrige modus |

Analysetypebytte nullstiller typespesifikke valg og søk, men bevarer visningsmodus,
utsnitt og lag. Kommunevalg beholder type/modus/side, fjerner gamle tall/markeringer
og avviser sene svar; eksisterende kommunetilpassing gjelder. Avslutt analyse
fjerner analyse og utvalg, men bevarer lag og utsnitt. «Skjul analyseresultater»
er en separat handling som beholder aktiv analyse. Ingen lokal lagring eller
ny global tilstandsarkitektur er innført.

### Faktisk målte kartflater

Målt med `getBoundingClientRect()` på den reelle `.explore-themes__canvas`,
sammenholdt med `OpenLayers.getSize()`. Bredden er hele viewportbredden.
Resultatpanelet får samme høyde som kartet i Delt, med egen scrolling.

| Viewport | Delt | Mer kart | Mer resultat |
|---|---:|---:|---:|
| 320 × 720 | 320 × 208,55 px | 320 × 417,11 px | 320 × 100 px |
| 390 × 844 | 390 × 270,55 px | 390 × 541,11 px | 390 × 100 px |

Delt er omtrent 52 px høyere enn C-prototypens 157 px ved 320 × 720 og møter
begge designmålene. Oppsummering/hurtigvalg ligger mellom kart og resultater.
Det fulle resultatpanelet er rullbart, og hovedresultatene er synlige øverst.
Ved 900 × 900 måles kartet til 648 × 604 px med analysepanel, og ved 1440 × 960
til 828 × 664 px med lag-/analysepanel. Mobilknappene vises ikke på desktop.

### Tall, geometri og kartinteraksjon

De reelle tjenestesvarene gir fortsatt Skog **2 032,22 daa**, Våtmark **12,64 daa**,
ufordelt natur **706,71 daa**, registrerte naturverdier **119,38 daa / 70 lokaliteter**.
Dette er prototypekontrollreferanser for planavsetninger, ikke faktisk/forventet
naturtap eller autoritativ geografisk fasit. Ingen metode-/kilde-/gridendring.

Før/etter paneler, de tre modusene, scroll og mobil→900→1440→mobil sammenlignes
senter, oppløsning, analyse-ID, utvalg, hash av faktiske kartgeometrikoordinater,
konsumentkall og antall kartopprettelser. Alle beholdes. Utviklingsappens StrictMode
oppretter kartet to ganger ved innledende montering; telleren forblir **2** gjennom
alle kontrollerte overganger. Det er ingen ny instans ved resize/modus/panel.
Eksplisitt fit og tastaturpanorering er kontrollert som faktiske utsnittsendringer.

Arealresultatets ID ender `83080adce8f6b43ecc780dc8660cf8668b66e929318d057cee23982fdc47d3e5`;
naturverdiresultatets ID ender `f1550e2d4cb1e0b9a531b42c53c9d81ffba5fefb4d7746db72bc2d93561ef3b9`.
Skog-geometrihash: `601b9f3be2869db9cbb184e76b11647cbff6ef2757a7dcaf27a7525dc635a894`.
Valgt BN00109936-geometrihash: `5aa53c60f0a998656285ac92bb455a6a17b58cd9a711cd9ffe079a6ed496fcea`.
Disse ID-ene og hashene er også identiske mellom den fullførte a- og b-kontrollen.

### Kvalitetssikring

| Kontroll | Resultat |
|---|---|
| Vitest | **199/199**, 34 testfiler; 7 nye overgangstester totalt |
| ESLint | 0 feil; ett eksisterende Fast Refresh-varsel i EcosystemPage |
| TypeScript/Vite build | Bestått; eksisterende varsel om JS-chunk >500 kB |
| Backend pytest / Ruff | **30/30**, Ruff bestått; eksisterende Starlette/AnyIO-deprekasjonsvarsel |
| `test:browser` | Bestått, eksisterende kart-/overlayregresjon |
| `test:browser:layers` | Bestått: 128 kombinasjoner, tegnerekkefølge, maskering, filter, opasitet, tom WMS og sent feilsvar |
| `test:browser:navigation` | Bestått ved 1440/900/832/701/700/390/320 px, produksjonsbundle |
| `test:browser:overview` | Bestått: fire bredder, eksisterende sider/temainnganger og statusrader |
| Reell B5.2b Chromium | 21 skjermtilstander, begge analyser, alle tre moduser, fire påkrevde dimensjoner |
| Axe-core 4.14.0 | 21 kontroller, **0 rapporterte brudd** på A/AA-tagene; `color-contrast` har uavklarte kontroller på sammensatte bakgrunner |
| Tastatur/fokus | Space/Enter bytter modus med synlig fokus; Tab, kartets piltaster, Escape og synlig fokusretur til Kartlag består |
| Overflyt/kontroller | 0 px horisontal sideoverflow i alle 21 bilder; synlige nye kontroller har ≥44 px høyde og avdekket klikkpunkt |
| Identitet/kommune | Samme analyse/markering gjennom paneler; Oslo viser manglende grunnlag; enhetstester avviser sene svar fra gammel kommune |

Navigasjons-/oversiktstesten avslutter nå analyse eksplisitt mellom scenarioene;
Escape skjuler resultatet og beholder analysen etter B5.2a. Dette erstatter den
utdaterte antakelsen om at lukking av panelet avslutter analysen.

En første parallell lagkjøring traff timeout ved fixture-oppstart. Isolert
omkjøring består. B5-testen har eget Vite-cacheområde for å unngå konflikt mellom
observerende Vite-tester. En visuell desktopkontroll avdekket at generell button-CSS
overstyrte mobilresetens display:none; spesifisiteten er rettet og skjuling ved
900/1440 er eksplisitt regresjonstestet.

### Evidens og reproduksjon

[B5.2b-kontrollfil](2026-10-19-mobile-split-view-b5-2ab/b/checks.json),
[sammenligning av a/b-identitet og geometri](2026-10-19-mobile-split-view-b5-2ab/verification.json),
[testlogger](2026-10-19-mobile-split-view-b5-2ab/logs/) og
[reproduksjonskommando](../../apps/web/tests/browser/README.md#aktiv-analyse-og-delt-mobilflate--b52ab).
HTTP-cachen inneholder kun faktiske vellykkede tjenestesvar hentet 19.10; ingen
SVG, prototype-snapshot eller syntetisk analyseresultat brukes i live-kontrollen.
Cachen er scratch utenfor repoet og endrer ikke produksjonens kilde-/loadinglogikk.
Kontrollerte WMS-svar i de separate CI-regresjonene er ikke live kildevalidering.

| Skjermtilstand | 320 px | 390 px |
|---|---|---|
| Delt – Arealfordeling | [Bilde](2026-10-19-mobile-split-view-b5-2ab/b/b-split-area-320.png) | [Bilde](2026-10-19-mobile-split-view-b5-2ab/b/b-split-area-390.png) |
| Mer kart – Skog | [Bilde](2026-10-19-mobile-split-view-b5-2ab/b/b-map-forest-320.png) | [Bilde](2026-10-19-mobile-split-view-b5-2ab/b/b-map-forest-390.png) |
| Mer resultat – Naturverdier | [Bilde](2026-10-19-mobile-split-view-b5-2ab/b/b-more-results-nature-320.png) | [Bilde](2026-10-19-mobile-split-view-b5-2ab/b/b-more-results-nature-390.png) |
| Valgt lokalitet | [Bilde](2026-10-19-mobile-split-view-b5-2ab/b/b-locality-320.png) | [Bilde](2026-10-19-mobile-split-view-b5-2ab/b/b-locality-390.png) |
| Kartlag under aktiv analyse | [Bilde](2026-10-19-mobile-split-view-b5-2ab/b/b-active-layers-320.png) | [Bilde](2026-10-19-mobile-split-view-b5-2ab/b/b-active-layers-390.png) |
| Oslo uten grunnlag | [Bilde](2026-10-19-mobile-split-view-b5-2ab/b/b-oslo-320.png) | [Bilde](2026-10-19-mobile-split-view-b5-2ab/b/b-oslo-390.png) |

Desktop etter responsiv overgang: [900 px](2026-10-19-mobile-split-view-b5-2ab/b/b-desktop-900-from-390.png)
og [1440 px](2026-10-19-mobile-split-view-b5-2ab/b/b-desktop-1440-from-390.png).
Skjermbildene tas etter faktisk brukerinteraksjon; Delt-oversikten bruker eksplisitt
Tilpass kart. Kartutsnittet flyttes ikke av kategoribyttet alene.

### Avvik, begrensninger og B5.2c

C-prinsippet er gjennomført med appens eksisterende header, native analysevelger,
48 px kontrollrader og oppsummering mellom kart/resultat. Prototypens illustrerte
kart/eksempeltall er erstattet av den virkelige arbeidsflaten. Ordinære lag vises
midlertidig i resultatplassen, mens oppsummeringen og markeringen beholdes.

Lokalitetsvalg bruker fortsatt eksisterende automatisk fit, som uttrykkelig tillatt.
Dette gjelder også den lille 100 px flaten; B5.2c bør vurdere en ensartet eksplisitt
fit-policy. Mer resultat er primært en leseflate; Mer kart/Delt gir betjenbare
zoom/reset-kontroller. Lange lokalitetsnavn avkortes visuelt i oppsummeringen;
fullt navn finnes i native velger og eksisterende lokalitetsdetalj.

Full analyse er fortsatt lang med eksisterende vertikal/horizontal tabellscroll.
Bedre innholdsvelger og lokalitets-/detaljflyt hører til B5.2c. Ingen slik ny flyt
er startet her. Axe er en automatisk delkontroll, ikke full WCAG-sertifisering;
visuelle bakgrunner/kontrast og praktisk berøringsbruk bør følges opp i brukertest.
Tjenestene kan feile uavhengig av UI: livekjøringer registrerte Unsplash 403 og
Villrein REST 500/502, mens de to analysegrunnlagene fullførte. Eksisterende
mangel-/feilmeldinger er beholdt. Ingen ny data-/nettverksfallback er lagt til.

Endrede produksjonsfiler: `ExploreThemesWorkspace.tsx/.css` (a/b), nye
`MobileAnalysisControls.tsx` og `MobileSplitView.css` (b), og kun tilgjengelige
rulleområder i `AnalysisPanel.tsx` (b). Testfiler, ny ADR, levende dokumentasjon
og denne kontrollrapporten følger med. Kartmotor, API, kilde-/modell-/metodemoduler,
råfliser og øvrige datafiler er uendret fra start-HEAD.
