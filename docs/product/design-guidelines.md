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

Hovedhierarkiet er:

1. **Velg analyseområde**
2. **Kryss området med**
3. **Resultat**
4. **Finn resultatet i kartet**

På desktop:

- kartet er hovedflate
- analysepanelet ligger ved siden av
- resultatkortene skal være lett skannbare
- sekundære kartinnstillinger kan ligge i sammenleggbart felt

På mobil:

- kart og analyse skal kunne brukes uten horisontal scrolling
- knapper skal ha tilstrekkelig størrelse og luft
- tegnemodus skal være tydelig
- resultatet skal kunne leses uten at kartet er synlig samtidig

## Resultatdesign

Overlayresultater skal presenteres med hovedtall først.

Eksempel:

- Natur som overlapper
- Jordbruk som overlapper
- berørte lokaliteter
- unikt overlappsareal

Detaljfordeling kommer etter hovedtallet.

«Finn resultatet i kartet» skal være en tydelig primærhandling når resultatet
kan stedfestes.

## Tegnemodus

Når brukeren tegner polygon:

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

## Tilgjengelighet

- hovedresultater skal være tilgjengelige som tekst, ikke bare kart
- interaktivt kart skal ha tilgjengelig navn
- feilmeldinger og lastestatus skal være semantiske
- tastaturfokus skal være synlig
- farge skal ikke være eneste bærer av informasjon
- mobilvisning skal være reelt brukbar, ikke bare teknisk responsiv
