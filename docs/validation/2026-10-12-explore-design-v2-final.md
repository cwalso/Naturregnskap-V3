# Utforsk i kart V2 – sluttverifikasjon og publiseringsgrunnlag

12.10.2026. Repo `cwalso/Naturregnskap-V3`, branch `feat/explore-analysis-map`, PR #76.

## Bekreftet utgangspunkt og videreføring

Faktisk start-HEAD er `f9a2eba8addd0b61fd4cff55291083822b8bfee3`.
Main er fortsatt `a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`.
Denne HEAD-en inneholder allerede delsteg A (`45606f2`), B (`4657944`) og C
(`f9a2eba`). Arbeidet viderefører disse committene; ingen ny designutredning
eller erstatning av den eksisterende kartmotoren er gjort.

Designarkivet ble hentet direkte fra lokal Git med
`git show edc7bbde475b2dd582e89ce6d2c0027cd668b580:docs/design/utforsk-design.zip`.
ZIP-integritet er kontrollert, og de 95 filene inkluderer React-kode, CSS,
bilder, designvurdering og kort V2-endringsrapport. Den godkjente kode-/CSS-
fasiten er sammenlignet med faktisk app, inkludert nye uredigerte screenshots.

## Rettelse før sluttkontroll

Valg fra lokalitetslisten brukte tidligere den eldre laginnstillingsknappen
som fokusåpner. Ved lukking av objektpanelet kunne fokus derfor gå til et
annet kontrollpunkt enn handlingen som åpnet objektet. `openPanel` registrerer
nå også åpneren for listevalgte objekter. Når lokalitetskortet er demontert,
returnerer den eksisterende lukkeflyten fokus til kartet, uten scrolling,
zoom/fit eller fjerning av valgt lokalitet/filter.

En ny frontendtest feilet før rettelsen og består etterpå. Den reelle
Chromium-kontrollen av lokalitetsvalg er utvidet med samme fokuskrav.
Kartvalgte objekter beholder sin eksisterende fokusflyt. Dette er den eneste
nye runtime-endringen etter start-HEAD.

## Sekvensielle testporter

| Port | Ny kjøring og resultat |
| --- | --- |
| A – layout/paneler | 127 frontendtester, lint og build bestått. Reell Chromium-kontroll ved 1440×960, 900×900, 390×844 og 320×720: samme OpenLayers-instans og senter/oppløsning ved panelbytte, Escape/fokusretur, musehjul, pan og zoomknapper. [Kontroll](2026-10-12-explore-design-v2-final/A/checks.json). |
| B – eksisterende funksjoner | Etter fokusrettelsen: 128 frontendtester, lint og build bestått. Reelle kartdata: hvert av de sju lagene alene, alle sammen, alle av, individuell gjennomsiktighet, naturtype/verdi/lokalitet, native legender, alle tre gråarealframstillinger, kommunebytte og villrein i Dovre. [Kontroll](2026-10-12-explore-design-v2-final/B/checks.json). |
| C – responsivitet/samspill | Reelle naturtype-/kartvalg ved fire bredder, bevart kartutsnitt, 900 px-retur til lagvalg, musehjulankring ved ulike pekerposisjoner, pan, tastatur, touch-pan/tofingerzoom og lave skjermer/reflow. Ingen horisontal overflow eller JavaScript-feil. [Kontroll](2026-10-12-explore-design-v2-final/C/checks.json). |

Frontend: **128/128 tester i 22 filer**. Backend: **30/30 pytest-tester**.
Ruff bestått. De to eksisterende Chromium-renderkontrollene for analyse og
lagkomposisjon er bestått, inkludert 128 fysiske lagkombinasjoner, planskravur,
maskering, utvalg, sene skjulte feil og opprydding. Disse kontrollerte
fixturetestene er regresjonsbevis; live A/B/C bruker reelle tjenester.

Backendens første kjøring i ordinær sandkasse stoppet ved TestClient/AnyIO.
Den ble avbrutt og kjørt på nytt med nødvendig lokal socket-/prosesstilgang:
alle 30 tester bestod på 0,35 s. Den stoppede kjøringen telles ikke som bestått.

Eksisterende advarsler er beholdt: Fast Refresh i `EcosystemPage`, stor
frontend-bundle og AnyIO-depresiering. Tre eksisterende Unsplash-bilder på
kommuneoversikten fikk proxy-403 under kommunebyttet i B. Dette gjelder ikke
kartkildene: live kart-/geometrikontrollene bestod. Det er ingen nye kartkilder,
syntetiske live kartdata eller påstått aksept for blokkerte bilder.

## Visuell kontroll mot V2

| Skjerm | Faktisk app med naturtypefilter | Synlig kart |
| --- | --- | --- |
| Desktop 1440×960 | [Filter](2026-10-12-explore-design-v2-final/C/C-1440-filter.png), [objekt](2026-10-12-explore-design-v2-final/C/C-1440-object.png) | 828×712 px |
| Mellomstor 900×900 | [Filter](2026-10-12-explore-design-v2-final/C/C-900-filter.png), [objekt](2026-10-12-explore-design-v2-final/C/C-900-object.png) | 648×652 px |
| Mobil 390×844 | [Filter](2026-10-12-explore-design-v2-final/C/C-390-filter.png), [objekt](2026-10-12-explore-design-v2-final/C/C-390-object.png) | 390×270 px |
| Mobil 320×720 | [Filter](2026-10-12-explore-design-v2-final/C/C-320-filter.png), [objekt](2026-10-12-explore-design-v2-final/C/C-320-object.png) | 320×186 px |

58 nye, uredigerte app-screenshots fra A/B/C følger rapporten. Eksempler:
[alle sju](2026-10-12-explore-design-v2-final/B/B-all-seven.png),
[Dovre villrein](2026-10-12-explore-design-v2-final/B/B-Dovre-villrein.png).
Godkjente V2-referansebilder finnes fortsatt i
`2026-10-12-explore-design-v2/reference/`.

Paneler, hierarki, sjøgrønn/krem, filtre, gråarealradioer og plassering følger
V2. Bevisste avvik beholdes: ekte kommunevalg/meny, kompakt mobilheader i to
rader, reell kommunemaske/projeksjon og kildegeometrisk objektomriss. Filteret
viser faktiske Trondheim-data (1529 lokaliteter og 90 typer), ikke mockens ene
eksempel. Kartvinduet er 1 px lavere på mobil enn i mocken. Kartgeografi og
kildesymboler skal ikke pikselmatches mot arkivmockens illustrative bilder.

## Bevarte kontrakter og publisering

Ingen endringer i API-, dataset-, kartmotor-, raster-, analyse-, cache- eller
backendkode fra start-HEAD. Grunnkart/DiBK/planskravur, geografisk naturtype-
metode, offisielle tjenester og OpenLayers-navigasjon er beholdt. FKB og den
tidligere kryssanalysen er fortsatt av. Eksisterende V2-ADR gjelder; ingen ny
design-/arkitekturbeslutning er innført.

Leveransen pushes til eksisterende PR #76, med Quality Gate før Pages-dispatch
fra samme oppgavebranch. Endelig commit, Actions-run og deployment-status
verifiseres og oppgis i leveransemeldingen. Ingen merge, main-endring eller
ny PR inngår. Direkte Pages-adresse kan være blokkert av miljøets proxy;
Actions og deployment-API brukes til å kontrollere eksakt publisert SHA.
