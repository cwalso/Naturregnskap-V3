# Felles prototypeindikatorer for økosystemareal i planområder

Besluttet av oppdragsgiver 15.10.2026, B1 i Issue #77/PR #76.

Skog og Myr/våtmark skal bruke eksisterende `calculatePlanArea` som felles
kilde for indikatorene om økosystemareal i framtidige planavsetninger.
Oversikt og kart bruker samme resultat, identitet og klassifiserte delceller.
Beslutningen erstatter bare kilden til disse temasideindikatorene, ikke
beholdningsberegninger, planfilter, klassifikasjon eller analysemetode.

Dette gir konsistens i prototypen og er ikke en endelig godkjenning av den
bildebaserte beregningsmetoden. Delvis fordeling, ufordelt natur, tekniske feil
og manglende kommunegrunnlag skal være synlige. Identifisert nullareal er ikke
bevis for fravær av naturtypen. Planavsetning er ikke faktisk/forventet naturtap.

Temakortet åpner Arealfordeling med riktig kategori, uten automatisk fit.
Skogsidens arealdekke-beholdning beholdes. Myr/våtmarks beholdning beholdes;
en andel som blander den med ny delvis planfordeling beregnes ikke.
Eldre beregningsmoduler beholdes for øvrige/tilbakeholdte bruksområder, men
de gamle temasideindikatorene beregnes eller presenteres ikke parallelt.

Se [differanseundersøkelse](../validation/2026-10-15-ecosystem-overlap-differences.md)
og [leveranse-/kontrollrapport](../validation/2026-10-15-ux-improvements-b1-b4.md).
