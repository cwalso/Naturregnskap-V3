# Beslutning: Oversikt starter med Level0-beholdningen

Dato: 2026-09-29

## Status

Besluttet for V3-prototypen.

## Beslutning

Oversikt er første kapittel i brukerreisen og skal først svare på det mest
grunnleggende spørsmålet:

> Hvor mye av kommunen er Natur, Dyrket mark og Bebygd?

Level0-beholdningen vises derfor umiddelbart etter introduksjonen. Natur gis
størst visuell vekt, mens Dyrket mark og Bebygd vises som de to øvrige
hovedkategoriene.

Den tidligere forklaringsflaten om regnskapsgrunnlag før tallene tas bort fra
første leseflyt. Metode, kilde og avgrensninger er fortsatt tilgjengelige under
tallene gjennom proveniensinformasjonen.

## Begreper

Den stabile domenekategorien er fortsatt `agriculture`. Den brukerrettede
etiketten endres fra «Jordbruk» til «Dyrket mark».

Dette bygger på prototype-mappingen der kildekoden `jordbruk` i Grunnkart for
arealanalyse er mappet til `agriculture`, og på beslutningsgrunnlaget for
Level0 som beskriver den brukerrettede kategorien som «Dyrket mark».

«Arealregnskap 2025» skal ikke brukes som overskrift for denne visningen.
Visningen omtales som «Arealbasert naturregnskap · 2025» for å unngå å blande
naturregnskap og arealregnskap.

## Presentasjon

Oversikten skal:

- vise absolutte arealtall i dekar
- ikke vise prosent eller relative søyler før prosentnevneren er metodisk avklart
- bruke Natur som hovedkort
- vise Dyrket mark og Bebygd som likeverdige øvrige Level0-kategorier
- føre brukeren videre med spørsmål som «Hva har gått tapt?» og «Hva slags natur har vi?»

Kartet på Oversikt omtales som «arealgrunnlaget i kart». Kart-WMS-et viser et
mer detaljert nivå enn de tre Level0-kategoriene og skal derfor ikke framstilles
som en direkte kartgjengivelse av de tre aggregerte regnskapstallene.

## Konsekvens

Oversikt blir en enklere og mer sammenhengende inngang til naturregnskapet:
først beholdning, deretter endring, mer detaljert naturinformasjon og kart.
