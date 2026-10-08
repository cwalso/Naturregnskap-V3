# Utviklingsplan – Naturregnskap V3

**Sist oppdatert: 08.10.2026**

Dette er en arbeidsplan for den tekniske V3-prototypen, ikke en formell
leveranseplan for Kommunale naturregnskap.

> **Vedlikeholdsregel:** Ved hver merget PR skal det vurderes om status,
> arkitektur, metode eller produktretning har endret seg. Berørte levende
> dokumenter skal oppdateres i samme PR eller umiddelbart etterpå.

## Status nå

V3 har gått fra teknisk fundament og grunnleggende kart til en offentlig
GitHub Pages-prototype med:

- kommuneoversikt
- Naturtapet
- prioriterte temasider
- analyseverksted i kart
- framtidig utbygging som analyseområde
- eget tegnet polygon som analyseområde
- overlay mot Natur/Jordbruk og Verdsatte naturtyper
- delt request-/flispipeline for bedre ytelse

Prototypen er fortsatt et utviklings- og læringsverktøy. Den er ikke et ferdig
kommunalt naturregnskap eller en profilgodkjent Miljødirektoratet-tjeneste.

## Milepæler

| Milepæl | Status | Resultat |
| --- | --- | --- |
| Teknisk fundament | ✅ | React/TypeScript/Vite/OpenLayers og FastAPI/Python-struktur etablert |
| Kommunevalg og kommunegrense | ✅ | Kommune er felles kontekst for sider, kart og analyser |
| Dataset registry | ✅ | Kilder har eksplisitt faglig rolle og teknisk kilde |
| Kommuneoversikt / nivå 0 | ✅ prototype | Natur, Jordbruk og Bebygd presenteres; dagens hovedtall har fortsatt prototypeforbehold |
| Proveniens | ✅ delvis | Kilde/metode kan vises, men må videreføres til alle nye analyser |
| Naturtapet | 🟡 | Side/design etablert; endelig dokumentert endringsgrunnlag fortsatt under avklaring |
| Naturtema | ✅ prototype | Prioriterte temasider etablert |
| Kommuneavgrenset temakart | ✅ | Temadata maskeres visuelt utenfor valgt kommune |
| Skog og Myr/våtmark | ✅ prototype / Trondheimstall | Grunnkart-baserte temasider og kart; tallberegning krever klargjort raster og finnes nå bare for Trondheim |
| Verdsatte naturtyper | ✅ prototype / Trondheim-overlay | Kommunevise REST-beregninger og kartleggingsgrad; overlay mot analyseområde krever klargjort basisanalyse |
| Verneområder | ✅ prototype | Supplerende temaside og kart |
| Villreinområder | ✅ prototype | Supplerende temaside og kart |
| Inngrepsfri natur | ✅ prototype | Status/tidsserieinformasjon og kart |
| Bynaturen / grå arealer | 🟡 | Temaside etablert; direkte integrasjon mot eget gråarealdatasett kan videreutvikles |
| Utforsk i kart – analyseverksted | ✅ prototype | Område → datagrunnlag → resultat → stedfesting |
| Framtidig utbygging × Natur/Jordbruk | ✅ prototype / Trondheim | Rasterbasert overlay og lesbart resultat; ikke nasjonalt klargjort |
| Framtidig utbygging × Verdsatte naturtyper | ✅ prototype / Trondheim | Overlay, filtrering og stedfesting; avhenger av samme klargjorte basisanalyse |
| Tegn eget polygon | ✅ prototype / Trondheimanalyse | OpenLayers Draw er generelt tilgjengelig; tall og overlay krever klargjort kommunevis raster |
| Korrekthetsgate for eksisterende overlay | ✅ avgrenset | UUID, nevner, område-/cacheisolasjon og mobilinteraksjon kontrollert; fire verdikategorier/høyeste verdi verifisert. Felles UTM-korreksjon er innført; autoritativ kildevalidering og entydig naturtypefordeling gjenstår |
| Delt request-/flispipeline | ✅ | Deduplisering, maks fire samtidige kall per kilde og begrenset cache |
| Generisk preparation for autoritative regnskapstall | 🔵 | Ikke ferdigstilt nasjonalt |
| Historiske tidsserier | ⚪ | Krever avklart endringsprodukt og metode |
| Forslag til ny KPA / plansammenligning | ⚪ | Framtidig mulig videreutvikling |
| Rapportgenerering | ⚪ | Framtidig mulig videreutvikling |

## Gjeldende temasider

Temasidesettet er låst til:

1. Myr (våtmark)
2. Skog
3. Verdsatte naturtyper
4. Verneområder
5. Villreinområder
6. Inngrepsfri natur
7. Bynaturen (grå arealer)

Ikke legg til nye temasider uten eksplisitt beslutning.

## Analyseverkstedet

Gjeldende analyseområder:

- framtidig utbygging
- eget tegnet polygon

Gjeldende analysegrunnlag:

- Natur og jordbruk
- Verdsatte naturtyper

Arbeidsflyten er implementert generelt i brukerflaten, men tallberegningene er
per 08.10.2026 bare klargjort for Trondheim (5001). Dette skyldes at repoet bare
har et kommunevis oversiktsraster for Trondheim. Temakart og direkte
tematjenester har ikke nødvendigvis samme geografiske begrensning.

Nye analysegrunnlag skal legges til først når brukerbehov, analysekilde,
resultattype og datadekning er avklart.

## Funksjonelle gap i Utforsk i kart

Status nedenfor gjelder relevant brukerfunksjonalitet i analyseverkstedet,
ikke bare at et datasett eller kartlag finnes på en temaside. TODO-ene er
ønskede behov, ikke vedtatt funksjonsutvidelse eller ferdig implementasjon.

| Brukerbehov | Status | Konkret TODO / avgrensning |
| --- | --- | --- |
| Framtidig utbygging som analyseområde | Allerede dekket | Behold gjeldende DiBK-filter og prototypeforbehold; tall er bare klargjort for Trondheim |
| Ett eget tegnet polygon | Allerede dekket | Tegn, angre, ferdig, avbryt, tegn på nytt og fjern; samme analysegrunnlag som plan |
| Flere egne områder og områdehåndtering | Delvis dekket | Ett område finnes. Vurder navngiving, liste, valg og fjerning; avklar separat/samlet analyse og overlapp før implementering |
| Overlay mot Natur/Jordbruk og Verdsatte naturtyper | Allerede dekket | Behold skillet mellom heldekkende basis og supplerende registreringer; kart og tall skal dele identitet/mask |
| Tydelig stedfesting og delresultatvalg | Dekket i prototype | Dempet områderamme, sterke treff, Natur/Jordbruk-kort og faktiske lokaliteter med kategori-/naturtypefilter. Zoom-handlingen beholder aktivt valg; status og tegnforklaring følger kartet |
| Objektinformasjon for aktiv analyse | Dekket for Verdsatte naturtyper | Kildepolygoner, kategori-/naturtypefilter, liste ↔ kartvalg, detaljer og registrert dekning. Andre objektflyter er fortsatt TODO |
| Flere relevante overlaytema | Mangler | Verneområder og villrein finnes som temasider, men ikke som analysegrunnlag. Avklar kilde, mål, dekning og usikkerhet før kobling; inngrepsfri natur trenger særskilt metode for avstand/soner og kan ikke fremstilles som beregnet konsekvens av enkel overlapp |
| Grå arealer og mulig arealgjenbruk | Mangler | Bynaturen gir kontekst, men direkte gråareal-overlay i verkstedet mangler. Avklar data/metode; grått betyr ikke ledig areal og er ikke regnskapets Bebygd-kategori |
| Panorering, zoom, kommuneutsnitt og tegnemodus | Dekket i prototype | Polygonet gjenopprettes etter sidenavigasjon i samme økt. Mobil har kart/resultat-snarveier og tegnekontroller ved kartet; ikke lagring mellom økter |
| Opplasting av egne arealer/planer | Mangler | Vurder validering av geometri, koordinatsystem, format, størrelsesgrenser, kilde og lagring; ikke implementert |
| Sammenligning av gjeldende/forslått plan eller områdealternativer | Mangler | Krever eksplisitt faglig beslutning om sammenligningsgrunnlag, endringer og overlapp; ingen automatisk erstatning av gjeldende plan |
| Plan-/datadekning og tilstand forklart i arbeidsflaten | Delvis dekket | Prototypeforbehold, feil og utilgjengelig raster finnes. Tydeliggjør manglende/ufullstendig plan og tematisk kartlegging; null treff skal ikke forveksles med ukjent dekning |
| Generell lagkatalog og tekniske debug-kontroller som brukerfunksjon | Ikke relevant for V3 | Kartkontroller skal støtte analyseoppgaven, ikke gjøre verkstedet til en generell GIS-klient |
| Antatt framtidig naturtap som autoritativ regnskapsendring | Ikke relevant for V3 | Overlay er prototypebeslutningsstøtte. Utbygging eller egen tegning bokføres ikke som faktisk endring |

**Implementert produktløft: kildegeometri og objektflyt.** Analyseområdet vises som
dempet ramme, treff som sterke flater. «Zoom til treff» viser og
stedfester aktivt delresultat, også ved spredte treff. Valg/filtrering, status
og tegnforklaring følger samme analyseidentitet og utvalg; Natur/Jordbruk
bruker raster, Verdsatte naturtyper kildepolygoner med visningsklipp. Null treff, skjult resultat og
teknisk feil har egne tilstander. Natur/Jordbruk-klassifisering, analysegrid og DiBK-filter er uendret; arealene målestokkskorrigeres. Verdsatte naturtyper
bruker fire kategorier og høyeste verdi ved overlapp (metodeversjon v2). Se
[akseptansekriterier for tydelige overlaytreff](product/analysis-user-stories.md#11-tydelige-overlaytreff-i-kartet)
og [objektinformasjon](product/analysis-user-stories.md#12-objektinformasjon-for-aktiv-analyse).

Videre arbeid skal bevare flyten analyseområde → datagrunnlag → resultat →
stedfesting, bruke eksisterende V3-designmønstre og verifiseres på mobil med
berøring. Ingen nye temasider eller analysefamilier innføres uten beslutning.

## Prinsipper for videre utvikling

1. Naturregnskap, temadata, analyse og veiledning holdes adskilt.
2. Grunnkart er sentralt heldekkende grunnlag.
3. Browserbaserte rasteranalyser er prototypebeslutningsstøtte, ikke
   autoritative regnskapstall.
4. Kart og tall deler identitet og gyldig avgrensning; kildegeometri og beregningsgrid skilles.
5. Manglende data skal aldri bli falsk 0.
6. Kommuneavgrensning skal være eksplisitt.
7. Metode- og dataversjoner skal kunne spores.
8. Små vertikale PR-er foretrekkes.
9. Dokumentasjon og ADR oppdateres når beslutninger endres.
10. Produksjonsarkitektur avgjøres ikke av hva som er enklest i prototypen.

## Prioriterte neste steg

### 1. Følge opp eksisterende overlayberegninger og tydelige treff

Den avgrensede korrekthetsgaten har kontrollert rasternevner, UUID-identitet,
cacheisolasjon og sene svar ved plan → polygon A → polygon B → plan for begge
implementerte analysegrunnlag. Nevneren var allerede riktig; metoden er ikke
endret. Nye tester kontrollerer også ny kartinstans og avbrutte kall.

Gjenstående prioritering:

- validering av rasteranslag mot et faglig godkjent kontrollgrunnlag
- videre objektflyt for andre grunnlag; Verdsatte naturtyper har koblet liste/kartvalg
- videre brukerprøving av mobil tegnemodus og stedfesting i faktiske plansaker
- behold regresjonsdekning for områdebytte, prosentnevnere og cache

### 2. Stabilitet og ytelse

Mål faktisk effekt av:

- request-deduplisering
- cache
- maks fire samtidige kall
- gjenbruk av råfliser
- object URL-/ImageBitmap-opprydding

### 3. Grunnkart/metode

Avklar:

- autoritativ analysekilde
- nivå-0-bokføringsregler
- versjonering
- datakorrigering versus reell endring
- nasjonal preparation

### 4. Naturtapet

Koble siden til dokumentert endringsgrunnlag når dette finnes og er metodisk
avklart.

Ikke konstruer stedfestede tap fra aggregert statistikk.

### 5. Bynaturen

Vurder direkte integrasjon av Kart over grå arealer dersom dette prioriteres,
med tydelig skille mot regnskapets Bebygd/opparbeidet-kategori.

### 6. Flere overlaytema

Verneområder, villrein og inngrepsfri natur kan vurderes, men bare etter
avklaring av:

- brukerbehov
- analysekilde
- resultatmål
- dekning
- usikkerhet

### 7. Ny KPA / plansammenligning

Dette er mulig videreutvikling, ikke en forpliktelse i første versjon.

## Dokumentasjonsstatus

Levende dokumenter som skal holdes oppdatert:

- `AGENTS.md`
- `README.md`
- `docs/README.md`
- `docs/utviklingsplan.md`
- `docs/product/*.md`
- `docs/architecture/overview.md`
- relevante data-/metodedokumenter

Historiske ADR-er under `docs/decisions/` skal normalt ikke omskrives. Nye
beslutninger dokumenteres i nye ADR-er.
