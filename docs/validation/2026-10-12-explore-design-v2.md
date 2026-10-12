# Utforsk i kart – implementering av designprototype V2

Designgrunnlag: kjørbar `utforsk-design.zip` fra designcommit
`edc7bbde475b2dd582e89ce6d2c0027cd668b580`, React/CSS, rapport og reviderte
før-/etterbilder. Vedlegget i chat oversteg overføringsgrensen; samme arkiv
ble hentet fra GitHub etter at kommandosandkassen fikk nettverkstilgang.
Teknisk utgangspunkt: PR #76, `fa6a0c938d83540ce5e8f9c18d5aa1787aef7333`.

## Delsteg A – layout og panelstruktur

Implementert kompakt lagliste, sentral kartflate og ett kontekstavhengig panel.
Desktop: 274 px lagliste og 338 px detaljpanel. Ved 900 px erstatter detaljene
laglisten i 252 px sideplass. Mobil: lukket ved åpning, ett 260–300 px
bunnpanel med intern scrolling, egen synlig kartflate og tre snarveier.
Header og ordinær meny/kommunevalg beholdes. Kun utforsk-ruten har nye
layoutregler. Kartets eksisterende ResizeObserver, kartinstans og navigasjon
beholdes; ingen endringer i kartmotoren.

Testport A bestått: 125 frontendtester, lint (én eksisterende Fast Refresh-
advarsel), TypeScript/build (eksisterende bundleadvarsel), Chromium-layout
ved 1440×960, 900×900, 390×844 og 320×720. Ingen horisontal overflow.
Panelendringer bevarer senter/oppløsning og samme OpenLayers-instans.
Escape og fokusretur, musehjul, musepan og zoomknapper kontrollert.
Navigasjonskontrollen fokuserer kartet, som den eksisterende OpenLayers-
kontrollen krever. Browsertrafikk videresendes til reelle kildetjenester via
miljøets policyproxy; ingen syntetiske data brukes i denne kontrollen.

[Maskinlesbare målinger](2026-10-12-explore-design-v2/A/checks.json).
[Desktop](2026-10-12-explore-design-v2/A/A-1440-settings.png),
[900 px](2026-10-12-explore-design-v2/A/A-900-settings.png),
[390 px](2026-10-12-explore-design-v2/A/A-390-settings.png),
[320 px](2026-10-12-explore-design-v2/A/A-320-settings.png).

## Delsteg B – eksisterende funksjoner i V2-panelene

Alle sju uavhengige lag, individuell opasitet og fast tegnerekkefølge beholdes.
Registeret og kartmotoren er uendret. Den godkjente rekkefølgen i laglisten er
separat fra tegnerekkefølgen. Grå arealer har tre native radiovalg og kildens
matching GetLegendGraphic. Samlet legend viser aktive lag øverst til nederst.
Kildetekst, forbehold og INON januar 2023 beholdes.

`RegisteredNaturePanel` bruker eksisterende `filterRegisteredNature` og
kommuneavgrenset REST-metode: faktisk Trondheim-kontroll ga 1529 lokaliteter
og 90 naturtyper. Dropdowns prioriteres, navnesøk kan utvides, aktivt filter
vises i lagraden og ved kartet. Lokalitetsliste og faktiske kartvalg åpner
samme `RegisteredNatureDetails`, med navn, naturtype, verdi, objekt-ID og
kilde-ID. Retur til filter bevarer valg. Skjuling av naturtypelaget fjerner
objektvalg og bevarer filter, som før. Ingen fit eller analyse utløses.

Testport B bestått: 127 frontendtester, lint og build. 30 backendtester og
Ruff bestått. Begge eksisterende Chromium-renderkontroller bestått; disse
bruker kontrollerte fixtures for regresjon og er ikke live kildevalidering.
Ny separat live-kontroll verifiserer hvert lag alene, alle sju, alle av,
opasitet, naturtypefilter og objektinformasjon, tre gråarealprodukter,
kildelegender og kommunebytte. Sammensatte skjermpiksler sammenlignes med
bakgrunn ved et punkt innenfor faktisk kommunegeometri. Villrein er gyldig
tomt i Trondheim og synlig i Dovre. Browserkontrollen bruker ordinær meny
etter kommunebytte, fordi eksisterende kommunevalg navigerer til oversikten.

[Kontroller og kildeforespørsler](2026-10-12-explore-design-v2/B/checks.json).
[Filter](2026-10-12-explore-design-v2/B/B-filter-desktop.png),
[objekt](2026-10-12-explore-design-v2/B/B-object-desktop.png),
[alle sju](2026-10-12-explore-design-v2/B/B-all-seven.png),
[Dovre villrein](2026-10-12-explore-design-v2/B/B-Dovre-villrein.png).

## Delsteg C – samspill og sluttkontroll

Bestått: faktisk kartklikk i Elvåsan sør 2 (2089403) ved 1440, 900, 390 og
320 px; samme kilde-ID som designfasiten, med hele kommunens reelle data.
Filter, objekt, retur og panelendringer bevarer utsnittet. Hjulzoom i begge
retninger beholder geografisk punkt ved to pekerposisjoner (avvik <1 px),
ingen sidescrolling over fokusert kart, musepan, zoomknapper, piltast/+, 3 px
synlig fokus, Escape/fokusretur, 900 px retur til kartlag. Chromium-touch pan
og tofingerzoom bestått. Karttrykk gir target fokus uten å overta fokus fra
kartets kontrollknapper. Ingen bildebasert navigasjonskode er innført.

Reflow ved 720×480 CSS px, tilsvarende 200 % av 1440×960, og lave 390/320×480
skjermer beholder praktisk kartflate og kontroller gjennom intern/vertikal
scrolling, uten horisontal overflow. Dette er browserkontroll, ikke en
påstand om testing på fysisk mobil eller med alle skjermlesere.

Axe: ingen automatiske WCAG 2.2 AA-relaterte brudd på desktop/mobil. Manuelle
reviewpunkter: en eksisterende testbadge hadde aria-label på generisk span;
Utforsk-ruten har nå role=note. Icon-only × og ☰ krever menneskelig
kontrastvurdering; CSS-farger er kontrollert mot 3:1 for ikke-tekstlig input.
Se [siste automatiske review](2026-10-12-explore-design-v2/C/accessibility-review.json)
og [manuell kontroll](2026-10-12-explore-design-v2/C/manual-accessibility.json).
Dette er avgrensede tilgjengelighetskontroller, ikke en full WCAG-revisjon.

[Sluttkontrollens browserdata](2026-10-12-explore-design-v2/C/checks.json).
Ingen JavaScript-feil i A/B/C. Backend 30/30, frontend 127/127 (22 filer),
lint, Ruff og build bestått. Begge eksisterende renderkontroller og
lagrender ved DPR 2 bestått. Fixturekontroller bekrefter 128 fysiske
kombinasjoner og kart-/analyseisolasjon; livekontroller bekrefter geografisk
synlige kildedata. Eksisterende Fast Refresh-, bundle- og AnyIO-advarsler
beholdes. Ingen API-, dataset-, kart-/analyse- eller cachefil er endret.

## Visuell sammenligning og avvik

| Visning | Godkjent V2 | Faktisk V3 | Synlig kart med panel |
| --- | --- | --- | --- |
| 1440×960 | [V2](2026-10-12-explore-design-v2/reference/V2-1440-filter.png) | [Filter](2026-10-12-explore-design-v2/C/C-1440-filter.png), [objekt](2026-10-12-explore-design-v2/C/C-1440-object.png) | 828×712 px |
| 900×900 | [V2](2026-10-12-explore-design-v2/reference/V2-900-filter.png) | [Filter](2026-10-12-explore-design-v2/C/C-900-filter.png), [objekt](2026-10-12-explore-design-v2/C/C-900-object.png) | 648×652 px |
| 390×844 | [V2](2026-10-12-explore-design-v2/reference/V2-390-filter.png) | [Filter](2026-10-12-explore-design-v2/C/C-390-filter.png), [objekt](2026-10-12-explore-design-v2/C/C-390-object.png), [lukket](2026-10-12-explore-design-v2/C/C-390-closed.png) | 390×270 px |
| 320×720 | [V2](2026-10-12-explore-design-v2/reference/V2-320-filter.png) | [Filter](2026-10-12-explore-design-v2/C/C-320-filter.png), [objekt](2026-10-12-explore-design-v2/C/C-320-object.png), [lukket](2026-10-12-explore-design-v2/C/C-320-closed.png) | 320×186 px |

Panelbredder, hierarki, laggrupper, innstillingsknapper, farger, filterchip,
radioframstillinger og responsive plasseringer følger V2. Kartstørrelsen er
identisk på desktop/900 px og avviker 1 px i høyden på mobil. Sammenligningen
er gjort ved visning av uredigerte app- og prototypebilder, ikke bare DOM-mål.

Bevisste avvik: ordinær V3-meny og reelt kommunevalg beholdes; mobilheader har
to kompakte rader. Bildemockens illustrative markør brukes ikke – valgt
lokalitet har eksisterende kildegeometrisk omriss. Ekte kartprojeksjon,
kommunemaske og kartografi brukes videre, slik at geografisk utsnitt/farger
og aktivt lagutvalg ikke skal pikselmatches mot arkivmocken. Filteret viser
alle kommunerelevante typer og lokaliteter, ikke bare mockens ene eksempel.
Utvalgte sluttbilder viser også Verneområder, for å dokumentere bevart filter
og objektvalg ved endring av et annet lag.

## Endrede komponenter og dokumentasjon

- `ExploreThemesWorkspace`: panel-/fokusmodell rundt samme karttarget,
  flyttede laginnstillinger, status, legender og objektkobling.
- `RegisteredNaturePanel`/`RegisteredNatureDetails`: presentasjon over uendret
  kommuneavgrenset filter-/lokalitetsdata.
- `ExploreMapIcon` og scoped `ExploreThemesWorkspace.css`: V2-kontroller/layout.
- `App`: kompakt Utforsk-tittel og rutespesifikk layoutklasse.
- `SiteHeader`: tilgjengelig rolle på testbadge kun i Utforsk.
- Frontend- og Chromium-tester, browserveiledning og npm-designkommando.
- AGENTS, utviklingsplan, designføringer, arkitekturoversikt, docs-indeks,
  ny panelbeslutning og denne etterprøvbare kontrollrapporten.

## Begrensninger og publisering

Eksisterende begrensninger beholdes: klargjort grovt nivå-0-/planraster er
Trondheim-basert; eksterne WMS-/REST-kilder kan endre seg. Gråarealproduktet er
testversjon 1 med blandede grunnlagsår og noen manglende vegetasjonsandeler.
FKB er fortsatt utelatt; kryssanalyse er fortsatt av. Kommunebytte navigerer
fortsatt til oversikten. Fysisk mobil og manuell skjermleserrevisjon gjenstår
som brukeraksept, uten at automatisk WCAG-samsvar påstås.

Publiseringsstatus og endelig SHA dokumenteres i PR #76 etter bestått CI og
verifisert Pages-deployment. Ingen merge inngår.
