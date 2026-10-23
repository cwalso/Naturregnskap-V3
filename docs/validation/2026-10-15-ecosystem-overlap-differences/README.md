# Reproduksjon av differanseundersøkelsen

Se [hovedrapport](../2026-10-15-ecosystem-overlap-differences.md).
Ingen av kontrollkombinasjonene er en ny godkjent beregningsmetode.
Verktøyene er isolert fra runtime og endrer ikke produksjonsfiler eller kildekontrakter.

## Lagret evidens

- `captured-inputs.zip`: 30 faktiske HTTP-svar (20 DiBK-plan-PNG-er, sju NIBIO-
  økosystem-PNG-er, to kommunelistesvar og ett kommunegrensesvar), SHA-256/URL/
  tidspunkt, eldre/nye mellommasker og 20 faktisk Canvas-resamplede nivå-0-fliser.
  Alle med kalde resultatcacher i Chromium 151.0.7922.173, Node v24.19.0,
  kildekode ved `d934f143ecd8066792a239fcca5f1ec310b8cdde`.
- `results.json`: funksjonenes originale resultat/proveniens uten store bytearrays.
  Ingen tall er konstruert for å få samsvar med skjermbildene.
- `audit.json`: uavhengige kontroller, åtte diagnostiske kombinasjoner,
  rekkefølgeavhengig differansedekomponering, celleoverganger, grensekontroll
  og koordinater for detaljutsnittet.
- `difference-grids.npz`: samlokaliserte masker/klassekoder på et felles
  10,578125 m grid. Kode 0=utenfor respektiv Natur-støtte, 1=skog, 2=hei/buskmark,
  3=lite vegetert,4=våtmark,5=kyst,6=ufordelt. `old_raw`/`old_clean`/
  `midpoint_raw` bruker0=utenfor, 1=Natur, 2=Jordbruk. `plan_edge` er en boolsk
  rasterkant, ikke juridisk plangrense. Geografisk extent står i `audit.json`.
- `geographic-differences.png` og `geographic-detail.png`: diagnostiske figurer
  laget fra faktiske rasterresultater med standard plotting, uten bakgrunnskart.
- `reference-check.json`: identiske foreldre-/klassifikasjonshasher, sju
  detaljflishasher og analyse-ID mot 14.10-referansen, samt ZIP-ens SHA-256.

Den eldre Canvas-samplingen er lagret som faktisk Chromium-mellomresultat.
Python gjenskaper ikke Chromiums resampler fra bunnen av: den kontrollerer
alle videre nivå-0-/strip-/klassifikasjons-/arealtrinn uavhengig, og gjenskaper
den nye midtpunktsampingen direkte fra originalt oversiktsbilde.
Ingen autoritativ originalnatur-/originalplangeometri er hentet inn.

## Offlinekontroll, uten nye nettverksdata

Kjør fra reporoten. Bruk egen analyse-venv og `work/` til mellomfiler.
Avhengighetene går ikke inn i frontend/API runtime.

```bash
python3 -m venv work/ecosystem-overlaps/venv
work/ecosystem-overlaps/venv/bin/pip install -r apps/web/tests/analysis/ecosystem-overlap-requirements.txt
unzip docs/validation/2026-10-15-ecosystem-overlap-differences/captured-inputs.zip -d work/ecosystem-overlaps/capture
XDG_CACHE_HOME="$PWD/work/ecosystem-overlaps/cache" \
MPLCONFIGDIR="$PWD/work/ecosystem-overlaps/mpl" \
work/ecosystem-overlaps/venv/bin/python apps/web/tests/analysis/audit-ecosystem-overlaps.py \
  work/ecosystem-overlaps/capture apps/web work/ecosystem-overlaps/output --boundary-check
```

`--boundary-check` er valgfri og bruker pyproj til det allerede lagrede
Kartverket-svaret. Uten flagget trengs bare eksisterende `requirements.txt`.
Kjør mot samme uendrede `5001.png`: SHA-256 kontrolleres mot manifestet.
Alle råsvarshasher, gamle rå-/rensede masker og binær analysemaske, ny
foreldremaske, ny detaljmaske og de faktiske kategoriantallene har assertions.
Grensekontrollen beregner også UTM-faktoren uavhengig og sjekker likhet.

Den arkiverte ZIP-en er pakket ut og kommandoen er kjørt på nytt. Alle
numeriske resultater er identiske. Referanse-/teststatus ligger i `checks.json`.
Figurenes interne metadata/komprimering er ikke et numerisk kontrollkriterium.

## Ny fangst av de eksisterende funksjonene

Dette er ikke nødvendig for offlinekontroll. Live-kilder kan endres.
Fra `apps/web`, med installert Chromium og eksisterende frontendavhengigheter:

```bash
CHROMIUM_PATH=/usr/bin/chromium \
node tests/analysis/capture-ecosystem-overlaps.mjs /absolute/path/to/work/capture
```

Vite-port 5217 må være ledig. Midlertidige Vite-hooks kopierer bare to
råmasker og resamplede flisdata fra den eldre funksjonen; kildefilene redigeres
ikke. Direkte importer kaller `calculatePlannedDevelopment`,
`calculatePlannedNatureBreakdown`, `calculatePlanArea` og `loadFutureNatureMask`.
Avledet klassegrid og prosent/areal beregnes med de eksisterende funksjonene.
Proxy og TLS beholdes. Maks fire samtidige kildekall videreføres fra runtime;
identiske vellykkede URL-svar gjenbrukes innen fangsten. Ingen ytelsesmåling.

Sammenlign alle kildehasher før nye live-resultater tolkes som metodeavvik.
`planned:5001` alene er ikke en kildeversjon. Eksakt samsvar 14.–15.10.2026
gir ikke garanti for senere WMS-uttak. Tidspunktet i manifestet er UTC;
rapportens dato er 15.10.2026 norsk tid.

Kontroller faktisk kjørt: Chromium-fangst, offlineaudit to ganger med
grensekontroll, 178 frontendtester, ESLint, TypeScript/Vite build, Ruff,
`node --check` og `git diff --check`. Eksisterende Fast Refresh-/chunkvarsler
er dokumentert i hovedrapporten. Backend og kartmotor er ikke endret.
