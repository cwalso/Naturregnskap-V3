# Direkte Grunnkart-geodata – tilgang og kjørbar Trondheim-pilot

Dato: 14.10.2026. Repository `cwalso/Naturregnskap-V3`, branch
`feat/explore-analysis-map`, PR #76. Faktisk lokal og remote start-HEAD:
`81dd4154f438248130f426526340632fdc7f7e80`. Arbeidskopien var ren.
Main er fortsatt `a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`.

## 1. Hovedkonklusjon

**Geometripiloten med reelle Grunnkart-data er ikke gjennomført.**
Årsversjon 2025 med GPKG/FGDB/GML er dokumentert i offisielle metadata,
men korrekt Trondheim-fil og nødvendig bruksrett kunne ikke verifiseres.
Nedlastingsvertene avvises av miljøets HTTP-proxy med 403. Ingen
datasettautentisering eller oppdrags-/utlånsavtale er konfigurert/dokumentert.

Dette utløser oppgavens eksplisitte stoppregel for selve geometripiloten.
Det er ingen konstruerte C-resultater eller nye natur-/jordbrukstall.
Tilgangsundersøkelsen er fullført, og et lokalt, testet oppsett er klart til
å ta imot faktisk fil når årsversjon, bruksrett og klassifikasjon er dokumentert.
Produksjonsberegninger, kart, UI og eksisterende analyseidentitet er uendret.

## 2. Tilgang og rettigheter

### Faktisk kontroll

| Kontroll | Resultat |
| --- | --- |
| [Offisiell katalogoppføring](https://data.norge.no/nb/datasets/ad38290e-2c12-3b77-96a8-fa07e02eefa7/nasjonalt-grunnkart-for-arealanalyse) | Lest via nettsøk: produktet har GPKG, FGDB og GML-distribusjoner, begrenset tilgang og Norge digitalt-lisens |
| [Geonorge produkt-UUID](https://kartkatalog.geonorge.no/metadata/uuid/28c28e3a-d88f-4a34-8c60-5efe6d56a44d) | Nytt direkte forsøk: proxy-403; nettsøk kunne heller ikke åpne denne katalogruten |
| [Dokumentert Atom/GML-distribusjon](https://nedlasting.geonorge.no/geonorge/ATOM-feeds/GrunnkartArealanalyse_AtomFeedGML.xml) | Nytt direkte forsøk: proxy-403. Ingen faktiske kommuneoppføringer/filnavn lest |
| [Geonorge nedlastings-API](https://nedlasting.geonorge.no/api/capabilities/) | Nytt direkte forsøk: proxy-403. Produktspesifikke formater, CRS-valg og autentisert bestilling ikke hentet |
| Miljøets tilganger | Restriktiv policy er aktiv, versjon 22; ingen konfigurerte datasettidentiteter/tilgangsopplysninger. Dette sier ikke om brukerens virksomhet har en avtale |
| Faktisk 2025-fil | Ingen mottatt eller lastet ned. Ingen fil-CRS, objekter eller fysisk skjema kan bekreftes |
| Bruksrett for lokal pilot/Codex | Ikke verifisert. Kataloglisens alene dokumenterer ikke at denne aktøren og miljøet omfattes |

[Maskinlesbar tilgangskontroll](2026-10-14-direct-grunnkart-pilot/access-check.json).
403 gjelder miljøets destinasjonspolicy, ikke en autentisert avvisning fra
Geonorge. Det er ikke bevis for at dataene ikke eksisterer eller at korrekt
autentisert nedlasting ville mislykkes. Tilgangskontroller er ikke omgått.

### Kan lokal analyse uten publisering være tillatt?

[Kartverkets Norge digitalt-vilkår](https://www.kartverket.no/geodataarbeid/norge-digitalt/partsinformasjon/avtaler-og-vilkar/norge-digitalt-lisens)
beskriver intern kopiering og bearbeiding for parters ansatte/oppdragsgivere,
og adgang til å gi underleverandører kopidata for avtalte oppgaver, med
sletting ved avslutning. **Lokal analyse kan derfor være en aktuell avtalt
bruk**, men aktør, oppdrag, behandlingsmiljø og eventuell underleverandørtilgang
må bekreftes. Ingen slik bekreftelse foreligger i denne oppgaven.

[Geonorges tilgangsveiledning](https://www.geonorge.no/kartdata/tilgang-og-passord/)
beskriver GeoID eller dataeiers tilgangssystem for regulerte data. Virksomheter
uten Norge digitalt-tilgang må benytte en egnet avtale/dataforhandler. Den
konkrete nedlastingsdistribusjonens autentisering er ikke testet her.
Det er ikke bedt om, lest eller lagret brukerpassord i repoet.

Rådata og alle geografiske avledede resultater skal bli i et avtalt privat
miljø. Publisering av statistikk må også avklares dersom vilkårene krever det;
rett til lokal analyse gir ikke automatisk rett til offentlig viderebruk.

## 3. Presis bestilling og verifisert datagrunnlag

Følgende uttrekk trengs:

| Bestillingspunkt | Krav |
| --- | --- |
| Produkt | **Nasjonalt grunnkart for arealanalyse, årsversjon 2025**, UUID `28c28e3a-d88f-4a34-8c60-5efe6d56a44d` |
| Område | Kommune **5001 Trondheim**, med tilstrekkelig flatedekning av lagret analysestøtte |
| Format | Foretrukket **GPKG**; FGDB eller GML med nødvendige sidefiler som alternativ |
| Innhold | Original flategeometri; økosystemnivå 1 og helst 2/3, klassekoder, kommune, kildeattributter og objekt-ID |
| CRS | Foretrukket EPSG:25833 dersom produktet tilbyr det; faktisk fil-CRS må følge dokumentasjonen. Ikke anta at valget finnes |
| Metadata | Eksakt årsversjon, produksjons-/uttrekksdato, innhold/skjema, dekning og lisens-/oppdragsvilkår |
| Rettigheter | Bekreftelse på lokal analyse i valgt miljø, eventuell underleverandørbehandling, sletting og hva som kan deles |

Lagret støtte ligger innen EPSG:25833-boksen
`[257526.78125, 7023573.4375, 280269.75, 7044454.65625]`.
Bestill helst kommuneproduktet, ikke et utsnitt som klipper bort nødvendig
geometri/topologiinformasjon. Boks er hjelpeinformasjon, ikke ny planmaske.

**Eksakt leverandørfilnavn kan ikke oppgis:** Atom/API/katalogens bestillingsvalg
kunne ikke leses. `trondheim-2025.gpkg` i kjøringsanvisningen er kun et lokalt
eksempelnavn. Ingen ubekreftet fil-URL eller layer er konstruert.

[NIBIO produktbeskrivelse](https://www.nibio.no/tema/jord/arealressurser/andre-kart/grunnkart-for-arealregnskap)
bekrefter årsversjoner og heldekkende fastlandsprodukt til én nautisk mil
utenfor grunnlinjen. [Offisiell GrunnkartFlate-modell](https://objektkatalog.geonorge.no/Objekttype/Index/EAID_B96B0139_3463_46a4_A65F_9023DABFA269)
beskriver geometri, nivå 1/2/3, kode, kommune og kildereferanser.
Disse dokumentene bekrefter modell/produkt, **ikke fysisk filskjema eller
dekning i en nedlastet Trondheim-fil**. Katalogens kilder per 01.01.2025
og årsversjon 2025 må verifiseres mot faktisk leveranse, ikke et testprodukt
publisert i 2025. [Nivå-1-kodeliste](https://register.geonorge.no/sosi-kodelister/temadata/grunnkart-arealanalyse/okosystemtypeniva1)
brukes til å validere eksplisitt klassemapping; ingen nivå-0-kobling utledes.

### Mottak i pilotmiljø

En autorisert person velger produkt, område, format og dokumentert år gjennom
[Geonorges nedlastingsflyt](https://www.geonorge.no/aktuelt/om-geonorge/slik-bruker-du-geonorge/laste-ned-data/),
med virksomhetens avtalte tilgang. Mottatt fil, metadata og vilkår lagres og
overføres gjennom virksomhetens godkjente filkanal/mount. Kopier plasseres
**utenfor Git-repoet**, eksempel `/workspace/work/direct-grunnkart-private/data/`.
Codex/cloud kan bare brukes dersom dette miljøet er omfattet av avtalen;
ellers kjøres oppsettet i virksomhetens lokale pilotmiljø.

GML overføres med skjema/sidefiler; FGDB som komplett `.gdb`-katalog. Behold
opprinnelig leveranse og uttrekksmanifest privat. Følg avtalte sletteregler.
Tilgangsopplysninger, råfiler og avledede geografiske filer legges ikke i GitHub.

### Kort forslag til forespørsel – ikke sendt

Til NIBIOs tekniske kartkontakt `gisdrift@nibio.no` eller produktkontakten
[Maria Oldeman Lund](https://www.nibio.no/tema/jord/arealressurser/andre-kart/grunnkart-for-arealregnskap):

> Vi ønsker et avgrenset uttrekk av Nasjonalt grunnkart for arealanalyse,
> årsversjon 2025, kommune 5001 Trondheim, helst GPKG med flategeometri,
> økosystemnivå 1/2/3, klassekoder, kommune og kilde-/objektidentifikatorer.
> Kan dere bekrefte riktig distribusjon, år, CRS, dekning og nedlastingsmåte?
> Formålet er en intern sammenligningspilot mot en eksisterende lagret planmaske.
> Kan uttrekket behandles i [virksomhetens valgte pilotmiljø], eventuelt med
> avtalt underleverandør, uten offentlig publisering av rådata eller avledet
> geometri? Oppgi nødvendige avtalevilkår, sletteregler og om aggregert statistikk
> og kontrollrapport kan deles. Vi ønsker også dokumentasjon som avklarer
> koblingen mellom økosystemklassene og eventuell overordnet arealgruppering.

Virksomhet/avtalepart og behandlingsmiljø må fylles inn av dataansvarlig.
Ingen melding er sendt og ingen ny avtale er inngått.

## 4. Kjørbart beregningsoppsett

[Verktøy og komplette kommandoer](../../apps/web/tests/analysis/direct-grunnkart/README.md)
ligger utenfor produksjonskode. Fiona/GDAL leser lokal fil, PyProj håndterer
dokumentert CRS, og Shapely/GEOS utfører flateinterseksjon. GPKG er testet med
egen syntetisk fil; faktisk FGDB/GML-produkt er ikke kontrollert.

`inspect` registrerer alle faktiske layer-/feltnavn, typer, CRS/WKT, bounds,
objektantall, attributtverdier og ugyldige/manglende geometrier i privat JSON.
Det antas ikke at filfeltene heter det samme som WMS/SOSI-feltene.

`run` krever privat manifest med kildefingeravtrykk, bekreftet 2025-år,
dokumentasjon for lokal analyse, faktisk layer/CRS og observerte feltnavn.
En boolean er ingen juridisk godkjenning: ansvarlig person må dokumentere
grunnlaget. Oppsettet nekter kjøring uten denne inputen, og uten rett hash.

Første sammenligning bruker uendret offentlig lagret støtte fra
`reference-inputs.zip`, med SHA
`c2282443c935dc02485b7bb380d4395147012f0d562f4b1c28f365534a15a46f`.
Dette er **plan × prototypens Natur/Jordbruk**, ikke hele juridiske planpolygoner.
Den gamle masken inneholder derfor allerede et grovt nivå-0-utvalg; en pilot
på denne støtten kan ikke verifisere arealer som ble ekskludert tidligere.
Ingen nye DiBK-kall foretas. Samme arealfaktor
`0.9994795815751638` brukes, og ingen alternativ geodetisk arealmetode innføres.

Kildeobjekter som berører støtteutstrekningen undersøkes. Ugyldige geometrier
repareres ikke. Alle faktiske klasseverdier telles; manglende/ukjent klasse
og kommuneavvik holdes separat. Kilder projiseres til EPSG:25833. Klasseflater
klippes geometrisk, unioneres innen klasse, og kryssklasseoverlapp skilles ut
fra begge klassene. Manglende flatedekning bokføres som eget hullområde.

Privat output: statistikk/inventar/kvalitetsstatus, kildeobjektsporbar CSV,
gammel↔ny klassekrysstabell og geografisk diagnosefil med begge metoder.
Verktøyet har ingen publiseringskommando, og data/config/output inne i dette
offentlige repoet avvises. Kvalitetsfeil gir bare diagnose av gyldig del,
ikke en godkjent eller komplett pilottotal.

Natur/Jordbruk/Bebygd fra direkte klasser beregnes **ikke automatisk**.
Uten faglig godkjent, komplett mapping skrives nivå-0-totaler som utilgjengelige.
Dermed kan en detaljpilot gjennomføres uten å beslutte en ny regnskapsinndeling.
Ingen arealer normaliseres til gammel naturtotal.

## 5. Trondheim-resultater og sammenligning

| Mål | A, eksisterende lagrede resultat | B, direkte faktisk geodata |
| --- | ---: | --- |
| Natur | 2788,8047212052934 daa | Ikke beregnet |
| Jordbruk | 832,0784057494137 daa | Ikke beregnet |
| Samlet støtte | 3620,883126954707 daa | Ikke beregnet |
| Ufordelt natur | 706,7074524100195 daa | Ikke beregnet |
| Økosystemfordeling/klassekonflikt | Referanse fra tidligere kontroll | Ikke verifisert uten fil |
| Faktisk datadekning/arealavvik | Lagret støtte dokumentert | Ikke verifisert uten fil |
| Geografiske differanser/tidsbruk | Ikke ny A-kjøring mot live-kilde | Ingen reell B-beregning |

[Tidligere bildeundersøkelse](2026-10-14-unclassified-plan-nature.md) beholdes
som referanse, ikke direkte geodatafasit. Redusert ufordelt eller endrede
naturtotaler kan ikke påstås som pilotfunn i denne leveransen.

## 6. Geografisk kvalitet og uavhengig kontroll

**For reelle geodata gjenstår:** faktisk flatedekning, geometri/klasse per objekt,
CRS, kommune, kildereferanser, hull/overlapp og klassegrenser. Ingen diagnostisk
Trondheim-geodatakart er laget med oppdiktede kildepolygoner.

Det kjørbare oppsettet kontrollerer radstripeunion av masken mot uavhengig
celletelling, original mask/hash/klassifikasjon og arealbevaring ved geometrisk
partisjon. Numerisk kontroll er `1e-6 m²` absolutt/`1e-12` relativ toleranse
for flyttallsregning. Ingen geometri justeres eller målt avvik slettes.
Sann kildekvalitet kan ikke godkjennes av en slik numerisk toleranse.

Syntetiske tester har analytisk kjente fasitsummer: delpolygoner langs en
grense, hull, duplikat, klassekonflikt, ugyldig geometri, kommuneavvik og
koordinattransformasjon. Et GPKG-leseforsøk tester hele kjeden og private
outputfiler mot lagret referansestøtte. Disse er **verktøytester**, ikke
Grunnkart-resultater og ikke en uavhengig validering av det manglende produktet.
Neste faktiske pilot må suppleres med separat GIS/GEOS-kontroll av kildefilen.

## 7. Konsekvenser for videre metode og databehandling

Direkte attributter kan fjerne WMS-farge-/alphaavvisning og muliggjøre
eksakte klassegrenseinterseksjoner. Det er en forventet metodefordel,
ikke en målt kvalitetsgevinst i denne leveransen. Kildens egne feil og
nivå-0-kobling må fortsatt vurderes.

Videre kommunal bruk krever låste års-/filmanifester, kodelisteversjon,
rettigheter, kommunegrenser og kildeobjekt↔arealsporbarhet. Kommunevis
klargjøring må bevare topologi og avstemme hull/overlapp/nasjonale summer.
Skalering og kostnader må måles på faktisk data. Aktør for dataforvaltning,
preparation, kvalitetssikring, tilgang og oppdatering må utpekes.

En senere årsversjon kan ha kartkorrigeringer, endret klassifikasjon og ulik
ajourhold. Den blir ikke automatisk en fysisk endringsserie. Ny offisiell
beregningsmetode, nivå-0-regler og tidsserier krever faglig beslutning og
egen metode-/analyseidentitet. Ingen framtidig infrastruktur bygges nå.

## 8. Konkret neste aktivitet

**Dataansvarlig innhenter ett rettighetsavklart 2025-GPKG for kommune 5001
med metadata og godkjenning av det valgte lokale pilotmiljøet.**
Kontroller leveransens faktiske år, CRS/skjema og kodeverdier, fyll privat
manifest og kjør oppsettet med eksisterende maske. Del bare avtalte
kontrollresultater. Deretter vurderes direkte arealer og geografiske avvik;
først etter dette kan en produksjonsmetode besluttes.

Endring av nettverkspolicy alene erstatter ikke fil-/rettighetsavklaringen.
Det er ikke nødvendig å endre applikasjonen eller publisere Pages for neste steg.

## 9. Tester og leveranse

Kontrollfiler: [tilgang](2026-10-14-direct-grunnkart-pilot/access-check.json),
[test-/leveransestatus](2026-10-14-direct-grunnkart-pilot/checks.json),
[pilotverktøytester](2026-10-14-direct-grunnkart-pilot/pilot-tests.xml).

Nye analysetester verifiserer lokale geometrier, inputgater og uendret
referansestøtte. Eksisterende frontend-/backendkontroller, lint og build
kjøres separat. Kun rapport, verktøy, tests og kontrollstatus legges i PR #76.
Ingen begrenset kildefil, avledet geografi eller tilgangsopplysning committes.
Ingen ny PR, merge, main-endring eller Pages-publisering.
