# Hovednavigasjon og tilgang til planoverlapp

Kontrollert 13.10.2026 på `feat/explore-analysis-map`, PR #76. Start-HEAD er
`d3bd150a25bdac82a92ed49b0c87c6e2e81dba60`; faktisk remote-ref og PR-HEAD
ble kontrollert før implementering. `main` er
`a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`. Ingen nyere remote-endringer
forelå ved oppstart. Implementasjonen bygger videre på hele denne HEAD-en.

## Undersøkelse av publisert analyseinngang

GitHubs Actions- og deployment-API viser siste vellykkede Pages-publisering
fra `d3bd150a…`: [kjøring 38365338176](https://github.com/cwalso/Naturregnskap-V3/actions/runs/38365338176),
deployment `7033064834`, miljø `github-pages`, status `success`.
Build og deploy samt deres steg er vellykkede. Pages bruker workflowpublisering;
`source.branch=main` i Pages-konfigurasjonen hindrer ikke denne manuelle
publiseringen fra featurebranchen. Ingen ny publisering utføres i denne oppgaven.

Den publiserte artefakten `11796451557` (`github-pages`) ble lastet ned og
pakket ut. `index.html` refererer til `assets/index-CqFFBhNL.js`.
Bundlen inneholder både «Analyser planoverlapp» og
`future-valued-nature-geometry-v3`.
Bundle-SHA-256:
`1e5445f097e5fae9504a1cc63dc0ba74daba9b8c5cd19f4df5a556bfa7b891ce`.
Ingen service worker, registrering eller Workbox finnes i denne bundlen.
Metode-/resultatcachen lagrer analysedata, ikke en eldre frontendversjon.

Artefakten ble kjørt lokalt i Chromium med kontrollerte eksterne svar.
Knappen rendres ved første åpning av Utforsk i kart. Ved 1440 × 720 px kan
knappen rulles helt ut av laglistens synlige område. Dette er en gjenskapt
skjulingsmekanisme og en konkret svakhet i plasseringen. Det bekrefter ikke
at brukerens opprinnelige skjermbilde skyldes akkurat samme scrolling.
På mobil er laglisten normalt skjult, og den gamle kartinngangen het «Analyse».

Direkte HTTP-/nettleserkontroll av `cwalso.github.io` er blokkert av miljøets
nettverkspolicy (proxy HTTP 403). Derfor er deployment og den tilhørende
artefakten verifisert, mens den faktisk serverte HTML-en/bundlen ved den
offentlige URL-en og brukerens nettlesercache ikke kan bekreftes herfra.
Det er ikke grunnlag for å hevde at cache er årsaken.

## Endring

- De fire eksisterende hovedvalgene står permanent i en horisontal rad på
  desktop over 52 rem. Aktiv side markeres; temasider markerer Naturtema.
- Mindre skjermer bruker samme navigasjon med en menyknapp. Valg lukker
  menyen; Escape lukker og returnerer tastaturfokus.
- «Analyser planoverlapp» står fast over den rullbare laglisten, med tydelig
  farge og 44 px minimumshøyde. Mobilinngangen heter «Planoverlapp» og har
  tilgjengelig navn «Analyser planoverlapp».
- Kartets høyde tar hensyn til navigasjonsraden. Kommunevalg, eksisterende
  panel/fokusflyt, samme OpenLayers-instans og alle sju lag beholdes.

Faglig metode, datakilder, geometri, DiBK-filter, arealregler, nevnere og
cache er uendret. Ingen ny hovedside eller analysefamilie innføres.
Figma-skisse forelå ikke; bruker bekreftet dette. De fire eksisterende
hovedvalgene og det oppgitte prinsippet bestemmer navigasjonen.

## Validering

| Kontroll | Resultat |
| --- | --- |
| Frontendtester | 152 tester i 26 filer bestått |
| ESLint | Bestått; én eksisterende Fast Refresh-advarsel |
| TypeScript og produksjonsbygg | Bestått, både ordinær base og Pages-base; eksisterende bundle-størrelsesadvarsel |
| Ny Chromium-kontroll av produksjonsbundle | Bestått ved 1440, 900, 832, 701, 700, 390 og 320 px; null sideoverflow og ingen JavaScript-feil |
| Analyseinngang | Åpner eksisterende analysepanel fra desktop og mobil; desktopknappen bevares ved scrolling |
| Reell Trondheim-analyse | 119,38040306544042 daa, 70 lokaliteter |
| Reell kartkobling ved 1440/900/390/320 px | Verdi-/naturtypevalg bevarer utsnittet; lokalitetsvalg, søk, reset, samme kartinstans og sju lagtilstander bestått |
| Temasideinngang | «Åpne overlappsanalyse» åpner samme kartpanel |
| Manglende analysegrunnlag | Oslo rapporteres utilgjengelig, ikke null treff |
| Uavhengige lag | Alle 128 kombinasjoner og eksisterende lagrender-regresjon bestått |

Live-kontrollen bruker reelle kildedata gjennom miljøets proxy. Eksterne
prototypebilder fra Unsplash er blokkert av samme domenepolicy; dette
påvirker ikke analyse- eller navigasjonskontrollen. Backend er uendret.
Den nye navigasjonskontrollen er lagt inn i Quality Gate. Eksisterende
live-skript bruker en felles navigasjonshjelper som støtter begge skjermmodi.

## Filer og dokumentasjon

Hovedendringene er i `SiteHeader.tsx`, `global.css`,
`ExploreThemesWorkspace.tsx` og `ExploreThemesWorkspace.css`.
`siteHeader.test.tsx` og `check-navigation-render.mjs` er nye kontroller.
`map-browser-helpers.mjs` og de fem live-skriptene er tilpasset navigasjonen;
`package.json` og `.github/workflows/quality.yml` kjører den nye kontrollen.
`AGENTS.md`, `docs/product/design-guidelines.md` og browser-README er oppdatert.
Ingen ny arkitektur- eller metodebeslutning tas; historiske ADR-er beholdes.

[Desktop med reell analyse](2026-10-13-navigation-analysis-entry/desktop-analysis.png)
· [Mobil med reell analyse](2026-10-13-navigation-analysis-entry/mobile-analysis.png)
· [Gammel knapp skjult etter scrolling, kontrollerte data](2026-10-13-navigation-analysis-entry/baseline-scrolled.png)
· [Maskinlesbar navigasjonskontroll](2026-10-13-navigation-analysis-entry/navigation-checks.json)
· [Maskinlesbar reell kartkontroll](2026-10-13-navigation-analysis-entry/analysis-checks.json).
