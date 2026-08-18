# Brukerhistorier – fremtidig analyse

Dette dokumentet beskriver brukerbehovene som skal være styrende for videre utvikling av analysefunksjonalitet i V3.

## 1. Gjeldende KPA

Som bruker ønsker jeg å se hvordan gjeldende kommuneplanens arealdel påvirker naturen i kommunen.

Løsningen skal på sikt kunne:

- vise gjeldende KPA/planreserve i kart
- vise overlapp mellom planlagt utbygging og Grunnkart for arealanalyse
- vise relevante supplerende temadata i de berørte områdene
- beregne areal som potensielt berøres
- presentere både kart og statistikk
- gi grunnlag for rapportering

Aktuelle temadata er foreløpig:

- inngrepsfri natur
- verneområder
- villreinområder
- verdsatte naturtyper

KPA kan prinsipielt komme fra nasjonal plandatabase, forhåndslastede data eller lokal opplasting. Endelig kilde og integrasjonsmåte er ikke besluttet.

## 2. Forslag til ny KPA

Som bruker ønsker jeg å analysere forslag til ny KPA og sammenligne denne med gjeldende KPA.

Løsningen skal på sikt kunne:

- laste inn forslag til ny KPA
- vise gjeldende og foreslått KPA i samme løsning
- sammenligne planlagt arealbruk
- vise hvor ny plan øker eller reduserer planlagt nedbygging
- synliggjøre arealer som tas ut gjennom planvask
- sammenligne berørte naturarealer og supplerende naturdata

Gjeldende KPA og forslag til ny KPA skal bruke samme underliggende plan- og analysemodell.

## 3. Rapportering

Analyseverktøyet skal på sikt kunne presentere resultater for både enkeltområder og planen samlet.

Aktuelle resultater:

- planlagt berørt naturareal fordelt på økosystemtyper
- planlagt berørt areal for gjeldende og ny KPA
- berørt inngrepsfri natur
- berørte verneområder
- berørte villreinområder
- berørte verdsatte naturtyper
- andel/areal der relevante temadata mangler

Kart, tabeller, grafer og rapport skal bygge på samme analyseresultat.

PDF/digital rapport er et aktuelt behov. Eksakt rapportformat besluttes senere.

## 4. Sammenheng med naturregnskapet

Analyseverktøyet er ikke det samme som selve naturregnskapet, men skal oppleves som en sammenhengende del av samme tjeneste.

Det innebærer blant annet:

- felles designprinsipper
- gjenbruk av de samme relevante datakildene
- konsistente begreper
- samme forståelse av dataversjoner, metadata og usikkerhet

## 5. Tegne eget polygon

Lavere prioritert behov:

Som bruker ønsker jeg å kunne tegne et polygon og få oversikt over naturen som finnes eller er registrert innenfor området.

Mulige bruksområder:

- tidlig siling av nye utbyggingsinnspill
- planvask
- vurdering av enkeltområder
- prosjektbaserte analyser

Dette skal bruke samme analysemotor som KPA-analyse, ikke en separat beregningslogikk.

## 6. Kartleggingsgrad og datamangler

Brukeren trenger å forstå hvor kunnskapsgrunnlaget er mangelfullt.

Løsningen skal derfor kunne vise kartleggingsgrad/dekning der datakilden støtter dette, særlig for verdsatte naturtyper/NiN-relatert kartlegging.

Manglende temadata skal uttrykkes som ukjent eller ikke kartlagt, ikke som null naturverdi.

## Prioritering

Høy prioritet:

1. analyse av gjeldende KPA
2. analyse og sammenligning av forslag til ny KPA
3. felles resultatmodell og rapportgrunnlag
4. tydelig sammenheng med naturregnskapet

Lavere prioritet:

5. tegning av egne polygoner
6. mer detaljert visning av kartleggingsgrad
