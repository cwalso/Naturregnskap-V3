# ADR: Separat kartpresentasjon for Utforsk i kart

- Dato: 2026-10-09
- Status: Implementert på branch; publisering krever merge og deploy
- Presiserer presentasjonsdelen av `2026-10-08-v3-isolated-explore-map.md` og
  `2026-10-08-v3-locality-presentation-and-value-priority.md`; eldre ADR-er beholdes som historikk.

## Bakgrunn

Tidligere kartpresentasjon gjorde registrerte lokaliteter og beregnet overlapp
vanskelige å skille. En ny separat kartkomponent ble etablert med visuell gate
før kobling til offentlig brukerflate. DiBK-kall var først blokkert av
utviklingsmiljøets proxy. Etter åpnet tilgang ga frontendens uendrede GetMap-
requests HTTP 200 med PNG; det var ikke grunnlag for å endre URL eller filter.

## Beslutning

`ExploreAnalysisWorkspace` bruker eksisterende App-resultater og tilstander.
Den monterer `ExploreAnalysisMap`, ikke den gamle `municipalityMap`, for
`#utforsk-i-kart`. Andre kart og temasider beholder sin eksisterende visning.
Gammel arbeidsflate, tegning og metodekode slettes ikke.

Primærmodellen er framtidig utbygging × ett valgt grunnlag: Natur/Jordbruk
eller Verdsatte naturtyper. Tegneinngangen er midlertidig skjult; reaktivering
krever egen oppgave og visuell kontroll. Ingen nye tema, innlasting eller
plansammenligning følger av beslutningen.

Kartlag skilles eksplisitt:

1. Nøytralt bakgrunnskart.
2. Hele den eksisterende gyldige planmasken som blå rasterflate.
3. Ordinær naturtype-WMS med kildens symbolikk når dette grunnlaget er valgt.
4. Planens kant over temakartet.
5. Beregnet treff: lilla for naturtypeoverlapp, grønt/oker for Natur/Jordbruk.
6. Valgt lokalitets kildegeometriske omriss.
7. Vanlig vektormaske utenfor kommunen og tydelig kommunegrense.

`exploreOverlapGeometry.ts` følger ytre cellekanter i eksisterende mask,
utelater interne kanter og bevarer hull. Treffgrensen er beregnet
rastergeometri på ca. 21,16 m grid, ikke naturtypens eksakte geometri eller en
ny vektorinterseksjon. Fyll og lys kant gjør treffet synlig ved kommuneutsnitt;
strekens skjermbredde inngår ikke i beregning av areal.

Kartet passer bare utsnitt til kommune ved kommunebytte eller eksplisitt
«Vis hele kommunen». Temabytte, filtrering, objektvalg, resize og sene
resultater skal bevare brukerens utsnitt. Liste og kart deler lokalitetsvalg.
Verdi-/naturtypefilter endrer treff og liste; WMS viser fortsatt tema som
kontekst. Hovedtallene gjelder hele analysen, med aktivt filter forklart.

Panelet prioriterer antall, unikt areal, verdifordeling og liste. Dekning,
metode og forbehold er sekundært. Mobil bruker en kolonne med Kart/Resultat-
snarveier, minst 44 px kontroller og ingen horisontal scrolling ved 390 px.

## Bevarte faglige og tekniske kontrakter

- Fire verdikategorier og høyeste verdi ved overlapp er uendret.
- UTM-korreksjon, analysegrid, DiBK-filter og hele gyldige prosentnevner er uendret.
- Plan og treff viser samme resultats kommune og `analysisId`.
- Tegnede UUID-er og eksisterende cache-/stale-pipeline er uendret.
- Rasteranalyser er fortsatt Trondheim-klargjort prototypebeslutningsstøtte,
  ikke autoritative regnskapstall eller nasjonal analysetjeneste.
- Normal WMS-visning er uavhengig av beregning; kartfeil og beregningsfeil
  forklares hver for seg. Manglende registrering betyr ikke fravær av naturverdi.

## Kontroll og konsekvenser

A–E er kontrollert med reelle Trondheim-data: naturtype-WMS alene, plan alene,
begge uten trefflag, tydelig beregnet overlapp, og Natur/Jordbruk. Zoom inn,
zoom ut, pan, temarundtur og 390 px er kontrollert uten reset. Ny faktisk
OpenLayers/Chromium-renderkontroll kontrollerer sammensatte skjermpiksler,
temarydding, identitet og bevart utsnitt; den inngår i GitHub Quality Gate.
Live tjenestekontroll er separat og skal ikke erstattes med fixtures som
akseptbevis. Tester validerer presentasjonen, ikke den autoritative analysekilden.

Planvisningen lager statiske rasterbilder av eksisterende mask; treffvisningen
lager vektorgrenser bare ved endret resultat/utvalg. Dette er et avgrenset
presentasjonsvalg, ikke en ny resultatcache. Ytelse for store framtidige
analysegrunnlag må måles før nasjonal utrulling. Kilder og kartressurser
frigjøres ved destruksjon.
