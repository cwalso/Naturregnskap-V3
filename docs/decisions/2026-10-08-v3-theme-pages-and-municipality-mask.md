# ADR – Temasidesett og kommuneavgrenset kartvisning

**Dato:** 08.10.2026  
**Status:** Godkjent for V3-prototypen

## Kontekst

Prototypen fikk flere mulige økosystem-/temainnganger enn det produktmessige
målbildet tilsa. Samtidig viste temakart data utenfor valgt kommune, og en
tidlig canvas-klippeløsning gjorde enkelte lag ustabile eller usynlige.

## Beslutning – temasider

Gjeldende temasider er:

1. Myr (våtmark)
2. Skog
3. Verdsatte naturtyper
4. Verneområder
5. Villreinområder
6. Inngrepsfri natur
7. Bynaturen (grå arealer)

Det skal ikke opprettes nye temasider uten eksplisitt beslutning.

## Faglig rolle

- Skog og Myr/våtmark bygger på heldekkende Grunnkart.
- Verdsatte naturtyper, verneområder, villrein og inngrepsfri natur er
  supplerende temadata/indikatorer.
- Bynaturen/grå arealer er ikke en egen økosystemtype, men analyse- og
  beslutningsstøtte rundt den utbygde delen av kommunen.

## Beslutning – kartavgrensning

Temadata skal ikke vises utenfor valgt kommune på temasidene.

Dagens strategi er:

- temalaget tegnes normalt
- et maskelag dekker området utenfor kommunegrensen
- kommunegrensen tegnes over
- lag begrenses til kommunens extent der det er hensiktsmessig

Direkte canvas-klipping som tidligere gjorde temalag usynlige er forlatt.

## Konsekvenser

- kommunegrensen er del av presentasjonskontrakten for temasider
- nye temalag må fungere med samme maskemønster
- objektspørring utenfor kommunegrensen skal ikke gi tematreff
