# Utforsk i kart – endringsrapport, versjon 2

12. oktober 2026. Oppfølging av den separate designleveransen; hovedkonseptet er beholdt.

## Endringer

- **Musehjul:** Zoomer inn/ut mot pekerens posisjon. Pikselen under pekeren beholder sin skjermposisjon. Eksisterende grense 0,8–3 beholdes. En ikke-passiv wheel-lytter hindrer sidescrolling over kartet, også ved zoomgrensene. Pan med venstre museknapp, zoomknapper og tastatur virker fortsatt. Dette er bildeinteraksjon, ikke en ny geografisk motor.
- **Mobil:** Kartbildet krympet både med kartflaten og med en ekstra viewport-basert CSS-bredde. Den ekstra regelen er fjernet. Bildet beholder nå skjermbredden ved panelåpning. Bunnpanelet er redusert til 260–300 px, og kartet får mer synlig plass. Bildets sentrum, zoom og pan beholdes; et lavere kartvindu beskjærer bildet vertikalt fremfor å zoome ut til en miniatyr. Panelinnhold kan fortsatt scrolles internt.
- **900 px:** Detaljer bruker fortsatt laglistens sideplass, slik at kartet beholder 648 px bredde. Navigasjonen er beholdt etter kontroll, med en tydelig «Tilbake til kartlag»-knapp over kartet. Panelenes returknapp, Escape og fokusretur virker. Mobilens lukkeknapp returnerer også fokus til lagvalgknappen.

## Målt størrelse med åpne naturtypefiltre

| Visning | Synlig kartflate, før → etter | Bildets grunnbredde, før → etter |
| --- | --- | --- |
| 390 × 844 px | 390 × 231 → 390 × 271 px | 268 → 390 px |
| 320 × 720 px | 320 × 145 → 320 × 187 px | 179 → 320 px |
| 900 × 900 px | 648 × 652 px, uendret | 648 px, uendret |
| 1440 × 960 px | 828 × 712 px, uendret | 828 px, uendret |

## Kontroll

**21 nye browserkontroller bestått, 0 JavaScript-feil.** Faktisk Chromium-kjøring kontrollerte musehjul ved sentrum og to ulike pekerposisjoner, zoom inn/ut og grenser, pan etter zoom, knapper og tastatur, ingen sidescrolling over kartet, fortsatt panelscrolling, filterets åpning/lukking og bevarte valg, lagvalg/retur ved 900 px, objektinformasjon, Escape/fokusretur og ingen horisontal overflow ved 1440, 900, 390 og 320 px. Mobilens bildesenter og skala ble sammenlignet før/etter panelåpning, ikke bare kontrollert visuelt.

Nye uredigerte før-/etterbilder for alle fire bredder ligger i `revisjon/bilder/`. Navnene `foer-<bredde>-filter.png` og `etter-<bredde>-filter.png` gir direkte sammenligning. Startvisninger, objektvisninger, mobil lagvelger, 900 px-retur og musehjul/pan er også dokumentert. Målinger og assertions ligger i `revisjon/kontroller.json`; kjørbart skript er `revision-check.mjs`. Lint og TypeScript/build er bestått uten feil eller advarsler.

## Avgrensning og filer

Endret: `src/App.tsx`, `src/style.css`, bygget `index.html` og leveransens README/versjon. Lagt til: kort endringsrapport, nytt kontrollskript, målinger og før-/etterbilder. Den opprinnelige designvurderingen er historikk; ingen ny designutredning er laget.

Alle 20 eksisterende kart-/legendefiler har uendret SHA-256. Kartlag, navn, grupper, filterbegreper, objektfelter, gråarealframstillinger og designidentitet er beholdt. Kartet er fortsatt en arkivbasert designmock med én dokumentert eksempellokalitet. Ingen produksjonsimplementering, endring av main/PR #76/Pages eller merge.
