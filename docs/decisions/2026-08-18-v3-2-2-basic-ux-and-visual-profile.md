# V3.2.2: Grunnleggende UX og visuell profil

**Dato:** 2026-08-18  
**Utgangspunkt:** `8efae77` (V3.2.1: Codespaces browser-preview)

## Beslutninger

Kartverkets `topograatone` brukes som standard bakgrunnskart i EPSG:3857. Konfigurasjonen ligger i en egen basemap-definisjon slik at bakgrunnskartet kan byttes uten å endre øvrig kartlogikk. Basemapet er en visualiseringskilde og inngår ikke i dataset registry eller regnskapskjernen.

Det lange HTML-valgfeltet er erstattet av en liten React-combobox som bruker den eksisterende, normaliserte kommunelisten. Komponenten filtrerer lokalt, viser maksimalt ti treff om gangen og støtter søk på navn og kommunenummer, mus, piltaster, Enter, Escape og tømming. Kommunegrense hentes fortsatt gjennom eksisterende API først når et treff velges.

Et avgrenset visuelt grunnsystem tar i bruk konkrete føringer fra Miljødirektoratet Designmanual v1.2 2026. CSS bruker profilens sjøgrønne primærfarger (`#005E5D`, `#337E7D`, `#40C1AC`) og beige sekundærfarger (`#ECE7D2`, `#F5F1E5`, `#FCFAF6`). Oransje `#D86018` brukes begrenset som fokusfarge. Prototypen bruker fontstacken `"Open Sans", Arial, sans-serif` uten å legge fontfiler i repoet.

Miljødirektoratet vises som tekstlig avsender. Offisiell logo er ikke implementert fordi en godkjent logoressurs ikke ligger i repoet. Faglig kartografi recolores ikke for å passe profilen.

## Status og avgrensning

Dette er et første profil- og UX-grunnlag, ikke en ferdig eller profilgodkjent løsning. Oppgaven endrer ikke kommune-API, dataset registry, Grunnkart-WMS, Codespaces-preview eller analysemetode. Den innfører ikke bakgrunnskartvelger, analyse, nye regnskapstall, logoressurser, illustrasjoner, M-mønster eller Playwright-oppsett.
