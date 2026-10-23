# Kontrollgrunnlag B1–B4, 15.10.2026

B1, B2 og B3 inneholder kontrollene gjort før neste leveranse startet.
Final inneholder sluttkontrollen av alle fire leveranser (35 PNG + sidetekst,
checks.json). Regression inneholder separat reell kart-/demoregresjon (16 PNG
og sidetekst), samt kontrollerte navigasjons-/Oversikt-logger. PNG-ene er
faktiske Chromium-skjermbilder, ikke tegnede skisser.

## Reproduksjon

Fra apps/web, med installerte frontendavhengigheter og system-Chromium:

```sh
npm test
npm run lint
npm run build
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser:layers
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser:navigation
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser:overview
CHROMIUM_PATH=/usr/bin/chromium UX_STAGE=all UX_AXE_PATH=/absolutt/sti/axe.min.js BROWSER_OUTPUT=/tmp/ux-final node tests/browser/check-ux-improvements.mjs
CHROMIUM_PATH=/usr/bin/chromium UX_STAGE=regression BROWSER_OUTPUT=/tmp/ux-regression node tests/browser/check-ux-improvements.mjs
```

Axe-core 4.14.0 er installert i separat kontrollmiljø, ikke som appavhengighet.
Live-testen bruker port 5220; kjør stadiene sekvensielt. UX_STAGE kan avgrenses
til B1, B2, B3 eller B4. HTTPS-proxy videresender reelle kilder uten mock;
vellykkede svar caches under kjøringen. Vite-plugin eksponerer kartreferansen
for observasjon uten å endre produksjonsfilen. Ingen tjenester må erstattes
med fixtures for å omtale kjøringen som live.

Backend fra apps/api, i separat Python-miljø med prosjektavhengigheter:

```sh
pytest
ruff check .
```

Se hovedrapporten for begrensninger, målinger og skillet mellom live-kontroll,
kontrollerte renderregresjoner og etterfølgende Pages-deployment.
