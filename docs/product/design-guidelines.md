# Visuelle føringer for Kommunale naturregnskap

**Sist oppdatert: 13.10.2026**

## Status

Brukerflaten er en offentlig prototype. Den er ikke en ferdig eller
profilgodkjent Miljødirektoratet-tjeneste.

Miljødirektoratets designmanual og offentlige komponentbibliotek er relevante
referanser, men prototypen skal ikke framstå som offisielt godkjent avsenderflate
uten eksplisitt avklaring.

## Avsender og header

Offentlig prototype skal bruke en nøytral header med:

- «Kommunale naturregnskap»
- tydelig teststatus
- kommunevalg og navigasjon

Miljødirektoratets logo skal **ikke** brukes i offentlig prototype uten
eksplisitt godkjenning.

Tidligere logoimplementasjon er historikk og er ikke gjeldende designregel.

Hovedvalgene Kommuneoversikt, Naturtapet, Naturtema og Utforsk i kart står
permanent i en horisontal rad på desktop (over 52 rem). Aktiv side markeres
med bakgrunn, understrek og `aria-current`; temasidene markerer Naturtema.
På mindre skjermer åpnes den samme navigasjonen med en knapp. Valg lukker
menyen; Escape lukker og returnerer fokus til menyknappen. Kommunevalg og
nøytral avsender/teststatus beholdes. Ingen nye hovedsider innføres.

## Designretning

Uttrykket skal være:

- enkelt
- luftig
- offentlig forvaltning, ikke «GIS-verktøy»
- tydelig hierarki
- få valg av gangen
- kart som hjelpemiddel
- tall og hovedbudskap som første lesning
- forståelig for kommunale arealplanleggere

Skisser og etablerte sider i V3 er designbaseline. Ikke tolk dem fritt når en ny
side skal følge samme mal.

## Farger

Primærfargene i prototypen er basert på sjøgrønn profil:

- Sjøgrønn mørk: `#005E5D`
- Sjøgrønn mellom: `#337E7D`
- Sjøgrønn 6: `#669E9D`
- Sjøgrønn 2: `#CCDFDE`
- Sjøgrønn 1: `#E5EEEE`

Beige og oransje brukes som støttefarger.

Faglig kartografi skal ikke recolores bare for å passe profilen. Profilfarger
brukes i grensesnitt og kontrollflater.

## Typografi

Prototypen bruker:

`"Open Sans", Arial, sans-serif`

Ikke legg proprietære fontfiler i repoet uten særskilt avklaring.

## Kommuneoversikt – ny forside (13.10.2026)

Oversikt følger brukerens nye skisse med en luftig todelt toppseksjon:
Natur, Jordbruk og Bebygget til venstre, eksisterende kommuneavgrenset
OpenLayers-/Grunnkart-kart til høyre. Nøkterne kildeopplysninger skiller
SSB-arealtall fra Grunnkart-visningen. Ingen andel utledes når
`sharePercent` mangler. Faktiske historiske data skal ikke erstattes med eksempeltall.

To lyseblå fortellende seksjoner med store Unsplash-bilder rammer inn
en historisk forhåndsvisning. Fra 14.10 viser denne eksplisitt autoriserte
Trondheim-demodata for 2016–2025, med to nøkkeltall og kompakt økosystemfordeling.
«Demodata – illustrasjon, ikke offisiell statistikk» står ved tallene.
Listen har ingen utvidelse eller Utforsk-lenker per rad.
Eksisterende temainnganger, blant annet Skog og Våtmark, ligger i temakortene.
Den andre fortellende seksjonen gjelder mulig utbyggingspress og leder til
eksisterende kart/planoverlapp; ingen samlet planarealverdi konstrueres.
Generelle beskrivelser av inngrep er ikke kommunespesifikke
resultater. Ingen sammenlignings-/rangeringsseksjon vises uten eksisterende
dokumentert datagrunnlag. Skissens illustrerte rangeringer overføres ikke.

Seks temakort gir innganger til Skog, Våtmark, Verneområder, Verdsatte
naturtyper, Inngrepsfri natur og Villrein. Økosystemer og supplerende
naturverdier/vern har separate grupper. Treffstatus gjenbrukes fra eksisterende
kommunevise temadata; kildeobjekter omtales ikke som unike lokaliteter.

Bildene har tematisk/nordisk relevans, alt-tekst og lenket fotografkreditering.
Illustrasjonsfotoene er ikke dokumentasjon fra valgt kommune. Brede skjermer
har to kolonner; under 700 px stables innholdet, med kart etter oppsummeringen.
Alle seksjoner fungerer også ved manglende tall, kommunegrense og bilder.
[Bilder, datamangler og faktisk nettleserkontroll](../validation/2026-10-13-overview-redesign.md).

## Naturtapet og felles historisk datagrunnlag (14.10.2026)

Naturtapet har innledning, periodevalg, tre nøkkeltall, grupperte søyler for
natur/jordbruk, tabellalternativ, økosystemfordeling og valgfri etterfølgende
arealbruk. På mobil blir tidsdiagrammet horisontale søyler per periode.
En lyseblå seksjon forklarer manglende historiske polygoner; ingen kartpolygoner
simuleres. Brutto nedbygging holdes adskilt fra nettoendring og dagens beholdning.
Begge sider får samme kommuneeide datasett. Bare Trondheim har demodata;
andre kommuner får forklarte datamangler. Kildemerking står ved hver visualisering.
Se [datamodell, illustrative kategorier og SSB-avklaringer](historical-loss-pages.md).

## Temasidenes oppbygning

Temasidene skal følge et felles redaksjonelt mønster:

1. brødsmule
2. tydelig hero med tittel, ingress og bilde
3. forklaringsspørsmål/accordion
4. 1–2 sentrale nøkkeltall
5. relevante analyser mot framtidig utbygging der metodisk koblet
6. kilde/metode
7. kart
8. diagram/tabell eller annen relevant innsikt
9. FAQ/begrensninger

Gjeldende temasider er:

- Myr (våtmark)
- Skog
- Verdsatte naturtyper
- Verneområder
- Villreinområder
- Inngrepsfri natur
- Bynaturen (grå arealer)

Ikke opprett nye temasider uten eksplisitt beslutning.

## Bilder

Flere temasider bruker midlertidige Unsplash-bilder via eksterne
`images.unsplash.com`-URL-er.

Dette er kun prototypeillustrasjoner.

Før mer formell publisering bør bildene:

- ha dokumentert kilde
- ha avklart bruksrett
- ha fotograf/kreditering der det kreves
- lagres kontrollert eller leveres fra godkjent bilde-/medieløsning
- faglig passe temaet

Ikke anta at dagens Unsplash-motiver er endelige.

## Utforsk i kart

Brukeren krysser av uavhengige kartlag: Grunnkart nivå 0, framtidig utbygging
og Verdsatte naturtyper, Verneområder, Inngrepsfri natur (INON), Villrein og Grå arealer.
Nivå 0 er standard. Grupper er Regnskapsgrunnlag,
Plandata og Supplerende temadata. 0–7 aktive lag støttes; alle av viser basen.
Aktive lag viser egen gjennomsiktighetskontroll, tegnforklaring og kilde.

Avkryssingslisten har begrenset høyde og kan senere romme åtte implementerte
lag; ingen uvirksomme avkryssinger vises. Fast rekkefølge: nivå 0, Grå arealer, INON,
Villrein, plan, naturtyper, verneområder og kommunemaske/grense. Nivå 0
starter med 30 %, INON med 35 %, Grå arealer med 25 %, øvrige med 0 % ekstra gjennomsiktighet.
De tre nye lagene bruker offisielle symboler og GetLegendGraphic. INON-år
er synlig uten å åpne kildebeskrivelsen. Tomt bilde, regional datadekning
og kildefeil forklares forskjellig. Ingen fri flytting av lag eller GIS-katalog.
Naturtypefilteret har tekstsøk, kommunerelevante valg og fire verdikategorier.
Kart og liste bruker samme utvalg; kilde-ID-er beholdes i lokalitetsinformasjon.

Godkjent V2-design bruker en kompakt lagliste og ett kontekstpanel.
Midlertidig laste-/kartstatus vises i detaljpanelet og eksisterende tilgjengelige
statusmeldinger, ikke i lagradene. Lagradenes høyde er stabil ved statusendringer.
Desktop har 274 px lagliste og 338 px detaljer ved behov. Ved 900 px
bruker detaljer laglistens 252 px sideplass, med «Tilbake til kartlag».
Mobil åpner ett bunnpanel på 260–300 px; kartet får egen flate over.
Naturtype og verdi prioriteres, navnesøk kan utvides, objektinformasjon
bytter inn i samme panel. Aktive filtre vises i lagrad og snarvei ved kartet.
Gråarealprodukt velges med native radio; gjennomsiktighet ligger per lag.
Samlet tegnforklaring følger aktive lags tegnerekkefølge fra øverst til nederst.
Escape og fokusretur, tastatur og intern scrolling bevares. Lave skjermer
bruker vertikal reflow. Headerens kommunevalg beholdes; hovednavigasjonen
følger den permanente desktopraden beskrevet ovenfor.
[Beslutning](../decisions/2026-10-12-v3-explore-design-v2.md).

Fra 14.10 åpner «Analyser planområder» primært **Arealfordeling**; **Registrerte
naturverdier** er et eget, supplerende valg i samme panel. Kommuneoversiktens
analyseinngang åpner arealfordelingen direkte, mens temasidens eksisterende
overlappsinngang åpner naturverdiene. Arealresultatet viser natur/jordbruk og
identifiserte nivå-1-typer med synlig ufordelt natur. Tydelig prototypemerking
skiller reelle kartanalyser fra historiske demodata. Ingen summering mellom
heldekkende arealer og registrerte lokaliteter.

Kun arealpanelet får 420 px på desktop og 340 px ved 900 px, med fortsatt synlig
kart. Mobil bruker 300–360 px resultatpanel; «Vis kart»/Plananalyser veksler
uten å fjerne det beregnede utvalget. Utvalg/fit/nullstilling er separate handlinger.
Fargelagte resultatområder har mørk kontur for lesbarhet i grove utsnitt;
konturbredden innebærer ikke større treffareal eller bedre geografisk presisjon.
Lagvalg, gjennomsiktighet, filtrering, objektvalg og resize bevarer senter/oppløsning.
Bare kommunevalg og eksplisitt reset tilpasser utsnittet. Framtidig utbygging
viser bare Natur og Jordbruk innenfor planformålene, med to egne legendeposter
og mørk grønn/gul diagonalskravur over transparent tint. Natur og Jordbruk har
motsatt skravurretning. Linjeavstand og -bredde er stabile i skjermpiksler
ved zoom og forskjellig skjermoppløsning; legend viser samme mønster.
Range-kontroller skal passe innenfor innholdsbredde uten standardmarginer
som skaper horisontal scrolling. Bebygd og vann skjules; forklaringen
skiller kartpresentasjon fra bokført eller prognostisert naturtap.
Den eldre analysearbeidsflaten er skjult. Den godkjente geometriske
planoverlappanalysen åpnes eksplisitt med «Analyser planoverlapp», som står
fast over den rullbare laglisten. Mobil har «Planoverlapp» i kartkontrollene,
med samme tilgjengelige knappnavn. Den åpner eksisterende kontekstpanel i
samme kartinstans, uavhengig av synlighet for plan- og naturtypelag.
Lagvalg starter fortsatt ingen analyse. Se
[kontrollrapport for hovednavigasjon og analyseinngang](../validation/2026-10-13-navigation-analysis-entry.md).

## Resultatdesign i beholdt analyseverksted

Føringene nedenfor gjelder den beholdte analysepresentasjonen, ikke de tre
uavhengige kartlagene.

Overlayresultater skal presenteres med hovedtall først.

Eksempel:

- Natur som overlapper
- Jordbruk som overlapper
- berørte lokaliteter
- unikt overlappsareal

Detaljfordeling kommer etter hovedtallet.

Kartet viser resultatet direkte med et kompakt sidepanel. Antall berørte
lokaliteter, unikt overlappsareal, verdifordeling og lokalitetsliste er primært.
Dekning, metode og forbehold ligger i et sekundært sammenleggbart felt.

Kartografi i den beholdte analysearbeidsflaten:

- framtidig utbygging: blå flater og mørk blå kant fra hele gyldige planmasken
- Verdsatte naturtyper: ordinær WMS med datakildens etablerte farger
- beregnet naturtypeoverlapp: lilla fyll og tydelig lys kant over plan og tema
- Natur/Jordbruk: grønt/oker fra eksisterende klassifiserte treffmaske
- valgt lokalitet: mørkt kildegeometrisk omriss med lys kant
- kommunegrense over vanlig vektormaske utenfor kommunen

Treffgrensene følger eksisterende ca. 21,16 m analysegrid. De skal ikke
fremstilles som naturtypens eksakte geometri. Kantbredden er en visuell
markering i skjermpiksler, ikke et ekstra beregnet areal.

Brukeren zoomer og panorerer selv. Temabytte, filter, objektvalg og innkomne
analyseresultater skal ikke tilpasse utsnittet. «Vis hele kommunen» er eneste
reset-handling i arbeidsflaten. «Zoom til treff» og «Finn resultatet i kartet»
er skjult sammen med den eldre kartflyten.

Verdikategori/naturtype filtrerer treff og lokalitetsliste, mens hovedtallene
fortsatt gjelder hele analysen. Aktivt filter forklares eksplisitt; naturtype-
og objekttall kan dobbelttelle, mens verdiandeler bygger på høyeste verdi.
Filter og valgt lokalitet nullstilles ved kommune-/analyse-/grunnlagsbytte.
Null treff, lasting og teknisk feil er forskjellige tilstander.

På mobil står kart og resultat under hverandre med Kart/Resultat-snarveier.
Kontroller har minst 44 px høyde, og brukerflaten skal fungere ved 390 px uten
horisontal scrolling. Tegneinngangen er midlertidig skjult; gammel
metode-/kartkode er beholdt. Den må få egen visuell gate før reaktivering.

## Tegnemodus

Før tegneinngangen reaktiveres skal følgende fortsatt gjelde:

- det skal være åpenbart at kartet er i tegnemodus
- kontrollene Angre punkt, Ferdig og Avbryt skal være tilgjengelige
- tegnet polygon skal være visuelt tydelig
- brukeren skal kunne tegne på nytt eller fjerne området
- kartklikk for objektinformasjon skal ikke konkurrere med tegning

## Kart og kommuneavgrensning

Temadata på temasider skal ikke vises utenfor valgt kommune.

Dagens mønster er:

- temalag tegnes normalt
- området utenfor kommunen maskeres visuelt
- kommunegrensen ligger tydelig over
- kartlaget begrenses til kommunens utstrekning der det er hensiktsmessig

Ikke gjeninnfør sårbar canvas-klipping uten dokumentert behov.

## Tegnforklaring

Aktive faglag skal ha forståelig tegnforklaring.

For WMS skal tjenestens `GetLegendGraphic` foretrekkes når den er korrekt og
forståelig. Manuell symbolikk skal ikke gjettes.

Analyseverkstedets egen resultatmaske har en separat tegnforklaring fra
visningskoden: blått planområde, grønt for Natur, oker for Jordbruk og lilla
beregnet overlapp for Verdsatte naturtyper. Den beskriver
prototypeoverlapp og erstatter ikke datakildenes faglige tegnforklaringer.

## Tilgjengelighet

- hovedresultater skal være tilgjengelige som tekst, ikke bare kart
- interaktivt kart skal ha tilgjengelig navn
- feilmeldinger og lastestatus skal være semantiske
- tastaturfokus skal være synlig
- farge skal ikke være eneste bærer av informasjon
- mobilvisning skal være reelt brukbar, ikke bare teknisk responsiv

Grå arealer er koblet inn via NIBIOs offisielle `graastruktur`-WMS, med
`graa_arealer`, `andel_uten_vegetasjon` og `andel_med_vegetasjon` bak én
avkryssing. Framstillingsvalg bevarer lag, opasitet, filter/valg og utsnitt.
Kildens estimater og GetLegendGraphic brukes direkte; ingen egen prosent-
eller arealberegning. Testversjon 1 har sammensatt kildegrunnlag og er ikke
lik nivå-0-klassen Bebygd. Kildens målestokkgrense 1:250 000 håndteres som
`out-of-scale`, med forklaring og uten automatisk zoom. FKB-Grønnstruktur
er teknisk kontrollert, men publiseres ikke før Norge digitalt-bruksrett
for denne offentlige prototypen er dokumentert. Gråareal-WMS-en har egne
tjenestevilkår uten begrensninger; nedlastbare data har annen lisens.
Se [kilde-/kartkontroll](../validation/2026-10-12-grey-areas.md).
