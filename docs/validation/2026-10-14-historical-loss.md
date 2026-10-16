# Kommuneoversikt og Naturtapet – kontroll 14.10.2026

Utgangspunkt: `380896e3b4f0470ce3665a9bea9a551ba75e280d`, branch
`feat/explore-analysis-map`, PR #76. Ingen merge eller endring av main.

## Tre selvstendige kontrollpunkter

1. Felles modell/kilde/adapter: frie perioder/kategorier, brutto nedbygging,
   tilgjengelig/manglende/ikke levert, komplette/delvise fordelinger. Modelltester
   godkjenner summer og avviser overlappende perioder/inkonsistente kategorier.
   [Struktur og antakelser](../product/historical-loss-pages.md),
   [beslutning](../decisions/2026-10-14-historical-loss-demo.md).
2. Naturtapet: periodevalg, tre nøkkeltall, tidsdiagram med tabellalternativ,
   økosystemfordeling og valgfri etterfølgende arealbruk. Modell-/sidetester og
   Chromium ved fire bredder bestod før arbeid med Oversikt.
3. Oversikt: to historiske nøkkeltall/kompakt fordeling fra samme modell,
   selvstendig planseksjon og bevarte beholdningskort, Grunnkart og seks temakort.
   Eksisterende navigasjon/kommunevalg beholdes. Sjøgrønn header/navigasjonsflate
   gjelder disse to sidene, uten å endre navigasjonsstruktur eller andre hovedsider.

## Faglig kontroll

Trondheim-demo 2016–2025: 1 280 daa natur + 320 daa jordbruk = 1 600 daa.
Årene summerer til perioden, økosystemene til natur og etterfølgende arealbruk
til natur + jordbruk. Alle visualiseringer har demomerking. Ingen andel av
dagens beholdning, nettoendring, historiske polygoner eller prognoser beregnes.
Andre kommuner får mangelstatus. Natur/jordbruk, supplerende naturverdier og
planoverlapp omtales separat; planavsetning presenteres ikke som naturtap.

Reell Trondheim-plananalyse kjørt 14.10 med uendret metode/kilder/grid:
**119,38040306544042 daa / 70 lokaliteter**, samme som etablert resultat.
[Resultat og kilde-/maskehash](2026-10-14-historical-loss/plan-analysis-check.json).
Verdifilter, typefilter, lokalitetsvalg, lagbevaring og én kartinstans bestod ved
1440, 900, 390 og 320 px i eksisterende live-analysetest.

## Tester

- Frontend: 167 tester / 29 filer.
- Backend: 30 tester; Ruff bestått.
- ESLint og TypeScript/Vite build bestått. Eksisterende Fast Refresh-advarsel
  i EcosystemPage, bundle-størrelsesadvarsel og AnyIO-deprecation er uendret.
- Eksisterende kart-renderregresjon og lagregresjon, inkludert 128 kombinasjoner,
  tomme svar, sene feil, masking, viewport og opprydding, bestått.
- Navigasjon/plananalyseinngang: 1440, 900, 832, 701, 700, 390, 320 px bestått.
- Begge nye sider: 1440, 900, 390, 320 px uten horisontal scrolling, ett h1,
  brukbart periodevalg, sammenhengende summer, tastatur og tabellalternativ.
- Alle seks temakort, Oslo/Trondheim-eierskap, kartinngang og retur til Oversikt
  beholder kommunen. Manglende beholdning/grense/bilder er kontrollert.
- Lagrader beholder høyde og avkryssing/innstillinger gjennom loading/empty/error/ready.

[Live-kontroller](2026-10-14-historical-loss/browser-checks.json) og
[kontrollerte bilde-/feilsvar](2026-10-14-historical-loss/controlled-checks.json).

## Faktiske Chromium-skjermbilder

Skjermbildene viser den reelle App-ruten med live SSB-/kartdata og nye demotall.
Unsplash blokkeres med HTTP 403 av Codex-miljøets nettverkspolicy; derfor vises
den eksisterende, kontrollerte fallbacken. URL-er/foto/kreditering er beholdt.
Vellykket responsive bildedekoding er separat testet med kontrollerte bildesvar;
leveransen påstår ikke at live Unsplash-bilder er verifisert i dette miljøet.

| Bredde | Kommuneoversikt | Naturtapet |
| --- | --- | --- |
| 1440 | [Skjermbilde](2026-10-14-historical-loss/overview-1440.png) | [Skjermbilde](2026-10-14-historical-loss/naturtapet-1440.png) |
| 900 | [Skjermbilde](2026-10-14-historical-loss/overview-900.png) | [Skjermbilde](2026-10-14-historical-loss/naturtapet-900.png) |
| 390 | [Skjermbilde](2026-10-14-historical-loss/overview-390.png) | [Skjermbilde](2026-10-14-historical-loss/naturtapet-390.png) |
| 320 | [Skjermbilde](2026-10-14-historical-loss/overview-320.png) | [Skjermbilde](2026-10-14-historical-loss/naturtapet-320.png) |

## Åpent før SSB-integrasjon

Tabelltilgang, periode/grenser, mål/definisjon, klassifikasjon/harmonisering,
variabler, enheter, dekning, null/suppresjon, versjoner og lisens må avklares.
Økosystemer og etterfølgende arealbruk er ikke bekreftet i forventet leveranse
25. november 2026. Polygoner forventes først i 2027. Adapteren har ingen antatt
API-kontrakt; den krever en bekreftet mapping og dokumentert offisiell kilde.

Publisering verifiseres etter push gjennom eksisterende workflow_dispatch,
Actions-kjøringens SHA og github-pages deployment-status, uten merge.
