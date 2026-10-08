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
- begrenses i beregningen til gyldige, ikke-transparente piksler i det
  klargjorte kommunevise rasteret
- analyseres på samme overordnede rasterpipeline som øvrig overlay
- kan krysses med Natur og jordbruk
- kan krysses med Verdsatte naturtyper

Den tegnede geometrien vises som en dempet, stiplet ramme og beholdes når
kartet opprettes på nytt ved sidenavigasjon i samme økt. Rammen ligger over
trefflaget, med transparent innside, slik at den fortsatt synes også når hele
polygonet gir treff. «Tegn på nytt» starter en ny tegning; «Fjern område» fjerner området
og går tilbake til framtidig utbygging. Dette er ikke lagring mellom økter.

Ved endringer skal det testes at gammel analyse/cache ikke følger med når
brukeren bytter mellom framtidig utbygging og eget polygon.

Tegnet område får en UUID-basert `analysisId` ved fullført tegning, uavhengig av
kartinstans. Samme område beholder identiteten ved bytte av datagrunnlag.
Regresjonstester dekker unik ID etter ny kartinstans, plan → polygon A → polygon
B → plan og sene svar etter områdebytte. Tall og treffmaske brukes bare når
resultatets ID og kommune stemmer med aktiv analyse.

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

## 11. Tydelige overlaytreff i kartet

**Status: implementert prototype for de to eksisterende analysegrunnlagene**

Som bruker ønsker jeg umiddelbart å forstå hvor analysen gir treff og hvordan
treffene forholder seg til valgt analyseområde.

Gjeldende interaksjon og akseptansekriterier:

1. Analyseområdet og treffområdet kan skilles visuelt, også uten bare å tolke
   farge. Brukeren kan se både områdets ramme og hvilke deler som gir treff.
2. «Zoom til treff» gjør relevant resultat synlig og gir et
   forståelig utsnitt, også for små eller spredte treff. Brukeren skal ikke
   måtte tolke flere nesten like lag for å finne treffet.
3. Valg av verdikategori, naturtype eller annet delresultat gjenspeiles
   tydelig i kartet og markeres i resultatvisningen. Aktivt valg er synlig og
   kan nullstilles; det følger ikke med til et annet analyseområde.
4. Tegnforklaring og status beskriver aktivt område, datagrunnlag, treff og
   eventuelt filter. Kart og tall deler analyseidentitet og gyldig avgrensning,
   mens beregningsgrid og kildegeometri holdes adskilt.
5. Null registrerte treff, skjult resultat, manglende grunnlag, lasting og
   teknisk feil har ulike forståelige tilstander. Tomt kart alene er ikke
   en tilstrekkelig forklaring. Null treff betyr ikke fravær av naturverdi.
6. Flyten område → datagrunnlag → resultat → stedfesting fungerer på mobil og
   desktop. Tegnekontroller, resultatvalg, kartutsnitt og status prøves i en
   virkelig nettleser med berøring og tastatur; små enhetstester erstatter
   ikke denne kontrollen.

Natur- og Jordbruk-kortene velger tilhørende treffmaske og finner den i kartet.
Verdikategori og naturtype filtrerer faktiske berørte kildeobjekter i både
kart og liste. Svake hele lokaliteter viser kontekst; sterkt fyll følger
gyldige analyse-/verdimasker.
«Zoom til treff» beholder aktivt delresultat, gjør det synlig og
tilpasser utsnittet til alle valgte treff. «Vis alle» nullstiller filteret for Verdsatte naturtyper, mens
«Vis alle treff» nullstiller Natur/Jordbruk. Område- og datagrunnlagsbytte nullstiller filter og skjult resultat.
Uten treff flyttes ikke kartet til en tom maske; statusen forklarer null treff
og analyseområdets ramme beholdes.

Kartet har en kompakt kontekst med område, datagrunnlag, aktivt valg, status og
egen tegnforklaring for resultatmasken. Analyseområdet vises dempet, mens
treff vises med sterk fyllfarge og lys kant. Kartmasken for Natur/Jordbruk
beholder det beregnede analysegridet også ved nær zoom; visningen henter ikke
en annen treffmaske fra mer detaljerte kartfliser. Dette endrer ingen tall,
rastermetode eller kommuneavgrensning.

På mobil finnes snarveier mellom kart og resultat og tegnehandlinger ved
kartet. Beregningsfeil, visningsfeil, lasting, utilgjengelig grunnlag, null
treff og skjult resultat forklares som forskjellige tilstander. Generell
objektinformasjon for andre analysegrunnlag, flere tema og
plansammenligning er fortsatt framtidige behov.

## 12. Objektinformasjon for aktiv analyse

**Status: implementert for Verdsatte naturtyper; øvrige objektflyter er TODO**

Kart og kompakt resultatliste deler valgt lokalitet, filtrering på verdi og
naturtype og Vis alle. Listevalg markerer og finner samme kildeobjekt i
kartet; kartvalg markerer raden og detaljene uten å flytte hele siden.
Detaljer viser navn, naturtype, verdi, kilde-ID og registrert overlappsareal
med prototypeforbehold. Hovedresultat er antall og unikt areal; verdifordeling
bruker høyeste verdi, mens objekter/naturtype fortsatt viser registrert areal.

Etter resultatet er område/datagrunnlag sammenleggbart, og kartet er hovedflate.
Tegn på nytt og Fjern område er fortsatt tilgjengelige. Zoom til treff er
kompakt og beholder filteret. Mobil bruker separate kart-/resultatflater og
44 px kontroller, uten et permanent objektpanel oppå kartet.

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

**Status: TODO – ett tegnet polygon er dekket; områdeliste og innlasting mangler**

Mulige behov er navngiving, valg, fjerning og sammenligning av flere egne
områder samt innlasting av egne arealer/planer. Dette er framtidige
produktoppgaver, ikke implementert funksjonalitet eller en ny analysefamilie.

Før prioritering må det besluttes om områder analyseres separat eller samlet,
hvordan overlapp håndteres, hvilke filformater/projeksjoner som støttes og
hvordan lagring, størrelsesgrenser og datakvalitet formidles. Områdene skal ha
eksplisitt identitet, kilde og rolle. Innlasting skal valideres før analyse;
en egen tegning skal ikke automatisk erstatte gjeldende plan. Plansammenligning
krever egen faglig beslutning om gjeldende og foreslått arealbruk, jf. del 7.
