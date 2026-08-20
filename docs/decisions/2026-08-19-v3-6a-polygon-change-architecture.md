# V3.6A: Polygonbasert endringsarkitektur

**Dato:** 2026-08-19  
**Status:** Akseptert for arkitektur-POC

## Besluttet

- `ChangeFeature` er den generiske analyseenheten og inneholder geometri, areal,
  periode, kilde, overgang og metode/proveniens.
- Kildespesifikke adaptere skal produsere denne modellen; domenet og frontend
  skal ikke kjenne AR5- eller SSB-feltnavn.
- Store kildedata behandles offline. HTTP-API-et leser separat prepared summary
  og geometri og validerer at begge representerer samme feature-sett.
- Det versjonerte fixturet for 5054 er utelukkende syntetisk og har formålet
  `architecture_test`. Polygonareal beregnes fra metrisk EPSG:25833-geometri i
  preparation, slik at kart og statistikk bygger på de samme polygonene.
- Manglende eller inkonsistente prepared-filer gir `not_available`, aldri et
  falskt nullresultat.

Kjeden er:

```text
samples/changes/synthetic/5054.geojson
  → offline preparation
  → .data/changes/prepared/{kommune}-summary.json
  + .data/changes/prepared/{kommune}-features.json
  → GET /api/municipalities/{kommune}/changes
      → aggregert endringsoversikt
  → GET /api/municipalities/{kommune}/changes/features
      → endringspolygoner til OpenLayers
```

Fixturet klargjøres fra repo-roten med:

```bash
cd apps/api
python -m app.scripts.prepare_synthetic_changes \
  --municipality 5054 \
  --input ../../samples/changes/synthetic/5054.geojson
```

Prepared-filene ligger i `.data` og committes ikke. Det eneste committede
datagrunnlaget er det lille, eksplisitt syntetiske kildefixturet.

## Framtidige kildemekanismer

Transition-modellen har valgfrie kildeklasser og tillater at `fromLevel0` er
uavklart på feature-nivå. Dermed støttes både:

A. en kilde som selv oppgir før-/etterklasse; og
B. en kilde som bare gir polygon, der før-klassen senere utledes ved overlay
   mot et låst Grunnkart T1.

Prepared summary kan bare publiseres når `fromLevel0` er utledet. Mekanisme B
implementeres ikke nå.

## Tematisk overlay

Et senere overlay hører hjemme i backendens analyse-/tjenestelag:

```text
ChangeFeature.geometry × ThematicDataset → OverlayResult
```

`OverlayResult` skal skille `covered_hit`, `covered_no_hit`, `not_covered` og
`not_evaluated`. Ingen treff skal aldri alene presenteres som ingen naturverdi.
Temadata forblir supplerende og holdes utenfor selve endringsregnskapet.

## Verifisert og ikke besluttet

Eksternt verifisert: NIBIO publiserer periodebaserte AR5-endringspolygonlag og
laget «NIBIO – Periodisk». Kartendring er ikke nødvendigvis datofestet fysisk
endring og kan inkludere ajourhold, feilretting og omklassifisering.

Ikke verifisert eller besluttet:

- teknisk AR5-vektortilgang, skjema og nivå-0-mapping;
- endelig SSB-format og integrasjon;
- produksjonslagring eller nasjonal dataplattform;
- endelig historisk tidsserie;
- temadatasett og konkret overlay-metode.

Arbeidshypotesen er at adapteren senere kan byttes fra synthetic → AR5 → SSB
uten å endre den generiske domenemodellen, API-kontrakten eller frontendens
typed modell.
