# B5.2c – eksplisitte analysehandlinger og innholdsnavigasjon

20.10.2026. Eksplisitt oppdrag på PR #76, etter valgt C i B5.2a–b.

Valg endrer utvalg og markering. Bare eksplisitt Tilpass kart/Vis hele kommunen,
kommunevalg og nødvendig førstegangsinitialisering endrer utsnittet. Det tillatte
unntaket for automatisk lokalitets-fit i B5.2b opphører.

Tilpass kart bruker eksisterende analysegeometri: rasterbaserte kategoriutvalg
for Arealfordeling og `selectionGeometry`/overlappsflaten for Registrerte
naturverdier, også ved lokalitetsvalg. Hele lokaliteten er fortsatt kontekst og
nevner for andel, men skal ikke styre analyse-fit. Valg og fit bruker samme
kommuneeide resultat/identitet. Ugyldig eller tom geometri deaktiverer handlingen.

Kartadapterens eksisterende `setFutureNature`-analysehandling tilpasses dette
konkrete behovet: eksplisitt fit bruker allerede montert overlap-source og virker
for alle analyseutvalg. Det er den eneste endringen der. OpenLayers-motoren,
generell kommunetilpassing, kilder, lag-/loadinglogikk og geografiske resultater
endres ikke. Ingen metodeendring eller alternativ geometriberegning innføres.

Innholdsnavigasjon og lokalitetsdetaljer skal gjenbruke eksisterende resultater,
søk og tabeller i samme panel. Nullstill utvalg omfatter også lokalitetssøk og
analysefiltre, men aldri ordinære lag, utsnitt eller aktiv analysetype.

Se [kontrollrapport](../validation/2026-10-20-mobile-map-b5-2c.md).
Fire testede commits (C1–C4), ingen Pages-publisering, merge, main-endring eller
automatisk oppstart av B5.2d.
