# Visuelle føringer for Kommunale naturregnskap

**Sist oppdatert: 09.10.2026**

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

Brukeren velger ett selvstendig karttema: Grunnkart nivå 0, Verdsatte
naturtyper eller framtidige utbyggingsformål. Nivå 0 er standard.
Faglig rolle, aktivt tema, tegnforklaring og kilde er tydelige.

En kompakt select håndterer også 6–8 framtidige temaer uten ny navigasjon.
Det er ingen fri lagkombinasjon eller generell GIS-katalog.
Naturtypefilteret har tekstsøk, kommunerelevante valg og fire verdikategorier.
Kart og liste bruker samme utvalg; kilde-ID-er beholdes i lokalitetsinformasjon.

På desktop ligger kart og temapanel ved siden av hverandre. På mobil
ligger de i én kolonne. Kontroller er minst 44 px, og visningen skal ikke
ha horisontal scrolling ved 390 px.

Temabytte, filtrering, objektvalg og resize bevarer senter/oppløsning.
Bare kommunevalg og eksplisitt reset tilpasser utsnittet. Framtidig utbygging
viser bare Natur og Jordbruk innenfor planformålene, med to egne legendeposter
og eksisterende grønn/gul symbolikk. Bebygd og vann skjules; forklaringen
skiller kartpresentasjon fra bokført eller prognostisert naturtap.
Kryssanalyse er skjult og krever separat reaktivering etter manuell kontroll.

## Resultatdesign i beholdt analyseverksted

Føringene nedenfor gjelder den beholdte analysepresentasjonen, ikke de tre
selvstendige karttemaene.

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
