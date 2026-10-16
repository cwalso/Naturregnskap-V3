# Ny Oversikt-side – leveranse og kontroll

Dato: 13.10.2026. Repo `cwalso/Naturregnskap-V3`, branch
`feat/explore-analysis-map`, eksisterende [PR #76](https://github.com/cwalso/Naturregnskap-V3/pull/76).
Faktisk HEAD ved oppstart var `e7c85cdf4a49e6162784407abd08afce05d42860`,
kontrollert mot remote. `main` var fortsatt
`a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`. Hele denne basen er beholdt.

## Hva som er bygget

Oversikt er bygget om i den faktiske React-applikasjonen, med eksisterende
hash-ruter og kommunevalg. Brukerens to skjermbilder bestemmer rekkefølge,
todelt topp, luft, lyseblå fortellinger og store visuelle innganger.
Den eksisterende nøytrale avsenderen og hovednavigasjonen videreføres;
skissens direktoratlogo, kommunenavn og eksempeltall overføres ikke.

| Skissens seksjon | Implementert innhold |
| --- | --- |
| A. Topp | Tittel «Naturregnskap for [navn] kommune», Natur/Jordbruk/Bebygget, eksisterende arealtall, native forklaringsaccordions og eksisterende OpenLayers-/Grunnkart-kart |
| B. Naturtapfortelling | Stor kyst-/arealbruksillustrasjon, kort generelt budskap og tydelig status for manglende historiske naturtapstall, med lenke videre |
| C. Naturtapoversikt | Lesbar naturtypeliste fra eksisterende Grunnkart-inndeling. Historisk nedbygging er merket utilgjengelig; radene forklarer og peker til dagens natur |
| D. Drivkrefter | Lyseblå seksjon med vei gjennom skog, korte fremhevede begreper og lenke til Naturtapet. Ingen påstand om hvilken sektor som dominerer i kommunen |
| E. Sammenligning | Utelatt: kodebasen har ikke eksisterende kommune-/landsrangeringer eller eksempelrangeringer som dagens Oversikt bruker |
| F. Utforsk naturen | Seks bildekort til Skog, Våtmark, Verneområder, Verdsatte naturtyper, Inngrepsfri natur og Villrein, gruppert etter faglig rolle |

Siden avsluttes med en tydelig inngang til Utforsk i kart. Sammenligningskort
og skjermbilde av en slik seksjon er ikke laget: det ville krevd nye eller
udokumenterte rangeringer, i strid med oppgavens betingelse. Eksisterende
syntetiske endringsdata er heller ikke hentet inn på forsiden, i tråd med
[beslutningen om sidestruktur](../decisions/2026-09-29-v3-page-structure-and-overview.md).

## Tall, faglig skille og manglende data

App gjenbruker `loadMunicipalityAccount` og den eksisterende SSB-adapteren.
Det innføres ingen nye statistikk-, endrings- eller rangeringstjenester.
Live-kontrollen mot SSB tabell 09594 ga følgende eksisterende Trondheimstall
for 2026, bare omregnet fra km² til dekar for presentasjon:

| Hovedkategori | Areal |
| --- | ---: |
| Natur | 347 980 dekar |
| Jordbruk | 72 120 dekar |
| Bebygget | 74 730 dekar |

Disse er SSB-prototypens grupperte arealstatistikk, ikke et nytt eller endelig
Grunnkart-basert naturregnskap. Kartet bruker eksisterende Grunnkart 2025.
Forskjellen står synlig ved kartet og i gjenbrukt kilde-/metodeinformasjon.

`sharePercent` er ikke oppgitt i dagens SSB-modell; andeler utledes ikke fra
summen av kategoriene eller kartbildet. Kortene viser «Andel av landarealet
er ikke oppgitt». En allerede oppgitt, gyldig andel støttes, inkludert 0 %.
Historisk endring og naturtapets drivkraftfordeling er ikke klargjort og
erstattes av korte, nøkterne forklaringer. Planavsetninger blir ikke naturtap.

Lasting, kildefeil, manglende enkeltfelt og manglende klargjøring har egne
tekster. Manglende areal blir ikke 0; et faktisk oppgitt nullareal beholdes.
Kommuneeier sjekkes før arealtall og tematreff vises. Ved manglende
kommunegrense skjules kartbildet og feilen forklares, slik at et generelt
utsnitt ikke fremstår som valgt kommune.

Temakortene gjenbruker eksisterende kommunetreff. Treff omtales som
**kildeobjekter**, uten å påstå at de er unike faglige lokaliteter.
Ingen registrerte treff, teknisk utilgjengelig status og kartlag uten
beregnet treffstatus er forskjellige tilstander. Økosystemkort og
supplerende naturverdier/vern har separate grupper.

## Unsplash-bilder

Alle åtte motiver har verifiserte gratis foto-/kildesider på Unsplash, med
[Unsplash-lisens](https://unsplash.com/license). Fotograf og kilde lenkes
ved hvert bilde; alle merkes som illustrasjon og med faktisk motivsted.
Bildene påstås ikke å være fra valgt kommune eller å dokumentere endring.
Direkte `images.unsplash.com/photo-…`-lenker brukes med responsive størrelser,
lazy loading og fast bildeflate. Ingen bilder fra andre kilder er lagt til.

| Bruk | Fotograf og kilde | Begrunnelse |
| --- | --- | --- |
| Naturtapfortelling | [Taneli Lahtinen – RfAYgPcfnKI](https://unsplash.com/photos/RfAYgPcfnKI) | Flyfoto av norsk kystbygd, veier, bebyggelse og natur gir arealbrukskontekst |
| Drivkrefter | [Ingrid Martinussen – Pz3thr4MRFI](https://unsplash.com/photos/Pz3thr4MRFI) | Vei gjennom skog ved Hamar viser et konkret teknisk inngrep |
| Skog | [Barnabas Davoti – TxhP8ZNgzLA](https://unsplash.com/photos/TxhP8ZNgzLA) | Norsk furuskog ved Rødberg |
| Våtmark | [Harri P – jyOh06o0NpE](https://unsplash.com/photos/jyOh06o0NpE) | Nordfinsk myr med vannspeil og furutrær, eksplisitt våtmarksmotiv |
| Verneområder | [Roar Skotte – LsNYl_G5SNk](https://unsplash.com/photos/LsNYl_G5SNk) | Fjell og vann i Jotunheimen gir relevant natur-/vernepreg |
| Verdsatte naturtyper | [Kirill Prikhodko – HFf-A1RnAy8](https://unsplash.com/photos/HFf-A1RnAy8) | Blomsterik kysteng i Lofoten illustrerer naturmangfold |
| Inngrepsfri natur | [Danny Rienecker – T8R3MiQ0rs8](https://unsplash.com/photos/T8R3MiQ0rs8) | Åpent naturlandskap i Ånderdalen, Senja; illustrerer sammenhengende landskap uten å dokumentere INON-klassifisering |
| Villrein | [Barnabas Davoti – O_WnxG6t2fU](https://unsplash.com/photos/O_WnxG6t2fU) | Reinmotiv på Norefjell, ikke et generisk fjellbilde |

Miljøets domenepolicy blokkerer `images.unsplash.com` med proxy HTTP 403.
Faktisk leveranse/avkoding av de åtte Unsplash-bildene kunne derfor ikke
verifiseres i Chromium herfra. De stabile, kildeverifiserte lenkene beholdes
som oppgaven uttrykkelig tillater. **De reelle skjermbildene viser denne
fallback-tilstanden.** Bildesuccess, skalering og feiltilstand er i tillegg
testet med kontrollerte renderfixtures; disse er ikke Unsplash-fotografi og
presenteres ikke som dokumentasjon av bildenes faktiske leveranse.

## Responsivitet og tilgjengelighet

På desktop er toppseksjonen og fortellingene todelte, og temakortene har
to kolonner. Ved 900 px reduseres avstandene. Under 700 px står oppsummering
før kart, og fortellinger og kort stables. Alle flater og tekster får lov til
å brytes naturlig; ingen sideveis scrolling ble funnet ved 1440/900/390/320 px.

Én h1 og ordnet heading-struktur, meningsfulle hash-lenker, alt-tekster,
fotografkreditering, native details/summary og tydelig fokusmarkering brukes.
Kartet har regionnavn, tastaturfokus og instruksjon. Piltastpanorering,
Enter på accordion, meny/Escape og alle hoved-/temainnganger er prøvd i
Chromium. Faglige farger er beholdt. Grensesnittets mørke sjøgrønne tekster
står på lyse flater; fokusmarkeringen er oransje.

Sidenavigasjon og kommunebytte starter øverst. Dette er kontrollert særskilt
fra en lenke langt nede på den lange Oversikt-siden. Browserkontrollens
egne målinger setter scrollposisjonen eksplisitt og venter på riktig posisjon,
slik at eksisterende glatt scrolling ikke gir en måling midt i animasjonen.

## Tester og kontroll

| Kontroll | Resultat |
| --- | --- |
| Frontend | 157 tester i 27 filer bestått |
| Backend | 30 tester bestått |
| ESLint / Ruff | Bestått; én eksisterende Fast Refresh-advarsel og eksisterende AnyIO-depresieringsadvarsel i backend |
| TypeScript / Vite | Bestått, ordinær build og Pages-base; eksisterende advarsel om bundle-størrelse |
| Ny kontroll av faktisk Oversikt-rute | 1440, 900, 390 og 320 px bestått: én h1, kartstørrelse, klaring til navigasjonen, null sideoverflow, ingen JavaScript-feil |
| Hoved-/temalenker og kommunevalg | Naturtapet, Naturtema, Utforsk i kart, alle seks temakort og Trondheim → Oslo bestått |
| Bilde-/datatilstander | Kontrollerte success-/feilresponser, manglende areal/kildedata/kommunegrense og fortsatt brukbare lenker bestått |
| Eksisterende kart-render | Tema/plan/overlapp/Natur/Jordbruk, analyseidentitet, valg og opprydding bestått |
| Eksisterende lag-render | 128 kombinasjoner, opasitet, symbolikk, tomme/sene svar og opprydding bestått |
| Eksisterende hovednavigasjon | Desktop, mobil og breakpointkontroll bestått |
| Reell planoverlapp | Fortsatt 119,38040306544042 daa / 70 lokaliteter; samme geometri, utsnitt, sju lag og kartinstans ved 1440/900/390/320 px |

Vite-kontrollene bruker egne servere; Oversikt har egen dependency-cache for
å unngå invalidert testbundle når uavhengige kontroller kjører samtidig.
Den nye kontrollen er lagt inn i eksisterende GitHub Quality Gate.

## Filer og dokumentasjon

- `apps/web/src/pages/OverviewPage.tsx` og `app/App.tsx`: ny side, data-/kartkobling og eksisterende navigasjon.
- `features/overview/{content,OverviewPhoto,OverviewSummary,OverviewThemes}` og `OverviewPage.css`: innholdsregister og rene presentasjonskomponenter med avgrenset CSS.
- `tests/overviewPage.test.tsx`, `tests/App.test.tsx` og `tests/browser/check-overview.mjs`: data-, eier-, navigasjons- og renderkontroller.
- `package.json`, `.github/workflows/quality.yml` og browser-README: kontrollkommando og eksisterende CI.
- `AGENTS.md`, `docs/product/design-guidelines.md`, `docs/architecture/overview.md`, `docs/utviklingsplan.md` og denne rapporten: dagens løsning og begrensninger.

Ingen beregningsmetode, DiBK-filter, planoverlapp, kartmotor, datakilde eller
kartlag er endret. Andre sider og `main` beholdes. Ingen ny PR eller merge.
Ingen ny arkitekturbeslutning tas; tidligere ADR-er beholdes.

## Faktiske skjermbilder og maskinlesbare kontroller

Skjermbildene under er tatt fra faktisk applikasjon med reelle tjenester,
inkludert de reelle blokkerte Unsplash-bildenes fallback. De er ikke
designbilder eller skjermbilder med syntetiske bilde-responser.

- [Hele siden, desktop 1440](2026-10-13-overview-redesign/overview-1440.png)
- [Hele siden, 900](2026-10-13-overview-redesign/overview-900.png)
- [Hele siden, mobil 390](2026-10-13-overview-redesign/overview-390.png)
- [Hele siden, mobil 320](2026-10-13-overview-redesign/overview-320.png)
- [Hero, desktop](2026-10-13-overview-redesign/hero-1440.png) / [mobil](2026-10-13-overview-redesign/hero-390.png)
- [Naturtapets hovedoversikt](2026-10-13-overview-redesign/naturtap-1440.png) / [mobil](2026-10-13-overview-redesign/naturtap-390.png)
- [Fortellende naturtapseksjon](2026-10-13-overview-redesign/fortelling-1440.png)
- [Drivkrefter](2026-10-13-overview-redesign/drivkrefter-1440.png)
- [Temakort, desktop](2026-10-13-overview-redesign/temakort-1440.png) / [mobil](2026-10-13-overview-redesign/temakort-390.png)
- [Reelle kilde-/browserutfall](2026-10-13-overview-redesign/live-checks.json)
- [Kontrollerte UI-/feiltilstander](2026-10-13-overview-redesign/controlled-checks.json)
- [Reell planoverlapp-regresjon](2026-10-13-overview-redesign/future-nature-checks.json)

## Publisering og åpne punkter

Leveransen pushes til eksisterende PR #76 og publiseres fra samme HEAD med
eksisterende `deploy-pages.yml` / `workflow_dispatch`. SHA, Actions-kjøring og
deployment-status verifiseres via GitHub og oppgis i sluttrapporten.
Direkte kontroll av den offentlige Pages-URL-en er også blokkert av miljøets
domenepolicy; dette hindrer ikke publisering eller deployment-verifikasjon.

Historiske naturtapstall, andeler med avklart landarealnevner, drivkraftfordeling
og nasjonale rangeringer krever eget datagrunnlag. Naturtapet beholder sin
eksisterende prototypestatus. Disse datamanglene er synlige; ingen nye
beregninger eller illustrerte rangeringer er brukt for å fylle dem.
