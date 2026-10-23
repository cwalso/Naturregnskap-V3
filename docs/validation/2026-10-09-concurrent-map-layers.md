# Kontroll av samtidige kartlag – Trondheim

Dato: 09.10.2026. Repo cwalso/Naturregnskap-V3, branch feat/explore-analysis-map,
eksisterende PR #76. Start-HEAD ble kontrollert mot GitHub:
`6cb8ef0f23b50d4ffe200a4d768c43b5da81d289`. De tre kartvisningene og den
korrigerte planpresentasjonen er manuelt godkjent i brukerens bestilling.
Denne leveransen endrer lagstyringen; ny samlet visning leveres for brukertest.

## Implementert og avgrenset

- Tre uavhengige avkryssinger, fordelt på Regnskapsgrunnlag, Plandata og
  Supplerende temadata. Alle åtte kombinasjoner støttes; alle av viser basen.
- Egen gjennomsiktighet 0–100 % per aktivt lag, bevart ved av/på.
- Fast rekkefølge: base → nivå 0 → plan → naturtyper/lokalitetsvalg →
  kommunemaske/grense. Nivå 0 starter på 30 % gjennomsiktighet, øvrige på 0 %.
- Lagene har stabil ID, kilde, legend, beskrivelse/forbehold, filtertype,
  standard synlighet/opasitet og zIndex i et lite typet register. Fem ID-er
  er reservert, uten datakilder eller uvirksomme kontroller. Et senere lag må
  legge til registerdefinisjon og kilde/livssyklus i eksisterende kartmotor;
  velger, state, opasitet, status og legend kan gjenbrukes.
- Én OpenLayers-instans. Lagvalg/opasitet/filter/objektvalg/resize bevarer
  senter/oppløsning. Bare kommunevalg og eksplisitt reset tilpasser kartet.
- Naturtypefilteret gjelder bare Verdsatte naturtyper, fra hele kommunens
  1 529 registrerte lokaliteter / 90 naturtyper i kontrollkjøringen. Andre
  lagvalg bevarer filter og valgt objekt. Skjuling av naturtypelaget fjerner
  objektvalg, men bevarer filteret til gjenåpning.
- Naturtypekall avbrytes ved skjuling/kommunebytte. Fullførte resultater bruker
  eksisterende cache. Status eies per lag/kommune; deaktivert lags sene feil
  skjules. Rasterstatus leser allerede eksisterende renderer-fliser.
- Desktopvelger i sidepanel; sammenleggbar mobilvelger over kartet, legend og
  naturtypefilter under kartet. Ingen horisontal scrolling ved 390 px.

Den godkjente framtidsvisningen viser fortsatt Natur/Jordbruk innenfor
uendret DiBK-filter. Klassifisering, farger, raster/detaljvisning, fire
naturtypekategorier, EPSG:25833 og kommunemaskering er beholdt.
`futureDevelopmentDisplay`, `plannedDevelopment`, analysemetoder, rutenett,
UTM-korreksjon, prosentnevnere, verdi-/overlappsregler, analyse-ID og request-/
resultatcache er ikke endret. Kryssanalyse er ikke aktivert. Lagkombinasjonene
beregner ingen nye overlapper eller arealtall.

## Faktisk kjørende applikasjon, A–L

Chromium åpnet Vite-appens ordinære App-rute med reelle Trondheim-tjenester.
Bare tilgang til kart/state var testeksponert. HTTPS ble videresendt gjennom
miljøets proxy med identisk URL, metode, query og body, uten erstatningsdata.
Skjermbilder er uredigerte fullsidebilder etter faktisk rendercomplete.
Resultatene under støttes både av assertions og visuell gjennomgang av bildene.

| Kontroll | Resultat og faktisk skjermbilde |
| --- | --- |
| A: bare nivå 0 | Eksisterende Natur/Jordbruk/Bebygd/vann. [A](2026-10-09-concurrent-map-layers/A-level0.png) viser 0 % gjennomsiktighet for klassekontroll; standard er 30 %. Ingen DiBK-kall før plan ble aktivert. |
| B: bare framtidig utbygging | Natur grønn, Jordbruk gul; ingen Bebygd eller blå heldekkende planflate. [B](2026-10-09-concurrent-map-layers/B-future.png). |
| C: bare naturtyper | Ordinær WMS, fire kategorier og kommunens liste/filter. [C](2026-10-09-concurrent-map-layers/C-valued.png). |
| D: nivå 0 + framtidig | To aktive lag med egne legender, fullfargede planfelter over svakere basisfarge. [D](2026-10-09-concurrent-map-layers/D-level0-future.png). |
| E: nivå 0 + naturtyper | Naturtypeflater ligger over nivå 0. [E](2026-10-09-concurrent-map-layers/E-level0-valued.png). |
| F: framtidig + naturtyper | Begge vises i geografisk sammenfall, naturtyper øverst. [F](2026-10-09-concurrent-map-layers/F-future-valued.png). |
| G: alle tre | Tre avkryssinger/legender, grense over alle. [G](2026-10-09-concurrent-map-layers/G-all.png). |
| H: alle av | Base og kommunegrense, ingen hengende temaflater/legender. [H](2026-10-09-concurrent-map-layers/H-none.png). |
| I: gjennomsiktighet/rekkefølge | Hvert lag satt til 50 % og 100 %, de andre og utsnitt bevart. [Nivå 0](2026-10-09-concurrent-map-layers/I-opacity-level0.png), [plan](2026-10-09-concurrent-map-layers/I-opacity-future-development.png), [naturtyper](2026-10-09-concurrent-map-layers/I-opacity-valued-nature.png), alle 50 %-bilder. Ved 100 % naturtypegjennomsiktighet forsvinner kategoriens fylte piksler. |
| J: filter med andre lag | Frisk lågurtfuruskog / Elvåsan sør 2, kilde-ID VKU-NINFP2510188746. Plan av/på bevarer filter og valg. Faktisk kartklikk velger kildeobjektet uten zoom. [Naturtype og valg](2026-10-09-concurrent-map-layers/J-filter-with-layers.png), [Stor verdi](2026-10-09-concurrent-map-layers/J-value-filter-with-layers.png). |
| K: av/på, pan, zoom, reset | Hjulzoom og +, faktisk drag/pan, fire lagkombinasjoner etter navigasjon uten fit. Eksplisitt reset gjenoppretter kommuneutsnitt. [Detalj](2026-10-09-concurrent-map-layers/K-all-detail.png), [rundtur](2026-10-09-concurrent-map-layers/K-roundtrip-detail.png). |
| L: mobil 390 px | Velger åpen/lukket, plan/alle/ingen, opasitet og manuell zoom. Ingen horisontal scrolling; lukket velger skjuler ingen lag/legend. [Lukket](2026-10-09-concurrent-map-layers/L-mobile-closed.png), [åpen](2026-10-09-concurrent-map-layers/L-mobile-open.png), [plan](2026-10-09-concurrent-map-layers/L-mobile-future.png), [alle](2026-10-09-concurrent-map-layers/L-mobile-all.png), [ingen](2026-10-09-concurrent-map-layers/L-mobile-none.png), [zoom](2026-10-09-concurrent-map-layers/L-mobile-detail.png). |

[Maskinlesbare gates, fysiske lag/opasitet/zIndex, navigasjon og HTTP-logg](2026-10-09-concurrent-map-layers/checks.json).
Alle A–L er bestått. Ingen JavaScript-feil eller mislykkede tjenestekall ble
registrert i sluttkjøringen. Kartverket, NIBIO, DiBK, Miljødirektoratet og SSB
svarte HTTP 200. Plan alene hadde synlige Natur- og Jordbruk-piksler, og null
Bebygd-/blå-plan-piksler i kommuneutsnittet.

## Regresjon av godkjent planpresentasjon

En faktisk detaljflis `[11, 1021, 743]`, bbox
`[264868, 7031232, 267576, 7033940]`, ble sammenlignet piksel for piksel med
rå DiBK og Grunnkart på identisk rutenett. Av 262 144 piksler var:

- 4 103 Natur og 4 784 Jordbruk innenfor plan, vist med riktig klassefarge.
- 57 254 Bebygd og 24 vann innenfor plan, alle transparente i planlaget.
- 126 ukjente/ugyldige og 195 853 utenfor plan, alle transparente.
- **0 avvik** mellom forventet og faktisk visningsflis.

Tidligere [referansesammenligning](2026-10-09-future-development-display.md)
med Publicdemorepo gjelder fortsatt; presentasjonsmotoren er ikke endret her.
Dette er en kontroll av kartpresentasjon, ikke en endret beregningsmetode.

## Tester og CI

Lokalt bestått:

- `npm test`: 119 tester i 21 filer, inkludert eksisterende analyse- og
  cache-/nevner-/UTM-kontroller, kommuneeier og avbrutte naturtypekall.
- `npm run lint`: 0 feil; én eksisterende Fast Refresh-advarsel i EcosystemPage.
- `npm run build`: bestått; eksisterende advarsel om stor hovedbundle.
- `npm run test:browser`: beholdt analysekarts faktiske renderregresjon.
- `npm run test:browser:layers`: ny kontroll med faktisk OpenLayers-/Chromium-
  pikselkomposisjon, synlighet/opasitet/rekkefølge, filterisolasjon, objektvalg,
  kommunemaske med hull, korrekt lastestatus, sen deaktivert feil og destroy.
- `npm run test:browser:themes`: reell Trondheim A–L og råpikselkontroll ovenfor.

Den nye kontrollerte lagtesten inngår i eksisterende GitHub Quality Gate.
Live-kjøringen beholdes separat fordi den avhenger av eksterne tjenester.
Publisert HEAD, CI- og deploystatus rapporteres i PR #76 og leveransemeldingen.
Ingen merge eller main-endring inngår.

## Kjente svakheter og visuell vurdering

- Kommuneoversikt er fortsatt bare klargjort for Trondheim. Eksisterende
  oppløsning/dekning og små eller smale felts svakere farge ved grov målestokk
  er uendret. Planfeltene er derfor mindre tydelige i kommuneoversikt enn nær.
- Nivå 0 og plan bruker samme godkjente klassefarger. Ved 0 % gjennomsiktighet
  i nivå 0 blir planfelter vanskeligere å skille. Standard 30 % hjelper;
  brukeren kan øke gjennomsiktigheten eller skjule basislaget.
- Naturtypelaget ligger øverst og kan dekke planfelter. Egen gjennomsiktighet
  eller av/på gjør underliggende lag synlige. Dette er forventet tegning,
  ikke beregnet plan/naturtypeoverlapp.
- Lange legender/filter gir en lang side, særlig på mobil. Kontroller og
  legend flyter under kartet; velgeren kan lukkes og dekker det ikke permanent.
- Resize bevarer oppløsning/senter. Overgang fra bredt til smalt vindu kan
  derfor beskjære kommuneutsnittet. «Vis hele kommunen» tilpasser eksplisitt.
- Direkte visning av Pages gjennom Codex-proxyen kan være blokkert. Deploy
  kontrolleres i GitHub Actions/API; dette hindrer ikke autorisert publisering.
