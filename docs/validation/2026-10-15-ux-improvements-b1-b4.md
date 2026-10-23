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

B1–B3 ble kontrollert og committed før neste del. Sluttkontrollen nedenfor
gjentar flytene med alle fire leveransene samlet.

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

## B3 – Kontrast, fokus og native lister

Produktnavnet arver nå headerens tekstfarge og forblir lesbart på både lys og
mørk bakgrunn. Valgt analyseknapp beholder mørk grønn bakgrunn med hvit tekst
også ved hover/fokus. Tydelig fokusmarkering er kontrollert på headerknapp og
analyseknapper. Naturtema bruker native `ul/li` rundt eksisterende knapper;
Testversjon har en gyldig note-rolle. Ingen egen interaksjonskomponent innført.

| Kontroll | Før | Etter, normal/hover/fokus |
| --- | ---: | ---: |
| Valgt analyseknapp | 1,18:1 ved hover | 7,61:1 |
| Produktnavn på Naturtema | 1,24:1 | 6,10:1 |

190/190 frontendtester, lint (0 feil/ett eksisterende varsel) og build består.
Reell Chromium ved 1440×960, 900×900, 390×844 og 320×720: 12 axe-core4.14.0-
kontroller uten registrerte WCAG-brudd i utvalget. Tastaturfokus har synlig
3 px ring; Enter bytter valgt analysetype ved alle bredder. Native lister er
kontrollert med komponenttest. Analyseknappene har ingen deaktivert tilstand;
kommunesøkets native disabled under lasting er beholdt.

Axe har ufullførte automatiske fargekontroller for enkelte ikoner/gradienter.
Målingene over gjelder de dokumenterte tekstelementene. Dette er ikke en
full WCAG-sertifisering eller skjermlesertest. Ingen side-overflow i utvalget.
[Alle målinger og axe-resultater](2026-10-15-ux-improvements-b1-b4/B3/checks.json),
[desktop med headerfokus](2026-10-15-ux-improvements-b1-b4/B3/B3-themes-1440.png),
[900 px](2026-10-15-ux-improvements-b1-b4/B3/B3-Arealfordeling-900.png),
[390 px](2026-10-15-ux-improvements-b1-b4/B3/B3-Arealfordeling-390.png),
[320 px](2026-10-15-ux-improvements-b1-b4/B3/B3-Arealfordeling-320.png).

## B4 – Dagens natur og bynaturens rolle

Naturtema viser nå «Fordeling av dagens natur etter økosystemtype» rett etter
innledningen, med Grunnkart 2025/nivå1 og tydelig skille fra historisk nedbygging
og planoverlapp. Tabellen er trukket ut fra Myr/våtmark til en felles komponent.
Eksisterende beholdningsberegning, sortering, nevnere og tallformat gjenbrukes;
ingen klassifikasjon eller arealberegning er endret. Samme cachede kildeløp
deles mellom sidene uten at én avsluttet side avbryter den neste konsumenten.
Resultater har fortsatt kommuneeierkontroll og egne last-/mangel-/feiltilstander.

Bynaturen flyttes fra regnskapsgruppen til «Supplerende analyser og
beslutningsstøtte». Siden forklarer at eget temakart viser Grunnkartets
bebygde/opparbeidede areal, mens gråareallaget finnes i Utforsk. Kartgrunnlaget
utgis ikke for en analyse av tilgjengelige/egnede utbyggingsarealer; den
planlagte firekategori-analysen er ikke implementert. Alle sju temasider beholdes.

«Naturtema» brukes i oversiktsinngang og tilbakeknapper. «Bebygd» erstatter
«Bebygget» som visningsord; kategori-ID, SSB-gruppering, Grunnkart-mapping og
alle tall er uendret. Kilde-/inndelingsforskjellen mellom SSB og Grunnkart
beholdes. Skogsidens arealdekke skilles fra økosystemtype også ved den nye tabellen.

Den samlede axe-kontrollen avdekket at den gjenbrukte tabellens horisontale
rulleområde måtte få tastaturtilgang på mobil. Begge tabellinnganger har nå
en navngitt region med native fokus/scroll og tydelig fokusmarkering.
Ingen egen interaksjonsmotor er innført.

## Samlet kvalitetssikring

B4 og endelig frontendkontroll: **192/192 tester i 34 filer**, ESLint uten
feil og TypeScript/Vite produksjonsbygg består. Ett eksisterende Fast Refresh-
varsel på EcosystemPage og Vites varsel om stor JS-chunk står igjen.
Backend: **30/30 pytest**, Ruff uten feil; eksisterende Starlette/AnyIO-
deprecation-varsel. Ingen runtimeavhengigheter er lagt til.

| Kontroll | Resultat |
| --- | --- |
| Reell Chromium, 1440×960, 900×900, 390×844, 320×720 | 35 sluttbilder, ingen JavaScript-feil eller sideoverflow |
| Axe-core 4.14.0 | 16 avgrensede kontroller, ingen registrerte regelbrudd; ufullførte fargekontroller krever manuell vurdering |
| Tastatur | Synlig header-/analysefokus, Enter bytter analyse; rullbar økosystemtabell har native fokus og tydelig ring |
| Dagens økosystemfordeling | Samme tabell/tall på Naturtema og Myr ved alle fire bredder; Skog 297 431 og Våtmark 38 495 dekar |
| Alle temasider | To regnskapstemaer, fire supplerende temaer og én beslutningsstøtteinngang; alle sju mål virker |
| Kommunebytte | Trondheim–Oslo–Trondheim beholder side/analysetype; ingen gamle tall; Oslo viser manglende grunnlag |
| Kartregresjon med reelle tjenester | 16 ekstra bilder; samme instans, panorert utsnitt beholdes, riktig Skog-geometri, lag på/av, opasitet 65 % og tegnforklaring |
| Registrerte naturverdier | Uendret 119,38 daa /70 lokaliteter ved alle fire bredder |
| Historisk nedbygging | Fortsatt eksplisitt demomerket på Naturtapet ved alle fire bredder |
| Kontrollerte nettlesertester | Kartkomposisjon, 128 lagkombinasjoner, feil/masker/opasitet, navigasjon og Oversikt består |

[Samlede råkontroller og 35 skjermbilder](2026-10-15-ux-improvements-b1-b4/Final/),
[kartregresjon og 16 skjermbilder](2026-10-15-ux-improvements-b1-b4/Regression/),
[reproduksjon](2026-10-15-ux-improvements-b1-b4/README.md).
Utvalgte bilder:
[Naturtema 1440](2026-10-15-ux-improvements-b1-b4/Final/B4-themes-1440.png),
[900](2026-10-15-ux-improvements-b1-b4/Final/B4-themes-900.png),
[390](2026-10-15-ux-improvements-b1-b4/Final/B4-themes-390.png),
[320](2026-10-15-ux-improvements-b1-b4/Final/B4-themes-320.png),
[Bynatur 390](2026-10-15-ux-improvements-b1-b4/Final/B4-urban-390.png),
[Oslo uten Trondheim-tall](2026-10-15-ux-improvements-b1-b4/Final/B4-oslo-no-stock.png),
[demomerking 320](2026-10-15-ux-improvements-b1-b4/Regression/regression-demo-320.png).

### Uendrede faglige og tekniske grenser

Diff mot start-HEAD viser ingen endring i produksjonsmoduler for beregning,
kartmotor/OpenLayers, API/kilder, dataversjoner, geometri eller historiske
demodata. Det er konsumenter og presentasjon som endres. Plananalysen er
fortsatt foreløpig og delvis klassifisert: Skog 2 032,22 daa, Våtmark 12,64 daa,
ufordelt natur 706,71 daa. Areal avsatt til framtidig utbygging er ikke faktisk
eller forventet naturtap. Beholdning, planoverlapp, historiske demodata og
supplerende registreringer skal fortsatt leses separat.

Reelle Chromium-kontroller bruker lokal Vite-app og faktiske tjenester gjennom
miljøets HTTPS-proxy. En testinjeksjon leser kartinstans/geometri; produksjons-
kartmodulen er urørt. Dette er ikke et visuelt bevis for den publiserte Pages-
siden. Eksterne Unsplash-bilder blokkeres med 403 i dette miljøet; den eksisterende
fallbacken vises. Kontrollerte CI-tester bruker egne eksterne renderfixtures.

Ingen full WCAG-samsvarserklæring gis. Analysepanel/filtre lagres fortsatt ikke
i URL ved reload. Den tidligere dokumenterte begrensede mobile kartflaten
(B5) er ikke utbedret. Gråarealkartet er kartgrunnlag; firekategori-analyse og
analyse av tilgjengelige utbyggingsarealer er ikke implementert.

### Commits og neste steg

| Leveranse | Commit |
| --- | --- |
| B1 | `cbbf59b` |
| B2 | `5e58294` |
| B3 | `a051d5d` |
| B4 og samlet kvalitetssikring | Denne commiten |

Leveransen pushes til eksisterende PR #76 og publiseres med eksisterende
`deploy-pages.yml` via `workflow_dispatch` på oppgavebranchen. Kjøringens
`headSha` og vellykket `github-pages`-deployment kontrolleres mot leveransens
HEAD og rapporteres i sluttsvaret. Main og PR-merge inngår ikke.

Anbefalt neste steg er en separat prioritering av den allerede dokumenterte
mobile kartflaten (B5), samt senere faglig kvalitetssikring av metode og kilder.
Ingen av disse startes i denne leveransen.
