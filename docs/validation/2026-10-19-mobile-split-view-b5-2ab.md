# B5.2a–b – Delt kart- og analyseflate på mobil

19.10.2026. [PR #76](https://github.com/cwalso/Naturregnskap-V3/pull/76).
Start-HEAD lokalt/remote: `0e2aaba5528f16cd5a179b4375d3791b4d479a24`;
ren arbeidskopi. Main: `a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`.

Oppdragsgivers valg er **C – Delt arbeidsflate**, og erstatter anbefalingen av A
fra [B5.1](../design/2026-10-16-mobile-map-analysis-b5-1.md).
[Ny eksplisitt beslutning](../decisions/2026-10-19-mobile-split-view.md).
Ingen Pages-publisering inngår. Arbeidet deles i to commits; B5.2a fullføres
og kontrolleres før mobilpresentasjonen i B5.2b.

## B5.2a – Aktiv analyse uavhengig av panel

`ExploreThemesWorkspace` har nå en egen aktiv analysetype, uavhengig av valgt
kontekstpanel/lagvelger. Beregningskonsumentene har aktiv type, kommune og
kommunegrense som avhengigheter, uten panelavhengighet. Eksisterende moduler,
cache, eier- og abortkontroll beholdes. Panelet kan være skjult mens allerede
startet analyse fullføres; avsluttet/gammel konsument kan ikke publisere sent.

Kartets eksisterende setPlanArea/setFutureNature mottar samme resultatobjekt
og utvalg gjennom panelskift. Resultatpanelet beholdes montert når det skjules;
søk og sortering overlever midlertidig innstillinger/legend/lagvisning. Ny type
eller kommune nullstiller ugyldige valg, og typeskifte monterer nytt innhold.
«Avslutt analyse» er atskilt fra å skjule resultatene. Avslutning fjerner
markering og utvalg, men beholder ordinære lag/opasitet og utsnitt.

Automatiserte overganger dekker begge analyser, uendret konsument under skjult
panel, beholdt utvalg/søk, typebytte og sene kommunesvar. 197/197 frontendtester,
ESLint uten feil (ett eksisterende Fast Refresh-varsel) og TypeScript/Vite build
består. Eksisterende varsel om stor JS-chunk beholdes.

Reell Chromium-kontroll fullført med faktiske tjenester og OpenLayers ved
1440×960: Skog 2 032,22 daa, ufordelt 706,71 daa og naturverdier 119,38 daa.
Skog-/lokalitetsutvalg, analyse-ID, hash av faktisk kartgeometri, senter/oppløsning,
samme instans og antall analysekall er uendret gjennom innstillinger/legend og
retur. Søk etter BN00109936 beholdes; Oslo fjerner alle gamle tall/markeringer.
Avslutt analyse tømmer begge analysemarkeringer. 30/30 backendtester og Ruff består.
En første nettkjøring fikk timeout før naturverdier; den fullførte kjøringen har
begge faktiske resultater, uten produksjonsendring for å omgå kilde-/beregningsløpet.
[Kontrollfil](2026-10-19-mobile-split-view-b5-2ab/a/checks.json),
[Skog gjennom innstillinger](2026-10-19-mobile-split-view-b5-2ab/a/a-area-settings-1440.png),
[lokalitet etter retur](2026-10-19-mobile-split-view-b5-2ab/a/a-locality-return-1440.png),
[Oslo](2026-10-19-mobile-split-view-b5-2ab/a/a-oslo-no-old-results-1440.png).
Testens Vite-plugin eksponerer kartreferanse og teller konsumentkall; koden for
kartmotor, datakilder og beregninger er uendret. B5.2b dokumenteres i neste commit.
