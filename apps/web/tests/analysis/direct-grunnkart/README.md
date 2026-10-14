# Lokal pilot for direkte Grunnkart-geodata

**Status:** faktisk Trondheim-uttrekk og bruksrett er ikke verifisert.
Oppsettet er testet med egne syntetiske polygoner, ikke Grunnkart-data.
Ingen ny produksjonsmetode innføres. [Tilgangsrapport](../../../../../docs/validation/2026-10-14-direct-grunnkart-pilot.md).

## Fil som trengs

Nasjonalt grunnkart for arealanalyse, **årsversjon 2025**, kommune **5001 Trondheim**,
flategeometri og originale klasse-/kildeattributter. Foretrukket GPKG;
FGDB eller GML med tilhørende sidefiler kan brukes hvis lokal GDAL-driver
støtter formatet. [Geonorge UUID 28c28e3a-d88f-4a34-8c60-5efe6d56a44d](https://kartkatalog.geonorge.no/metadata/uuid/28c28e3a-d88f-4a34-8c60-5efe6d56a44d).
Faktisk distribusjonsfilnavn/layer/fil-CRS må bekreftes ved mottak; de gjettes ikke.

Skaff filen gjennom virksomhetens avtalte tilgang, sammen med metadata,
årsversjonsbekreftelse og bekreftelse på lokal analyse i valgt pilotmiljø.
Bekreft også eventuell behandling hos underleverandør/cloud, sletting og
rett til å dele statistikk. Ingen konto eller passord skal ligge i repoet.

## Privat oppsett og mottak

Bruk en katalog **utenfor Git-repoet**, eksempel `/workspace/work/direct-grunnkart-private`.
I et lokalt miljø kan tilsvarende privat prosjektkatalog brukes. Overfør
filen gjennom virksomhetens godkjente filkanal eller mount, uten offentlig
GitHub/Pages. Ved GML beholdes `.xsd`/`.gfs`/eventuelle andre nødvendige sidefiler;
FGDB beholdes som hel `.gdb`-katalog. Lagre opprinnelig arkiv, manifest og vilkår
privat. Filoverføring til Codex forutsetter at det miljøet er omfattet av bruksretten.

Kjør fra reporoten:

```sh
mkdir -p /workspace/work/direct-grunnkart-private/data /workspace/work/direct-grunnkart-private/output
python3 -m venv /workspace/work/direct-grunnkart-private/venv
/workspace/work/direct-grunnkart-private/venv/bin/pip install -r apps/web/tests/analysis/direct-grunnkart/requirements.txt
cp apps/web/tests/analysis/direct-grunnkart/manifest.example.json /workspace/work/direct-grunnkart-private/manifest.json
```

Legg den avtalte filen privat under `data/`. Følgende navn er **lokalt eksempel**, ikke
en verifisert fil fra Geonorge. Inspeksjon kjøres først når lokal bruk er avklart:

```sh
/workspace/work/direct-grunnkart-private/venv/bin/python apps/web/tests/analysis/direct-grunnkart/pilot.py inspect --data /workspace/work/direct-grunnkart-private/data/trondheim-2025.gpkg --output /workspace/work/direct-grunnkart-private/inventory
```

`inventory.json` har faktiske layernavn, fil-CRS/WKT, format, bounds, feltnavn/typer,
objektantall, alle observerte attributtverdier og ugyldige/manglende geometrier.
Det kan inneholde kilde-ID-er og skal forbli privat. `inspect` utleder ikke år,
lisens eller nivå-0-grupper fra innholdet. Faktisk format må kunne åpnes av Fiona/GDAL.
GPKG er testet ende til ende; reelle FGDB/GML-uttrekk er ikke testet i leveransen.

## Manifest før beregning

Fyll den private manifestfilen etter inspeksjon og rettighetsavklaring:

- `source_kind`: `official_2025`; `synthetic_fixture` er kun for egne tester.
- `year_verified`, `version_evidence`: bekreftet 2025-produkt, med sporbar referanse.
- `local_analysis_permitted`, `rights_evidence`: avtale/bekreftelse som dekker faktisk aktør,
  formål og behandlingsmiljø. Et manuelt flagg er ikke en lisens; verktøyet kan ikke
  kontrollere juridisk gyldighet, bare nekte kjøring uten dokumentert input.
- `data_sha256`: SHA-256 fra inventory for GPKG/GML-hovedfil. Behold alle sidefiler;
  et GML-hovedfilhash er ikke en hash av hele pakken. For FGDB hashes alle filer
  som sortert liste av relativt navn og innholdshash. Source reader må ikke endre filene.
- `layer`, `documented_crs`: faktiske verdier fra fil, kontrollert mot metadata.
- `fields`: observerte fysiske feltnavn for nivå 1, kommune og objekt-ID er obligatoriske.
  Nivå 2/3, økosystemkode og kildereferanse fylles dersom de faktisk finnes.
  Ingen SOSI-modellnavn eller WMS-navn brukes som antatt filskjema.
- `class_values`: eksakt fysisk verdi → dokumentert nivå-1-verdi. Ingen trim,
  fuzzy matching eller nærmeste farge. Ukjent/manglende verdi rapporteres separat.
- `level0_groups`: behold `{}` inntil faglig kobling er besluttet. Detaljfordeling
  og krysstabell kan kjøres uten ny Natur/Jordbruk/Bebygd-kobling. En senere mapping
  krever komplett eksplisitt kobling av alle mappede klasseverdier,
  `level0_mapping_approved=true` og `level0_mapping_evidence`.

Ingen eksempelverdi i manifestet gir automatisk tilgang eller godkjenning.
Manifest/data/output **avvises inne i dette offentlige repoet**.

## Kjør beregningen uten nye plan-/WMS-kall

```sh
/workspace/work/direct-grunnkart-private/venv/bin/python apps/web/tests/analysis/direct-grunnkart/pilot.py run --data /workspace/work/direct-grunnkart-private/data/trondheim-2025.gpkg --manifest /workspace/work/direct-grunnkart-private/manifest.json --reference docs/validation/2026-10-14-plan-area/reference-inputs.zip --reference-result docs/validation/2026-10-14-plan-area/result.json --output /workspace/work/direct-grunnkart-private/output
```

Maskens SHA må være
`c2282443c935dc02485b7bb380d4395147012f0d562f4b1c28f365534a15a46f`.
Verktøyet kontrollerer også lagret klassifikasjonshash og opprinnelige kategoriantall.
Planstøtten er union av gamle Natur/Jordbruk-celler, **ikke full juridisk plangeometri**.
Kilder projiseres til EPSG:25833, med dokumentert fil-CRS og `always_xy`.
Samme kommunevise arealfaktor 0,9994795815751638 brukes. Ingen ny DiBK/WMS-tilgang skjer.

Resultater, kun privat:

- `result.json`: faktisk kildeinventar, eksklusive klassearealer, ukjent klasse,
  udekket støtte, kryssklassekonflikt, dobbeltdekning innen klasse, tidsbruk,
  kvalitetsfeil og gammel↔ny arealkrysstabell. Nivå-0-total/differanse bare med
  godkjent og dekkende mapping; kjent eksklusivt areal er ikke komplett total ved hull/konflikter.
- `source-overlap.csv`: kildeobjekt/klasse/kommune med areal innen og utenfor
  støtten. Objektarealer kan overlappe, og skal ikke summeres blindt til kategoritotalene.
- `diagnostic.geojson`: EPSG:25833 med direkte diagnoseområder og lagret referanse;
  felt `method` skiller disse i et lokalt GIS. Dette er et lokalt geografisk
  kontrollprodukt og skal ikke publiseres uten særskilt rettighetsavklaring.

Ugyldige geometrier repareres ikke. Arealer for gyldig del kan fortsatt skrives
som `diagnostic_only` med kvalitetsfeil; dette er ingen godkjent pilottotal.
Hull, ukjente klasser og kommuneavvik bokføres adskilt. Samme-klasse-duplikat
unioneres med eksplisitt duplikatareal; kryssklasseoverlapp holdes utenfor begge
klassearealene. Ingen prioritering eller forholdsmessig tildeling brukes.
Floating-point-kontrollen (`1e-6 m²` absolutt/`1e-12` relativt) kontrollerer
arealbevaring, uten å endre geometri, snap, buffer eller skjule målte avvik.

## Tester

```sh
/workspace/work/direct-grunnkart-private/venv/bin/pytest -q apps/web/tests/analysis/direct-grunnkart
ruff check apps/web/tests/analysis/direct-grunnkart
```

Testene bruker egne syntetiske geometrier: analytiske klassegrenser,
delpolygoner, hull, samme-klasse-duplikat, kryssklasseoverlapp, ugyldig geometri,
kommuneavvik, ukjent klasse, faktisk GPKG-lesing og koordinattransformasjon.
De verifiserer også stopp uten rettighets-/årsdokumentasjon, feil hash/CRS/felt,
og avvisning av private data/output i repoet. Lagret Trondheim-planstøtte er
reprodusert, men syntetiske kildepolygoner gir **ingen reelle Grunnkart-resultater**.

Videre uavhengig kontroll av faktisk kildefil og statistikk må gjøres når
filen er mottatt. Ingen skriptfunksjon gjør en kilde autoritativ eller lisensiert.
