# Validering: tre selvstendige kartvisninger

Kontrollert 09.10.2026 på `feat/explore-analysis-map`, eksisterende PR #76.
Utgangspunkt: `3e2b5df5ca732ef607e60960cee6639fcf9a28ab`. Rapporten og
skjermbildene følger implementeringscommitten; eksakt leveranse-HEAD finnes i
PR-ens commitliste. Main er ikke endret; ingen merge eller Pages-publisering.

## 1. Implementert

Utforsk åpner Grunnkart nivå 0. En enkel temavelger bytter til Verdsatte
naturtyper eller Framtidig utbygging. Bare ett tema er aktivt. Hvert tema har
rolle, forklaring, kilde og tegnforklaring i et lite utvidbart register.
Ingen ytterligere temaer eller automatisk kryssanalyse er implementert.

Temabytte fjerner gamle temalag og rydder lokalitetsvalg og filtre. Senter
og oppløsning bevares ved tema/filter/objekt/resize. Kommunevalg og eksplisitt
«Vis hele kommunen» er de eneste handlingene som tilpasser utsnittet.
Desktop har kart og informasjon ved siden av hverandre; mobil har én kolonne.

## 2. Gjenbruk og bevarte analyser

- `accountOverviewRaster`: klargjort oversikt, eksisterende nivå-0-farger,
  klassifisering, detaljgrid og `loadAccountDisplayTileBlob`.
- `sharedImageRequests`: eksisterende råflisdeling og begrenset cache.
- `buildPlanTileUrl`: eksisterende kommuneplanfilter og SLD, med blå visningsfarge.
- `datasets/registry`, kommunegrense, EPSG:25833 og eksisterende bakgrunnskart.
- Verdsatte naturtypers eksisterende WMS-tjeneste og fire native verdifarger.

`ExploreAnalysisWorkspace`, den tidligere analysekartkontrolleren og tegning
beholdes. Analysegrid, beregninger for verdi/overlapp, UTM-korreksjon,
prosentnevnere, analyse-ID og resultatcache er ikke endret. Utforsk monterer
nå `ExploreThemesWorkspace`/`exploreThemeMap`; App-effektene starter ikke
analyse på denne ruten. Analyser på eksisterende temasider er beholdt.
Reaktivering av verkstedet krever egen oppgave etter manuell kartgodkjenning.

## 3. Status per karttema

| Tema | Resultat med Trondheim-data | Begrensning |
| --- | --- | --- |
| Grunnkart nivå 0 | Oversikt og nær WMS viser Natur, Jordbruk og Bebygd innen kommunen | Bare Trondheim har klargjort oversikt; vann er eksisterende bakgrunnskontekst |
| Verdsatte naturtyper | Fire WMS-verdikategorier, 1529 lokaliteter og 90 typer; filter og kart-/listevalg virker | Registrert natur er ikke heldekkende naturverdi eller dekning |
| Framtidig utbygging | Blå kildeplanflater, alene og også over eksisterende bebyggelse | Viser planavsetning; ikke beregnet naturtap |

Alle tre kunne hentes og rendres i kontrollmiljøet. Ingen visning ble markert
bestått med blokkerte kilder eller testdata. Dette er lokal teknisk/visuell
kontroll; brukerens manuelle faglige godkjenning gjenstår.

## 4. Grunnkart-WMS: hvorfor transparent

Tjenesten `grunnkart_arealanalyse` og lagene `okosystemtype`/
`arealdekkeniva1` er riktige. EPSG:25833 og bbox er verifisert. Capabilities
oppgir `MaxScaleDenominator` 50000. Den brede kommuneforespørselen var omtrent
1:122 000 og ga transparent PNG; detaljforespørsler under grensen ga synlige
klassifiserte piksler. Transparens i grovere målestokk dokumenterer derfor
ikke manglende Grunnkart.

Kommuneoversikten gjenbruker eksisterende klargjort raster, uten nye faglige
regler. Ved nær zoom brukes samme eksisterende detaljfliser, klassifisering
og cache som tidligere. Manglende oversiktsraster formidles som visningsfeil,
ikke erstattes med syntetiske data.

## 5. Kommuneavgrenset naturtypefilter

Et romlig REST-kall med hele kommunepolygonet og de fire verdikategoriene
henter først komplette objekt-ID-er (`returnIdsOnly`). Deretter hentes
attributter og kildepolygoner i batcher på 200, maksimalt fire samtidig.
Ufullstendige batcher deles; manglende enkeltobjekt gir feil fremfor et
ufullstendig eller falskt nullresultat. Avbrutte/sene svar brukes ikke eller
cachelagres. Komplette kommuneresultater har begrenset cache.

Naturtypevalgene er unike navn fra disse registreringene. Søket snevrer inn
navnelisten; naturtype og verdikategori filtrerer kart og lokalitetsliste.
Alle-visningen bruker WMS; filtrerte visninger bruker registrerte polygoner
med samme fire verdifarger. Objekt-ID og kilde-ID følger valgt lokalitet.
Filteret bygger aldri på plananalysens treff. Krysninger med kommunegrensen
telles som registrerte lokaliteter, mens kartet avgrenses visuelt.

## 6. Faktiske skjermbilder

Bildene kommer fra kjørende App med ekte Trondheim-data, uten kildefixtures.

| Kontroll | Skjermbilde |
| --- | --- |
| A: nivå 0 alene | [A](2026-10-09-map-themes/A-level0.png) |
| B: naturtyper alene | [B](2026-10-09-map-themes/B-valued.png) |
| C: plan alene | [C](2026-10-09-map-themes/C-future.png) |
| D: A → B → C → A | [Tilbake til A](2026-10-09-map-themes/D-roundtrip.png) |
| E: søk/filter og kildeobjekt | [Filter](2026-10-09-map-themes/E-filter.png) |
| F: nær zoom og ekte detaljfliser | [Detalj](2026-10-09-map-themes/F-detail.png) |
| G: 390 px | [Nivå 0](2026-10-09-map-themes/G-mobile-level0.png), [naturtyper](2026-10-09-map-themes/G-mobile-valued.png), [plan](2026-10-09-map-themes/G-mobile-future.png), [rundtur](2026-10-09-map-themes/G-mobile-roundtrip.png) |

## 7. Browser- og renderkontroll

`test:browser:themes` kjører Chromium mot Vite og reelle offentlige kilder.
Miljøets HTTP-proxy brukes som transport via Playwright; kildeinnholdet
endres ikke. Testinstrumentering eksponerer kontrollinstansen kun i denne
testserveren. Fargekontroll leser skjermbilde av faktisk sammensatt kart.

A–G bestod sekvensielt. Kontrollene bekreftet synlige klasse-/natur-/planpiksler,
at plan ikke lastes i A, at plan/natur ikke ligger igjen i andre temaer,
utrydding av valg/filter, søkbart 90-typefilter, kildeobjektvalg fra liste og
faktisk museklikk, zoom inn/ut med hjul og knapper, panorering, reset og
bevart utsnitt ved temarundtur og 390 px. Mobil hadde ingen horisontal rulling.
Nær Grunnkart viste alle tre klasser med ekte WMS-responser. Ingen JS-feil.
Se [maskinlesbare resultater](2026-10-09-map-themes/checks.json).

Den opprinnelige isolerte `test:browser` for beholdt analyseverksted bestod:
sammensatt plan/tema/overlapp/Natur/Jordbruk, identitet, filtre, objekter,
temarundtur, manuelt utsnitt og opprydding.

## 8. Tester, lint og build

- `npm test`: 114 tester i 20 filer bestod, inkludert eksisterende metode-/cache-
  regresjoner og nye tester for komplette kommunedata, abort/stale og temaeierskap.
- `npm run lint`: bestod uten feil; eksisterende Fast Refresh-advarsel i EcosystemPage.
- `npm run build`: bestod; eksisterende varsel om JS-bundle over 500 kB.
- `git diff --check`: bestod.

### Endrede filer og dokumentasjon

Ny visning: `ExploreThemesWorkspace.tsx/.css`, `mapThemes.ts`,
`exploreThemeMap.ts` og `api/municipalValuedNature.ts`. App kobler den inn;
CTA-tekst på Forest/Ecosystem/ThematicDataPage er tilpasset Utforsk.
Oversiktsindeksens interne arbeidsmetadata er fjernet uten å endre rasteret.

Nye kommunedata-/tematester og live browser-skript er lagt til. App-testene
kontrollerer ny rute uten automatisk analyse og tester det beholdte verkstedet
separat. Den eksisterende workspace-browserkommandoen peker på tema-kontrollen;
den isolerte analyserenderkontrollen og metode-/cachetestene er beholdt.

AGENTS, README, docs-indeks, utviklingsplan, produktprinsipper,
analysebrukerhistorier, designføringer og arkitekturoversikt beskriver ny
aktiv flyt og beholdt analyse. Ny [ADR](../decisions/2026-10-09-v3-independent-map-themes.md)
og denne rapporten med ti skjermbilder dokumenterer beslutning og validering.
Historiske ADR-er er ikke omskrevet.

## 9. Branch og review

Eksisterende branch `feat/explore-analysis-map` og PR #76 brukes. Denne
rapporten ligger sammen med implementeringen på branchen. Eksakt HEAD
rapporteres i leveransemeldingen og kan kontrolleres mot PR-ens commitliste.
Ingen ny PR, merge, endring av main eller ekstern testpublisering er utført.

## 10. Gjenstående begrensninger

- Helkommune nivå-0-oversikt er verifisert og klargjort bare for Trondheim.
  Andre kommuners oversikt må klargjøres før tilsvarende heldekkende visning
  kan hevdes; detalj-WMS alene løser ikke den grove målestokkgrensen.
- Levende WMS/REST-kilder er ikke et versjonert regnskapsgrunnlag. Kommunal
  dekning og kildeplaner varierer; registreringsfravær er ikke fravær av naturverdi.
- Kildeplanfilteret er uendret. Kontrollerte Trondheim-planflater med status 2,
  bl.a. formål 1001/1160, omfatter også bygd areal. Dette er ingen dokumentert
  filterfeil; visningen skal ikke mekanisk skjule slike flater.
- Objektinspeksjon gjelder naturtypelokaliteter; generell inspektør,
  planobjektinformasjon og nye temaer er ikke implementert.
- Manuell godkjenning og eventuell ekstern testlenke er separate neste steg.
