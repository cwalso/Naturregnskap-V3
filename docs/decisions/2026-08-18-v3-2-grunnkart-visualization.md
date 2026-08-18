# V3.2: Dataset registry og visualisering av Grunnkart

**Dato:** 2026-08-18  
**Utgangspunkt:** `def9674` (V3.1: Kommunevalg og kart)

## Beslutning

Nasjonalt grunnkart for arealanalyse introduseres nå fordi det er det
heldekkende beholdningsgrunnlaget for regnskapskjernen. V3.2 gjør bare den første
kontrollerte visualiseringen og beregner ikke et naturregnskap.

Dataset registry registrerer «Nasjonalt grunnkart for arealanalyse – Årsversjon
2025» i kategorien `account`, med `version` lik `2025` og
`sourceDataCutoff` lik `2025-01-01`. NIBIO er registrert som utgiver og
tjenesteleverandør. Eget felt for dataeier er ikke brukt i V3.2, fordi offentlige
metadata ikke gir et tilstrekkelig entydig grunnlag for å skille dette presist fra
utgiver, tjenesteleverandør og samarbeidsansvar. Grunnkartet er utviklet i
samarbeid mellom NIBIO, SSB, Kartverket og Miljødirektoratet.

Offisiell GetCapabilities ble hentet 2026-08-18. Tjenesten bruker WMS 1.3.0, og
laget er identifisert med:

- endepunkt: `https://wms.nibio.no/cgi-bin/grunnkart_arealanalyse`
- `Name`: `arealdekkeniva1`
- `Title`: `Arealdekke nivå 1`
- støttede CRS, arvet fra rotlaget: `EPSG:4258`, `EPSG:4326`, `EPSG:3035`,
  `EPSG:25832`–`EPSG:25836`, `EPSG:32632`–`EPSG:32636`, `EPSG:3857` og
  `EPSG:900913`

Tittelen i den aktive tjenesten inneholder ikke årsversjonen; versjonen
dokumenteres derfor separat i dataset-definisjonen og vises sammen med
lagkontrollen.

## Visualisering og analyse

WMS-kilden klassifiseres som `visualSource` fordi den leverer ferdig tegnede
bilder til kartvisning. Slike bilder er ikke et autoritativt grunnlag for
klassifisering, overlay, statistikk eller arealberegning. `analysisSource` er
derfor eksplisitt `null`. En analysekilde kan bare innføres senere gjennom en ny,
eksplisitt metode- og arkitekturbeslutning.

Kartlaget er aktivert som standard slik at dette stegets nye regnskapsgrunnlag
blir synlig når brukeren velger og zoomer til en kommune. Det ligger mellom det
topografiske bakgrunnskartet og kommunegrensen og kan slås av uten å påvirke
kommunevalg eller -grense.

## Avgrensning

V3.2 omfatter ikke regnskapsberegning, analysegrunnlag eller filnedlasting,
arealtall, statistikk, klassifisering, GetFeatureInfo, WFS, GIS-overlay,
kommune-klipping, temadata, historiske endringer, plananalyse eller rapportering.
