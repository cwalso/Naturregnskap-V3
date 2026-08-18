# Domenemodell – Kommunale naturregnskap V3

## Formål

Domenemodellen skal gjøre de faglige skillene eksplisitte i kode og API-er. Den er foreløpig konseptuell og skal konkretiseres trinnvis gjennom implementasjon.

## 1. Account

Representerer selve naturregnskapet.

Foreløpige sentrale begreper:

- `AccountPeriod`
- `AccountBalance`
- `AccountChange`
- `AccountForecast`
- `AccountMethodVersion`

Nivå 0-kategorier:

- `built`
- `agriculture`
- `nature`

Eksempel på prinsipiell balanse:

```text
AccountBalance
  municipalityId
  period
  builtArea
  agricultureArea
  natureArea
  datasetVersions
  methodVersion
```

## 2. NatureStatus

Representerer egenskaper ved naturen i dag, eksempelvis økosystemtype.

Dette er ikke samme klassifikasjon som Account nivå 0 og skal ikke modelleres som underkategorier av Bebygd/Jordbruk/Natur uten eksplisitt metodebeslutning.

## 3. HistoricalLoss

Representerer areal som er bygget ned i en periode og koblingen til informasjon om hva som var registrert der.

Prinsipielt:

```text
HistoricalLossEvent
  geometry
  period
  previousAccountClass
  resultingAccountClass
  ecosystemInfo
  thematicImpacts[]
  datasetVersions
  methodVersion
```

Tematiske treff er supplerende informasjon og ikke nødvendigvis heldekkende.

## 4. PlanScenario

Felles modell for fremtidig arealbruk.

Foreløpige scenario-typer:

- `adopted`, gjeldende/vedtatt plan
- `proposed`, forslag til ny plan
- `manual`, manuelt tegnet eller opplastet analyseområde

Prinsipielt:

```text
PlanScenario
  id
  name
  type
  source
  sourceVersion
  geometry
  crs
  planRuleSetVersion
  createdAt
```

PlanScenario skal ikke inneholde ferdig beregnede naturkonsekvenser. Det er input til analyse.

## 5. PlanRuleSet

Representerer metodiske regler for å trekke ut og tolke planlagt utbyggingsareal.

Skal etter hvert kunne beskrive blant annet:

- hvilke arealformål som teller som utbygging
- hvordan allerede utbygd areal håndteres
- hvordan overlapp håndteres
- hvilken plan som gjelder ved overlapp
- regler for geometri og normalisering
- regelsettversjon

## 6. PlanImpactResult

Standardisert resultat fra analyse av et PlanScenario.

Prinsipielt:

```text
PlanImpactResult
  scenarioId
  analysisArea
  accountImpact
    builtArea
    agricultureArea
    natureArea
  ecosystemImpacts[]
  thematicImpacts[]
  coverage[]
  warnings[]
  sourceVersions[]
  methodVersion
  calculatedAt
```

Kart, tabeller, grafer og rapporter skal bruke dette eller en senere standardisert variant av samme resultatmodell.

## 7. ThematicImpact

Representerer supplerende treff mot temadata.

Prinsipielt:

```text
ThematicImpact
  datasetId
  registeredArea
  mappedArea
  unmappedOrUnknownArea
  classes[]
  warnings[]
```

Modellen skal gjøre det mulig å skille registrert verdi fra manglende kartlegging.

## 8. DatasetDefinition

Representerer metadata og teknisk tilgang til et datasett.

Prinsipielt:

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

## 9. Versioning

Minstekravet er at analyseresultater kan knyttes til dataversjon og metodeversjon.

Versjonering skal ikke løses som fri tekst spredt i UI. Det skal inngå i domene-/resultatmodellene.

## Status

Dette dokumentet er et arkitekturgrunnlag, ikke en ferdig spesifikasjon. Navn og felt kan endres når vi implementerer første vertikale funksjoner, men de faglige skillene skal bevares.
