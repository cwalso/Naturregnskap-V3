# Dokumentasjon – Kommunale naturregnskap V3

**Sist oppdatert: 08.10.2026**

Denne siden viser hvilke dokumenter som er levende styringsdokumenter og hvilke
som er historiske beslutningslogger.

## Leserekkefølge for Codex og utviklere

1. [AGENTS.md](../AGENTS.md)
2. [Utviklingsplan](utviklingsplan.md)
3. [Produktprinsipper](product/principles.md)
4. [Analysebrukerhistorier](product/analysis-user-stories.md)
5. [Designføringer](product/design-guidelines.md)
6. [Arkitekturoversikt](architecture/overview.md)
7. relevante data-/metodedokumenter
8. relevante ADR-er

## Levende dokumenter

Disse skal oppdateres når dagens løsning eller retning endres:

- `../AGENTS.md`
- `../README.md`
- `utviklingsplan.md`
- `product/principles.md`
- `product/analysis-user-stories.md`
- `product/design-guidelines.md`
- `architecture/overview.md`
- `architecture/domain-model.md`
- `architecture/development-model.md`
- `architecture/v3-target-architecture-demo-reference.md`
- `data/grunnkart-2025-analysis-source.md`

## Historiske beslutninger

Dokumenter under `decisions/` er ADR-er.

De skal normalt **ikke omskrives** når retningen senere endres. Lag heller en ny
ADR som:

- beskriver ny beslutning
- peker på hva den erstatter eller presiserer
- forklarer konsekvensene

Dette gjør historikken etterprøvbar.

## Research

Dokumenter under `research/` beskriver undersøkelser på et gitt tidspunkt.

De skal ikke automatisk behandles som gjeldende arkitektur eller metode dersom
senere beslutninger har endret retningen.

## Viktige nye ADR-er per 08.10.2026

- analyseverkstedet i Utforsk i kart
- tegnet polygon som analyseområde
- delt request-/flispipeline
- temasidesett og kommuneavgrensning
- kildegeometri, objektvalg og høyeste verdi ved overlapp i analyseverkstedet

Se `decisions/`.

ADR-en `2026-10-08-v3-public-prototype-branding.md` erstatter den tidligere
føringen i `2026-08-18-v3-2-3-header-logo-and-map-legend.md` om bruk av
Miljødirektoratets logo. Den eldre ADR-en beholdes uendret som historikk og er
ikke en gjeldende UI-regel.

## Vedlikeholdsregel

Når en PR endrer faglig rolle, analysemetode, brukerflyt, arkitektur,
ytelsesstrategi eller offentlig presentasjon, skal relevant dokumentasjon
vurderes i samme PR.

Hvis dokumentasjonen ikke oppdateres fordi endringen er ren refaktorering eller
feilretting uten endret kontrakt, bør dette være bevisst.
