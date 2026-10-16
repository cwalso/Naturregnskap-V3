# Natur og jordbruk innenfor framtidige utbyggingsformål

Dato: 09.10.2026. Status: implementert på feat/explore-analysis-map.

Presiserer planpresentasjonen i [tre selvstendige temaer](2026-10-09-v3-independent-map-themes.md).
De tre valgene og øvrige temaer/interaksjoner beholdes.

Den selvstendige planvisningen skal vise dagens Natur og Jordbruk innenfor
framtidige utbyggingsformål. Bebygd, vann og ugyldige/ukjente piksler skjules.
Eksisterende nivå-0-farger (#9ECC73 og #FFD16E) skiller Natur og Jordbruk.
Forklaring og tegnforklaring beskriver begge klassene. Dette er ikke bokført
naturtap, prognose for faktisk framtidig naturtap eller et nytt naturregnskap.

Intern arbeidsreferanse: `eirikvk/Publicdemorepo`, commit
`ae6f9f25ac63b746b5a6f44b92dbbb904e73e903`, særlig `src/motor/plan.js`,
`fliser.js` og `farger.js`. Referansen krysses pikselvis med samme nivå-0-klasser,
status-2/formål-1*/2*-filter, EPSG:25833 og planrutenett. V3s eksisterende
`buildPlanTileUrl`, `buildRawAccountTileUrl`, `classifyAccountPixel`,
`loadOverviewRaster`, `planTileGrid` og delte requestlag gjenbrukes.

`futureDevelopmentDisplay` lager bare visningsfliser. Nivå 9 bruker
kommuneoversiktens råfarger samplet med nærmeste piksel til 21,15625 m.
Dette unngår nye RGB-blandinger ved forskjellig kildeoppløsning (19,72 m).
Grovere fliser aggregerer de faktiske treffene: dominerende klasse får farge,
alfa følger kvadratroten av treffandelen (minimum 0,35, som i referansen). Ingen felt utvides til
nabopiksler. Nærmere utsnitt bruker rå Grunnkart- og planfliser på samme
bbox/rutenett og alpha-grensene 100/128 fra eksisterende V3/referanse.

Referansens standardvisning fjerner smale komponenter uten kjerne på grovt
grid, og kan slå stripevisning på. Den selvstendige presentasjonen beholder
små og smale treff: analysegridets stripefjerning skal ikke bestemme hva
som finnes i disse planformålene. Detaljkartet kan derfor vise flere smale
eller små felt enn kommuneoversikten. Treff under halvparten av en 21 m
kildepiksel kan mangle i oversikten, men vises ved nærmere zoom. Grove
blandingspiksler viser én dominerende klasse, ikke begge samtidig.

Ingen analysemetode, prosentnevner, analysegrid, verdiregel, analyse-ID,
resultatcache eller DiBK-filter endres. Ingen analysefunksjon kalles fra dette
kartlaget. Eksisterende rårequest-cache og fire-kall-grense brukes uendret.
OpenLayers håndterer visningsflisene; konsumenten avbrytes ved kommunebytte/
destruksjon. Kommunemaskering og kartnavigasjon beholdes.

Grov kommunevisning krever klargjort oversikt, foreløpig bare Trondheim.
Manglende oversikt/kildefeil gir kartfeil, ikke falsk tom planvisning.

Se [validering](../validation/2026-10-09-future-development-display.md).
