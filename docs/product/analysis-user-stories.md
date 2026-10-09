# Brukerhistorier – analyse og beslutningsstøtte

**Sist oppdatert: 09.10.2026**

Dette dokumentet beskriver brukerbehovene som skal styre analysefunksjonaliteten
i V3. Status skilles mellom det som er implementert i prototypen og det som
fortsatt er framtidig.

## Gjeldende kartflyt og status

Utforsk i kart viser nå Grunnkart nivå 0, Verdsatte naturtyper og Framtidig
utbygging som tre selvstendige temaer, ett om gangen. Ingen kryssanalyse
startes der. Naturtypefilteret gjelder kommunens registrerte lokaliteter,
ikke planoverlapp; objektinformasjon viser kilde-ID og registrerte egenskaper,
uten beregnet overlappsareal. Temabytte og objektvalg bevarer kartutsnittet.

Delene nedenfor beskriver den **beholdte analysekoden og framtidige analysebehov**.
Beskrivelser av analyseverkstedet, samtidige plan-/tema-/trefflag og aktiv
analyse gjelder denne beholdte implementasjonen, ikke dagens Utforsk-rute.
Analyser som allerede finnes på temasider er beholdt. Kryssanalyse i Utforsk
kan først kobles tilbake i en egen oppgave etter manuell godkjenning av de
tre kartvisningene. Se [beslutning](../decisions/2026-10-09-v3-independent-map-themes.md).

## 1. Hovedbruker og arbeidsflyt

Primærbrukeren er en kommunal arealplanlegger.

Brukeren skal ikke måtte starte med å velge mange kartlag. Primærflyten er:

1. velg analyseområde
2. velg datagrunnlag
3. les resultat
4. finn resultatet i kartet

Kartet brukes til stedfesting. Resultatet skal være forståelig som tall og tekst
før brukeren tolker kartet.

Arbeidsflyten er implementert i det beholdte analyseverkstedet, men de rasterbaserte tallanalysene
krever et klargjort kommunevis Grunnkart-raster. Repoet har per 08.10.2026 bare
dette for Trondheim (5001). Statusene «implementert prototype» nedenfor betyr
derfor implementert og testbar for denne prototypekommunen, ikke nasjonal
beregningsdekning.

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

## 3. Eget polygon – kode beholdt, inngang midlertidig skjult

**Status: analyse-/kartkode implementert; ikke tilgjengelig i ny arbeidsflate**

Behovet for å tegne et område og analysere det som framtidig utbygging består.
Den tidligere tegneflyten med start, punkter, angre, ferdig, avbryt, tegn på
nytt og fjern er beholdt i kode, men inngangen er midlertidig skjult under
utskiftingen av kartpresentasjonen. Ikke beskriv den som aktiv brukerfunksjon.

Rasterisering, gyldige kildepiksler, begge overlaygrunnlag, UUID ved fullført
tegning og cache-/stale-isolasjon er uendret. Regresjonstester for plan →
polygon A → polygon B → plan og ny kartinstans beholdes. Reaktivering krever
ny eksplisitt oppgave og visuell kontroll av tegning og kartinteraksjon.

## 4. Natur og jordbruk – implementert prototype

**Status: implementert prototype**

Som bruker ønsker jeg å forstå hvor mye Natur og Jordbruk som overlapper valgt
analyseområde.

Resultatet skal minst vise:

- berørt Natur i dekar
- berørt Jordbruk i dekar
- relevant andel av analyseområdet når nevneren er metodisk riktig
- økosystemfordeling der den er beregnet
- direkte stedfesting i kartet uten ekstra Finn-/Zoom-handling

Prosentandeler skal ikke vises dersom nevneren ikke kan dokumenteres.

Dagens nevner er hele den gyldige analysemasken på 21,15625 m rutenett, også
Bebygd og vann. Planområdets mask renses med eksisterende smalstripefilter;
tegnet polygon bruker polygonmasken og gyldige kildepiksler uten dette
filteret. Natur + Jordbruk skal ikke brukes som analyseareal. Se
[analyseareal og prosentnevner](../data/grunnkart-2025-analysis-source.md#analyseareal-og-prosentnevner-i-dagens-rastermetode).

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
- være tydelig i tegnemodus dersom tegneinngangen reaktiveres
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

## 11. Tydelige overlaytreff i kartet

**Status: implementert prototype for de to eksisterende analysegrunnlagene**

Som bruker ønsker jeg umiddelbart å forstå hvor analysen gir treff og hvordan
treffene forholder seg til valgt analyseområde.

Gjeldende interaksjon og akseptansekriterier:

1. Hele gyldige planmasken vises blå, naturtypelokalitetene som ordinær WMS,
   og beregnet overlapp lilla med lys kant. Plan, tema og treff skal være
   synlige samtidig og kunne skilles ved kommuneutsnitt og nær zoom.
2. Treff vises direkte. Filter, objektvalg, temabytte og innkomne resultat
   skal bevare brukerens utsnitt. Bare kommune/reset tilpasser utsnittet.
3. Verdi-/naturtypefilter gjenspeiles i treffmaske og liste. Aktivt filter
   forklares; hovedtallene gjelder hele analysen. Filter og valgt objekt
   nullstilles ved kommune-, analyse- eller datagrunnlagsbytte.
4. Natur/Jordbruk viser klassene fra `overlay.cleaned`, mens planlaget viser
   hele `analysisMask`, også gyldige bebygde/vannpiksler. Treffgrensene følger
   eksisterende analysegrid, uten smoothing eller ny faglig metode.
5. Null registrerte treff, manglende grunnlag, lasting, beregningsfeil og
   visningsfeil har forskjellige tilstander. Ingen registrering betyr ikke
   fravær av naturverdi. Dekning og forbehold er sekundært, men tilgjengelig.
6. Flyten fungerer på desktop og ved 390 px, med Kart/Resultat-snarveier og
   minst 44 px kontroller. Zoom inn/ut, panorering og temarundtur kontrolleres
   med reelle data. Faktisk sammensatt render skal regresjonstestes; DOM og
   state alene er ikke akseptbevis.

A–E er visuelt kontrollert med reelle Trondheim-data 09.10.2026. De betyr
naturtyper alene, plan alene, plan + tema uten trefflag, plan + tema +
beregnet overlapp og plan × Natur/Jordbruk. Det beholdte analyseverkstedet bruker de
to siste resultatvisningene. Metode, grid, nevner, filter og cache er bevart.
Tegneinngangen er midlertidig skjult. Flere tema og plansammenligning er
fortsatt framtidige behov.

## 12. Objektinformasjon for aktiv analyse

**Status: implementert for Verdsatte naturtyper; øvrige objektflyter er TODO**

Kart og kompakt resultatliste deler valgt lokalitet og filtrering på verdi
og naturtype. Listevalg markerer kildeobjektets omriss i kartet; kartvalg
markerer raden og detaljene. Ingen av valgene zoomer eller flytter kartet.
Detaljer viser navn, naturtype, verdi, kilde-ID og registrert overlappsareal
med prototypeforbehold. Hovedresultat er antall og unikt areal; verdifordeling
bruker høyeste verdi, mens objekter/naturtype viser registrert areal.

Kartet er hovedflate. Dekning/metode er sammenleggbart og sekundært. Mobil
har Kart/Resultat-snarveier og 44 px kontroller. Tegneinngangen og Finn-/Zoom-
handlingene er skjult, mens gammel metode-/kartkode er beholdt.

Dekning hentes separat for aktiv kommune/analysisId. Registrert dekning, ingen
registrert dekning, ukjent/lasting og teknisk feil formidles forskjellig.
Andelen gjelder gyldig analysemask, ikke kommunens landareal. Null lokaliteter
betyr aldri fravær av naturverdi. Ikke implementert: kartlag for dekning,
generell inspektør, egne planobjekter eller klassifikasjonsobjekter.

Akseptansekriterier:

- Objektinformasjon gjelder aktiv analyse/datagrunnlag og viser hva punktet
  eller objektet representerer; grunnkartklasse, planområde og tematreff
  holdes adskilt.
- Valg fra resultat og fra kart peker på samme treff og viser kilde,
  dekning og relevante opplysninger uten falsk presisjon.
- Tegning konkurrerer ikke med objektvalg. Ingen treff, skjult lag og
  teknisk feil forklares forskjellig. Informasjonen kan også nås uten
  presist kartklikk og brukes på mobil.

## 13. Flere egne områder og innlasting

**Status: TODO – enkeltpolygonkode beholdt, inngang skjult; områdeliste og innlasting mangler**

Mulige behov er navngiving, valg, fjerning og sammenligning av flere egne
områder samt innlasting av egne arealer/planer. Dette er framtidige
produktoppgaver, ikke implementert funksjonalitet eller en ny analysefamilie.

Før prioritering må det besluttes om områder analyseres separat eller samlet,
hvordan overlapp håndteres, hvilke filformater/projeksjoner som støttes og
hvordan lagring, størrelsesgrenser og datakvalitet formidles. Områdene skal ha
eksplisitt identitet, kilde og rolle. Innlasting skal valideres før analyse;
en egen tegning skal ikke automatisk erstatte gjeldende plan. Plansammenligning
krever egen faglig beslutning om gjeldende og foreslått arealbruk, jf. del 7.
