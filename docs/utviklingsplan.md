# Utviklingsplan – Naturregnskap V3

**Sist oppdatert: 13.10.2026**

Dette er en arbeidsplan for den tekniske V3-prototypen, ikke en formell
leveranseplan for Kommunale naturregnskap.

> **Vedlikeholdsregel:** Ved hver merget PR skal det vurderes om status,
> arkitektur, metode eller produktretning har endret seg. Berørte levende
> dokumenter skal oppdateres i samme PR eller umiddelbart etterpå.

## Status nå

V3 har gått fra teknisk fundament og grunnleggende kart til en offentlig
GitHub Pages-prototype med:

- kommuneoversikt
- Naturtapet
- prioriterte temasider
- sju uavhengige kartlag på oppgavebranchen; analyseverkstedet beholdt i kode
- framtidig utbygging som analyseområde
- tegnet polygon som analyseområde i beholdt kode; inngang midlertidig skjult
- overlay mot Natur/Jordbruk og Verdsatte naturtyper
- delt request-/flispipeline for bedre ytelse

Prototypen er fortsatt et utviklings- og læringsverktøy. Den er ikke et ferdig
kommunalt naturregnskap eller en profilgodkjent Miljødirektoratet-tjeneste.

## Milepæler

| Milepæl | Status | Resultat |
| --- | --- | --- |
| Teknisk fundament | ✅ | React/TypeScript/Vite/OpenLayers og FastAPI/Python-struktur etablert |
| Kommunevalg og kommunegrense | ✅ | Kommune er felles kontekst for sider, kart og analyser |
| Dataset registry | ✅ | Kilder har eksplisitt faglig rolle og teknisk kilde |
| Kommuneoversikt / nivå 0 | ✅ prototype / ny forside | Ny Oversikt med tre arealkort, Grunnkart-kart, forklaringer, naturtapets datastatus og seks temainnganger. Eksisterende SSB-tall og kilde-/metodeforbehold beholdes; andeler, historisk endring og nasjonal rangering utledes ikke |
| Proveniens | ✅ delvis | Kilde/metode kan vises, men må videreføres til alle nye analyser |
| Naturtapet | ✅ demo / offisielle data avventes | Trondheim-demodata 2016–2025 med periodevalg, brutto nøkkeltall, tidsdiagram/tabell og fordelinger; samme modell i Oversikt. SSB-variabler/klassifikasjon avklares før integrasjon |
| Naturtema | ✅ prototype | Prioriterte temasider etablert |
| Kommuneavgrenset temakart | ✅ | Temadata maskeres visuelt utenfor valgt kommune |
| Skog og Myr/våtmark | ✅ prototype / Trondheimstall | Grunnkart-baserte temasider og kart; tallberegning krever klargjort raster og finnes nå bare for Trondheim |
| Verdsatte naturtyper | ✅ prototype / Trondheim-overlay | Kommunevise REST-beregninger og kartleggingsgrad; overlay mot analyseområde krever klargjort basisanalyse |
| Verneområder | ✅ prototype | Supplerende temaside og kart |
| Villreinområder | ✅ prototype | Supplerende temaside og kart |
| Inngrepsfri natur | ✅ prototype | Status/tidsserieinformasjon og kart |
| Bynaturen / grå arealer | 🟡 | Temaside beholdt; offisiell gråareal-WMS i Utforsk, uten analyseintegrasjon |
| Utforsk i kart – samtidige lag | ✅ branch / ny brukertest | Sju lag med avkryssing, egen gjennomsiktighet og V2-panelstruktur; godkjent planvisning beholdt, ingen kryssanalyse |
| Framtidig utbygging × Natur/Jordbruk | ✅ prototype / Trondheim | Rasterbasert overlay og lesbart resultat; ikke nasjonalt klargjort |
| Planområder × arealfordeling | ✅ kontrollert prototype / Trondheim | Primært kartpanel og samme oppsummering på Oversikt. 2 788,80 daa natur +832,08 daa jordbruk; delvis nivå-1-fordeling med 706,71 daa ufordelt. Egen identitet, delt eksisterende planmaske og uavhengig GEOS-/råbildekontroll |
| Framtidig utbygging × Verdsatte naturtyper | ✅ prototype / Trondheim | Overlay, filtrering og stedfesting; avhenger av samme klargjorte basisanalyse |
| Tegn eget polygon | 🟡 kode beholdt / inngang skjult | Tidligere Draw og analyse er bevart; reaktivering krever ny oppgave og visuell gate |
| Korrekthetsgate for eksisterende overlay | ✅ avgrenset | UUID, nevner, område-/cacheisolasjon og mobilinteraksjon kontrollert; fire verdikategorier/høyeste verdi verifisert. Felles UTM-korreksjon er innført; autoritativ kildevalidering og entydig naturtypefordeling gjenstår |
| Delt request-/flispipeline | ✅ | Deduplisering, maks fire samtidige kall per kilde og begrenset cache |
| Generisk preparation for autoritative regnskapstall | 🔵 | Ikke ferdigstilt nasjonalt |
| Historiske tidsserier | ⚪ | Krever avklart endringsprodukt og metode |
| Forslag til ny KPA / plansammenligning | ⚪ | Framtidig mulig videreutvikling |
| Rapportgenerering | ⚪ | Framtidig mulig videreutvikling |

## Gjeldende temasider

[Brukerreisekontroll for arealplanleggere, Issue #77](validation/2026-10-15-user-journey-review.md),
15.10: scenario A–F gjennomgått i Chromium mot lokalt produksjonsbygg av
publisert commit, med fem prioriterte tiltak. Tiltakene er forslag til ny
avgrenset bestilling; ingen produksjonskode, metode eller publisering endret.

[Differanseanalyse av økosystemindikatorer 15.10](validation/2026-10-15-ecosystem-overlap-differences.md)
har reprodusert begge tallpar og dekomponert avvikene. Rapporten anbefaler én
tydelig prototypeindikator med bevart usikkerhet; valg av felles grunnlag og
eventuell endring av temasideindikatorene venter fortsatt på faglig vurdering.

Gråarealenes nye firekategori-visning (Issue #78) har gjennomført
[tilgangs-/metodeundersøkelse A](validation/2026-10-14-grey-areas-trondheim.md).
Faktiske Trondheim-vektoruttrekk og lokal-/cloud-/publiseringsrett er ikke
bekreftet; B og C er derfor ikke startet. Eksisterende gråareal-WMS beholdes.

Temasidesettet er låst til:

1. Myr (våtmark)
2. Skog
3. Verdsatte naturtyper
4. Verneområder
5. Villreinområder
6. Inngrepsfri natur
7. Bynaturen (grå arealer)

Ikke legg til nye temasider uten eksplisitt beslutning.

## Samtidige kartlag og beholdt analyseverksted

De tre kartvisningene og korrigert planvisning er manuelt godkjent. Gjeldende
leveranse på samme branch lar brukeren kombinere nivå 0, framtidig utbygging,
Verdsatte naturtyper, Verneområder, INON, Villrein og Grå arealer med uavhengig avkryssing
og gjennomsiktighet.
Alle lag kan slås av; basen vises. Fast rekkefølge bevarer naturtyper og
kommunegrense øverst. Mobilvelgeren kan lukkes. Naturtypefilter og valg
påvirkes ikke av de andre lagene. Ingen automatisk tallanalyse kjøres.
Framtidig utbygging er korrigert til dagens Natur og Jordbruk innenfor
planformålene, med Bebygd/vann/ugyldige piksler skjult. Små og smale treff
beholdes i kartpresentasjonen; eksisterende analyser er uendret.
Søkbare kommunale naturtypevalg bygger på alle registrerte lokaliteter
i de fire verdikategoriene, ikke bare lokaliteter berørt av plan.

Analyseverkstedet, tegning og alle metoder beholdes for senere reaktivering.
Natur/Jordbruk- og naturtypeoverlapp er fortsatt Trondheim-klargjorte
prototypeberegninger. Tre supplerende kartlag er lagt til; ingen nye
analysegrunnlag eller beregninger er innført.

[Samtidige lag](decisions/2026-10-09-v3-concurrent-map-layers.md) og
[visuell A–L-kontroll](validation/2026-10-09-concurrent-map-layers.md) dokumenterer neste leveranse.
Lagregisteret er forberedt for åtte ID-er; sju kilder er koblet inn.
[Ny kilde-/kartkontroll](validation/2026-10-12-six-explore-layers.md) dokumenterer vern, INON og
Villrein i Trondheim og Dovre. INON er januar 2023, øvrige nye kilder er
løpende tjenester. Ingen beregninger eller nye analysegrunnlag er koblet inn.
[Visuell korreksjon 12.10](validation/2026-10-12-layer-panel-and-plan-hatch.md)
fjerner range-marginenes 4 px overbredde og innfører mørk grønn/gul
skravur i planlaget. Av/på, filter, lagrekkefølge og beregninger er uendret.

Hovedretningen er brukerakseptert. Korrigert planvisning er testet med reelle
Trondheim-data; Pages-testpublisering utføres fra PR-branchen uten merge. Se
[ny kontrollrapport](validation/2026-10-09-future-development-display.md),
[planpresentasjon](decisions/2026-10-09-v3-future-development-display.md),
[beslutning](decisions/2026-10-09-v3-independent-map-themes.md) og
[kontrollrapport](validation/2026-10-09-independent-map-themes.md).

## Naturtypefilter og kart i samme arbeidsflate

Det tidligere UX-punktet er løst med godkjent designprototype V2. Kompakt
lagliste og ett kontekstpanel holder kartet synlig ved filtrering og
objektvalg. Desktop, 900 px og mobil bruker samme paneltilstand med
Escape/fokusretur; lave skjermer bruker vertikal reflow. Den kommuneavgrensede
naturtypedatametoden, sju kartlag og OpenLayers-instansen beholdes.
[Beslutning](decisions/2026-10-12-v3-explore-design-v2.md) og
[kontrollrapport](validation/2026-10-12-explore-design-v2.md).

## Funksjonelle gap i Utforsk i kart

**Status:** Brukerruten viser nå uavhengige kartlag. Tabellen nedenfor
beskriver beholdt analysefunksjonalitet og framtidige behov; den innebærer
ikke at kryssanalyse fortsatt er tilgjengelig i den nye kartflyten.

Status nedenfor gjelder relevant brukerfunksjonalitet i analyseverkstedet,
ikke bare at et datasett eller kartlag finnes på en temaside. TODO-ene er
ønskede behov, ikke vedtatt funksjonsutvidelse eller ferdig implementasjon.

| Brukerbehov | Status | Konkret TODO / avgrensning |
| --- | --- | --- |
| Framtidig utbygging som analyseområde | Allerede dekket | Behold gjeldende DiBK-filter og prototypeforbehold; tall er bare klargjort for Trondheim |
| Ett eget tegnet polygon | Kode beholdt, inngang skjult | Ingen nye tegnefunksjoner; visuell gate før reaktivering |
| Flere egne områder og områdehåndtering | Delvis dekket | Enkeltpolygonkode er beholdt med skjult inngang. Vurder navngiving, liste, valg og fjerning; avklar separat/samlet analyse og overlapp før implementering |
| Overlay mot Natur/Jordbruk og Verdsatte naturtyper | Allerede dekket | Behold skillet mellom heldekkende basis og supplerende registreringer; kart og tall skal dele identitet/mask |
| Tydelig stedfesting og delresultatvalg | Dekket i prototype | Blå planflate, ordinær naturtype-WMS og sterke grid-treff. Verdi-/naturtypefilter styrer treff/liste; filter, objektvalg og temabytte bevarer utsnittet |
| Objektinformasjon for aktiv analyse | Dekket for Verdsatte naturtyper | Kildepolygoner, kategori-/naturtypefilter, liste ↔ kartvalg, detaljer og registrert dekning. Andre objektflyter er fortsatt TODO |
| Flere relevante overlaytema | Mangler | Verneområder og villrein finnes som temasider, men ikke som analysegrunnlag. Avklar kilde, mål, dekning og usikkerhet før kobling; inngrepsfri natur trenger særskilt metode for avstand/soner og kan ikke fremstilles som beregnet konsekvens av enkel overlapp |
| Grå arealer og mulig arealgjenbruk | Mangler | Bynaturen gir kontekst, men direkte gråareal-overlay i verkstedet mangler. Avklar data/metode; grått betyr ikke ledig areal og er ikke regnskapets Bebygd-kategori |
| Panorering, zoom, kommuneutsnitt og tegnemodus | Kart dekket, tegneinngang skjult | Zoom/pan, kommune/reset og mobile Kart/Resultat-snarveier er kontrollert. Tegnekontroller skjult; tidligere kode beholdt |
| Opplasting av egne arealer/planer | Mangler | Vurder validering av geometri, koordinatsystem, format, størrelsesgrenser, kilde og lagring; ikke implementert |
| Sammenligning av gjeldende/forslått plan eller områdealternativer | Mangler | Krever eksplisitt faglig beslutning om sammenligningsgrunnlag, endringer og overlapp; ingen automatisk erstatning av gjeldende plan |
| Plan-/datadekning og tilstand forklart i arbeidsflaten | Delvis dekket | Prototypeforbehold, feil og utilgjengelig raster finnes. Tydeliggjør manglende/ufullstendig plan og tematisk kartlegging; null treff skal ikke forveksles med ukjent dekning |
| Generell lagkatalog og tekniske debug-kontroller som brukerfunksjon | Ikke relevant for V3 | Kartkontroller skal støtte analyseoppgaven, ikke gjøre verkstedet til en generell GIS-klient |
| Antatt framtidig naturtap som autoritativ regnskapsendring | Ikke relevant for V3 | Overlay er prototypebeslutningsstøtte. Utbygging eller egen tegning bokføres ikke som faktisk endring |

**Implementert presentasjonsløft:** Plan, tema og beregnet treff vises som
forskjellige lag, med sterkest markering på treffet. Kompakt panel prioriterer
antall, unikt areal, fire verdikategorier og liste. Dekning/metode er sekundært.
Objekt- og filtervalg skjer uten kartflytting. Natur/Jordbruk bruker eksisterende
rasterklasser; Verdsatte naturtyper bruker ordinær WMS-kontekst, grid-avledet
treffgeometri og valgt kildeomriss. Kategorier, høyeste verdi, UTM-korreksjon,
grid, DiBK-filter, nevner, UUID og eksisterende cachelogikk er uendret.

Videre arbeid skal bevare flyten analyseområde → datagrunnlag → resultat →
stedfesting, bruke eksisterende V3-designmønstre og verifiseres på mobil med
berøring. Ingen nye temasider eller analysefamilier innføres uten beslutning.

## Prinsipper for videre utvikling

1. Naturregnskap, temadata, analyse og veiledning holdes adskilt.
2. Grunnkart er sentralt heldekkende grunnlag.
3. Browserbaserte rasteranalyser er prototypebeslutningsstøtte, ikke
   autoritative regnskapstall.
4. Kart og tall deler identitet og gyldig avgrensning; kildegeometri og beregningsgrid skilles.
5. Manglende data skal aldri bli falsk 0.
6. Kommuneavgrensning skal være eksplisitt.
7. Metode- og dataversjoner skal kunne spores.
8. Små vertikale PR-er foretrekkes.
9. Dokumentasjon og ADR oppdateres når beslutninger endres.
10. Produksjonsarkitektur avgjøres ikke av hva som er enklest i prototypen.

## Prioriterte neste steg

### 1. Følge opp eksisterende overlayberegninger og tydelige treff

Den avgrensede korrekthetsgaten har kontrollert rasternevner, UUID-identitet,
cacheisolasjon og sene svar ved plan → polygon A → polygon B → plan for begge
implementerte analysegrunnlag. Nevneren var allerede riktig; metoden er ikke
endret. Nye tester kontrollerer også ny kartinstans og avbrutte kall.

Gjenstående prioritering:

- validering av rasteranslag mot et faglig godkjent kontrollgrunnlag
- videre objektflyt for andre grunnlag; Verdsatte naturtyper har koblet liste/kartvalg
- videre brukerprøving av stedfesting i faktiske plansaker; ny gate før tegneinngangen eventuelt reaktiveres
- behold regresjonsdekning for områdebytte, prosentnevnere og cache

### 2. Stabilitet og ytelse

Mål faktisk effekt av:

- request-deduplisering
- cache
- maks fire samtidige kall
- gjenbruk av råfliser
- object URL-/ImageBitmap-opprydding

### 3. Grunnkart/metode

Avklar:

- autoritativ analysekilde
- nivå-0-bokføringsregler
- versjonering
- datakorrigering versus reell endring
- nasjonal preparation

### 4. Naturtapet

Trondheim-demonstrasjonen og felles forhåndsvisning er implementert på PR #76.
Koble siden til dokumentert endringsgrunnlag når dette finnes og er metodisk
avklart. Tabellstatistikk forventes 25. november 2026; økosystemtyper og
etterfølgende arealbruk er ikke bekreftet. Se [avklaringer](product/historical-loss-pages.md).

Ikke konstruer stedfestede tap fra aggregert statistikk.

### 5. Bynaturen

Vurder direkte integrasjon av Kart over grå arealer dersom dette prioriteres,
med tydelig skille mot regnskapets Bebygd/opparbeidet-kategori.

### 6. Flere overlaytema

Verneområder, villrein og inngrepsfri natur kan vurderes, men bare etter
avklaring av:

- brukerbehov
- analysekilde
- resultatmål
- dekning
- usikkerhet

### 7. Ny KPA / plansammenligning

Dette er mulig videreutvikling, ikke en forpliktelse i første versjon.

## Dokumentasjonsstatus

Levende dokumenter som skal holdes oppdatert:

- `AGENTS.md`
- `README.md`
- `docs/README.md`
- `docs/utviklingsplan.md`
- `docs/product/*.md`
- `docs/architecture/overview.md`
- relevante data-/metodedokumenter

Historiske ADR-er under `docs/decisions/` skal normalt ikke omskrives. Nye
beslutninger dokumenteres i nye ADR-er.

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
Se [kilde-/kartkontroll](validation/2026-10-12-grey-areas.md).

## Oppdatert status 13.10.2026: geometrisk planoverlapp

Temasidens kort og et eget V2-analysepanel bruker nå geometrisk skjæring mot den faste Natur/Jordbruk-planmasken. Trondheim: 119,38 daa, 70 lokaliteter i referanseuttrekket; dette er et prototypeøyeblikksbilde, ikke nasjonale regnskapstall. Høyeste KU-fordeling, union innen naturtype, faglig ID, full arealnevner og faktisk overlappsgeometri er implementert. Klikk fra kategori/type/lokalitet bevarer sju lag og samme kartinstans. Oslo har ikke klargjort raster og gir manglende grunnlag. Den tidligere rastermidtpunktanalysen er beholdt i kode/tester, men driver ikke kortet. [Kontrollrapport](validation/2026-10-13-future-nature.md).

## Oppdatert status 15.10.2026: B1–B4

B1 felles planindikatorer, B2 bevart oppgave ved kommunevalg, B3 kontrast/native
semantikk og B4 økosysteminngang/faglig plassering av Bynatur er implementert og
regresjonskontrollert. Metode og data er uendret. Beslutningen om felles kilde
er konsistens i prototypen, ikke endelig faglig godkjenning. Den eksisterende
gråareal-WMS-en er kartgrunnlag, ikke analyse av tilgjengelige utbyggingsarealer.
Se [sluttrapport](validation/2026-10-15-ux-improvements-b1-b4.md).
B5/mobil kartflate ble prioritert separat; se senere status under.

## Oppdatert status 16.10.2026: B5.1 designleveranse

Tre isolerte, kjørbare mobilkonsepter er utarbeidet og ekspertkontrollert ved
320/390 px med desktopkontroll ved 900/1440. [Rapport, anbefaling og B5.2-
akseptansekriterier](design/2026-10-16-mobile-map-analysis-b5-1.md).
Kart først med eksplisitt utvidet resultatlesing anbefales, men er ikke en
besluttet implementering. Produksjonsappen, metoder og publisering er uendret.
Dette var status ved B5.1-leveransen. Oppdragsgivers senere valg er C, se under.

## Oppdatert status 19.10.2026: B5.2a–b

C – Delt arbeidsflate er implementert etter eksplisitt valg. Første separate
commit skiller aktiv analyse fra panel, med bevarte resultater, søk, utvalg og
markering. Neste commit gir Mer kart/Delt/Mer resultat på mobil, kompakt
oppsummering, hurtigvalg og eksplisitt fit. Delt kartflate er 209 px ved
320×720 og 271 px ved 390×844. Desktop beholder sidepaneler.
Metoder, geometri og datakilder er uendret. Lokalitetens eksisterende auto-fit
beholdes som tillatt unntak, og vurderes i B5.2c. Ingen Pages-publisering eller
arbeid på c/d inngår. [Kontrollrapport](validation/2026-10-19-mobile-split-view-b5-2ab.md).
