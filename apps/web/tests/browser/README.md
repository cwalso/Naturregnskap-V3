# Renderkontroll av separat analysekart

Kjøres fra `apps/web` etter `npm ci`:

```sh
npx playwright install chromium
npm run test:browser
npm run test:browser:live
```

Ved behov for Linux-systembiblioteker: `npx playwright install --with-deps chromium`.
En allerede installert Chromium kan velges med `CHROMIUM_PATH`.
`BROWSER_OUTPUT` velger outputmappe; standard er den ignorerte
`.browser-results/`. Nettleserkontrollen starter og lukker sin egen Vite-server
(5182 for fixtures, 5181 for levende tjenester).

`test:browser` bruker ekte OpenLayers og Chromium med kontrollerte WMS-bilder
og en kontrollert eksisterende planmask. Den leser piksler fra det sammensatte
skjermbildet, ikke bare lag-state eller lagets eget Canvas. Den kontrollerer
synlige naturtype-/planpiksler, kommuneavgrensning, maskens gyldige piksler
uten Natur/Jordbruk-klassifisering, feil identitet/kommune, temabytte,
manuell navigasjon uten reset og opprydding. Dette er ikke faglig
kildevalidering eller visuell aksept av reell plan/overlapp.

`test:browser:live` henter reell Trondheim-grense, naturtype-WMS og den
uendrede planberegningen. HTTPS bruker `HTTPS_PROXY` dersom miljøet har den.
TLS-verifikasjon beholdes; konfigurer `NODE_EXTRA_CA_CERTS` med miljøets
godkjente proxy-CA ved behov. Ingen tjenestesvar erstattes med fixtures.
Skjermbilder og `results.json` viser A og B. Kontroller både JSON-status og
bildene manuelt: vellykket skriptkjøring betyr ikke bestått acceptance-gate.

Foreløpig status: A er kontrollert med levende tjenester. B er blokkert av
miljøets proxy, som ikke tillater `nap.ft.dibk.no`. C–E, overlapp og den nye
offentlige UI-koblingen er ikke implementert. De skal få egne renderkontroller
og reelle skjermbilder før en PR opprettes. Gammel kartkode er beholdt.
