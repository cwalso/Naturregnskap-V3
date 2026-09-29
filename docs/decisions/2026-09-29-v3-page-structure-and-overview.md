# Beslutning: sidestruktur og Oversikt i V3

Dato: 2026-09-29

## Status

Besluttet for V3-prototypen.

## Beslutning

Frontend organiseres i fire brukerrettede visninger:

- Oversikt
- Naturtapet
- Utforsk naturen
- Utforsk i kart

Navigasjonen løses foreløpig med hash-baserte URL-er i eksisterende React/Vite-applikasjon. Det innføres ikke et eget routing-bibliotek nå.

## Domeneskille

Visningene skal støtte et tydelig skille mellom:

1. selve naturregnskapet, basert på felles metode og heldekkende regnskapsgrunnlag
2. supplerende natur- og temadata
3. analyse- og beslutningsstøtte
4. veiledning og formidling

Oversikt er første helhetlige brukerflate og viser dagens Level0-regnskap med Natur, Jordbruk og Bebygd, brukerrettet proveniens og kartvisning.

Naturtapet skal ikke bygge på en forutsetning om stedfestede utbyggingspolygoner. Siden skal senere fylles med dokumentert naturtap på det detaljeringsnivået tilgjengelig statistikk og metodegrunnlag faktisk støtter.

Utforsk naturen skal senere samle supplerende temadata og skal ikke framstille disse som selve regnskapsgrunnlaget.

Utforsk i kart skal gi en mer selvstendig inngang til kartutforsking. Avansert scenarioanalyse inngår ikke i denne leveransen.

## Syntetiske endringsdata

Eksisterende syntetisk endringsarkitektur beholdes teknisk, men syntetiske endringer skal ikke presenteres som ordinært brukerinnhold på Oversikt eller som faktisk Naturtapet.

## Hvorfor hash-navigasjon nå

V3 har få, flate visninger uten parametriserte eller nestede ruter. Hash-navigasjon gir adresserbare visninger og korrekt aktiv navigasjon uten ny dependency. Behovet for et routing-bibliotek vurderes på nytt dersom navigasjonsstrukturen blir mer kompleks.
