# Arbeidslogg: V3.1 kommunevalg og kart

**Dato:** 2026-08-18  
**Utgangspunkt:** `c57543406a168e07dcea2353c083a8e117f7788d`

## Beslutninger

Kartverkets Administrative enheter API brukes fordi det er Kartverkets
offisielle tjeneste for kommuneliste og kommuneområder. Vår backend normaliserer
kommunene til egne modeller og returnerer kommunegrensen som et GeoJSON Feature.

Det eksterne API-et skjules bak en Kartverket-adapter. Frontend avhenger dermed
av våre endepunkter og vår kontrakt, ikke av leverandørens URL-er, feltnavn eller
feilhåndtering. Adapteren setter eksplisitt timeout og oversetter tekniske feil
og uventede svar til en kontrollert upstream-feil.

Kartverkets åpne topografiske bakgrunnskart lastes direkte i OpenLayers. Det er
en `visualSource`, ikke et analysegrunnlag, og direkte lasting unngår en
unødvendig proxy. Kommunegeometrien leses som EPSG:4326 og transformeres av
OpenLayers til kartets EPSG:3857. Kartmodulen eier kart, view, bakgrunnskart,
vektorlag og tilpassing av utsnittet; React-komponenten eier brukerflyten.

## Avgrensning

V3.1 innfører ikke naturregnskap, natur- eller temadata, arealberegninger,
GIS-overlay, statistikk, KPA, analyseverktøy, opplasting, database, caching,
autentisering, rapportering eller dataset registry. Kommunegrensen brukes bare
til navigasjon og visning. Bakgrunnskartet skal ikke brukes til analyse.
