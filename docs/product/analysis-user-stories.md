# Brukerhistorier – analyse og beslutningsstøtte

**Sist oppdatert: 08.10.2026**

Dette dokumentet beskriver brukerbehovene som skal styre analysefunksjonaliteten
i V3. Status skilles mellom det som er implementert i prototypen og det som
fortsatt er framtidig.

## 1. Hovedbruker og arbeidsflyt

Primærbrukeren er en kommunal arealplanlegger.

Brukeren skal ikke måtte starte med å velge mange kartlag. Primærflyten er:

1. velg analyseområde
2. velg datagrunnlag
3. les resultat
4. finn resultatet i kartet

Kartet brukes til stedfesting. Resultatet skal være forståelig som tall og tekst
før brukeren tolker kartet.

## 2. Framtidig utbygging – implementert prototype

**Status: implementert prototype**

Som bruker ønsker jeg å se hvilken natur og hvilke registrerte naturverdier som
ligger i områder satt av til framtidig utbygging.

Dagens prototype kan:

- bruke framtidige utbyggingsområder fra kommuneplantjenesten som analyseområde
- krysse analyseområdet med Natur og jordbruk fra Grunnkart
- vise fordeling på økosystemtyper der beregningen er koblet inn
- krysse analyseområdet med Verdsatte naturtyper
- vise resultat som areal/nøkkeltall
- stedfeste analyseresultatet i kartet

Dette er beslutningsstøtte. Resultatet skal ikke omtales som sikkert framtidig
naturtap eller naturfaglig konsekvensutredning.

## 3. Eget polygon – implementert prototype

**Status: implementert prototype**

Som bruker ønsker jeg å tegne et område direkte i kartet og få samme type
analyse som for framtidig utbygging.

Dagens prototype støtter:

- start tegning
- registrering av polygonpunkter
- angre siste punkt
- ferdig
- avbryt
- tegn på nytt
- fjern område

Det tegnede området:

- rasteriseres
- avgrenses til valgt kommune
- analyseres på samme overordnede rasterpipeline som øvrig overlay
- kan krysses med Natur og jordbruk
- kan krysses med Verdsatte naturtyper

Ved endringer skal det testes at gammel analyse/cache ikke følger med når
brukeren bytter mellom framtidig utbygging og eget polygon.

## 4. Natur og jordbruk – implementert prototype

**Status: implementert prototype**

Som bruker ønsker jeg å forstå hvor mye Natur og Jordbruk som overlapper valgt
analyseområde.

Resultatet skal minst vise:

- berørt Natur i dekar
- berørt Jordbruk i dekar
- relevant andel av analyseområdet når nevneren er metodisk riktig
- økosystemfordeling der den er beregnet
- knapp for å finne resultatet i kartet

Prosentandeler skal ikke vises dersom nevneren ikke kan dokumenteres.

## 5. Verdsatte naturtyper – implementert prototype

**Status: implementert prototype**

Som bruker ønsker jeg å se hvilke registrerte verdsatte naturtyper som
overlapper analyseområdet.

Resultatet skal kunne vise:

- antall berørte registrerte lokaliteter
- beregnet unikt overlappsareal
- fordeling på verdikategori
- fordeling på naturtype der datagrunnlaget støtter det
- stedfesting av alle eller filtrerte treff i kartet

Verdsatte naturtyper er supplerende temadata. Manglende treff eller dekning skal
ikke tolkes som fravær av naturverdi.

## 6. Flere temadata i overlay

**Status: under vurdering**

Aktuelle tema for senere overlay er blant annet:

- verneområder
- villreinområder
- inngrepsfri natur
- andre eksplisitt prioriterte temadata

Disse skal ikke kobles inn bare fordi de finnes som kartlag. For hvert tema må
det avklares:

- hva analysen faktisk skal svare på
- hvilken analysekilde som brukes
- om areal, objektantall eller treffstatus er riktig resultat
- dekning og datamangler
- hvordan resultatet skal presenteres uten å skape falsk presisjon

## 7. Forslag til ny KPA og plansammenligning

**Status: framtidig**

Som bruker ønsker jeg på sikt å analysere forslag til ny KPA og sammenligne den
med gjeldende plan.

Aktuelle behov:

- laste inn eller velge forslag til ny KPA
- sammenligne gjeldende og foreslått arealbruk
- vise arealer som legges til eller tas ut
- sammenligne berørt natur
- støtte planvask

Gjeldende og foreslått KPA bør bruke samme underliggende analysemodell dersom
dette utvikles.

## 8. Rapportering

**Status: framtidig / delvis dekket av dagens resultatvisning**

Kart, tabeller, grafer og eventuell rapport skal bygge på samme analyseresultat.

Mulige framtidige rapportresultater:

- samlet berørt Natur og Jordbruk
- fordeling på økosystemtyper
- berørte registrerte naturverdier
- datadekning og usikkerhet
- analyseområde, dataversjon og metodeversjon

PDF eller annen rapportform besluttes senere.

## 9. Kartleggingsgrad og datamangler

Brukeren trenger å forstå når kunnskapsgrunnlaget er mangelfullt.

Løsningen skal skille mellom:

- registrert treff
- ingen registrerte treff
- ikke kartlagt/ukjent
- teknisk feil

For Verdsatte naturtyper er kartleggingsgrad/dekningsinformasjon særlig
relevant.

## 10. Ikke-funksjonelle behov

Analyseverktøyet skal:

- fungere på mobil og desktop
- være tydelig i tegnemodus
- ikke starte unødvendige parallelle analyser ved React-rerender
- gjenbruke identiske rasterfliser
- begrense samtidige nettverkskall
- avbryte/ignorere stale resultater ved område- eller kommunebytte
- gi forståelig feilmelding i stedet for falsk 0

## Prioritering videre

1. stabilisere eksisterende analyser og validere prosent-/arealberegninger
2. kvalitetssikre kart/resultat-samsvar
3. utvide overlay til nye temadata bare etter faglig avklaring
4. videreutvikle plansammenligning og rapportering dersom prosjektet prioriterer det
