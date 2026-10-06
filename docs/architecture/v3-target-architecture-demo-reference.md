# V3 målbilde – teknisk referanse fra Publicdemorepo

**Dato:** 2026-10-06  
**Status:** Målbilde for videre V3-utvikling

## Utgangspunkt

Publicdemorepo viser at mye av den praktiske verdien i et kommunalt
naturregnskap kan realiseres med en enkel dataflyt:

```text
kommunevalg
  -> autoritativ kilde
  -> avgrensning mot kommune
  -> enkel analyse / klassifisering
  -> kart + tall + objekter
```

V3 skal ta med seg denne enkelheten, men ikke kopiere demonstratorens
monolittiske implementasjon. V3 skal beholde et tydelig skille mellom:

1. selve naturregnskapet
2. supplerende temadata
3. analyse- og beslutningsstøtte
4. veiledning og formidling

Publicdemorepo brukes som funksjonell og teknisk referanse. Repoet har ingen
lisensfil, og kode skal derfor ikke kopieres. Mønstrene reimplementeres i V3.

## Arkitekturprinsipp: hybrid

V3 skal ikke gjøre alle datakilder til backend-prosesser. Samtidig skal
regnskapskritiske beregninger ikke flyttes ut i nettleseren.

```text
                         Valgt kommune
                              |
                      felles kommunekontekst
                              |
             +----------------+----------------+
             |                |                |
      Regnskapsmotor     Temadatamotor     Kartmotor
      versjonert         dynamisk          dynamisk
      etterprøvbar       supplerende       visualisering
             |                |                |
             +----------------+----------------+
                              |
                       fire temasider
```

### Regnskapsmotor

Brukes når resultatet skal omtales som del av naturregnskapet.

Krav:

- heldekkende og definert regnskapsområde
- eksplisitt metodeversjon
- eksplisitt dataversjon
- dokumentert bokføringsregel
- autoritativ arealberegning
- rekonsiliering
- sporbarhet

Frontend skal ikke eie disse beregningene.

### Temadatamotor

Brukes for supplerende innsikt, for eksempel verneområder, villrein,
verdsatte naturtyper og inngrepsfri natur.

Mønster:

```text
kommunegrense
  + feature-/karttjeneste
  -> treff / objekter / eventuell arealanalyse
  -> tydelig dekning og begrensning
```

Dynamiske kilder kan brukes direkte eller via backend-adapter avhengig av CORS,
stabilitet, geometribehov og behov for felles validering.

### Kartmotor

WMS og tilsvarende karttjenester brukes til rask visualisering. Et WMS-bilde er
ikke et autoritativt arealgrunnlag. Samme datasett kan derfor ha både
`visualSource` og `analysisSource`.

## Felles kommunekontekst

Kommunevalg er inngangen til hele tjenesten. Følgende skal deles på tvers av
alle temasider:

- kommunenummer og navn
- kommunegrense
- aktive datakilder
- regnskapsstatus
- temadatastatus
- karttilstand
- cache for data som allerede er hentet

Bytte mellom temasider skal ikke utløse unødvendig ny nedlasting av samme data.

## Funksjonsmapping fra Publicdemorepo

| Funksjon i demonstratoren | V3-plassering | Rolle i V3 |
| --- | --- | --- |
| Kommunevalg | Felles skall | Felles kontekst for alle sider |
| Kommunegrense fra Kartverket | Felles kjerne | Avgrensning, kart og analyser |
| NIBIO Grunnkart WMS | Oversikt + Utforsk i kart | Visualisering av heldekkende grunnlag |
| Gruppering Bebygd/Jordbruk/Natur i kart | Oversikt + Utforsk i kart | Presentasjon; regnskapstall kommer fra regnskapsmotor |
| SSB 09594 hovedtall | Ikke regnskapsgrunnlag uten metodevedtak | Kan brukes som referanse/validering, ikke erstatte Grunnkart-regnskap |
| SSB tidsserie | Naturtapet, evt. referanse | Må ikke presenteres som faktisk arealendring uten egnet endringsprodukt |
| Verneområder | Hva slags natur har vi? + kart | Supplerende temadata |
| Villrein | Hva slags natur har vi? + kart | Supplerende temadata, regional dekning |
| Verdsatte naturtyper | Hva slags natur har vi? + kart | Supplerende temadata; dekningsgrad må vises |
| INON | Hva slags natur har vi? + kart | Supplerende indikator |
| Objektliste og faktaark | Utforsk i kart | Objektinformasjon og kilde |
| Klikk i kart | Utforsk i kart | Objektidentifikasjon |
| Caching i nettleser | Felles kjerne | Ytelse og færre kall |
| Teknisk kall-logg | Utviklerdiagnostikk | Ikke primær brukerfunksjon |
| Kommuneplan / planlagt utbygging | Ikke i første V3 | Holdes utenfor inntil mandat/metode er avklart |
| Oversiktsbilde ved lav zoom | Kartmotor | Mulig ytelsesstrategi, ikke fagmodell |

## Fire temasider

### 1. Oversikt

Primærspørsmål:

> Hvor mye natur har kommunen?

Skal vise:

- Natur
- Dyrket mark som brukerrettet presentasjon av jordbrukskategorien
- Bebygd
- kompakt kart
- datagrunnlag og metode sekundært

Tall som omtales som naturregnskap skal komme fra den versjonerte
regnskapsmotoren. Kartet kan hentes dynamisk fra NIBIO.

### 2. Naturtapet

Primærspørsmål:

> Hvor mye natur er dokumentert bygget ned over tid?

Skal skille mellom:

- dokumentert endring
- statistisk kontekst
- eventuell naturtypefordeling når metode og kilder støtter det

Aggregert SSB-statistikk kan brukes som kontekst, men ikke konstrueres til
stedfestede tap eller omtales som faktisk endringsanalyse dersom kilden ikke
støtter dette.

### 3. Hva slags natur har vi?

Primærspørsmål:

> Hva vet vi mer om naturen i kommunen?

Skal inneholde to tydelige lag:

1. heldekkende informasjon som metodisk kan kobles til regnskapsgrunnlaget
2. supplerende temadata

Første prioriterte supplerende tema:

- verneområder
- villrein
- verdsatte naturtyper
- inngrepsfri natur

For hvert tema skal V3 vise kilde, dekning, treffstatus og viktige
begrensninger.

### 4. Utforsk i kart

Primærspørsmål:

> Hvor ligger arealene og de registrerte naturverdiene?

Skal være den mest fleksible arbeidsflaten:

- Grunnkart
- supplerende kartlag
- objektinformasjon
- klikkbare kildelenker
- lag av/på
- kommunegrense
- senere eventuelt analyseverktøy

Kartet skal ikke gjøre visuelle lag om til regnskapsdata uten separat
analysegrunnlag.

## Datakildekontrakt

Alle kilder som brukes i V3 skal beskrive minst:

- identifikator
- faglig rolle
- hvilke temasider kilden kan brukes på
- dataeier
- visualiseringskilde
- analysekilde
- versjon eller status som løpende tjeneste
- geografisk dekning
- viktige begrensninger

Dette registeret er den tekniske kontrakten mellom fag, data og presentasjon.

## Prioritert implementeringsrekkefølge

1. Felles kommunekontekst og cache.
2. Dataset-register med eksplisitt rolle per temaside.
3. Oversikt kobles til regnskapsmotor + NIBIO-kart.
4. Hva slags natur har vi? utvides med verdsatt natur og INON.
5. Utforsk i kart bruker samme registrerte kilder.
6. Naturtapet kobles til eget endringsgrunnlag når dette er avklart.

Det sentrale er ikke å kopiere én enkelt nettside, men å beholde den enkle
dataflyten samtidig som V3 får sporbarhet, klare faglige skiller og et
forvaltbart design- og kodegrunnlag.
