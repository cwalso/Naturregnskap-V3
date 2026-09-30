# Leveranse C: Trondheim 5001 – Nivå 0-data

**Dato:** 2026-09-30  
**Status:** Blokkert på autorisert kildenedlasting. Beregningsløpet er klart.

## Mål

Produsere et etterprøvbart Nivå 0-resultat for Trondheim kommune (5001) fra
Nasjonalt grunnkart for arealanalyse – Årsversjon 2025:

- Natur
- Jordbruk
- Bebygd

Resultatet skal beregnes med metoden fra Leveranse B
(`level0-v0.3-prototype`) og skrives som:

```text
.data/grunnkart/2025/prepared/5001.json
```

## Autoritativ kilde

Datasett:

- Nasjonalt grunnkart for arealanalyse – Årsversjon 2025
- metadata UUID: `28c28e3a-d88f-4a34-8c60-5efe6d56a44d`
- kommune: `5001`
- navn i Geonorge: `Trondheim – Tråante`
- foretrukket format for dette beregningsløpet: GML
- projeksjon: EUREF89 / UTM sone 32, EPSG:25832

GML velges fordi Leveranse B kan beregne areal direkte fra metrisk
polygongeometri og dermed ikke er avhengig av et separat arealfelt.

## Verifisert mot Geonorge 2026-09-30

En maskinell kontroll mot Geonorge nedlastings-API ga:

```text
GET capabilities                  -> HTTP 200
område 5001                       -> Trondheim – Tråante
projeksjon                        -> EPSG:25832
format                            -> GML
POST ordre uten GeoID-rolle       -> HTTP 500
respons:
"Order contains restricted datasets, but user does not have required role
for 28c28e3a-d88f-4a34-8c60-5efe6d56a44d"
```

Datasettet er dermed tilgjengelig i riktig kommuneutvalg, format og projeksjon,
men selve vektorfilen kan ikke hentes anonymt. Tilgangen krever gyldig
GeoID/Norge digitalt-rettighet for det tilgangsbegrensede datasettet.

## Det som ikke skal brukes som erstatning

Følgende skal ikke brukes til å konstruere Trondheim-regnskapet:

- WMS
- kartbilder eller pikseltelling
- skjermbilder
- SSB-arealstatistikk som erstatning for Grunnkart-beholdningen
- andre tilnærmede kommunearealtall

Dette sikrer at tallene i Oversikt kommer fra samme heldekkende og versjonerte
regnskapsgrunnlag som metoden forutsetter.

## Når kildefilen er tilgjengelig

Legg den autoriserte GML-leveransen lokalt, for eksempel:

```text
.data/grunnkart/2025/source/grunnkart_5001.gml
```

Kjør fra `apps/api`:

```bash
python -m app.scripts.prepare_account_balance_gml \
  --municipality 5001 \
  --input ../../.data/grunnkart/2025/source/grunnkart_5001.gml \
  --output ../../.data/grunnkart/2025/prepared/5001.json
```

## Akseptansekriterier før tall kan brukes

Resultatet kan først brukes når alle disse er oppfylt:

1. Kilden inneholder bare kommune 5001.
2. Kilde-CRS er metrisk EPSG:25832 eller EPSG:25833.
3. Alle arealbærende `okosystemtypeniva1`-verdier er eksplisitt mappet.
4. Ingen ukjent klasse er automatisk lagt til Natur.
5. `unmappedAreaM2 = 0`.
6. Klassifisert + eksplisitt ekskludert areal rekonsilerer mot geometriberegnet
   kildeareal innen beregningstoleransen.
7. Prepared-resultatet har metodeversjon `level0-v0.3-prototype`.
8. Kildehash, kildeformat, antall objekter og arealmetode er lagret.
9. De tre arealtallene gjennomgås som kontroll før de vises som reelle
   Trondheim-tall.

## Neste nødvendige input

Den eneste manglende innsatsen i Leveranse C er den autoriserte
Trondheim-leveransen fra Geonorge. Når GML-filen eller ZIP-en fra Geonorge er
tilgjengelig, kan resten av leveransen gjennomføres uten ny metodeutvikling.
