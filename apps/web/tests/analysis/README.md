# Isolert undersøkelse av ufordelt natur

Verktøyene endrer ingen produksjonsdata, karttilstand, kildekontrakt eller cache.
Forsøkene er ikke godkjente nye regnskapsberegninger.
[Rapport](../../../../docs/validation/2026-10-14-unclassified-plan-nature.md).

Kjør fra reporoten med Python 3.12. Analyseavhengighetene installeres i egen
virtuell environment; de inngår ikke i frontend/API runtime.

```sh
mkdir -p work/unclassified/reference work/unclassified/experiment work/unclassified/output
python3 -m venv work/unclassified/venv
work/unclassified/venv/bin/pip install -r apps/web/tests/analysis/requirements.txt
unzip docs/validation/2026-10-14-plan-area/reference-inputs.zip -d work/unclassified/reference
cp docs/validation/2026-10-14-plan-area/result.json work/unclassified/reference/result.json
unzip docs/validation/2026-10-14-unclassified-plan-nature/experiment-inputs.zip -d work/unclassified/experiment
work/unclassified/venv/bin/python apps/web/tests/browser/verify-plan-area.py work/unclassified/reference
MPLCONFIGDIR=work/unclassified/mpl work/unclassified/venv/bin/python apps/web/tests/analysis/audit-plan-nature.py work/unclassified/reference work/unclassified/experiment work/unclassified/output
```

Dette er offline: referanseverdier, full disjunkt RGBA-oppdeling, B1/B2,
terskelfølsomhet, kontrollmasker, geografisk nærhet og diagnostiske kart.
`diagnosis.json` inkluderer ikke råbilder, men alle tall; `diagnostic-grids.npz`
lagrer de geografiske diagnostiske gridene. Det er assertions for maskens
SHA, foreldreklasser, alle kategoriantall og identisk geografisk klassifikasjon.
Tiden er miljøavhengig; ingen autoritativ feilrate følger av arealsamsvar.

Valgfri offline Canvas-kontroll bruker eksisterende Playwright-avhengighet
og installert Chromium, ingen appserver eller ekstern nettverkstrafikk:

```sh
cd apps/web
CHROMIUM_PATH=/usr/bin/chromium node tests/analysis/check-png-canvas.mjs ../../work/unclassified/reference ../../work/unclassified/canvas
cd ../..
MPLCONFIGDIR=work/unclassified/mpl work/unclassified/venv/bin/python apps/web/tests/analysis/audit-plan-nature.py work/unclassified/reference work/unclassified/experiment work/unclassified/output --canvas work/unclassified/canvas
```

Sammenligning av rå PNG/Canvas gjøres ved auditens `--canvas`, ikke med
produksjonsklassifikatoren. Valideringsuttrekket viser 0 klassifikasjonsendringer.

Ny **live** undersøkelse, bare dersom ønsket; ikke nødvendig for reproduksjon:

```sh
work/unclassified/venv/bin/python apps/web/tests/analysis/fetch-plan-nature.py work/unclassified/reference work/unclassified/new-live --all-tiles --binary
MPLCONFIGDIR=work/unclassified/mpl work/unclassified/venv/bin/python apps/web/tests/analysis/audit-plan-nature.py work/unclassified/reference work/unclassified/new-live work/unclassified/new-output
work/unclassified/venv/bin/python apps/web/tests/analysis/sample-plan-nature.py work/unclassified/new-output/samples.json work/unclassified/new-samples
```

Maks fire samtidige WMS-kall. Råsvar, URL-er, SHA, HTTP-status, størrelse og
request-tid lagres. UTFGrid og WFS/WCS-kontroller er tjenesteprober, ingen
antatte geodatakilder. `--all-tiles` uten `--binary` henter bare PNG8/PNG og
metadata; uten flaggene brukes én avgrenset referanseflis.

Live-svar kan endres. Kontroller `rawPng8Unchanged` før nye differanser tolkes;
ikke bland kildeendring med metodeendring. GetFeatureInfo-sampling er
deterministisk stratifikasjon, ikke tilfeldig utvalg eller populasjonsfeilrate.
Serverens søketoleranse og fravær av polygongeometri begrenser kontrollen.
Råsvarene fra leveransen ligger under `samples/` i forsøksarkivet.

Eksisterende verdsatt-natur-referanse kan også kontrolleres uten live-kilder:

```sh
gzip -dc docs/validation/2026-10-13-future-nature/result.json.gz > work/unclassified/valued-result.json
work/unclassified/venv/bin/python apps/web/tests/browser/verify-future-nature-geos.py work/unclassified/valued-result.json
```

Ruff-kontroll: `ruff check apps/web/tests/analysis`.
Frontend regresjon: eksisterende `npm test`, `npm run lint`, `npm run build`
i `apps/web`. Ingen produksjonsimplementering eller Pages-dispatch inngår.
