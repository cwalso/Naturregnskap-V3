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

Delsteg C gjenstår. Ingen publisering på grunnlag av B alene.
