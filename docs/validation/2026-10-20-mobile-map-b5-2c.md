# B5.2c – forbedret kart- og analyseinteraksjon

20.10.2026. Branch `feat/explore-analysis-map`, [PR #76](https://github.com/cwalso/Naturregnskap-V3/pull/76).
Start-HEAD lokalt/remote: `7ce5dfd0c4735b415a75206504956d89fa47eccc`, ren arbeidskopi.
Main ved oppstart: `a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`.
[Beslutning](../decisions/2026-10-20-analysis-interaction.md).
Ingen Pages-publisering eller B5.2d inngår.

## C1 – eksplisitt karttilpassing

Lokalitetsvalg bruker ikke lenger `fit=true`. Kategori, KU-verdi, naturtype og
lokalitet endrer utvalg/markering, uten å endre senter/oppløsning. Begge analysetyper
har eksplisitt fit også på desktop. På mobil ligger handlingen i eksisterende
oppsummering og krever ikke ekstra permanent kontrollrad.

Før var eksplisitt naturverdi-fit begrenset til lokaliteter og brukte hele
lokalitetsgrensen. Nå bruker den analysehandlingens allerede tegnede overlappsflate
for alle utvalg. Dette krever én avgrenset endring i kartadapterens analysehandling;
OpenLayers, generell kommunetilpassing og kilder/lag/beregninger er uendret.
Ingen geometri kopieres, omformes eller erstattes. Eksisterende analysegeometri
valideres kun som et endelig, ikke-degenerert polygonutsnitt før fit aktiveres.
Kommune, metode og ikke-tom analyse-ID kontrolleres også; manglende/tom geometri
deaktiverer handlingen med forklaring.

C1 kontrollert før C2: 199/199 full frontendkjøring og 26/26 målrettede tester
(inkludert tre nye), lint uten feil og build består. Reell Chromium fullført: 22
skjermtilstander, fire bredder, alle mobilmoduser, begge analyser. Senter/oppløsning
beholdes ved alle utvalg; eksplisitt fit samsvarer med utvalgets tegnede extent og
36 px eksisterende padding. Kartinstans/ID/konsumentkall beholdes. 22 axe-kontroller
uten rapporterte brudd. [Kontrollfil](2026-10-20-mobile-map-b5-2c/c1-checks.json).
Ved 900 px bruker testen eksisterende tilbake-til-lag/resumer-analyse-flyt, siden
laglisten og analysepanelet deler sideplassen; ingen ny desktopstruktur er innført.

## C2 – direkte tilgang til eksisterende innhold

En native innholdsvelger i resultatpanelet gir direkte tilgang til Samlet resultat,
KU-verdi, Naturtyper, Lokaliteter og søk, og Metode/datagrunnlag. Arealfordeling har
Samlet arealfordeling, Økosystemtype, Ufordelt natur og Metode/forbehold. Valg flytter
fokus til relevant overskrift, søkefelt, eksisterende ufordelt-rad eller åpnet
metodefold. Utvalg, søk/sortering, analyse-ID, kartutsnitt og konsument beholdes.
Tabeller og resultatkomponenter finnes bare én gang og gjenbrukes uten nye analyser.

Velgeren ligger i den eksisterende resultatplassen, over et internt rulleområde.
Ingen ny rad legges til over kartet eller i den faste oppsummeringen. Delt-kartets
mål er derfor uendret. De første kontrollene av en sticky velger avdekket en delvis
tildekket knapp ved innholdshopp; endelig løsning har velger og rulleinnhold som
søsken i panelet, slik at innhold ikke ruller bak primærkontrollen. Desktop beholder
sidepanelprinsippet, analysetypevalget og samme resultater.

C2 kontrollert før C3: 204/204 frontendtester og 32/32 målrettet etter justert
rulleområde, lint uten feil (kun eksisterende varsel) og build består. Reell
Chromium fullført: 30 skjermtilstander, 30 axe-kontroller uten rapporterte brudd.
Direkte hopp til søk, KU og åpnet metode bevarer utvalg, søketekst, kartgeometri,
utsnitt, ID og konsumentkall. Delt-kart er fortsatt 208,55/270,55 px.
[Kontrollfil](2026-10-20-mobile-map-b5-2c/c2-checks.json).
