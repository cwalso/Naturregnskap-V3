# V3.4: Første beholdningsbalanse 2025 – blokkert research gate

**Dato:** 2026-08-18
**Utgangspunkt:** `32e261f14eccac30ed1146fe144fea8e6df721b3`
**Status:** Research gate blokkert; ingen regnskapsmotor besluttet

## Beslutning

V3.4 implementerer ikke operative regnskapstall i denne endringen. Tilgang fra
arbeidsmiljøet til Geonorges capabilities, metadata og produktmodell ble
blokkert før faktisk distribusjon, GeoPackage-skjema og komplett nivå-1-
klassifikasjon kunne undersøkes. Å implementere resten av kjeden ville dermed
brutt kravet om ikke å basere regnskapstall på antakelser.

Det eneste arkitekturgrepet utenfor dokumentasjonen er å reservere `.data/` som
gitignorert runtime-område. Det er ikke en aktiv analysekilde og inneholder ingen
committede data.

## Research-resultat og tilgang

Den eksplisitte API v3 capabilities-ruten og API-hjelpen svarte HTTP 403
`Domain forbidden` i dette miljøets nettverkslag. Geonorge-metadata ble avvist
på samme måte. Dette avgjør ikke om den virkelige distribusjonen er anonym,
gratis, direkte, kommunevis eller bestillingsbasert. Det avgjør bare at disse
egenskapene ikke kunne verifiseres her. Detaljert evidens og listen over åpne
felt ligger i `docs/data/grunnkart-2025-analysis-source.md`.

Ingen filstørrelse ble kjent, så ingen nasjonal eller kommunevis nedlasting ble
startet. Ingen ekte smoke-test ble kjørt.

## Analysis source og WMS

Ingen `analysisSource` velges før en faktisk vektordistribusjon er validert. Det
eksisterende WMS-et forblir utelukkende `visualSource`: ferdig tegnede bilder
kan ikke dokumentere kildeklassene eller brukes til eksakt geometriinterseksjon
og arealberegning.

Hvis gaten senere passerer, skal lokal runtime-data ligge deterministisk under
`.data/grunnkart/2025/{municipality_number}/` og aldri lastes i webrequesten fra
en asynkron bestillingsflyt.

## GIS og kommune-klipping

Det er ikke valgt eller lagt til GIS-bibliotek, fordi faktisk GeoPackage-format,
skjema og CRS ikke ble bekreftet. En senere beslutning må begrunne det minste
nødvendige biblioteksettet for GeoPackage-lesing, CRS-transformasjon,
interseksjon og areal.

En senere motor skal bruke kommunegeometrien fra den eksisterende
Kartverket-adapteren, eventuelt bruke kommunenummer som prefilter, og alltid
utføre endelig geometrisk klipping i et dokumentert metrisk CRS. Den skal telle
null, tomme og ugyldige geometrier; eventuell reparasjon skal være synlig i
provenance og warnings.

## Prototype-regelsett

`built`, `agriculture` og `nature` forblir de stabile domenekategoriene. Den
foreslåtte kildemappingen og navnet `level0-v0.1-prototype` er bare en
arbeidshypotese. Verken mappingen, havbehandlingen eller status `prototype` er
implementert, fordi faktisk nivå-1-kodeliste ikke ble observert. Dette er heller
ikke en endelig metodegodkjenning.

Før implementering må alle arealbærende kildeklasser være eksplisitt mappet
eller ekskludert. «Hav» kan bare behandles som `excluded` dersom faktisk felt og
klasse er bekreftet. Ukjente klasser skal gi `unmappedAreaKm2` og hindre at et
resultat presenteres som komplett.

## Rekonsiliering og prosent

En senere motor skal rekonsiliere klassifisert, ekskludert og unmapped areal og
aldri la en klasse forsvinne stille. Ingen nevner for prosentandel er metodisk
besluttet; `sharePercent` skal derfor være `null` når et resultat senere
implementeres.

## API og frontend

Endepunktet `GET /api/municipalities/{municipality_number}/account-overview` og
frontendkoblingen opprettes ikke i denne blokkerte endringen. Et tomt endepunkt
ville antydet en tilgjengelig analyse, og fake nuller eller eksempelverdier
ville blandet teknisk utilgjengelighet med et beregnet resultat. V3.3-visningen
fortsetter derfor å vise «Ikke beregnet ennå», mens kart, WMS og kommunegrense er
uendret.

## Begrensninger og ny beslutning

Research må gjentas fra et miljø med tilgang til de offisielle tjenestene. En ny
beslutning skal dokumentere capabilities, faktisk avgrenset GeoPackage,
klasseliste, mapping, bibliotek, CRS, geometrihåndtering, rekonsiliering og en
intern konsistent live smoke-test før README eller UI påstår operativ beregning.
