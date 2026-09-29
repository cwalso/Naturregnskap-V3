# Beslutning: Level0-beregning for beholdning i Oversikt

**Dato:** 2026-09-29  
**Status:** Implementert som prototype, datatilgang for Trondheim gjenstår

## Formål

Oversikt skal først vise kommunens beholdning på nivå 0:

- Natur
- Dyrket mark / jordbruk
- Bebygd

Dette er beholdningen. Historiske endringer behandles senere som overganger
mellom de samme hovedklassene og skal ikke brukes til å konstruere dagens
beholdning.

## Kilde og klassifikasjon

Beholdningen beregnes fra årsversjon 2025 av Nasjonalt grunnkart for
arealanalyse.

Beregningen bruker **Arealdekke nivå 1**, ikke økosystemtype. Årsversjon 2025
har åtte maskinlesbare nivå-1-klasser:

| Arealdekke nivå 1 | Kodeverdi | Level0 |
| --- | --- | --- |
| Bebygd og samferdsel | `bebygdSamferdsel` | Bebygd |
| Jordbruk | `jordbruk` | Dyrket mark / jordbruk |
| Skog | `skog` | Natur |
| Snaumark | `snaumark` | Natur |
| Myr | `myr` | Natur |
| Snø og isbre | `snoIsbre` | Natur |
| Ferskvann | `ferskvann` | Natur |
| Hav | `hav` | Ekskludert i gjeldende prototype |

`snoIsbre` er lagt til etter kontroll mot de offisielle
presentasjonsreglene for årsversjon 2025. Ukjente kodeverdier blokkerer
resultatet; de blir aldri automatisk klassifisert som Natur.

## Arealberegning

Det er implementert to kontrollerte innganger:

1. Kommunevis Parquet, der et validert metrisk arealfelt summeres.
2. Kommunevis GML, der areal beregnes direkte fra polygongeometrien.

GML-beregningen:

- krever kommuneleveranse i ETRS89 / UTM 32 eller 33
- leser `GrunnkartFlate`
- krever `kommunenummer` og `arealdekkeniva1`
- beregner areal fra ytterringer minus eventuelle hull
- summerer alle polygoner/MultiSurface-deler
- avviser geografisk CRS som EPSG:4258 for arealberegning
- stopper på ukjente klasser
- stopper dersom kommuneleveransen inneholder en annen kommune
- rekonsilerer geometriberegnet kildeareal mot klassifisert + ekskludert areal

Ingen arealtall beregnes fra WMS, kartpiksler, skjermbilde, BBOX i Web
Mercator eller en prosentvis antakelse.

## Nøyaktighet

For Parquet-sporet er `SHAPE_Area` tidligere kontrollert mot direkte
geometriberegning i et utvalg på 1 000 polygoner i den reelle 5054-filen.
Avviket lå på ordinært flyttallsnivå.

GML-sporet beregner areal direkte i metrisk UTM-geometri med dobbel
flyttallspresisjon. Dette fjerner usikkerheten som ville oppstått ved å måle
et rendret kartbilde. Den praktiske nøyaktigheten begrenses derfor primært av
selve Grunnkart-geometrien og klassifikasjonen, ikke av beregningsmetoden.

## Trondheim 5001

Geonorges offentlige Atom-feed er kontrollert maskinelt og inneholder en egen
GML-leveranse for kommune 5001 Trondheim, blant annet i EPSG:25832.

Nedlastings-API-et oppgir samtidig
`accessConstraintRequiredRole = nd.filnedlasting`. Anonym nedlasting av den
identifiserte Trondheim-filen gir HTTP 403 i GitHub Actions. Det er derfor
ikke lagt inn eller publisert Trondheim-tall uten kildefilen.

Så snart en autorisert Trondheim-fil er tilgjengelig, er kjeden:

```text
5001 GML (EPSG:25832)
  -> inspect_grunnkart_gml
  -> mapping gate
  -> geometrisk arealberegning
  -> rekonsiliering
  -> prepared/5001.json
  -> FastAPI account-overview
  -> Oversikt
```

Dette skal være en datatilgangsgate, ikke en grunn til å erstatte Grunnkart
med en annen statistikkilde.


## Sporbarhet i hvert beregnet resultat

Hvert prepared Level0-resultat lagrer nå:

- SHA-256 av den eksakte kildefilen
- kildeformat
- antall kildeobjekter
- eksplisitt arealmetode
- metodeversjon
- beregningstidspunkt
- klassifisert, ekskludert og umappet areal

Dette gjør at et publisert tall kan knyttes tilbake til både dataversjon, fysisk
kildefil og beregningsmåte. UI-et viser de viktigste opplysningene under
«Om datagrunnlaget».

## Kjøring når Trondheim-filen er tilgjengelig

For en GML-leveranse i EPSG:25832:

```bash
cd apps/api
python -m app.scripts.inspect_grunnkart_gml /sti/til/trondheim_5001.gml
python -m app.scripts.prepare_account_balance_gml \
  --municipality 5001 \
  --input /sti/til/trondheim_5001.gml
```

Andre kommando skal bare kjøres videre dersom inspeksjonen viser kommune 5001,
forventede Arealdekke nivå 1-koder og metrisk CRS. Ukjente klasser stopper
beregningen.


## Metodisk presisjon kontra geometrisk presisjon

Denne implementasjonen skiller mellom to typer nøyaktighet:

1. **Geometrisk/beregningsmessig presisjon.** Areal kan beregnes direkte fra
   metrisk kildegeometri eller et validert arealfelt. Denne delen er
   deterministisk og kan rekonsileres ned på kildearealet.
2. **Metodisk klassifikasjon.** Resultatet er bare så faglig presist som den
   eksplisitte Level0-regelen. Regelsettet har derfor fortsatt status
   `prototype` selv om selve summeringen er eksakt og reproducerbar.

Gjeldende aksepterte V3-regel bygger Level0-beholdningen fra
`arealdekkeniva1`, ikke `okosystemtypeniva1`. Økosystemtype er en separat
klassifikasjon og brukes i sporet for mer detaljert informasjon om naturen.

Før produksjonssetting må minst følgende vurderes eksplisitt:

- Arealdekke nivå 1 `snaumark` omfatter på nivå 2 også
  «Snaumark (konstruert)». Årsversjon 2025 kan blant annet kode bergverk som
  konstruert snaumark. Gjeldende Level0-regel mapper hele nivå-1-klassen
  `snaumark` til Natur.
- Kildeklassen `jordbruk` omfatter mer enn det ordet «Dyrket mark» isolert
  sett kan gi inntrykk av. «Dyrket mark» er i V3 en brukerrettet etikett for
  den stabile domenekategorien `agriculture`, ikke en ny kildeklassifikasjon.
- Hav er foreløpig eksplisitt ekskludert i beholdningsregelen, mens enkelte
  arbeidsutkast for endringsanalyse grupperer hav under Natur. Dette må
  harmoniseres før en metodeversjon kan omtales som endelig.

Disse punktene skal ikke løses ved skjult omkoding. En endring i
klassifikasjonsregelen skal gi ny metodeversjon og være synlig i tidsserier og
sammenligninger.
