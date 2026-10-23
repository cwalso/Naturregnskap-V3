# Geometrisk planoverlapp for verdsatte naturtyper

Dato: 13.10.2026. Status: godkjent som grunnlag for videreutvikling av prototypen i oppgaven, implementert og kontrollert med reelle Trondheim-data. Ikke en formell nasjonal regnskapsmetode.

Denne beslutningen presiserer 08.10-ADR-en om verdiprioritet og 09.10-ADR-en om selvstendig planpresentasjon. De historiske dokumentene beholdes.

## Beslutning

- Metodeversjon `future-valued-nature-geometry-v3` måler geometrisk overlapp mot rasterbasert analyseavgrensning. Den erstatter det gamle kortets midtpunktberegning; øvrige analyser beholder sine metoder.
- DiBK-filteret er uendret: `kparealformalomrade`, `arealbruksstatus=2`, formål `1*`/`2*`. Juridisk planstatus verifiseres ikke ytterligere.
- Masken gjenbruker planvisningens nivå-9-sampling, alfagrenser og Natur/Jordbruk-klassifisering. Ingen stripefjerning. Celler er 21,15625 m i EPSG:25833. Den faste analysemasken overtar planpresentasjonen mens analysepanelet er aktivt; vanlig detaljkart gjenopprettes ved lukking. Statistikken og analysens plankart har dermed samme støtte, også ved innzooming. Lagvalg og opasitet beholdes.
- Kildepolygoner klippes geometrisk mot maskens celleflater. Konturer spores bare innen hver lokalitets romlige vindu. Det opprettes ikke individuelle polygonobjekter for hele kommunegridet. `polygon-clipping` er en liten geometriavhengighet; OpenLayers er fortsatt eneste kartmotor.
- Høyeste av de fire dokumenterte KU-kategoriene får fellesareal. Kategorienes arealer summerer til global union innen 0,01 m² før arealkorreksjon. Lokalitetstall følger faktisk KU-kategori. Lokalitetenes arealer og ulike naturtyper kan overlappe; naturtypeareal unioneres innen hver type og er ikke additivt mellom typer.
- Faglig nøkkel er ID-en i kildens `FaktaarkLokalitet` (NiN/Naturbase). `KuverdiNaturtypeId` og KU-faktaarket må stemme med original-ID-en og de verifiserte formatene `VKU-<ID>`/`VKU-UN-<ID>`. OBJECTID brukes bare til henting og sporbarhet. Ukjente ID-formater stopper analysen. Konflikt i type/verdi for samme original-ID stopper analysen.
- Først hentes kandidatobjekter med geometri i maskens envelope, uten KU-filter. Deretter verifiseres alle objekter for original-ID-ene globalt, uten romlig avgrensning, med eksakte KU-ID-oppslag og maksimalt fire samtidige kall. Alle manglende deler hentes. Transfer limits/manglende batchobjekter gir oppdeling eller feil. Geometri hentes uten `geometryPrecision` eller `maxAllowableOffset`.
- Hele lokalitetens geografiske union er nevner, også utenfor kommunen. Teller og nevner bruker samme kommunemidtpunkt-korreksjon fra `utmArea.ts`. Andel er teller/nevner × 100. Ugyldig, manglende, ufullstendig eller nullareal-geometri stopper publisering av tall; ingen automatisk reparasjon. Andre KU-kategorier telles separat som utelatte kildeobjekter i uttrekket.
- Resultatet beholder full geometri, faktisk overlappsgeometri, kategoriens vinnende geometri og union per naturtype. Tabell og kart bruker samme resultat. Vanlige filtervalg gjør ikke fit. Eksplisitt lokalitetsvalg kan gjøre fit. Reset av utvalg flytter ikke utsnittet; «Vis hele kommunen» er eksplisitt utsnittsreset.
- Beregningen ligger utenfor React-render. Ny resultatcache er avgrenset til 16 fullførte, metodeversjonerte kommuneresultater i økten; den deler ikke resultater med v2. Abort og kommuneeier kontrolleres før resultat lagres/vises. Råflis-cache og øvrig cachelogikk er uendret.

## Sporbarhet og begrensninger

Analyse-ID inneholder metode, kommunenummer, SHA-256 av masken og SHA-256 av komplett kildeuttrekk. Uttrekksdato, celleoppløsning, Grunnkart-år, rasterets referansedato, korreksjon og beregningstid følger resultatet.

KU/DiBK er løpende tjenester, uten en felles låst dataversjon. Referanseuttrekk og beregnede geometrier er lagret komprimert i valideringsmappen; dette gjør kontrollen reproduserbar. Klargjort raster finnes bare for Trondheim. Oslo rapporteres som manglende analysegrunnlag, ikke null treff. Rastergrense og ca. 21 m planavgrensning er ikke eksakte kommune-/planpolygoner. Kildens registreringer er ikke heldekkende naturkunnskap.

Dette er supplerende beslutningsstøtte, ikke naturtap, konsekvensutredning eller selve naturregnskapet.

[Resultater, kildekontroll, uavhengig GEOS-verifikasjon og skjermbilder](../validation/2026-10-13-future-nature.md).
