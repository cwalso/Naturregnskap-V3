# Visuelle føringer for Kommunale naturregnskap

**Sist oppdatert: 08.10.2026**

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

## Temasider

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

`Utforsk i kart` skal være et analyseverksted, ikke en lagkatalog.

Modellen er **framtidig utbygging × ett valgt tema**. Analyseområdet er fast;
Natur og jordbruk og Verdsatte naturtyper velges med radio, ikke lagpanel.
Ingen wizard, inngang til tegning eller framtidige temavalg i arbeidsflaten.

Kartet er hovedflate på desktop, med kompakt resultatpanel ved siden av.
På mobil brukes kart-/resultatsnarveier, minst 44 px kontroller, tastaturfokus
og ingen horisontal scrolling. Resultatet skal også kunne leses uten kart.

## Resultatdesign

Overlayresultater skal presenteres med hovedtall først.

Eksempel:

- Natur som overlapper
- Jordbruk som overlapper
- berørte lokaliteter
- unikt overlappsareal

Detaljfordeling kommer etter hovedtallet.

Kartet viser resultatet automatisk. Ingen zoom til treff eller objekt, og
resultatvalg flytter ikke utsnittet. Brukeren zoomer/panorerer selv eller
velger `Vis hele kommunen`.

Faste roller:

- nøytralt bakgrunnskart; dempet Grunnkart bare når Natur/Jordbruk er valgt
- framtidig utbygging: rolig blått fyll og tydelig kant
- naturtypelokaliteter: ordinært temakart og moderate berørte kildepolygoner
- overlapp: sterkest fyll, mørk kant og lys ytterkant; lilla for Verdsatte naturtyper
- valgt lokalitet: ekstra hvit og mørk outline uten zoom

Tegnforklaringen beskriver bare aktive roller. Ved temabytte skjules gammelt
tema og overlapp; nytt resultat vises med samme kommune og analyseidentitet.
Hovedtall, enkel verdifordeling og lokalitetsliste prioriteres. Metode og dekning
ligger sekundært; status gjentas ikke i kart og panel.

Obligatorisk acceptance i virkelig Chromium med reelle Trondheim-data krever
synlig planområde, naturtypelokaliteter og overlapp, tilsvarende Natur/Jordbruk,
ryddig temabytte og stabil manuell navigasjon. Kontrollerte pixeltester er
regresjonsdekning og kan ikke erstatte dette.
