# Kommunale naturregnskap V3

V3 er en teknisk prototype for å prøve ut et felles, etterprøvbart og praktisk
nyttig kommunalt naturregnskap. Prototypen utvikles trinnvis og skal ikke
forveksles med en ferdig eller profilgodkjent tjeneste.

Den offentlige testflaten ligger på:

https://cwalso.github.io/Naturregnskap-V3/

**Status i repoet: 09.10.2026**

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

Oppgavebranchen viser tre uavhengige kartlag:

1. Grunnkart nivå 0 – heldekkende regnskapsgrunnlag; standard ved åpning.
2. Verdsatte naturtyper – supplerende registrerte lokaliteter.
3. Framtidig utbygging – planavsetninger fra kommuneplanens arealdel.

`ExploreThemesWorkspace` og `exploreThemeMap` lar brukeren kombinere 0–3 lag
med avkryssing og egen gjennomsiktighet. Nivå 0 ligger nederst (30 %
gjennomsiktighet som standard), plan i midten og naturtyper øverst.
Kommunemaske/grense ligger over alle; bakgrunnskartet vises også med alle av.
Lagvalg, gjennomsiktighet, søk, filter og lokalitetsvalg beholder utsnittet.
Naturtypefilteret påvirker bare naturtypelaget og bevares ved andre lagvalg.
Velgeren kan lukkes på mobil. Registeret er forberedt for åtte identiteter,
men bare de tre implementerte lagene vises. Planvisningen bruker uendret
DiBK-filter og viser dagens
Natur og Jordbruk innenfor planformålene, med eksisterende grønn/gul symbolikk.
Bebygd, vann og ugyldige piksler skjules. Dette er kartpresentasjon, ikke
bokført naturtap eller prognose for faktisk framtidig naturtap.

Kommuneoversikten for Grunnkart gjenbruker det klargjorte Trondheim-rasteret.
Ved innzooming brukes samme eksisterende klassifisering og WMS-fliser.
WMS-laget har maksimal målestokk 1:50 000.

Kryssanalyse, tegning, grid, UTM-korreksjon, verdi-/overlappsmetode og cache
beholdes i kode og tester. De startes ikke fra denne nye kartflyten.
Tallanalysene er fortsatt bare Trondheim-klargjorte prototypeberegninger.

[Flere samtidige kartlag](docs/decisions/2026-10-09-v3-concurrent-map-layers.md) og
[kontrollrapport med skjermbilder](docs/validation/2026-10-09-concurrent-map-layers.md) dokumenterer gjeldende flyt.

[Beslutning om selvstendige karttemaer](docs/decisions/2026-10-09-v3-independent-map-themes.md)
beskriver den tidligere presentasjonen og avgrensningen.
[Kontrollrapport og skjermbilder](docs/validation/2026-10-09-independent-map-themes.md)
viser den opprinnelige branch-kontrollen.
[Korrigert planvisning og nye skjermbilder](docs/validation/2026-10-09-future-development-display.md)
dokumenterer Natur/Jordbruk-visningen. Testpublisering skjer fra PR-branchen
via eksisterende Pages-workflow; ingen merge til main inngår.

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
