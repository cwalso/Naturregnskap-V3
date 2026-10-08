# Domenemodell – Kommunale naturregnskap V3

**Sist oppdatert: 08.10.2026**

## Formål

Domenemodellen skal gjøre de faglige skillene eksplisitte i kode, analyser og
brukerflate. Den er fortsatt konseptuell, men skal samsvare med dagens
prototype der begrepene er implementert.

## 1. Account

Representerer selve naturregnskapet.

Sentrale begreper:

- `AccountPeriod`
- `AccountBalance`
- `AccountChange`
- `AccountMethodVersion`

Nivå 0:

- `built`
- `agriculture`
- `nature`

Økosystemtype er ikke en underkategori av nivå 0 uten eksplisitt
metodebeslutning.

## 2. NatureStatus

Representerer heldekkende eller supplerende informasjon om naturen i dag.

Eksempler:

- økosystemtype
- arealdekke
- skogtype

NatureStatus kan bygge på Grunnkart, men er ikke automatisk samme modell som
Account.

## 3. ThematicData

Representerer supplerende temadata.

Gjeldende eksempler:

- Verdsatte naturtyper
- Verneområder
- Villreinområder
- Inngrepsfri natur

Temadata kan ha ulik geografisk dekning og kartleggingsgrad.

## 4. AnalysisArea

Analyseområde er et eget konsept og skal ikke blandes med selve
naturregnskapet.

Dagens typer:

- `planned` – framtidig utbygging hentet fra plan
- `drawn` – eget polygon tegnet av brukeren

Prinsipielt:

```text
AnalysisArea
  analysisId
  kind
  municipalityId
  geometry / rasterMask
  area
  source
  sourceVersion
```

Et nytt analyseområde skal så langt mulig bruke samme analysemotor, ikke egen
spesiallogikk.

## 5. PlanScenario

PlanScenario beskriver planbasert fremtidig arealbruk.

Mulige typer:

- `adopted`
- `proposed`

Dagens prototype bruker et planbasert analyseområde for framtidig utbygging,
men har ikke full plansammenligning.

PlanScenario er input til analyse, ikke ferdig naturkonsekvens.

## 6. AnalysisResult

Standardisert analyseresultat skal kunne knyttes til:

```text
AnalysisResult
  analysisId
  analysisAreaKind
  municipalityId
  sourceVersions[]
  methodVersion
  pixelResolution
  metrics[]
  thematicImpacts[]
  warnings[]
```

Kart, nøkkeltall og tabeller for samme analyse skal bruke samme resultat og
identitet. Kildegeometri i kartet er en presentasjon av samme gyldige
analyseområde, ikke en ny beregningsrepresentasjon. Berørt lokalitet har
kilde-ID, navn, naturtype, verdikategori, geometri i EPSG:25833 og registrert
overlappsareal på analysegridet. Objektvalg er knyttet til kommune/analysisId;
kilde-ID alene er ikke global analyseidentitet.

## 7. ThematicImpact

Representerer supplerende treff mot temadata.

Prinsipielt:

```text
ThematicImpact
  datasetId
  affectedFeatureCount
  overlapArea
  classes[]
  coverage
  warnings[]
```

For Verdsatte naturtyper er det viktig å skille registrerte treff fra
kartleggingsgrad.

## 8. DatasetDefinition

Representerer metadata og teknisk tilgang.

```text
DatasetDefinition
  id
  title
  category
  provider
  visualSource
  analysisSource
  version
  validDate
  metadataUrl
  coverage
  analysisCapabilities
```

Mulige kategorier:

- `account`
- `nature-status`
- `thematic`
- `plan`
- `basemap`

## 9. Bynatur

Bynaturen/grå arealer er ikke en egen økosystemtype.

Domenet bør skille mellom:

- regnskapets Bebygd/opparbeidet-kategori
- eget datasett for grå arealer
- analyser av grønt/grått/bygg innenfor den utbygde delen

## 10. Versioning

Minstekravet er at resultater kan knyttes til:

- analyseområde/`analysisId`
- dataversjon/status
- metodeversjon
- kommune
- eventuelle begrensninger

Versjonering skal ikke løses som fri tekst spredt i UI.

## 11. Status

Dette er et arkitekturgrunnlag, ikke en ferdig spesifikasjon.

Felt og navn kan endres, men følgende skiller skal bevares:

- naturregnskap versus analyse
- heldekkende grunnlag versus supplerende temadata
- analyseområde versus analyseresultat
- null treff versus manglende data
