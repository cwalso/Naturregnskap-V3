# Brukerhistorier – analyse og beslutningsstøtte

**Sist oppdatert: 08.10.2026**

Dette dokumentet beskriver brukerbehovene som skal styre analysefunksjonaliteten
i V3. Status skilles mellom det som er implementert i prototypen og det som
fortsatt er framtidig.

## 1. Hovedbruker og arbeidsflyt

Primærbrukeren er en kommunal arealplanlegger.

Primærflyten er kommune → framtidig utbygging → ett analysetema → treff i kart
→ hovedresultat. Kartet viser analysen automatisk; resultatet skal samtidig
kunne forstås som tall og tekst. Brukeren navigerer selv. Temabytte, filter og
objektvalg skal aldri zoome eller panorere. Bare `Vis hele kommunen` tilpasser
utsnittet eksplisitt.

Arbeidsflyten er implementert i brukerflaten, men de rasterbaserte tallanalysene
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

## 3. Eget polygon – bevart kode, midlertidig skjult inngang

**Status: modulene er implementert og testet; ikke tilgjengelig i arbeidsflaten**

Tegning, UUID-identitet, rasterisering og overlaypipeline beholdes for framtidig
bruk. Plan → polygon A → polygon B → plan, prosentnevner, cache og sene svar
har fortsatt dekning i modulregresjoner. Appen eksponerer bare framtidig utbygging.
Å gjeninnføre tegning krever en ny produktbeslutning. Flere områder, innlasting
og lagring er fortsatt framtidige behov.

## 4. Natur og jordbruk – implementert prototype

**Status: implementert prototype**

Som bruker ønsker jeg å forstå hvor mye Natur og Jordbruk som overlapper valgt
analyseområde.

Resultatet skal minst vise:

- berørt Natur i dekar
- berørt Jordbruk i dekar
- relevant andel av analyseområdet når nevneren er metodisk riktig
- økosystemfordeling der den er beregnet
- automatisk synlige treff og delresultatfilter uten zoom

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
- bruke ett tema om gangen og beholde manuell navigasjon
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

**Status: ny presentasjon implementert; reell visuell acceptance gjenstår**

Akseptansekriterier:

1. Planområde, valgt tema og faktisk overlapp skal være synlige og tydelig forskjellige.
2. Resultatet vises automatisk. Ingen knapp eller automatisk zoom trengs for å finne treff.
3. Ett radio-valgt tema om gangen; gamle temalag og treff fjernes ved bytte.
4. Filter og valgt lokalitet oppdaterer kart og panel med samme identitet uten å flytte utsnittet.
5. Natur/Jordbruk følger `overlay.cleaned`; Verdsatte naturtypers overlapp følger
   beregnede pixelindekser på samme planmask. Kildepolygoner er kontekst, ikke ny arealmetode.
6. Lilla overlapplag er sterkere enn naturtypekonteksten; valgt objekt har ekstra outline.
7. Null treff, manglende grunnlag, lasting og teknisk feil skilles; status vises én gang.
8. Mobil og desktop prøves i virkelig Chromium. Manuell zoom og panorering beholdes.

Browserregresjonen kontrollerer faktisk Canvas-rendering med kontrollerte
geometrier. Reelle Trondheim-data må i tillegg vise alle tre roller før PR
opprettes. DiBK HTTP 403 i utviklingsmiljøet har foreløpig blokkert denne
acceptance; fixturetesten er ikke tjenestevalidering.

## 12. Objektinformasjon for aktiv analyse

**Status: implementert for Verdsatte naturtyper; øvrige objektflyter er TODO**

Kart og kompakt resultatliste deler valgt lokalitet og verdi-/naturtypefilter.
Listevalg markerer kildeobjektet; kartvalg velger samme rad og detaljer.
Ingen av valgene endrer zoom eller sentrum. Hovedresultat er antall berørte
lokaliteter, unikt overlappsareal og enkel verdifordeling. Metode og dekning
ligger i lukket detaljfelt.

Desktop bruker kart med sidepanel; mobil har kart-/resultatsnarveier og store
kontroller. Inngangen til tegning og skjul-/zoomhandlinger er fjernet fra flaten.

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
- Ingen treff, ukjent dekning og
  teknisk feil forklares forskjellig. Informasjonen kan også nås uten
  presist kartklikk og brukes på mobil.

## 13. Flere egne områder og innlasting

**Status: TODO – polygonmoduler beholdes; inngangen er skjult. Områdeliste og innlasting mangler**

Mulige behov er navngiving, valg, fjerning og sammenligning av flere egne
områder samt innlasting av egne arealer/planer. Dette er framtidige
produktoppgaver, ikke implementert funksjonalitet eller en ny analysefamilie.

Før prioritering må det besluttes om områder analyseres separat eller samlet,
hvordan overlapp håndteres, hvilke filformater/projeksjoner som støttes og
hvordan lagring, størrelsesgrenser og datakvalitet formidles. Områdene skal ha
eksplisitt identitet, kilde og rolle. Innlasting skal valideres før analyse;
en egen tegning skal ikke automatisk erstatte gjeldende plan. Plansammenligning
krever egen faglig beslutning om gjeldende og foreslått arealbruk, jf. del 7.
