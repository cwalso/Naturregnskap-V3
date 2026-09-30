# AGENTS.md – Kommunale naturregnskap V3

Dette dokumentet gir varige instrukser til Codex og andre kodeassistenter som arbeider i repoet.

## 1. Formål

V3 er en modulær prototype for kommunale naturregnskap. Løsningen skal skille tydelig mellom selve naturregnskapet, supplerende temadata, analyse- og beslutningsstøtte og veiledning/formidling.

Løsningen er et virkemiddel. Verdien ligger i et felles og etterprøvbart regnskapsgrunnlag, dokumentert metode, sporbarhet, analyser og riktig bruk i kommunal arealforvaltning.

## 2. Faglige hovedregler

1. Regnskapsgrunnlag og supplerende temadata skal aldri blandes sammen uten eksplisitt metodisk beslutning.
2. Første regnskapskjerne bygger på heldekkende data, Grunnkart for arealanalyse som beholdningsgrunnlag og SSBs utbyggingsregnskap som endringsgrunnlag.
3. Overordnet nivå 0 i fagmodellen er Bebygd, Jordbruk og Natur. Den stabile domene-ID-en `agriculture` presenteres brukerrettet som «Jordbruk», med forklaring om at kategorien omfatter dyrket mark og grasmark.
4. Nivå 0 beregnes i gjeldende metodeutkast ved en eksplisitt og versjonert aggregering av `okosystemtypeniva1` i Grunnkart: bebygd/opparbeidet -> Bebygd, dyrket mark + grasmark -> Jordbruk, øvrige ikke-marine klasser -> Natur. Detaljerte økosystemtyper kan samtidig brukes til mer detaljert beskrivelse av naturen, men skal ikke forveksles med den aggregerte Nivå 0-presentasjonen.
5. Temadata som inngrepsfri natur, verneområder, villreinområder og verdsatte naturtyper er supplerende kunnskapslag. Manglende treff skal ikke tolkes som fravær av naturverdi.
6. Det skal ikke bygges tidsserier eller trendpåstander på detaljerte temadata uten uttrykkelig metodisk avklaring.
7. Tilstand og økosystemtjenester er ikke del av V1-regnskapskjernen.
8. Fremtidige analyser er analyse- og beslutningsstøtte, ikke selve naturregnskapet.
9. Framoverskuende arealanalyser skal bygge på samme heldekkende grunnlag og relevante temadata, men inngår ikke i selve regnskapsbalansen. Begreper, datakilder og avgrensning skal være metodisk avklart før funksjonalitet implementeres.
10. Fremtidig arealberegning er en arealmessig analyse, ikke automatisk en naturfaglig konsekvensvurdering.

## 3. Arkitekturregler

1. Frontend skal bygges modulært med React, TypeScript, Vite og OpenLayers.
2. Analyse-API skal bygges i Python med FastAPI.
3. WMS brukes primært til visualisering. Autoritative eller presenterte arealberegninger skal ikke utledes fra WMS-bilder.
4. GIS-analyser som gir regnskapstall eller analysegrunnlag skal utføres server-side eller mot eksplisitt godkjente forhåndsprosesserte data.
5. BBOX/envelope kan brukes til søk og ytelsesoptimalisering, men ikke som erstatning for eksakt geometrisk klipping når resultatet presenteres som arealtall.
6. Eksterne datakilder skal isoleres bak adaptere. Domene- og analysemoduler skal ikke være tett koblet til leverandørspesifikke API-er.
7. Kartvisning og analyse skal kunne bruke ulike kilder for samme datasett, for eksempel WMS til visning og WFS/API/forhåndsprosesserte data til analyse.
8. Datasettene skal beskrives i et sentralt register med kilde, kategori, versjon, gyldighetsdato, metadata og analysemuligheter.
9. Analyse-, data- og metodeversjon skal kunne spores i resultater.
10. Kart, tabeller, grafer og rapporter skal bygge på samme analyseresultat, ikke egne parallelle beregninger.
11. Visuell presentasjon og theme skal kunne byttes uten å endre fagmodell, analyse, API-kontrakter eller datakildeadaptere. UI-komponenter skal konsumere typed data/view models, bruke semantiske design tokens og ikke eie faglige beregninger eller datakildekunnskap.

## 4. Domeneskille

Kode og begreper skal tydelig skille mellom:

- `account`, selve naturregnskapet
- `nature-status`, naturen i dag
- `historical-loss`, hva som er bygget ned og hva slags registrert natur som er berørt
- `future-analysis`, vedtatt og ikke vedtatt fremtidig arealbruk
- `thematic-data`, supplerende temadata
- `reporting`, presentasjon og rapportering av allerede beregnede resultater

Ikke bruk generiske navn som gjør at disse domenene flyter sammen.

## 5. Plananalyse

Gjeldende KPA og forslag til ny KPA skal modelleres som varianter av samme konsept, ikke som to separate tekniske løsninger.

Plananalyse skal etter hvert håndtere:

- valgt planversjon
- kilde og datoversjon
- geometri og koordinatsystem
- hvilke arealformål som teller som utbygging
- allerede utbygd areal
- overlapp mellom gammel og ny plan
- regel for hvilken plan som gjelder ved overlapp
- ugyldig eller reparert geometri
- metode-/regelsettversjon

Ikke hardkod planregler i UI-komponenter.

## 6. Datamangler og usikkerhet

Datamangler er førsteklasses informasjon. Resultater skal kunne skille mellom:

- areal med registrert temainformasjon
- areal uten registrert temainformasjon
- teknisk feil eller manglende datatilgang

Ingen av disse skal presenteres som samme tilstand.

## 7. Utviklingsprinsipper

1. Bygg små, vertikale og testbare steg.
2. Ikke implementer funksjonalitet som ikke er eksplisitt etterspurt i oppgaven.
3. Ikke innfør nye rammeverk eller tunge avhengigheter uten konkret behov og begrunnelse.
4. Unngå overengineering. Dette er en profesjonell prototype, ikke et ferdig produksjonssystem.
5. Bruk TypeScript-typer og Python-modeller til å gjøre domenet eksplisitt.
6. Legg forretningsregler og analysemetode utenfor UI-komponenter.
7. Kjør relevante tester og build før oppgaven avsluttes.
8. Oppdater dokumentasjon og ADR når en oppgave innebærer en reell arkitekturbeslutning.
9. Ikke kopier V2-kode ukritisk. V2 er referanse for funksjonalitet, datakilder og læring, ikke teknisk fundament.

## 8. Arbeidsform med Codex

Før implementering:

1. Les denne filen.
2. Les relevante dokumenter under `docs/`.
3. Oppsummer kort hvilke arkitektur- og domeneregler som er relevante for oppgaven.
4. Gjør kun endringer som er nødvendige for oppgaven.

Ved avslutning skal Codex oppgi:

1. hva som er endret
2. hvilke filer som er opprettet eller endret
3. hvilke tester/build som er kjørt og resultatet
4. eventuelle avvik, antakelser eller spørsmål som bør avklares før neste steg

## 9. Kostnads- og utviklingsmiljø

Arbeidsflyten skal kunne gjennomføres fra nettleser med GitHub og Codex Web, uten å være avhengig av en bestemt lokal PC eller betalte tilleggstjenester. Ikke innfør infrastruktur som medfører løpende kostnader uten eksplisitt beslutning.
