# Kildegeometri, objektvalg og verdiprioritet i analyseverkstedet

Dato: 08.10.2026

Status: vedtatt for prototypen

Presiserer beslutningene om analyseverksted og tegnet analyseområde fra samme
dato. Rastergrid og gyldig mask gjelder beregningen; dette krever ikke at
tematiske kildepolygoner tegnes som rasterceller. Historiske ADR-er beholdes.

## Beslutning

- Naturregnskap, supplerende registreringer, beslutningsstøtte og formidling
  holdes adskilt. Ingen nye analysegrunnlag eller temasider innføres.
- Beregningsrepresentasjon og kartrepresentasjon skilles. Verdsatte naturtyper
  beholder geometri, kilde-ID, navn, type og verdi for berørte objekter.
  Natur/Jordbruk beholder ekte rastervisning og uendrede beregninger.
- Metodekontroll bekrefter fire verdikategorier og høyeste verdi ved overlapp.
  `planned-valued-nature-v2` gir hver berørt rute én vinnende verdi.
  Verdifordelingen summerer til unik union; registrert areal per lokalitet og
  naturtype er et separat mål som kan dobbelttelle. Antall berørte objekter
  krever minst ett gyldig rutemidtpunkt, også for helt overskyggede lokaliteter.
- Kartet viser svake hele berørte kildepolygoner og sterkere fyll innenfor
  gyldige visningsmasker på eget Canvas. Det er ikke eksakt vektorinterseksjon.
  Høyeste verdi tegnes øverst i samlet visning. Ved verdifilter fylles bare
  kategoriens vinnende ruter; hele lokaliteten beholdes svakt som kontekst.
- Liste og kart deler filter og valgt objekt. Valget gjelder aktiv kommune,
  analyseidentitet og analysegrunnlag og avbrytes ved område-/grunnlagsbytte.
  Tegning har forrang foran objektvalg. UUID-generering er uendret.
- Kartet er hovedflate etter beregning. Område/datagrunnlag kan foldes sammen;
  resultat, filtre, liste og detaljer finnes i et smalere sidepanel. Mobil har
  kart/resultat-snarveier og tegneverktøy under kartet, ikke permanent popup.
- Registrert kartleggingsdekning hentes fra eksisterende dekningskilde som
  union på gyldig analysegrid. Andel av analysemasken er uttrykkelig noe annet
  enn kommunens kartleggingsgrad av landarealet. Manglende registrering eller
  dekning innebærer ikke fravær av naturverdi. Kilde-/nettverksfeil gir ukjent
  dekning, ikke null. Et dekningslag i kartet innføres ikke nå.
- Geometriresultater og dekning har cache med høyst 16 fullførte analyser;
  pågående avbrutte kall kan erstattes uten at deres sene svar fjerner nye
  resultater. Rasterpipelinen med maks fire samtidige kall per kilde er uendret.

## Begrensninger og avklaringer

Løpende tjenester er ikke versjonslåst. Maskens kommunegrense er fortsatt
rasterbasert, og veldig små geometriske treff kan overses. UTM-arealene er
foreløpig ikke målestokkskorrigert. Kontrollgrunnlaget beskriver en slik
korreksjon, men felles arealbehandling på tvers av regnskap/Grunnkart/temasider
er ikke innført i dette produktløftet. Naturtypefordelingen har ingen avklart
entydig bokføringsregel ved overlapp eller lik verdi. Kommunale temasidestatistikker
bruker fortsatt sin eksisterende metode og er ikke harmonisert med verkstedets
vinnende verdifordeling. Autoritativ kilde, nasjonal preparation og endelige
nivå-0-regler er fortsatt åpne faglige beslutninger.

## Verifikasjon

Regresjonstester kontrollerer gyldig arealnevner, UUID, områdebytter og sene
svar. Nye tester kontrollerer kategoriutvalg, eksklusiv verdifordeling,
kildegeometri med hull/flere deler, visningsklipp, cachegrenser, dekning og
synkronisering mellom liste og kart. Nettleserkontroll skal gjøres med reelle
Trondheim-geometrier og kontrollerte plantestdata på desktop, 390 og 320 px.
Resultatene er prototypebeslutningsstøtte, ikke autoritative regnskapstall.
