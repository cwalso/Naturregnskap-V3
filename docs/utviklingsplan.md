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

## Prinsipper for videre utvikling

1. Naturregnskap, temadata, analyse og veiledning holdes adskilt.
2. Grunnkart er sentralt heldekkende grunnlag.
3. Browserbaserte rasteranalyser er prototypebeslutningsstøtte, ikke
   autoritative regnskapstall.
4. Kart og tall for samme analyse skal bruke samme analysemask.
5. Manglende data skal aldri bli falsk 0.
6. Kommuneavgrensning skal være eksplisitt.
7. Metode- og dataversjoner skal kunne spores.
8. Små vertikale PR-er foretrekkes.
9. Dokumentasjon og ADR oppdateres når beslutninger endres.
10. Produksjonsarkitektur avgjøres ikke av hva som er enklest i prototypen.

## Prioriterte neste steg

### 1. Validere eksisterende overlayberegninger

Kontroller spesielt:

- arealrekonsiliering
- prosentnevnere
- samsvar mellom kart og tall
- bytte mellom planområde og tegnet polygon
- stale cache/resultater, særlig fordi lokalt genererte `drawn:<nummer>`-ID-er
  kan gjenbrukes når kartinstansen opprettes på nytt
- mobil tegnemodus

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
