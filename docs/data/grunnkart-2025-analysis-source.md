# Grunnkart 2025 som analysekilde – research gate

**Undersøkt:** 2026-08-18  
**Metadata UUID:** `28c28e3a-d88f-4a34-8c60-5efe6d56a44d`  
**Research gate:** Erstattet av V3.4B sin lokale Parquet/preparation-gate

> Oppdatert 2026-08-19: Direkte Geonorge-nedlasting er ikke runtime-løsningen i
> prototypen. Kommunevis lokal Parquet er `analysisSource` for offline
> preprocessing, API-et leser kun prepared JSON, og eksisterende WMS forblir
> separat `visualSource`. Se beslutningen
> `2026-08-19-v3-4b-parquet-account-balance.md`.

## Konklusjon

Codex-miljøet kunne ikke lese de aktuelle Geonorge-rutene. Forespørsler ble
stanset av miljøets nettverkslag med HTTP 403 og teksten `Domain forbidden`.
Dette er en miljøbegrensning og er ikke dokumentasjon på at datasettet i seg
selv krever betaling eller autentisering.

Etter Codex-kjøringen ble flere forhold verifisert uavhengig mot offisielle
kilder:

- Årsversjon 2025 er publisert med distribusjoner i GeoPackage, File Geodatabase
  og GML, i tillegg til WMS.
- Kildedataene i årsversjon 2025 var oppdatert per `2025-01-01`.
- Geonorges nedlastings-API dokumenterer `capabilities` som inngang til
  datasettspesifikke formater, projeksjoner og områder, og anbefaler eksplisitt
  versjonerte `/api/v3/...`-ruter.
- Produktmodellen for `GrunnkartFlate` dokumenterer blant annet
  `arealdekkeNiva1`, `arealdekkeNiva2`, `arealdekkeKode` og `kommunenummer`, med
  `GM_MultiSurface` som geometri.
- Offisiell kartografi for Arealdekke nivå 1 viser de elleve etikettene:
  «Bebygd og opparbeidet areal», «Dyrket mark», «Grasmark», «Skog»,
  «Hei og buskmark», «Lite vegetert mark», «Våtmark», «Elver, bekker og
  kanaler», «Innsjøer og vannmagasiner», «Kyststrender, svaberg og dyner» og
  «Hav».

Dette er tilstrekkelig til å redusere den metodiske usikkerheten betydelig, men
ikke til å implementere den operative regnskapsmotoren. Vi mangler fortsatt en
faktisk GeoPackage og den datasettspesifikke capabilities-responsen. Dermed er
faktiske GPKG-feltnavn/-koder, CRS, områdeinndeling, filstørrelse og konkret
tilgangsmekanisme fortsatt ikke verifisert.

Stoppregelen for implementering opprettholdes. Det er ikke innført
`analysisSource`, nivå-0-regelsett, GIS-avhengigheter, API-resultater eller ekte
regnskapstall.

## Offisielle kilder

| Kilde | Rute | Status |
| --- | --- | --- |
| Download API v3 capabilities | `https://nedlasting.geonorge.no/api/v3/capabilities/28c28e3a-d88f-4a34-8c60-5efe6d56a44d` | Ikke lest direkte; Codex-miljøet ga `Domain forbidden` |
| Download API-hjelp | `https://nedlasting.geonorge.no/Help` | Verifisert utenfor Codex-miljøet |
| Geonorge metadata | `https://kartkatalog.geonorge.no/metadata/uuid/28c28e3a-d88f-4a34-8c60-5efe6d56a44d` | Codex-miljøet blokkerte direkte lesing |
| data.norge.no datasettoppføring | `https://data.norge.no/nb/datasets/ad38290e-2c12-3b77-96a8-fa07e02eefa7/nasjonalt-grunnkart-for-arealanalyse` | Verifisert utenfor Codex-miljøet |
| Produktmodell | `https://objektkatalog.geonorge.no/Pakke/Index/EAPK_5B9FBB40_744A_478b_A65D_DCAB5A9ADF2D` | Verifisert utenfor Codex-miljøet |
| GrunnkartFlate | `https://objektkatalog.geonorge.no/Objekttype/Index/EAID_E5DAD727_89F3_4234_B6FB_1A2D067C930A` | Verifisert utenfor Codex-miljøet |
| Digital kartografi | `https://register.geonorge.no/kartografi/files/files?uuid=28c28e3a-d88f-4a34-8c60-5efe6d56a44d` | Verifisert utenfor Codex-miljøet |

## VERIFISERT

### Datasett og distribusjon

- Datasettet er «Nasjonalt grunnkart for arealanalyse – Årsversjon 2025».
- Metadata-UUID er `28c28e3a-d88f-4a34-8c60-5efe6d56a44d`.
- Årsversjon 2025 finnes som GeoPackage, File Geodatabase og GML.
- WMS for årsversjon 2025 er en separat visualiseringstjeneste.
- Kildedataene i denne årsversjonen var oppdatert per `2025-01-01`.
- data.norge.no merker datasettet som «Begrenset tilgang» og viser
  Norge digitalt-lisens for distribusjonene. Dette alene avklarer ikke den
  praktiske tilgangsmekanismen for vår bruk; faktisk capabilities må fortsatt
  undersøkes.

### Nedlastings-API

Geonorges offisielle API-hjelp dokumenterer at en klient starter med
`capabilities` for metadata-UUID. Capabilities peker videre til datasettets
støttede:

- formater
- projeksjoner
- områder
- nedlastings-/ordreoperasjoner

API-dokumentasjonen anbefaler `/api/v3/...` for å unngå framtidige breaking
changes. API-et støtter både ferdig genererte filer og datasett der leveransen må
genereres etter bestilling; `deliveryNotificationByEmail` brukes til å angi om
e-post kreves. Hvilken variant Grunnkart 2025 faktisk bruker er fortsatt ikke
verifisert uten den konkrete capabilities-responsen.

### Produktmodell

Offisiell produktmodell beskriver `GrunnkartFlate` som en sammenhengende flate
med `GM_MultiSurface` og blant annet disse obligatoriske egenskapene:

- `arealdekkeNiva1`
- `arealdekkeNiva2`
- `arealdekkeKode`
- `kommunenummer`

Modellen dokumenterer også arealbruk, økosystemtype, kilder og flere øvrige
egenskaper. Dette bekrefter at kommunenummer kan brukes som et mulig prefilter,
men erstatter ikke kravet om geometrisk kontroll/klipping i regnskapsmotoren.

### Arealdekke nivå 1 – offisielle etiketter

Den offisielle kartografien for årsversjon 2025 viser følgende nivå-1-klasser:

1. Bebygd og opparbeidet areal
2. Dyrket mark
3. Grasmark
4. Skog
5. Hei og buskmark
6. Lite vegetert mark
7. Våtmark
8. Elver, bekker og kanaler
9. Innsjøer og vannmagasiner
10. Kyststrender, svaberg og dyner
11. Hav

Dette bekrefter etikettene, men ikke de faktiske kodeverdiene eller hvordan
feltnavn og koder er realisert i den nedlastede GeoPackage-filen.

## ARBEIDSHYPOTESE – ikke implementert

På bakgrunn av den verifiserte nivå-1-listen er følgende prototypehypotese nå
bedre underbygget, men fortsatt ikke implementert:

- `built`: «Bebygd og opparbeidet areal»
- `agriculture`: «Dyrket mark»
- `nature`: Grasmark, Skog, Hei og buskmark, Lite vegetert mark, Våtmark,
  Elver/bekker/kanaler, Innsjøer/vannmagasiner og Kyststrender/svaberg/dyner
- `excluded`: Hav

En eventuell metodeversjon skal hete `level0-v0.1-prototype` med status
`prototype`.

Før denne mappingen kodes må den kontrolleres mot faktisk GPKG-felt og komplette
kodeverdier. Den skal heller ikke omtales som endelig eller metodegodkjent.

## IKKE AVKLART

| Tema | Status |
| --- | --- |
| Faktisk capabilities-respons for datasettet | Ikke avklart |
| Eksakt GeoPackage format-id i API-et | Ikke avklart |
| Støttede CRS i konkret distribusjon | Ikke avklart |
| Kommune som valgbar geografisk area i API-et | Ikke avklart |
| Ferdige kommunefiler kontra generering på bestilling | Ikke avklart |
| Krav om e-post for akkurat dette datasettet | Ikke avklart |
| Praktisk autentisering/tilgang for distribusjonen | Ikke avklart |
| Direkte download-URL for GPKG | Ikke avklart |
| Mulighet for én kommune uten nasjonal fil | Ikke avklart |
| Filstørrelse | Ikke avklart |
| Faktisk GPKG-filnavn | Ikke avklart |
| Kilde-CRS og valgt beregnings-CRS | Ikke avklart |
| Faktisk GPKG layer-navn | Ikke avklart |
| Objekttall i testkommune | Ikke avklart |
| Faktiske GPKG-feltnavn og datatyper | Ikke avklart |
| Faktiske nivå-1-kodeverdier | Ikke avklart |
| Fullstendig rekonsiliering mot faktisk GPKG | Ikke avklart |

## Krav til neste research-forsøk

1. Kjør datasettets v3-capabilities i et miljø som tillater direkte tilgang og
   lagre responsen med hentetidspunkt.
2. Bekreft format-id, områdeinndeling, tilgangsvilkår, direkte/asynkron mekanisme
   og størrelse før nedlasting.
3. Foretrekk én kommune dersom capabilities tilbyr kommune som area. Ikke last
   ned nasjonal fil blindt.
4. Åpne faktisk GeoPackage og noter filnavn, bytes, CRS, lag, objekttall,
   geometritype, relevante kolonner og datatyper.
5. Hent distinct kombinasjoner av nivå-1-kode og etikett.
6. Sammenhold alle arealbærende klasser med prototype-regelsettet.
7. Pass implementeringsgaten først når ingen arealbærende klasse forsvinner
   stille eller er faglig tvetydig.
