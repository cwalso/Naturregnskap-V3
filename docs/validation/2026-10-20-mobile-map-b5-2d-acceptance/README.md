# B5.2d – kontrollmateriale

Nye kontroller utført 21.–22.10.2026. [Akseptanserapport](../2026-10-20-mobile-map-b5-2d-acceptance.md).
Alle PNG-er her er fra de nye kjøringene. Utvalgte bilder er bevart; ikke alle 59 +72 automatiserte tilstander er duplisert.

## Viktige bilder

- [Normal Delt 320](A3-Delt-320.png), [Mer kart](A3-Mer-kart-320.png), [Mer resultat](A3-Mer-resultat-320.png).
- [Tanemsmyra 320](A2-details-320.png), [desktop](A2-details-1440.png), [fokusretur](A2-return-focus-390.png).
- [D-01: lav reflow-høyde](reflow-360-240.png), [200 % font](font-only-200.png), [400 % font](font-only-400.png).
- [D-02: innholdsvelger etter ArrowDown](keyboard-closed-select-arrowdown.png).
- [D-03: Søra-tabell med 0 daa](tiny-overlap-table.png), [samme lokalitet med <0,01 daa](tiny-overlap-details.png).
- [Gyldig nullresultat](fault-zero-plan.png), [tom klassifikasjon med ufordelt natur](fault-empty-wms.png), [HTTP-feil](fault-http-plan.png), [naturkildens timeout](fault-timeout-nature.png).
- [Mobil tilbake til Skog](mobile-browser-back-theme.png), [Naturtema → Myr → analyse → tilbake](nature-theme-Myr-back.png).

## Kontrollfiler

`acceptance.json` inneholder brukerreiser, DOM-/kartmål, fokustilstand, tabellrader, forespørsler og scenariotider. `completed` betyr at observasjonsdriveren fullførte, ikke at produktet er godkjent. To ugyldige tidlige fontstresstilstander er uttrykkelig utelatt. Normalmål og øvrige observasjoner gjelder produksjonsbygget.

`regression-checks.json` er den uendrede C4-driveren: 72 tilstander/axe-kontroller og 40 fit-kontroller, med kart-ID, geometrihash og konsumenttellere. `fault-followup.json` har gyldige transparente PNG-er i forespurt størrelse, nullplan og dokumentert 7-sekunders forsinkelse.

`supplement.json` har korrigert fontskalering, beregnede farger, browser-AX, pinch-resolusjon og mobil historie. `navigation-supplement.json` utvider dette med begge Naturtema-innganger og en konkret liten positiv lokalitetsoverlapp. Supplementet observerer kartreferansen med en isolert Vite-transform; produksjonsfilen endres ikke. `table-accessibility-tree.json` er et browser-tre, ikke en skjermlesertest.

`*-axe.json` inneholder komplette regel-/nodeopplysninger fra 8 nye, uavhengige kontroller. De tomme tabellene gir `th-has-data-cells` incomplete; symboler gir `color-contrast` incomplete. Se manuell vurdering i rapporten.

## Reproduksjon

Fra `apps/web`, etter `npm ci` og `npm run build`, med installert Chromium og axe-core tilgjengelig lokalt:

```sh
CHROMIUM_PATH=/usr/bin/chromium UX_AXE_PATH=/path/to/axe.min.js BROWSER_OUTPUT=/tmp/b5-audit node tests/browser/review-mobile-acceptance.mjs
CHROMIUM_PATH=/usr/bin/chromium BROWSER_OUTPUT=/tmp/b5-supplement SPLIT_HTTP_CACHE=/path/to/dated-http-cache node tests/browser/review-mobile-acceptance-supplement.mjs
```

`AUDIT_PHASE=fault-only` og `AUDIT_FAULTS=zero-plan,empty-wms,slow-switch` velger målrettet feilkontroll. `SUPPLEMENT_NAV_ONLY=1` velger supplerende navigasjon/liten lokalitet uten å gjenta font/pinch. Uten diskcache bruker supplementet nettverket. Inherited proxy/CA må være korrekt; nettverk og lokal browser-IPC må være tillatt.

Hoveddriveren gjenbruker vellykkede HTTP-svar innen kjøringen. Lokal C4/supplement bruker også eldre, daterte HTTP-svar til layout/identitet. CORS-header tilpasses lokal testorigin ved replay; datainnholdet endres ikke. Ingen rå HTTP-cache er lagt i repoet. Disse kjøringene er ikke kaldlastbenchmarks. Fysisk mobil, skjermleser og native browser-zoom er ikke utført/godkjent.

`manifest.json` gir SHA-256 for de bevarte filene. Ingen produksjonsrettelser eller Pages-publisering inngår.
