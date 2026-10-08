# ADR – Tegnet polygon som analyseområde

**Dato:** 08.10.2026  
**Status:** Godkjent for V3-prototypen

## Kontekst

Brukere trenger å kunne undersøke et område som ikke allerede finnes som
planpolygon, for eksempel ved tidlig siling eller vurdering av et enkeltområde.

En egen analysemotor for tegnede områder ville skapt parallelle metoder og høy
risiko for inkonsistente resultater.

## Beslutning

Eget polygon modelleres som samme konseptuelle type **analyseområde** som
framtidig utbygging.

Polygonet:

- tegnes med OpenLayers Draw
- får egen `analysisId`
- avgrenses til valgt kommune
- rasteriseres på samme overordnede plan-/analysegrid
- bruker samme overlaypipeline der datagrunnlaget tillater det
- kan krysses med Natur/Jordbruk og Verdsatte naturtyper

Kart og tall skal bruke samme analysemask.

## Rasteroppløsning

Dagens plan-/polygonanalyse bruker omtrent 21,16 meter per analysepiksel i
EPSG:25833.

## Konsekvenser

- cache må nøckles på analyseområde, ikke bare kommune
- områdebytte må invalidere/ignorere gamle resultater
- prosentandeler må bruke dokumentert riktig nevner
- tegnet område er beslutningsstøtte, ikke en ny regnskapsenhet

## Kontrollpunkter

Ved endringer skal det testes:

- planområde → tegnet område → planområde
- nytt polygon etter gammelt polygon
- Natur/Jordbruk → Verdsatte naturtyper på samme polygon
- arealrekonsiliering
- mobil tegnemodus
