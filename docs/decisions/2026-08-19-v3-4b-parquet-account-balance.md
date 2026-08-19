# V3.4B: Kommunevis Parquet til prepared nivå-0-balanse

**Dato:** 2026-08-19  
**Status:** Akseptert for prototype

## Beslutning

Grunnkart 2025 kan brukes som lokal `analysisSource` gjennom en eksplisitt,
offline kjede:

```text
.data/grunnkart/2025/source/grunnkart_{municipality_number}.parquet
  → inspect → mapping-gate → prepare
  → .data/grunnkart/2025/prepared/{municipality_number}.json
  → FastAPI → typed view model → frontend
```

Store Parquet-filer leses aldri i en HTTP-request. API-et åpner bare den lille
prepared JSON-filen. Dette gir forutsigbar responstid og gjør validering,
rekonsiliering og provenance etterprøvbart før et tall publiseres.

Filkonvensjonen bruker kommunenummer og produksjonslogikken kjenner ingen
kommunenavn eller særkommuner. Funksjonell dekning er derfor landsdekkende,
mens datadekning følger hvilke kommuner som har en valid prepared-fil. `5054`
er kun et dokumentert første eksempel, ikke en kodegren.

Parquet-, prepared- og filesystem-konvensjonene er utelukkende detaljer i
backend og offline preprocessing. Frontend kjenner bare det typed
account-overview API-et og har ingen avhengighet til PyArrow, Parquet, JSON-filer
eller lokale filbaner.

## Mapping-gate og metode

Nivå-0-balansen bygges utelukkende fra **Arealdekke nivå 1** i feltet
`arealdekkeniva1`. Arealdekke nivå 1 og Økosystemtype er separate
klassifikasjoner: `okosystemtypeniva1/2/3` kan rapporteres av inspector, men
brukes ikke i nivå-0-beregningen. Økosystemtype hører til et senere spor for
«Naturen i dag».

Den faktiske `grunnkart_5054.parquet` er nå inspisert. Filen inneholder bare
kommunenummer `5054`, geometri kodet som WKB/MultiPolygon i ETRS89 / UTM sone
33N (EPSG:25833), og følgende maskinlesbare, case-sensitive kodeverdier
(camelCase/lowercase) i `arealdekkeniva1`:

- `bebygdSamferdsel`
- `jordbruk`
- `skog`
- `snaumark`
- `myr`
- `ferskvann`
- `hav`

Regelsettet `level0-v0.1-prototype` har status `prototype` og mapper de
verifiserte kildekodene slik: `bebygdSamferdsel` → `built`, `jordbruk` →
`agriculture`, `skog`, `snaumark`, `myr` og `ferskvann` → `nature`, og `hav` →
`excluded`. Bare eksplisitt oppførte kildeverdier kan bli `nature`,
`agriculture`, `built` eller
`excluded`. En ukjent arealbærende klasse rapporteres og blokkerer skriving av
prepared-resultatet; den blir aldri implisitt Natur. Resultatet rekonsilerer
klassifisert, ekskludert og unmapped areal.

Mappingen er verifisert mot 5054-filen, men dette dokumenterer ikke alle mulige
nasjonale Arealdekke nivå 1-verdier. En ny kildekode i en annen kommune skal
fortsatt stoppe preparation og må verifiseres før regelsettet eventuelt utvides.
Det brukes ingen normalisering, fuzzy matching eller fallback.

I 5054-filen finnes `SHAPE_Area` som `double` uten nullverdier; geometry har
heller ingen nullverdier, og kilde-CRS-et er metrisk EPSG:25833. Dette er ikke
tilstrekkelig til å erklære `SHAPE_Area` endelig validert som polygonareal i m².
Feltet må fortsatt kontrolleres mot et geometrisk utvalg før første reelle
prepared-resultat godtas. Prototypens
prepare-kommando beregner ikke areal fra WMS, BBOX, EPSG:4326 eller EPSG:3857.

## API og presentasjon

`GET /api/municipalities/{municipality_number}/account-overview` returnerer
`available` med areal i km² når et komplett prepared-resultat finnes, ellers
`not_available` med `null` — aldri falske nuller. Frontend konverterer km²
eksplisitt til dekar (`1 km² = 1 000 dekar`) og viser `XX` med en diskret
prototypeforklaring når data ikke er klargjort. Prosent er utsatt og
`sharePercent` er alltid `null` i V3.4B.

Grunnkart-WMS-et forblir uendret `visualSource` i OpenLayers. Kart, kommunegrense,
lagkontroll og tegnforklaring er uavhengige av om account-data finnes. Parquet
brukes ikke til et nytt kartlag.

## Kjøring med første reelle fil

Fra repo-roten, etter at filen er lagt i source-katalogen:

```bash
cd apps/api
python -m app.scripts.inspect_grunnkart_parquet \
  ../../.data/grunnkart/2025/source/grunnkart_5054.parquet
python -m app.scripts.prepare_account_balance \
  --municipality 5054 \
  --input ../../.data/grunnkart/2025/source/grunnkart_5054.parquet \
  --output ../../.data/grunnkart/2025/prepared/5054.json \
  --area-field SHAPE_Area
```

Den siste kommandoen skal bare kjøres med `SHAPE_Area` dersom inspector og
kildedokumentasjon bekrefter at feltet er polygonareal i m² og geometrisk
stikkprøve er tilfredsstillende. Faktisk feltnavn skal brukes case-sensitivt.
