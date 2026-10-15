# Samordnede indikatorer og UX-forbedringer B1–B4

15.10.2026. [Issue #77](https://github.com/cwalso/Naturregnskap-V3/issues/77),
[PR #76](https://github.com/cwalso/Naturregnskap-V3/pull/76).
Start-HEAD lokalt/remote: `4ec7ed7a44d98d04880fd97bb384ae084441f2b9`.
Main: `a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`.

## B1 – Felles kilde til planindikatorene

Skog og Myr/våtmark viser nå samme eksisterende `calculatePlanArea`-resultat
som Oversikt/kart. Et felles presentasjonskort viser identifisert delareal,
ufordelt natur, null, manglende grunnlag eller teknisk feil. Ingen hardkodet
reserve eller eldre indikator vises. Appens lastede planresultat gjenbrukes;
eldre temasidekonsumenter er fjernet, eldre beregningsmoduler beholdt.

Lenken åpner Arealfordeling med Skog/Våtmark valgt, uten fit. Beholdningstall
og egne temakart er uendret. Den gamle våtmarkandelen erstattes med forklaring
om delvis fordeling; en ny prosent med ulike beregningsgrunnlag konstrueres ikke.
Se [eksplisitt prototypebeslutning](../decisions/2026-10-15-common-plan-indicators.md).
Dette er konsistens/etterprøvbarhet, ikke endelig faglig metodegodkjenning.

B1: 181/181 frontendtester, lint (0 feil/ett eksisterende Fast Refresh-varsel)
og TypeScript/Vite build består. Chromium med reelle tjenester verifiserer
2 032,22 daa skog /12,64 daa våtmark, samme analyse-ID som kartet,
280 586/38 495 dekar uendrede beholdningstall og riktig aktiv kartkategori.
Ingen JavaScript-feil eller side-overflow ved 1440 px.
[Kontroller](2026-10-15-ux-improvements-b1-b4/B1/checks.json),
[Skogkort](2026-10-15-ux-improvements-b1-b4/B1/B1-skog-theme-1440.png),
[Våtmarkkort](2026-10-15-ux-improvements-b1-b4/B1/B1-vatmark-theme-1440.png),
[Skog i kart](2026-10-15-ux-improvements-b1-b4/B1/B1-skog-map-1440.png).

Kontroller og skjermbilder registreres per leveranse før neste del starter.
B2–B4 og samlet regresjons-/publiseringsstatus føyes til i sine respektive commits.

## B2 – Kommunevalg beholder oppgaven

Den ubetingede navigasjonen til Oversikt er fjernet. Analysepanelets formål
og valgt analysetype beholdes ved kommunevalg. Kommuneavhengige resultater
har eierkontroll, pågående konsumenter avbrytes, og kategori-/lokalitetsvalg
og søk resettes. Eksisterende kartkontroller håndterer ny kommunegrense/fit;
selve OpenLayers-instansen gjenbrukes.

Kommune lagres som `?kommune=5001` ved siden av eksisterende hash-rute.
Bare et kommunenummer fra den faktiske kommunelisten gjenopprettes. URL og
nettleserens hash-historikk samordnes; ingen lokal lagring eller ny router.
Kommune og side beholdes ved reload. Åpent panel/filtre serialiseres fortsatt
ikke til URL; analysetypen beholdes ved ordinært kommunevalg i den åpne siden.

189/189 frontendtester, lint (0 feil/ett eksisterende varsel) og build består.
Målrettede tester dekker sene svar, ugyldige gamle utvalg og beholdt analysetype.
Reell Chromium-kontroll: Trondheim–Oslo–Trondheim fra de fire hovedsidene og
Skog; begge analysetyper beholder panel og kartinstans, gamle resultater trekkes
tilbake og utsnittet endres til Oslo. Reload og nettleser-tilbake består.
[Kontroller](2026-10-15-ux-improvements-b1-b4/B2/checks.json),
[Oslo Arealfordeling](2026-10-15-ux-improvements-b1-b4/B2/B2-oslo-Arealfordeling.png),
[Oslo Registrerte naturverdier](2026-10-15-ux-improvements-b1-b4/B2/B2-oslo-Registrerte-naturverdier.png).
