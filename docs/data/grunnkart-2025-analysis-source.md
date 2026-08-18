# Grunnkart 2025 som analysekilde – research gate

**Undersøkt:** 2026-08-18
**Metadata UUID:** `28c28e3a-d88f-4a34-8c60-5efe6d56a44d`
**Research gate:** **BLOCKED**

## Konklusjon

Denne arbeidsøkten kunne ikke validere den faktiske distribusjonen eller åpne en
GeoPackage. Nettverkslaget i utviklingsmiljøet avviste alle forespørsler til de
aktuelle Geonorge-domenene med HTTP 403 og teksten `Domain forbidden`. Den
samme capabilities-ruten feilet via både HTTP og HTTPS, nettleserlignende
`User-Agent`, `curl` og `httpx`. Dette er en begrensning i forskningsmiljøets
tilgang, ikke dokumentasjon på at datasettet krever betaling, autentisering eller
Norge digitalt-medlemskap.

Stoppregelen er derfor utløst. Det er ikke innført analysekilde, nivå-0-mapping,
nedlastingskommando, GIS-avhengigheter, API-resultater eller ekte tall. Det ville
krevd antakelser om både distribusjon, skjema og klassifikasjon.

## Undersøkte offisielle kilder

| Kilde | Rute | Resultat i dette miljøet |
| --- | --- | --- |
| Download API v3 capabilities | `https://nedlasting.geonorge.no/api/v3/capabilities/28c28e3a-d88f-4a34-8c60-5efe6d56a44d` | HTTP 403 `Domain forbidden` |
| Download API-hjelp | `https://nedlasting.geonorge.no/Help` | HTTP 403 `Domain forbidden` |
| Geonorge metadata | `https://kartkatalog.geonorge.no/metadata/uuid/28c28e3a-d88f-4a34-8c60-5efe6d56a44d` | HTTP 403 `Domain forbidden` |
| data.norge.no datasettoppføring | `https://data.norge.no/nb/datasets/ad38290e-2c12-3b77-96a8-fa07e02eefa7/nasjonalt-grunnkart-for-arealanalyse-arsversjon-2025` | Forsøk via nettverktøy kunne ikke autoriseres; innhold ikke brukt som evidens |
| Produktmodell | `https://objektkatalog.geonorge.no/Pakke/Index/EAPK_5B9FBB40_744A_478b_A65D_DCAB5A9ADF2D` | Forsøk via nettverktøy kunne ikke autoriseres; innhold ikke brukt som evidens |

## VERIFISERT

- Repositoryets besluttede domenekategorier er `built`, `agriculture` og
  `nature`. Dette er regnskapskategorier, ikke kildeklassifikasjonen.
- Datasetidentiteten oppgitt for undersøkelsen er «Nasjonalt grunnkart for
  arealanalyse – Årsversjon 2025», med metadata-UUID-en over.
- Repositoryet registrerer `2025` som datasetversjon og `2025-01-01` som
  `sourceDataCutoff`, og bruker WMS-laget `arealdekkeniva1` bare som
  `visualSource`.
- De faktiske HTTP-forsøkene i dette miljøet ble stanset før API-respons eller
  distribusjonsfil kunne leses.
- Ingen rådata eller GeoPackage er lastet ned eller lagt i Git.

«Verifisert» her betyr enten kontrollert repository-tilstand eller faktisk
observert nettverksresultat. Det betyr ikke at capabilities eller produktdata er
verifisert.

## ARBEIDSHYPOTESE – ikke implementert

Oppgavens foreløpige prototypehypotese er at kildeklassene kan gi en entydig
mapping der «Bebygd og opparbeidet areal» blir `built`, «Dyrket mark» blir
`agriculture`, øvrige land-/ferskvannsklasser blir `nature`, og «Hav» blir
ekskludert. En eventuell metodeversjon skal hete
`level0-v0.1-prototype` og ha status `prototype`.

Hypotesen er ikke bekreftet mot faktisk GeoPackage eller komplett offisiell
kodeliste og er derfor ikke kodet.

## IKKE AVKLART

Følgende må fylles ut fra en faktisk capabilities-respons og en faktisk,
avgrenset distribusjonsfil før gaten kan passeres:

| Tema | Status |
| --- | --- |
| Faktisk download API-rute utover capabilities | Ikke avklart |
| GeoPackage-støtte og eksakt formatnavn/-id | Ikke avklart |
| Støttede CRS | Ikke avklart |
| Kommune som geografisk område | Ikke avklart |
| Ferdige kommunefiler kontra generering på bestilling | Ikke avklart |
| Krav om e-post | Ikke avklart |
| Autentisering eller Norge digitalt-tilgang | Ikke avklart |
| Gratis/betalt tilgang | Ikke avklart; ingen betalingsforespørsel ble nådd |
| Direkte download-URL | Ikke avklart |
| Mulighet for én kommune uten nasjonal fil | Ikke avklart |
| Filstørrelse | Ikke avklart; ingen nedlasting ble startet |
| Filnavn | Ikke avklart |
| Kilde-CRS og egnet beregnings-CRS | Ikke avklart |
| Faktisk layer-navn | Ikke avklart |
| Objekttall og geometritype | Ikke avklart |
| Faktiske GPKG-feltnavn og datatyper | Ikke avklart |
| Felt for nivå 1, nivå 2, arealdekkekode og kommunenummer | Ikke avklart |
| Distinct nivå-1-koder og offisielle etiketter | Ikke avklart |
| Entydig hav-/landavgrensning | Ikke avklart |
| Fullstendig nivå-0-mapping og unmapped-klasser | Ikke avklart |

## Krav til neste research-forsøk

1. Kjør capabilities-kallet i et miljø som tillater tilgang til Geonorge, og
   arkiver responsen med hentetidspunkt.
2. Bekreft format-id, områdeinndeling, tilgangsvilkår, direkte/asynkron mekanisme
   og estimert størrelse før noen data lastes ned.
3. Hent bare én trygg, kommuneavgrenset fil dersom capabilities faktisk støtter
   det. Ikke start en nasjonal nedlasting blindt.
4. Inspiser filen med et GeoPackage-verktøy og noter filnavn, bytes, CRS, lag,
   objekttall, geometri, alle relevante kolonner og datatyper.
5. Hent distinct kombinasjoner av nivå-1-kode og etikett og sammenhold hele
   listen med produktmodellen.
6. Pass først mapping-gaten når alle arealbærende klasser er eksplisitt mappet
   eller ekskludert uten faglig tvetydighet.
