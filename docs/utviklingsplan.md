# Utviklingsplan – Naturregnskap V3

**Sist oppdatert: 29.09.2026**

Dette er en arbeidsplan for den tekniske V3-prototypen, ikke en formell
leveranseplan for Kommunale naturregnskap. Prototypen tester dataflyt,
metodeimplementering og arkitekturprinsipper. I gjeldende løsningsarkitektur er
det lagt opp til bruk av blant annet Databricks og Experience Builder, mens
prototypen bruker enklere teknologi for å prøve ut de samme logiske prinsippene.

Dokumentet skal oppdateres fortløpende etter gjennomførte PR-er og
arkitekturavklaringer.

> **Vedlikeholdsregel:** Ved hver merget versjon/PR skal status, resultat og neste
> steg i dette dokumentet vurderes og oppdateres.

## Statusoversikt

| Versjon | Status | Hovedmål | Resultat / neste steg |
| --- | --- | --- | --- |
| V3.0 – Teknisk fundament | ✅ Ferdig | React/TypeScript/Vite-frontend, FastAPI-backend og grunnleggende modul- og domenestruktur. | Det modulære tekniske fundamentet er etablert. |
| V3.1 – Kart og kommunevalg | ✅ Ferdig | Kommunevalg, kommunegrense og grunnleggende kart. | Kommune er etablert som inngang til kartflyten. |
| V3.2 – Dataset registry og Grunnkart | ✅ Ferdig | Sentralt dataset registry, Grunnkart 2025 WMS som `visualSource` og tydelig skille mellom visning og analysegrunnlag. | WMS-visualisering er etablert uten å gjøre kartbilder til beregningsgrunnlag. |
| V3.2.1 – Codespaces/browser-preview | ✅ Ferdig | Nettleserbasert utviklingspreview med frontend og API i GitHub Codespaces. | Preview-flyt og utviklingsoppsett er etablert. |
| V3.2.2 – Grunnleggende UX/design | ✅ Ferdig | Grunnleggende kommunevelger, layout, semantiske designtokens og visuelt profilgrunnlag. | Et første, ikke profilgodkjent UX- og designgrunnlag er etablert. |
| V3.2.3 – Profilheader og tegnforklaring | ✅ Ferdig | Profilheader med offisiell logo og permanent tegnforklaring for aktive faglag. | Header og tegnforklaring er etablert; framtidige lag må få validert legendekilde. |
| V3.3 – Overordnet regnskapsoversikt | ✅ Ferdig | Level0-kategoriene Natur, Jordbruk og Bebygd, eksplisitt `XX`/`not_available` ved manglende data og utskiftbar presentasjonsarkitektur. | Typed presentasjonsflyt er etablert uten beregninger i UI-komponentene. |
| V3.4 – Research gate for Grunnkart 2025 | ✅ Ferdig | Kontrollere faktisk datagrunnlag og stenge implementering inntil analysekilden var inspisert. | Historisk research gate er gjennomført og senere erstattet av den operative beslutningen i V3.4B. |
| V3.4B – Kommunevis Parquet → prepared data → API | ✅ Ferdig | Faktisk GeoParquet for Indre Fosen (5054), offline beregning, prepared resultat og `/account-overview`-API. | Tung regnskapsberegning skjer ikke i nettleseren eller per HTTP-request. Grunnkart-WMS brukes fortsatt bare til visualisering. |
| V3.5 – Proveniens og etterprøvbarhet | ✅ Ferdig | Gjøre kilde, metode, versjon/periode og viktige avgrensninger forståelige og nyttige for brukeren. | Brukerrettet proveniens er etablert for dagens Level0-regnskap. Kilde, referanseversjon eller regnskapsperiode, metode og viktige avgrensninger kan formidles i brukerflaten. Teknisk sporbarhet beholdes i backend uten å eksponeres unødvendig. Videre forbedring av metadata-kontrakten tas ved konkret behov. |
| V3.6 – Generisk preparation-pipeline | 🔵 Planlagt | Gå fra én eksplisitt testkommune til kommuneuavhengig behandling, slik at samme arkitektur og metode virker for flere kommuner uten spesialkode. | Neste praktiske verifikasjon er å kjøre det eksisterende preparation-løpet på minst én ny kommune med reell GeoParquet. Videreføre batch/precompute og ikke lese stor Parquet per HTTP-request. |
| V3.6A – Polygonbasert endringsarkitektur | ✅ Ferdig | Etablere en kildeuavhengig arkitektur for polygonbaserte endringer. | Generisk `ChangeFeature`-modell og eksplisitt syntetiske testpolygoner for 5054 er etablert; de er ikke observerte AR5-/SSB-endringer. Separate prepared summary/features bindes til samme preparation-run med `generationId`. `/changes` gir aggregert informasjon og `/changes/features` polygoner. Frontend avviser mismatch, håndterer stale responses og lar ikke polygonfeil gjøre aggregert oversikt utilgjengelig. |
| V3.7 – Dokumentert naturtap | ⚪ Under avklaring | Etablere historisk visning av dokumentert naturtap basert på statistikk og metodegrunnlag som faktisk er tilgjengelig på kommunenivå. | SSBs naturregnskapsstatistikk publiseres første gang 25. november 2026. Løsningen skal ikke forutsette at SSB leverer stedfestede utbyggingspolygoner. Aggregert statistikk og polygonbaserte endringsdata behandles som ulike dataproblemer. |
| V3.8 – «Naturen i dag» | 🟡 Påbegynt | Introdusere mer detaljert informasjon om dagens natur og gjøre skillet mellom regnskapsgrunnlag og supplerende data tydelig for brukeren. | «Utforsk naturen» har interaktiv temautforsking, forklaring av regnskapsgrunnlaget og de første reelle supplerende datasettene. Mer detaljert heldekkende naturinndeling er fortsatt under avklaring. |
| V3.9 – Supplerende temadata | 🟡 Påbegynt | Innføre temalag som beriker forståelsen av arealer uten å blande temadata med regnskapsgrunnlaget. | Naturvernområder og Villreinområder er koblet til med WMS som visualisering og ArcGIS REST Query som separat analysegrunnlag for kommunespesifikk treffstatus. UI skiller mellom treff, ingen registrerte treff og teknisk utilgjengelig kilde. Øvrige temainnganger er fortsatt ikke koblet til. |
| V3.10 – Tematisk forståelse av naturtap | ⚪ Under avklaring | Vurdere om dokumentert naturtap kan beskrives med mer detaljert naturinformasjon der datagrunnlaget gir metodisk grunnlag for det. | Skal ikke bygge på en antakelse om at historisk naturtap er stedfestet. Dersom egnet naturklassifisering eller geometri finnes, kan supplerende temadata brukes, men manglende dekning skal være eksplisitt og temadata skal ikke endre Level0-regnskapet. |
| V3.11 – Historikk og tidsserier | ⚪ Under avklaring | Vise dokumenterte endringer mellom låste og versjonerte perioder med sporbarhet mellom data-, metodeversjoner og publiserte resultater. | Planlagt retning, men periodegrunnlag og metode må avklares. Det skal ikke antas årlige tidsserier dersom datagrunnlaget ikke støtter det. |
| V3.12 – Natur i områder avsatt til framtidig utbygging | ⚪ Under avklaring | Mulig videreutvikling for å vise hvilken natur som ligger i områder som i vedtatte planer er avsatt til framtidig utbygging. | Dette er beslutningsstøtte, ikke selve naturregnskapet, og er ikke garantert del av første versjon. Omfang, datagrunnlag og metode må avklares før eventuell implementering. Analysen skal ha natur som fokus og skal ikke presentere planreserve eller hvilke utbyggingsformål områdene er avsatt til. |

## Prinsipper som gjelder for alle videre versjoner

1. Regnskapsgrunnlag og supplerende temadata skal ikke blandes.
2. Grunnkart for arealanalyse er sentralt heldekkende grunnlag for Level0.
3. WMS er `visualSource`, ikke beregningsgrunnlag.
4. Regnskapsberegninger gjøres i databehandlingslaget, ikke i nettleseren.
5. Prepared/kuraterte resultater serveres til brukerflaten.
6. Manglende data = `not_available`, aldri falsk null.
7. Versjonering, provenance, metodeversjon og sporbarhet er førsteklasses krav.
8. Arkitekturen skal være kildeuavhengig der det er praktisk mulig.
9. Prototypens teknologistack er ikke et bindende valg for produksjonsløsningen.
10. Produksjonsarkitekturen må kunne oversette samme logiske dataflyt til
    Databricks, ArcGIS-tjenester/API og Experience Builder.
11. Fremoverskuende visninger skal beskrive hvilken natur som ligger i områder
    som i vedtatte planer er avsatt til framtidig utbygging, ikke planreserve
    eller utbyggingsformål.
12. Historisk naturtap skal presenteres på det geografiske og tematiske
    detaljeringsnivået kildedata faktisk støtter. Aggregert statistikk skal ikke
    framstilles som stedfestede endringspolygoner.

## Neste anbefalte steg

1. **Brukerflater:** Oversikt, Utforsk naturen og Utforsk i kart er løftet inn i samme designretning. Naturvernområder og Villreinområder har nå kommunespesifikk treffstatus basert på polygonspørring mot feature-tjenestene, mens WMS fortsatt kun brukes til visning. Neste steg er å utvide samme mønster til flere prioriterte temadata og eventuelt etablere eksplisitt dekningsgeometri der kilden krever skille mellom null treff og manglende geografisk dekning.
2. **V3.6:** Verifisere preparation-løpet på minst én ny kommune med reell GeoParquet.
3. **V3.7:** Koble på SSB-/annet dokumentert naturtap når publisert datagrunnlag og kommunal metode er avklart. Ikke forutsett polygoner.
4. **V3.8/V3.9:** Koble på mer detaljert heldekkende naturinformasjon og deretter supplerende temadata med eksplisitt datadekning.
5. **V3.10/V3.11:** Vurdere tematisk naturtap og tidsserier først når datagrunnlaget støtter dette.
6. **V3.12:** Deretter vurdere visning av natur i områder som i vedtatte planer er avsatt til framtidig utbygging.


## Kilder for avgrensning per 29.09.2026

- SSB, «Naturregnskap»: første publisering er varslet 25. november 2026, med tall for referanseåret 2024.
- SSB, «Arealbruk og arealressurser»: statistikken beskriver bebygd areal etter bruksformål og ubebygde områder etter markslag, og er derfor en annen statistikk enn kommunalt naturregnskap.
- Miljødirektoratet, «Naturregnskap»: beskriver utbredelse, tilstand og økosystemtjenester som ulike deler av naturregnskapet, og peker samtidig på at enklere naturregnskap kan lages med tilgjengelige data mens kunnskapsgrunnlaget utvikles.

Kildene brukes som faglig ramme for prototypen. De innebærer ikke at alle nasjonale regnskapsdeler eller SSB-statistikker kan overføres direkte til kommunalt nivå uten metodeavklaring.
