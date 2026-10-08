# Produktprinsipper – Kommunale naturregnskap V3

**Sist oppdatert: 08.10.2026**

## Formål

V3 skal demonstrere hvordan kommunale naturregnskap kan etableres som et felles,
etterprøvbart og praktisk nyttig kunnskapsgrunnlag for kommunal
arealforvaltning.

Den digitale løsningen er et virkemiddel. Verdien ligger i metode,
datagrunnlag, bokføringsregler, analyser, veiledning og bruk.

## 1. Fire tydelige lag

Løsningen skal alltid skille mellom:

1. **Naturregnskapet** – felles metode, heldekkende datagrunnlag,
   versjonering og sammenlignbarhet.
2. **Supplerende temadata** – relevante kartlag som gir innsikt, men som ikke
   automatisk inngår i regnskapet.
3. **Analyse- og beslutningsstøtte** – overlay og andre analyser som bygger
   videre på regnskap og temadata.
4. **Veiledning og formidling** – forklaringer som er nødvendige for riktig bruk.

Dette skillet skal være synlig både i fagmodell, kode og brukerflate.

## 2. Første regnskapskjerne

Første versjon skal først og fremst forstås som et
arealbasert/utbredelsesbasert naturregnskap.

Grunnkart for arealanalyse er sentralt heldekkende grunnlag. Overordnet nivå 0
i prototypen er:

- Bebygd
- Jordbruk
- Natur

Økosystemtype er en annen klassifikasjon enn nivå 0 og skal ikke blandes med
nivå 0.

Tilstand og økosystemtjenester er ikke del av regnskapskjernen i dagens
prototype.

## 3. Endring over tid

Historisk endring må bygge på et eksplisitt endringsgrunnlag. Differanse mellom
to årsversjoner av Grunnkart skal ikke automatisk tolkes som reell endring på
bakken, fordi datakorrigering og forbedret klassifisering kan gi utslag.

Målet er sporbare perioder der:

`låst versjon + dokumenterte endringer = neste låste versjon`

Metode- og dataversjoner skal kunne spores.

## 4. Naturen i dag

Brukeren skal kunne undersøke dagens natur gjennom:

- heldekkende informasjon fra Grunnkart
- supplerende temadata
- tydelig informasjon om dekning og begrensninger

Gjeldende temasider er:

- Myr (våtmark)
- Skog
- Verdsatte naturtyper
- Verneområder
- Villreinområder
- Inngrepsfri natur
- Bynaturen (grå arealer)

Disse sidene har ulike faglige roller. De skal ikke fremstilles som én felles
regnskapsklassifikasjon.

## 5. Supplerende temadata

Verdsatte naturtyper, verneområder, villreinområder og inngrepsfri natur gir
supplerende innsikt.

Manglende treff betyr ikke at området mangler naturverdi. Løsningen skal skille
mellom:

- registrert verdi/treff
- ingen registrerte treff
- ikke kartlagt/ukjent
- teknisk utilgjengelig data

## 6. Bynaturen og grå arealer

Bynaturen er ikke en egen økosystemtype i naturregnskapet.

Temaet brukes for å forstå den utbygde delen av kommunen og støtte vurderinger
av fortetting, transformasjon og gjenbruk.

Naturregnskapets bebygde/opparbeidede areal og det separate Kart over grå
arealer er beslektede, men ikke identiske størrelser. De skal ikke blandes uten
metodisk avklaring.

## 7. Fremtidig arealbruk er analyse

Områder satt av til framtidig utbygging brukes som analyseområde. Analysen kan
vise hvilken natur eller hvilke registrerte naturverdier som ligger innenfor
området.

Dette er beslutningsstøtte, ikke selve naturregnskapet.

Prototypen skal ikke beskrive dette som en naturfaglig konsekvensutredning eller
som et sikkert framtidig naturtap.

## 8. Eget tegnet område

Brukeren kan tegne et polygon og bruke dette som analyseområde.

Det tegnede området skal bruke samme grunnprinsipp som andre overlayanalyser:

1. et eksplisitt analyseområde
2. et eksplisitt datagrunnlag
3. en dokumentert overlaymetode
4. et resultat som kan leses som tall og stedfestes i kart

Det skal ikke bygges en separat analysemotor for tegnede områder dersom samme
pipeline kan gjenbrukes.

## 9. Kart og resultat

Kartet er et hjelpemiddel for stedfesting. Hovedresultatet i analyser skal være
lesbart som tekst/tall uten at brukeren må tolke kartet.

Kart, tabeller og nøkkeltall for samme analyse skal bygge på samme
analyseresultat/analysemask.

## 10. Prototypeberegninger

Dagens nettleserbaserte rasteranalyser er prototyper.

De kan bruke klassifiserte WMS-rasterfliser for å teste arbeidsflyt, metode og
brukernytte, men skal ikke omtales som autoritative regnskapstall uten:

- godkjent metode
- låst dataversjon
- validering mot egnet analysekilde
- dokumentert usikkerhet
- sporbarhet

## 11. Første versjon og videreutvikling

Avansert scenarioanalyse, økologisk tilstand, økosystemtjenester og mer
automatisert beslutningsstøtte skal omtales som mulig videreutvikling.

Første versjon bør først og fremst etablere et felles og etterprøvbart
regnskapsgrunnlag og en forståelig måte å bruke det på.
