# V3.4: Første beholdningsbalanse 2025 – research gate delvis avklart

**Dato:** 2026-08-18  
**Utgangspunkt:** `32e261f14eccac30ed1146fe144fea8e6df721b3`  
**Status:** Datakilde og klassifikasjon delvis verifisert; operativ regnskapsmotor fortsatt ikke implementert

## Beslutning

V3.4 implementerer ikke operative regnskapstall i denne endringen.

Codex-miljøet ble blokkert av sitt nettverkslag før det kunne lese Geonorges
capabilities og åpne en faktisk GeoPackage. Etter Codex-kjøringen er flere
forhold likevel verifisert uavhengig mot offisielle kilder: årsversjon 2025 er
tilgjengelig som GeoPackage, GML og File Geodatabase; produktmodellen inneholder
de relevante arealdekkeegenskapene og kommunenummer; og den offisielle
kartografien dokumenterer de elleve nivå-1-etikettene.

Det er derfor ikke riktig å betrakte selve datasettet eller klassifikasjonen som
uavklart i sin helhet. Implementeringsgaten forblir likevel stengt fordi den
faktiske GeoPackage-filen og datasettets konkrete capabilities-respons ikke er
inspisert. Vi mangler dermed blant annet faktisk GPKG-skjema, kodeverdier, CRS,
områdeinndeling, filstørrelse og praktisk tilgangsmekanisme.

Det eneste arkitekturgrepet utenfor dokumentasjonen er å reservere `.data/` som
gitignorert runtime-område. Det er ikke en aktiv analysekilde og inneholder ingen
committede data.

## Verifisert etter Codex-kjøringen

Offisielle kilder bekrefter:

- Årsversjon 2025 har GeoPackage-, File Geodatabase- og GML-distribusjoner.
- Kildedataene i denne årsversjonen var oppdatert per `2025-01-01`.
- Geonorges nedlastings-API bruker `capabilities` som rot for å finne
  datasettspesifikke formater, projeksjoner og områder, og dokumentasjonen
  anbefaler eksplisitt `/api/v3/...`.
- Produktmodellen for `GrunnkartFlate` har `GM_MultiSurface` og obligatoriske
  egenskaper som `arealdekkeNiva1`, `arealdekkeNiva2`, `arealdekkeKode` og
  `kommunenummer`.
- Offisiell kartografi for Arealdekke nivå 1 viser klassene «Bebygd og
  opparbeidet areal», «Dyrket mark», «Grasmark», «Skog», «Hei og buskmark»,
  «Lite vegetert mark», «Våtmark», «Elver, bekker og kanaler», «Innsjøer og
  vannmagasiner», «Kyststrender, svaberg og dyner» og «Hav».

Detaljene og åpne punkter er dokumentert i
`docs/data/grunnkart-2025-analysis-source.md`.

## Tilgang og capabilities

Codex-miljøets HTTP 403 `Domain forbidden` var en miljøbegrensning og er ikke
evidens for at Geonorge faktisk avviser brukeren.

data.norge.no merker likevel datasettet som «Begrenset tilgang» og viser Norge
digitalt-lisens for distribusjonene. Dette må ikke tolkes videre enn metadataene
støtter. Før implementering skal den konkrete capabilities-responsen avklare
praktisk områdevalg, format-id, projeksjon, direkte/bestillingsbasert levering,
e-postkrav og eventuell autentisering.

Ingen filstørrelse er verifisert og ingen nedlasting er startet. Ingen ekte
smoke-test er derfor kjørt.

## Analysis source og WMS

Ingen `analysisSource` aktiveres før en faktisk vektordistribusjon er åpnet og
validert. Det eksisterende WMS-et forblir utelukkende `visualSource`: ferdig
kartografi skal ikke brukes som grunnlag for autoritative arealberegninger.

Når implementeringsgaten passerer, skal lokale analysedata ligge deterministisk
under `.data/grunnkart/2025/{municipality_number}/` eller tilsvarende og ikke
committes til Git.

## GIS og kommune-klipping

Det velges fortsatt ikke GIS-bibliotek i denne endringen. Bibliotekvalg tas når
faktisk GPKG, CRS og distribusjonsmåte er kjent.

Regnskapsmotoren skal senere kunne bruke `kommunenummer` som effektivt prefilter,
men endelig resultat skal bygge på eksplisitt kommunegeometri og dokumentert
geometrisk klipping/interseksjon i et egnet metrisk CRS. Null, tomme, ugyldige
eller reparerte geometrier skal håndteres og rapporteres eksplisitt.

## Prototype-regelsett

`built`, `agriculture` og `nature` forblir de stabile domenekategoriene.

Den offisielle nivå-1-listen gir nå et bedre grunnlag for følgende
prototypehypotese:

- `built`: Bebygd og opparbeidet areal
- `agriculture`: Dyrket mark
- `nature`: øvrige land-/ferskvannsklasser
- `excluded`: Hav

Metodeversjonen kan, dersom faktisk GeoPackage bekrefter klassene og kodene,
innføres som `level0-v0.1-prototype` med status `prototype`.

Dette er fortsatt ikke en endelig metodegodkjenning. Mappingen skal ikke kodes
før den er kontrollert mot faktiske GPKG-kodeverdier. Alle arealbærende klasser
skal være eksplisitt mappet eller ekskludert; ukjente klasser skal gi
`unmappedAreaKm2` og hindre at resultatet presenteres som komplett.

## Rekonsiliering og prosent

En senere motor skal rekonsiliere klassifisert, ekskludert og unmapped areal og
aldri la en kildeklasse forsvinne stille.

Nevner for prosentandel er fortsatt ikke metodisk besluttet. `sharePercent` skal
derfor være `null` i første operative implementering.

## API og frontend

Endepunktet `GET /api/municipalities/{municipality_number}/account-overview` og
frontendkoblingen opprettes ikke i denne dokumentasjonsendringen. V3.3 fortsetter
å vise «Ikke beregnet ennå» mens kart, WMS og kommunegrense fungerer som før.

## Neste beslutningspunkt

Neste implementasjonsforsøk skal først:

1. hente datasettets konkrete v3-capabilities,
2. avklare om en kommune kan hentes som avgrenset GeoPackage,
3. åpne faktisk GPKG og kontrollere skjema, CRS og nivå-1-koder,
4. validere prototype-mappingen mot alle arealbærende klasser.

Når disse fire punktene er oppfylt, kan GIS-stack, `analysisSource`,
regnskapsmotor, API og live smoke-test implementeres i samme vertikale slice.
