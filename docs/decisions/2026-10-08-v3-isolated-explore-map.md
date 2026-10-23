# Separat kartpresentasjon for Utforsk i kart

Dato: 08.10.2026

Status: under implementering; ikke aktivert i offentlig brukerflate.

Presiserer presentasjonsretningen i
`2026-10-08-v3-locality-presentation-and-value-priority.md`. Metodebeslutningene
der beholdes. Historiske ADR-er omskrives ikke.

## Bakgrunn

Manuell kontroll av offentlig prototype viser at naturtypelokaliteter og
overlapp ikke er tydelige nok. Dagens visning kobler temapresentasjonen til
analysegeometri, svakt kontekstfyll og Canvas-klipp. En grønn metode-/state-test
er ikke tilstrekkelig bevis for at brukeren ser temaflater i kartet.

## Beslutning og implementeringsrekkefølge

- Bygg `ExploreAnalysisMap` separat; ikke utvid `municipalityMap.ts`.
- Vis Verdsatte naturtyper med etablert WMS. REST-geometri beholder rollen
  som analysekilde og grunnlag for mulig objektvalg.
- Behold eksisterende beregninger, fire verdikategorier, høyeste verdi,
  unik overlapp, UTM-korreksjon, grid, DiBK-filter, identitet og cachelogikk.
- Bruk nøytral bakgrunn, vanlig vektormaske utenfor kommunegrensen og et
  selvstendig planlag fra eksisterende gyldig analysemaske. Den masken omfatter
  også gyldige Bebygd-/vannpiksler; den er ikke bare Natur/Jordbruk.
- Kontroller visuelt A: naturtyper alene, B: plan alene, C: begge,
  D: tydelig overlapp, deretter E: Natur/Jordbruk. Hvert trinn må bestå før
  neste bygges. Kontrollerte render-fixtures erstatter ikke reelle skjermbilder.
- Bare ett av de to eksisterende analysetemaene skal være aktivt. Ingen
  lagkatalog eller nye analysefamilier. Tegnekode beholdes.
- Resultat-/filter-/objektvalg skal ikke zoome eller flytte utsnittet.
  Bare kommuneendring eller eksplisitt «Vis hele kommunen» kan tilpasse utsnitt.
- Etter godkjent kart: forenkle panelet til antall lokaliteter, unikt
  overlappsareal, fordeling/liste og sekundær dekning/metode/forbehold.
- Behold gammel kartimplementasjon og offentlig kobling til alle visuelle
  trinn er godkjent. Ingen PR før overlappen i D er åpenbar.

## Status og begrensninger

Trinn A er visuelt kontrollert med reell Trondheim-grense og naturtype-WMS.
Lokaliteter er synlige, også etter manuell zoom/pan. Mobilbredde er kontrollert.
Trinn B har en separat visningsadapter for eksisterende planmask, men reell
visuell kontroll er blokkert: plantjenesten kan ikke nås gjennom testmiljøets
nettverksproxy. Dette er ikke en dokumentert feil i DiBK-tjenesten og ikke
bevis for null planområder. Domenet `nap.ft.dibk.no` må være tillatt i miljøet.

C–E, overlappsvisning, objektvalg, nytt resultatpanel og kobling i `App.tsx`
er ikke implementert. Den offentlige prototypen bruker fortsatt gammel
kartkode. Utskiftingen er ikke ferdig eller visuelt akseptert.

Kontrollerte nettlesertester leser faktiske sammensatte skjermbildepiksler for
WMS-lokaliteter og hele planmasken, kommuneavgrensning, temabytte,
analyseidentitet, manuell navigasjon og opprydding. De tester ikke overlapp
eller levende plantjeneste. Nettleserbaserte analyser er fortsatt
prototypebeslutningsstøtte, ikke autoritative regnskapstall.
