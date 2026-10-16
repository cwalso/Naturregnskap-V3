# B5.1 – lokale designprototyper

Design og ekspertkontroll 16.10.2026; ikke produksjonskode eller godkjent B5.2.
Ingen API, OpenLayers, eksterne bilder, skriftnedlastinger eller nye beregninger.
Kartet er egen SVG-illustrasjon og har ingen geografisk gyldighet. Referansetall
og alle 70 lokaliteter er kopiert uendret fra dokumenterte uttak, uten geometri.

## Selvstendig pakke

`prototypes.zip` inneholder samme testede HTML/CSS/JS og referansedata, uten
npm-avhengigheter. Pakk ut og kjør `python -m http.server 8080 --bind 127.0.0.1`
i den utpakkede katalogen. Åpne http://localhost:8080/index.html.
Rapport/kontrollbilder ligger i repoet og er lenket fra pakken. ZIP-en har
identiske runtimefiler; bare sammenligningssidens dokumentasjonslenker peker
til GitHub for å fungere uten resten av repoet.

## Åpne og sammenlign

Fra repoets rot:

```sh
python -m http.server 8080 --bind 127.0.0.1 --directory docs/design
```

Åpne http://localhost:8080/2026-10-16-mobile-map-analysis-b5-1/index.html
Velg 390×844 eller 320×720 og én av seks tilstander. Rammene har faktisk CSS-
bredde/høyde; de er ikke nedskalerte skjermbilder. Åpne A, B eller C separat
for uavbrutt tastatur-/kartbetjening. Desktop kan velges på samme sted.

Direkte innganger, relativt til denne katalogen:

- `app.html?alternative=A&scene=forest` – Kart først.
- `app.html?alternative=B&scene=forest` – Resultat først.
- `app.html?alternative=C&scene=forest` – Delt arbeidsflate.

`scene` kan være `entry`, `area-all`, `forest`, `nature-all`, `locality`,
`pan` eller `missing`. Den setter bare en starttilstand i skissen. Det er
ikke en ny produksjonsrute eller endring av kommunevalg i appen.
A/B/C-lenkene gjenåpner samme navngitte starttilstand i et annet alternativ;
de overfører ikke endringer gjort etterpå. Hovednavigasjonens desktopnavn er
referansetekst; det er ikke opprettet nye hovedsider.

## Prøv selv

Start uten analyse, start Arealfordeling, velg Skog, tilpass kartet, panorer,
velg Våtmark og kontroller at utsnittet beholdes. Åpne Resultater; velg deretter
Registrerte naturverdier, søk `BN00109936` og velg Tanemsmyra. Bruk innholds-
velgeren til KU-verdi, naturtyper eller metode uten å passere lokalitetslisten.
A har Utvid/Delt for lange lister. Nullstill går tilbake til samlet resultat og
tømmer søket; utsnitt og lag beholdes. Åpne/lukk Kartlag og bytt Oslo/Trondheim.

Tab/Shift+Tab, Enter og native select-taster virker. Escape lukker skuff/lag og
returnerer fokus. Kartillustrasjonen kan panoreres med mus, berøring eller
piltaster og zoomes med knappene eller +/−. Kontroller i skuffen panorerer ikke
kartet. Ingen drahåndtak eller modale fokusfeller.

Lagenes sju avkryssinger og gjennomsiktighetsverdi er interaksjonstilstander;
illustrasjonen er ikke en gjengivelse av de sju tjenestenes faktiske kartografi.
Kildestatus/legend forklares som skisseavgrensning. B5.2 skal beholde alle
produksjonsfunksjoner, kildefeil, framstillingsvalg og legender.

## Gjenta dokumentert kontroll

Krever full repo, frontendavhengigheter (`npm ci` i apps/web), system-Chromium
og en separat axe-core 4.14.0-installasjon. Eksempel på separat kontrollmiljø:

```sh
npm install --prefix /tmp/b5-axe --no-save axe-core@4.14.0
CHROMIUM_PATH=/usr/bin/chromium UX_AXE_PATH=/tmp/b5-axe/node_modules/axe-core/axe.min.js DESIGN_OUTPUT=/tmp/b5-check node docs/design/2026-10-16-mobile-map-analysis-b5-1/check-design.mjs
```

Kjør fra repoets rot. Kontrollen bruker egen lokal HTTP-server på port 5232 og
lukker den etterpå. Ingen eksterne tjenester trengs under selve kontrollen.
Med UX_AXE_PATH utelatt kjøres interaksjonskontrollene uten å hevde axe-audit.
`window.designState()` returnerer en kopi av skissens tilstand for observasjon.

`evidence/checks.json`: 50 individuelle skjermbilder/axe-kontroller, to
sammenligningsbilder, 36 oppgaveregistreringer og to ekstra A-flyter. Scroll
måles i CSS-piksler etter scrollIntoView og før klikk/rerender, slik at native
rulling ikke forsvinner fra målingen når en DOM-node erstattes. Det er et
reproduserbart ekspertforløp, ikke observerte brukerhandlinger fra en brukertest.

Se [rapporten](../2026-10-16-mobile-map-analysis-b5-1.md) for anbefaling,
akseptansekriterier og utestående fysisk mobil-/skjermleserkontroll.
