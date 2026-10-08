# ADR – Delt request- og flispipeline for kart og analyse

**Dato:** 08.10.2026  
**Status:** Godkjent for V3-prototypen

## Kontekst

Kart og rasteranalyse hentet flere av de samme bildene/flisene uavhengig.
Dette ga unødvendige nettverkskall, svakere ytelse og risiko for at kart og
analyse brukte ulike dataøyeblikk.

## Beslutning

V3 bruker et felles requestlag i:

`apps/web/src/map/sharedImageRequests.ts`

Gjeldende regler:

- request-pool per datakilde
- maks 4 samtidige nettverkskall per kilde
- identiske pågående kall deles
- råbilder caches
- dagens cachegrense er 400 elementer per kilde
- samme råflis gjenbrukes mellom kart og analyse når URL/datagrunnlag er identisk

NIBIO og DiBK behandles som egne kilder/pools.

## Konsekvenser

- kart og analyse skal ikke lage parallelle fetch-mekanismer uten grunn
- nye rasterbaserte funksjoner bør bruke felles requestlag
- cache må være begrenset
- object URLs, Canvas og ImageBitmap må frigjøres
- stale analyser må aborteres eller ignoreres ved kontekstbytte

## Avgrensning

Dette er en prototypeoptimalisering. Den fastsetter ikke produksjonsarkitektur
eller framtidig server-side cache.
