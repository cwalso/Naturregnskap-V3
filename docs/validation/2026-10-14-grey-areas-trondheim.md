# Grå arealer i Trondheim – leveranse A

Dato: 14.10.2026. Branch `feat/explore-analysis-map`, PR #76,
[Issue #78](https://github.com/cwalso/Naturregnskap-V3/issues/78).
Faktisk lokal og remote start-HEAD:
`642341fdc9ecedc3e4ad17c5f632d234e792cfb0`; ren arbeidskopi.
Main: `a2e270dc7986cb2ce2f9a6c22ffe46e5aa7793db`.

## Konklusjon og A/B/C-status

**Kontrollpunkt A består ikke: faktiske Trondheim-vektoruttrekk og lokal
bruksrett kunne ikke verifiseres.** Leveranse A dokumenterer gjennomført
undersøkelse, kilde-/rettighetsstatus og konkret databehov. B er ikke utført,
og C er ikke implementert eller publisert. Kun dokumentasjon og offentlige
tjenestemetadata legges i denne commiten. Ingen syntetiske geodatatall,
WMS-fargeklassifikasjon eller begrensede geografiske filer er brukt.

Begge vektorproduktene er dokumentert i offisielle kataloger med Norge
digitalt-lisens. Dette bekrefter produkt/distribusjon, ikke denne aktørens
tilgang eller rett til analyse, Codex-behandling eller offentlig avledet geometri.
Nedlastings-/katalogvertene er blokkert av miljøets proxy, og ingen
datasettautentisering eller dokumentert oppdragsrett er konfigurert.

Et vesentlig metodeforbehold er påvist: **FKB «grått» kan også være naturlig
vegetasjonsløs mark.** Klassetreffet alene dokumenterer ikke at en flate er
opparbeidet. Den blå kategorien må avklares før en geografisk implementering.
Fire kategorier er et mulig presentasjonsoppsett, ikke en validert fysisk
klassifikasjon i Trondheim og ikke et mål på utbyggingspotensial.

## 1. Kilder og faktisk datatilgang

Utgangspunktet er [tidligere metode-/kildekontroll](2026-10-12-grey-areas.md)
og Issue #78, lest på nytt. Issue har ingen kommentarer eller stedfestet
skjermbilde som identifiserer et boligområde. Denne oppgaven endrer ikke
den eksisterende WMS-visningen.

| Kilde | Dokumentert produkt og leveranse | Versjon, dekning og presisjon | Faktisk filstatus |
| --- | --- | --- | --- |
| [Kart over grå arealer, Geonorge c5f09d79](https://kartkatalog.geonorge.no/metadata/uuid/c5f09d79-1546-495c-8b36-91efd4008bd7), [offisiell høstet metadata](https://data.norge.no/nb/datasets/1ff3e9eb-3e9d-37f1-b592-cccf977e6fd6/kart-over-gra-arealer) | Samarbeid Miljødirektoratet/Kartverket/NIBIO/SSB; NIBIO står som utgiver i katalogen. GPKG-distribusjon, kommune-/fylkes-/landsfiler dokumentert | Rapport versjon 1, datert 15.12.2025; WMS-katalogen heter Testversjon 1. Avgrenser kartlagte gråområder, ikke bare asfalt. Eksakt aktuell Trondheim-fil/produksjonsdato og kvalitet ikke kontrollert | Ingen fil hentet. Katalogrute/API gir miljøets proxy-403 |
| [FKB-Grønnstruktur, Geonorge 86d6201a](https://kartkatalog.geonorge.no/metadata/uuid/86d6201a-4e0b-4f61-a1dc-c94164cfd160), [høstet metadata](https://data.norge.no/nb/datasets/d72c5c41-dc6a-318f-a2b5-2395700caa6e/fkb-gronnstruktur) | Geovekst-eid, NIBIO produserer. Katalogen dokumenterer GPKG, FGDB, GML, SOSI og Atom/GML | Produktspesifikasjon 1.0. Landsdekkende tilbud innen kartleggingsområder i bebygde områder/hyttefelt/næring; ikke alle flater i hele kommunen. Faktisk uttrekksdato/kildedato per objekt ikke verifisert | Ingen fil hentet. Katalog/Atom/API gir proxy-403. Ingen fysisk layer-/feltnavnliste eller objektgeometri tilgjengelig |
| [FKB-Bygning](https://data.norge.no/nb/datasets/856e4466-bd65-3f09-adfd-18596e2d3a58/fkb-bygning) | Mulig uavhengig kontroll av bygningsflater, Norge digitalt-lisens | Grønnstruktur inneholder allerede generaliserte FKB-bygningsflater; originalkilde må være dokumentert og tidsmessig sammenlignbar | Ingen Trondheim-fil brukt. Eventuell ny kilde-/bruksavtale må verifiseres |
| [FKB-Veg](https://data.norge.no/nb/datasets/a187208c-cda6-3f42-a835-bdb2857a67a1/fkb-veg) | Mulig kontroll av veg-/transportflater, Norge digitalt-lisens | Original flategeometri må skilles fra senterlinjer, parkeringsflater og interne kjørearealer | Ingen Trondheim-fil brukt. Ikke konstruer vegareal med udokumentert linjebuffer |

### Versjons-/metadataforbehold

[Kartverkets gråarealrapport, versjon 1](https://dokument.geonorge.no/nasjonale-standarder-og-veiledere/dokumentasjon-og-metode/kart-over-gr%C3%A5-arealer-sluttrapport/1/kart-over-gr%C3%A5-arealer-sluttrapport.pdf)
beskriver Grunnkart Testversjon 2 fra april/juni 2025, med vegetasjonsandeler
som estimater og SSB-bygg per 01.01.2024. Produktet er derfor ikke en låst
kopi av Grunnkart årsversjon 2025. Katalogens oppdateringsdato er heller
ikke en fysisk observasjonsdato. Leverandøren må bekrefte hvilket gjeldende
Trondheim-uttrekk som skal brukes og eventuelle senere korreksjoner.

[FKB-Grønnstruktur-produktarket 1.0, 25.11.2025](https://dokument.geonorge.no/produktark/fkb-gr%C3%B8nnstruktur/1.0/fkb-gr%C3%B8nnstruktur.pdf)
oppgir FGDB/GML og EPSG:25832/25833/25835/4258. Katalogen viser også GPKG;
det er ikke verifisert hvilket format/CRS som faktisk kan bestilles for 5001.
Produktarket angir 2–4 m satellittdata, 1 m høydedata og 5 m² minste
kartleggingsenhet; dette er ikke dokumentert nøyaktighet for alle Trondheim-
flater eller en passende grense for kandidatflater. Andre FKB-objekter
generaliseres. Kvalitetskrav er ikke et resultat fra vår egen stedfestede test.

[NIBIOs gjeldende produktbeskrivelse](https://www.nibio.no/tema/jord/arealressurser/gronnstruktur)
beskriver periodisk satellitt-/høydeajourhold vanligvis hvert tredje år,
med FKB-basert ajourhold mellom rundene. Produkt-/katalogetiketten «årlig»
betyr derfor ikke at alle satellitt- og geometrikilder har samme nye dato.
År, datadato og uttrekksdato må lagres separat.

### Ny teknisk kontroll

Kontrollen henter bare metadata, ingen vektorfeatures eller nye FKB-kartbilder:

| Kontroll | Faktisk svar |
| --- | --- |
| Gråareal- og grønnstruktur-katalog | Proxy: `Tunnel connection failed: 403 Forbidden` |
| [Dokumentert FKB Atom/GML](https://nedlasting.geonorge.no/geonorge/ATOM-feeds/FKB_Gronnstruktur_AtomFeedGML.xml) og [nedlastings-API](https://nedlasting.geonorge.no/api/capabilities/) | Samme proxy-403. Konkrete filnavn, størrelser og autentiserte bestillingsvalg er ikke lest |
| `graastruktur` GetCapabilities | HTTP 200. `graa_arealer`, `andel_med_vegetasjon`, `andel_uten_vegetasjon`, `andel_med_bygninger`. Fees «no conditions apply», AccessConstraints «none» |
| `gronnstruktur` GetCapabilities | HTTP 200. `arealtype`, `sjikthoyder`, EPSG:25833. Fees/AccessConstraints er ikke fylt ut; dette gir ingen ny publiseringsrett |
| WFS GetCapabilities på de samme to endepunktene | Begge HTTP 400: «WFS request not enabled». Dette avkrefter denne mulige tilgangen, ikke alle andre tenkelige tjenester |

[URL-er, status, SHA og metadatauttrekk](2026-10-14-grey-areas-trondheim/access-check.json).
403 er miljøets destinasjonspolicy, ikke en autentisert avvisning fra
Geonorge. Bare metadata er brukt; WMS er ikke erstatning for originale
geometrier/klasseattributter. Ingen tilgangskontroll er omgått.

## 2. Rettigheter – tre separate spørsmål

| Bruk | Kart over grå arealer – vektor | FKB-Grønnstruktur – vektor | Hva som må foreligge |
| --- | --- | --- | --- |
| Lokal analyse i kontrollert pilotmiljø | Ikke bekreftet for aktøren | Ikke bekreftet for aktøren | Dokumentert avtale-/parts-/oppdragsrett til de faktiske uttrekkene og analyseformålet |
| Ekstern behandling i Codex/cloud | Ikke bekreftet | Ikke bekreftet | At valgt miljø/underleverandør, kopiering, lagring og sletting omfattes av avtalen |
| Offentlig publisering av nye geografiske flater på Pages | Ikke bekreftet | Ikke bekreftet | Eksplisitt grunnlag for offentlig avledet geografi, distribusjon, kreditering og oppdatering. Intern analysetilgang alene er utilstrekkelig |

[Norge digitalt-vilkårene](https://www.kartverket.no/geodataarbeid/norge-digitalt/partsinformasjon/avtaler-og-vilkar/norge-digitalt-lisens)
beskriver intern bearbeiding og adgang til avtalt underleverandørbruk med
sletting ved avsluttet oppdrag. Det er en mulig avtalevei, ikke dokumentasjon
på at denne prototypen omfattes. [Tilgangsveiledningen](https://www.geonorge.no/kartdata/tilgang-og-passord/)
beskriver GeoID/dataeiers system og tilgang via avtale/forhandler. Ingen
pålogging eller ny avtale er foretatt. Tilgangsopplysninger skal ikke legges
i Git eller deles som tekst i en kontrollrapport.

Den eksisterende gråareal-WMS-en har egne vilkår for kartvisning. Den
rettigheten overføres ikke til vektorfiler eller nye klassifiserte flater.
FKB-Grønnstruktur-WMS og nedlasting har tidligere katalogkontroll med
Norge digitalt-lisens; manglende constraints i XML betyr ikke fri bruk.

**Kontrollpunkt A: ikke bestått.** Reell geografisk analyse stanser her,
uavhengig av at metodens konsepter og metadata kan undersøkes videre.

## 3. Faglig modell – verifisert versus foreslått

[NIBIOs arealtypebeskrivelse](https://www.nibio.no/tema/jord/arealressurser/gronnstruktur/arealtype)
bekrefter åtte arealtyper: bunnsjikt, busksjikt, tresjikt, grått, veg, vann,
bygning og jordbruk. Vegetasjonstypene beskriver dominerende høyde i
arealfiguren. «Grått» inkluderer også fjell/svaberg, og er ikke bare
opparbeidet overflate. Dette er dokumenterte begreper; faktiske feltnavn,
kodeverdier, nullverdier og topologi må inspiseres i mottatt fil.

[Sjikthøydebeskrivelsen](https://www.nibio.no/tema/jord/arealressurser/gronnstruktur/sjikthoyde)
gir gjennomsnittlig vegetasjonshøyde per polygon, ikke enkelttrær eller
en separat full beskrivelse av vegetasjon under trekroner. Produktarket
knytter høydeegenskapen til tresjikt. Det kan ikke antas at bunn-, busk-
og tresjikt er tre uavhengige, overlappende vertikale lag i originalfilen.
Ved faktisk flere flater skal grønne arealer unioneres, ikke summeres med
dobbelttelling. Manglende bunnsjikt under tresjikt er ikke bevis på asfalt.

| Foreløpig kategori | Dokumentert grunnlag | Avklaring før B/C |
| --- | --- | --- |
| Blå – åpne grå flater | Positive treff på FKB «grått» innen gråarealavgrensningen, med bygg/veg fjernet, er et mulig første utvalg | Kan naturlig vegetasjonsløs mark skilles fra opparbeidede flater? Hvis ikke må usikkerhet/begrenset klassebetydning synliggjøres; ikke påstå opparbeiding som verifisert fakta |
| Grønn – vegetasjon | Samlet geografisk union av de tre vegetasjonsklassene innen avgrensningen | Dominerende sjikt, trekroner over veg/oppkjørsel, kildealder og faktisk overlapp må kontrolleres |
| Grå – eksisterende anlegg/øvrige kjente flater | FKB bygg/veg og eksplisitt bestemte andre kjente klasser | Hva vann/jordbruk og andre kjente flater skal bety i samlet presentasjon må bestemmes; ikke automatisk gjøre dem til blå eller vegetasjon |
| Gul – uavklart | Manglende dekning/klasse, ugyldig geometri, uavklart grense/versjon eller motstrid | Må være egen bokføring med forklarbar årsak; fravær av grønt er ikke tilstrekkelig for blått |

[Rapporten publisert av KLD 22.06.2026](https://www.regjeringen.no/no/dokumenter/kunnskap-for-bedre-utnyttelse-av-gra-arealer/id3167212/)
støtter kobling til mer detaljert grønnstruktur som kunnskapsgrunnlag, og
beskriver at dagens aktivitet og flere andre egenskaper trengs for vurdering
av transformasjon. En parkeringsplass eller lagerflate kan være fysisk
grå og samtidig være fullt brukt. Blått betyr derfor ikke ledig eller byggbart.
Grønt betyr heller ikke et juridisk byggeforbud. Arealplaner avgjør ikke
fysisk arealklasse i denne leveransen.

### Klasseprioritet – forslag som må kvalitetstestes

Ingen prioritetsregel er implementert eller faglig godkjent nå. Et forsvarlig
kontrollforslag er å skille sikre kildeklasser fra motstrid først:

1. Avgrens til union av gyldige gråarealpolygoner klippet mot dokumentert kommune.
2. Unioner samme klasse; bokfør dobbelgeometri, hull og mellomklasseoverlapp.
3. Bygg/veg skal utelukke blått. Ved sikker og kompatibel fysisk klassifikasjon
   kan kjent anlegg få grått; ved uavklart konflikt med vegetasjon/kildegrenser
   beholdes gul status til kilde-/sjiktforholdet er avklart.
4. Grønne klassetreff og eventuell blå klasse må være positive identifikasjoner,
   ikke komplementet til hverandre. Uforklarte konflikter og dekning uten sikkert
   klassetreff blir gule. Ikke bruk vilkårlig prioritet til å skjule slike avvik.
5. De fire endelige arealsettene skal være parvis disjunkte og dekke hele
   godkjent analyseavgrensning. Først da brukes én felles prosentnevner.

Det må særlig bestemmes om kartet beskriver bakkeoverflate, dominerende
arealdekke eller også trekroner. En trekrones overlapp med veg kan være
reell sjiktinformasjon og ikke en kartfeil. Detaljene kan ikke avgjøres
uten geometrier og de tre testmiljøene. Dette er et metodeforslag for B,
ikke en ny fast analysekontrakt.

## 4. Konkret dataspesifikasjon og tilgangsbehov

Bestill dokumenterte **Trondheim 5001-uttrekk** for samme avtalte pilotdato:

- Kart over grå arealer, UUID `c5f09d79-1546-495c-8b36-91efd4008bd7`,
  GPKG med originale flategrenser, objekt-ID, klasse-/kildeattributter,
  versjon og metadata. Be om bekreftelse på gjeldende versjon, ikke antatt «2026».
- FKB-Grønnstruktur 1.0, datasett-UUID `86d6201a-4e0b-4f61-a1dc-c94164cfd160`,
  GPKG dersom tilbys, alternativt komplett FGDB/GML. Originale arealtypeflater,
  faktiske klassekoder, sjikthøyde der relevant, identifikasjon, kildedatoer
  og kvalitet. `48ec2648-3cef-4817-a28f-aeaf00cfdc8f` er WMS-metadata,
  ikke automatisk filproduktets ID.
- Ved behov uavhengige FKB-Bygning- og FKB-Veg-**flater** med samme geografiske
  utstrekning og dokumenterte datoer. Avklar nybygg som ennå ikke finnes i
  FKB, generalisering og hvilke interne transport-/parkeringsflater som inngår.
- Dokumentert CRS, helst EPSG:25833 hvis tilgjengelig, feltliste/kodelister,
  dekning/NoData, objekt-ID og fil-/pakkemanifest med SHA og uttrekksdato.
- Lovlig flyfoto for de valgte testområdene: opptaksdato, oppløsning,
  projeksjon, bruk i lokalt/pilot-/cloudmiljø og rett til kontrollskjermbilder.

Faktiske leverandørfilnavn og direkte fil-URL-er er ikke verifisert og gjettes
ikke. Datasettsidene over og dokumentert Atom/API er bestillingsinnganger.
Nettverkstilgang alene gir ikke brukerrett; en autorisert avtalepart må hente
filene og bekrefte de tre bruksformene separat.

Overfør via virksomhetens avtalte filkanal/mount til et privat miljø utenfor
Git-repoet. Behold metadata og full FGDB/GML-pakke privat. Codex kan bare
brukes dersom avtalen omfatter det miljøet. Ingen kildegeometri, avledet
geometri eller adgangsopplysninger skal committes offentlig. Aggregert
statistikk/kontrollfigurer publiseres først med dokumentert relevant rett.

### Kort forespørselsutkast – ikke sendt

Til NIBIO `gisdrift@nibio.no` og relevant Geovekst/Kartverket-/Norge digitalt-
dataansvarlig:

> Vi ønsker et Trondheim 5001-uttrekk av Kart over grå arealer og
> FKB-Grønnstruktur 1.0, helst GPKG med original geometri, faktiske klassekoder,
> objekt-ID, kilde-/kvalitetsattributter og dokumenterte datoer/CRS. Formålet er
> en fysisk firekategori-pilot med kontroll mot bygg/veg og flyfoto.
> Bekreft hvilken aktuell distribusjon som skal brukes og nødvendig tilgang.
> Avklar separat rett til lokal analyse, behandling i [valgt Codex/cloud-/lokalmiljø]
> og offentlig Pages-visning av nye avledede flater, inkludert kontrollbilder,
> kildekrav, lagring og sletting. Vi trenger også avklaring av grått som naturlig
> vegetasjonsløs mark, sjiktrepresentasjon og eventuell klasseoverlapp.

Virksomhet/avtalepart og behandlingsmiljø må fylles inn. Ingen henvendelse er sendt.

## 5. B – kvalitetstest som gjenstår

| Testmiljø | Status nå | Kontroll når A består |
| --- | --- | --- |
| Boligområde | Ikke stedfestet/testet | Eksakt polygon for plen/trekroner/oppkjørsel/bygg; kildegrense og generalisering mot lovlig datert flyfoto |
| Næringsområde | Ikke stedfestet/testet | Parkering/lager/asfalt/bygg/veg/grønne restflater; skill kjent fysisk klasse fra pågående arealbruk |
| Sentrum | Ikke stedfestet/testet | Tett bebyggelse, vegflater, små grønne/restflater, skygger og ajourhold |

Brukerens tidligere skjermbilde kan ikke stedfestes sikkert fra det tilgjengelige
materialet/Issue #78. Ingen beliggenhet eller testavgrensning er gjettet.
Ingen nye B-skjermbilder, arealtall eller Trondheim-feilrater finnes.

For hvert faktisk testområde må B logge inputversjoner/hash, kommune/CRS,
fysisk skjema/koder, gyldig og manglende geometri, areal per klasse, konflikt/hull,
objektsporbarhet og eksempler på treff/avvik. Arealsummer skal verifiseres
uavhengig med geometrisk union/interseksjon og faktisk kommuneavgrensning.
Visuell kontroll mot flyfoto supplerer, men beviser ikke full kartnøyaktighet.
Kilde- og fotodato kan være ulike; nye bygg/veger, skygge, små restflater og
naturlige bare flater må undersøkes særskilt. Feil skal ikke fjernes med
udokumentert snap, buffersone eller toleranse.

Sammenhengende blå flater er en separat framtidig avledet analyse. Ingen
minstestørrelse eller bredde velges før kvaliteten er observert. Produktets
minste kartleggingsenhet er ikke et vedtatt kandidatfilter. Sammenheng alene
avgjør ikke tilgjengelighet eller byggbarhet.

## 6. C, tester og avslutning

C er ikke startet fordi A ikke består og B ikke kan utføres. Ingen nye
lagfiltre, objektvalg, farger, nøkkeltall eller kartfunksjoner er innført.
Kommunevalg, sju eksisterende lag, opasitet, OpenLayers-instans og begge
plananalyser står uendret. Ingen offentlig ny versjon publiseres.

Eksisterende frontendtester, lint, build og backendkontroller kjøres for
dokumentasjonsleveransen; faktiske resultater lagres i
[checks.json](2026-10-14-grey-areas-trondheim/checks.json).
Ingen nye B/C-tester eller responsive screenshots fremstilles som bestått.
De historiske [12.10-skjermbildene](2026-10-12-grey-areas.md) dokumenterer
tidligere WMS-aksept, ikke kvalitet på denne nye firekategori-modellen.

**Neste aktivitet:** dataansvarlig innhenter de to komplette vektoruttrekkene
og dokumenterer lokal-/cloud-/publiseringsrett, med flyfoto-/bygg-/veggrunnlag
for B. Avklar samtidig hva «åpne grå flater» faktisk kan dokumentere og hvordan
vegetasjon over transport-/anleggsflater skal presenteres. Deretter kan B
gjennomføres; C følger først med bestått geografisk kvalitet og publiseringsrett.

Dette er supplerende beslutningsstøtte, ikke en ny regnskapsklasse eller en
sertifisering av utbyggingsareal. Kun A har commit. PR #76 beholdes åpen;
ingen merge, main-endring eller Pages-dispatch.
