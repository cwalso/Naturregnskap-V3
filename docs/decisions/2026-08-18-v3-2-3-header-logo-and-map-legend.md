# V3.2.3: Header, offisiell logo og permanent kart-tegnforklaring

**Dato:** 2026-08-18  
**Utgangspunkt:** `f848e4c` (V3.2.2: grunnleggende UX og visuell profil)

## Beslutning

Headeren endres fra mørk sjøgrønn til den lyse, offisielle profilfargen
`--md-color-green-1` (`#E5EEEE`), med mørk sjøgrønn `#005E5D` for tekst.
Den lysere og luftigere flaten gir en tydelig avsender uten å konkurrere med
kartet. «Prototype» vises diskret ved produktnavnet; teknisk «V3» er ikke stor,
brukerrettet headerinformasjon.

Headeren bruker Miljødirektoratets offisielle primærlogo fra
[`miljodir/md-components/assets/logo-primary.svg`](https://github.com/miljodir/md-components/blob/main/assets/logo-primary.svg).
Filen ble hentet 2026-08-18 og lagres uendret lokalt som
`apps/web/src/assets/miljodirektoratet-logo-primary.svg`. Lokal bruk gir stabil
rendering, ingen runtime-avhengighet til designsystemets nettsted og en sporbar
logoressurs. SVG-ens paths, farge og sideforhold endres ikke.

## Tegnforklaring

Et permanent legendepanel vises sammen med kartet. Alle faglige kartlag som
visualiseres skal ha en tilgjengelig og forståelig tegnforklaring som følger
aktive faglag. Kartverkets gråtonebakgrunn er fortsatt en separat
visualiseringskilde og trenger ikke legend eller registrering som faglig datasett.

En liten, generell `MapLegendItem`-modell gir panelet id, tittel, synlighet og
bilde-URL per faglag. I dette steget er bare Arealdekke nivå 1 (2025) koblet til.
Checkboxen og legendens innhold bruker samme React-state: når laget slås av,
skjules lagets legend og panelet viser «Ingen aktive faglag»; når det slås på,
kommer legenden tilbake. OpenLayers-lagets synlighet oppdateres samtidig.

NIBIO-tjenestens `GetLegendGraphic` ble testet direkte 2026-08-18. En WMS 1.3.0-
forespørsel uten `SLD_VERSION` returnerte en XML-feil om manglende parameter.
Med `SLD_VERSION=1.1.0` returnerte tjenesten en lesbar PNG på 190 × 153 piksler
for `arealdekkeniva1`. URL-byggeren bruker derfor tjenestens WMS-versjon,
`FORMAT=image/png`, lag-id og `SLD_VERSION=1.1.0`. Enhetstesten verifiserer URL-en
uten live nettverk; selve bildet hentes av nettleseren fra NIBIO ved runtime,
slik WMS-kartbildene allerede gjør.

## Avgrensning og åpne punkter

Endringen innfører ingen nye datasett, analysekilde, beregninger eller faglig
symbolikk. Fremtidige faglag må få validert legendekilde når de innføres. Det er
ikke avklart om alle framtidige leverandører vil støtte `GetLegendGraphic`; der
de ikke gjør det, må en offisiell eller teknisk legendekilde besluttes uten å
gjette farger. Full integrasjon av `md-components` vurderes separat.
