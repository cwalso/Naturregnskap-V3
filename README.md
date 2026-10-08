# Kommunale naturregnskap V3

V3 er en teknisk prototype for å prøve ut et felles, etterprøvbart og praktisk
nyttig kommunalt naturregnskap. Prototypen utvikles trinnvis og skal ikke
forveksles med en ferdig eller profilgodkjent tjeneste.

Den offentlige testflaten ligger på:

https://cwalso.github.io/Naturregnskap-V3/

**Status i repoet: 08.10.2026**

## Faglig skille

Prototypen skiller mellom fire ting som ikke skal blandes:

1. **Naturregnskapet** – heldekkende og metodebundet regnskapsgrunnlag.
2. **Supplerende temadata** – relevante kartlag som gir ekstra innsikt.
3. **Analyse- og beslutningsstøtte** – overlay og andre analyser som bygger videre på dataene.
4. **Veiledning og formidling** – forklaringer som gjør dataene forståelige og anvendelige.

Første versjon skal først og fremst forstås som et arealbasert/utbredelsesbasert
naturregnskap. Tilstand, økosystemtjenester og avansert scenarioanalyse er ikke
avklart som del av regnskapskjernen.

## Dagens sider

Hovednavigasjonen består av:

- **Kommuneoversikt**
- **Naturtapet**
- **Naturtema**
- **Utforsk i kart**

Gjeldende temasider er:

- Myr (våtmark)
- Skog
- Verdsatte naturtyper
- Verneområder
- Villreinområder
- Inngrepsfri natur
- Bynaturen (grå arealer)

Temadata på temasidene avgrenses visuelt til valgt kommune.

## Utforsk i kart

`#utforsk-i-kart` er et analyseverksted, ikke en generell GIS-klient.

Arbeidsflyten er:

```text
velg analyseområde
        ↓
velg datagrunnlag
        ↓
les resultat
        ↓
finn resultatet i kartet
```

Analyseområder som er implementert:

- områder satt av til framtidig utbygging i kommuneplan
- eget polygon tegnet i kartet

Analysegrunnlag som er implementert:

- Natur og jordbruk fra Grunnkart for arealanalyse
- Verdsatte naturtyper

Resultatene er prototypebasert beslutningsstøtte. De skal ikke omtales som
autoritative regnskapstall uten egen metodisk beslutning og validering.

De rasterbaserte tallanalysene krever et klargjort kommunevis
oversiktsraster. Repoet inneholder per 08.10.2026 bare et slikt raster for
Trondheim (5001). Analyseverkstedet og temasidene kan åpnes for andre kommuner,
men Natur/Jordbruk-overlay, Verdsatte naturtyper-overlay, skogstatistikk og
våtmarksstatistikk returnerer da at beregningen ikke er klargjort. Dynamiske
kartlag og kommunevise tematreff har en annen og bredere dekning.

## Offentlig demoarkitektur

GitHub Pages er den eneste runtime-komponenten som trengs for den offentlige
demoen.

```text
Kartverket / NIBIO / DiBK / Miljødirektoratet / SSB
                    +
        statiske/prepared prototypefiler
                    ↓
       React + TypeScript + OpenLayers
                    ↓
               GitHub Pages
```

`apps/api` inneholder FastAPI/Python-kode for preparation, domenelogikk og
tester, men API-et er ikke en runtime-forutsetning for den publiserte
GitHub Pages-demoen.

## Datagrunnlag i prototypen

Brukerflaten bruker blant annet:

- Kartverket for kommunevalg og kommunegrense
- NIBIOs Grunnkart for arealanalyse 2025
- DiBKs kommuneplantjeneste for prototypeanalyse av framtidig utbygging
- Miljødirektoratets tjenester for supplerende temadata
- SSB tabell 09594 som foreløpig prototypevisning av overordnede hovedtall
- forhåndsprosesserte rasterfiler der dette er lagt inn i repoet

SSB-visningen og nettleserbaserte rasteranalyser er eksplisitte
prototypeimplementasjoner og skal ikke forveksles med et ferdig godkjent
regnskapsgrunnlag.

## Grunnkart og rasteranalyse

Kartet bruker EPSG:25833.

For Trondheim finnes et forhåndsprosessert oversiktsraster:

```text
apps/web/public/data/grunnkart/2025/overview/5001.png
```

Oversiktsrasteret brukes ved grov målestokk. Detaljerte Grunnkart-fliser hentes
ved nærmere zoom.

Overlayanalysen for framtidig utbygging og eget polygon bruker et fast
prototype-rutenett på ca. **21,16 meter**. Det klargjorte Grunnkart-rasteret for
Trondheim har ca. **19,72 meter** kildeoppløsning og samples til analyserutenettet.
Overlay mot Verdsatte naturtyper rasteriserer REST-geometrier på det samme
21,16-metersrutenettet. Økosystemfordelingen bruker finere klassifiseringspiksler
på ca. 10,58 meter. Dette er nettleserbasert beslutningsstøtte, ikke en
erstatning for en versjonert, autoritativ regnskapsmotor.

Se `docs/data/grunnkart-2025-analysis-source.md`.

## Delt flispipeline

`apps/web/src/map/sharedImageRequests.ts` sørger for at rasterkall gjenbrukes
på tvers av kart og analyser der URL/datagrunnlag er det samme.

Dagens regler:

- maks 4 samtidige kall per datakilde
- identiske pågående kall deles
- råbilder caches med begrenset cache
- kart og analyse skal gjenbruke samme råflis når det er mulig

Dette reduserer unødvendige WMS-kall og inkonsistens mellom kart og analyse.

## Branding og bilder

Prototypen er offentlig, men ikke profilgodkjent. Headeren er derfor nøytral og
skal ikke bruke Miljødirektoratets logo uten eksplisitt godkjenning.

Flere temasider bruker midlertidige Unsplash-bilder via eksterne URL-er. Dette
er prototypeillustrasjoner. Før en mer formell publisering bør bildene erstattes
med kontrollerte filer med kjent kilde, fotograf/kreditering og bruksrett.

## Repo

- `apps/web`: React, TypeScript, Vite og OpenLayers. Offentlig demo.
- `apps/api`: FastAPI/Python, domenelogikk, preparation og tester.
- `docs`: produkt-, metode-, arkitektur- og beslutningsdokumentasjon.
- `.data`: lokale analysedata som ikke versjoneres i Git.

## Lokal frontend

Krav: Node.js og npm.

```bash
cd apps/web
npm install
npm run dev
```

Frontend er da tilgjengelig på `http://localhost:5173`.

## Python/FastAPI for utvikling og preparation

Krav: Python 3.11 eller nyere.

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

## Tester og kvalitetskontroll

Frontend:

```bash
cd apps/web
npm test
npm run lint
npm run build
```

Backend/preparation:

```bash
cd apps/api
source .venv/bin/activate
pytest
ruff check .
```

Pull requests og `main` kjøres gjennom GitHub Actions quality gate. Frontend
deployes automatisk til GitHub Pages etter merge til `main`.

## Førende dokumentasjon

Start her:

- [AGENTS.md](AGENTS.md)
- [Dokumentasjonsoversikt](docs/README.md)
- [Utviklingsplan](docs/utviklingsplan.md)
- [Arkitekturoversikt](docs/architecture/overview.md)
- [Produktprinsipper](docs/product/principles.md)
- [Analysebrukerhistorier](docs/product/analysis-user-stories.md)

Gamle ADR-er er historiske beslutningslogger og skal normalt ikke omskrives.
Nyere ADR-er og dagens eksplisitte levende dokumentasjon gjelder når retningen
er endret.
