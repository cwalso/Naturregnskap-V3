# Utviklingsmodell

**Sist oppdatert: 08.10.2026**

GitHub er kilde til sannhet for kode og dokumentasjon i Kommunale naturregnskap
V3. Codex brukes til avgrensede implementeringsoppgaver som kan gjennomgås og
valideres hver for seg.

## Arbeidsform

1. Les `AGENTS.md` og relevant dokumentasjon.
2. Kontroller faktisk `main` før implementering.
3. Arbeid i liten, avgrenset branch/PR.
4. Kjør relevante tester, lint og build.
5. Oppdater levende dokumentasjon dersom funksjon, metode eller arkitektur er
   endret.
6. Legg til ny ADR ved reell beslutning. Ikke skriv om gamle ADR-er for å få
   historikken til å se konsistent ut.
7. Merge først når kvalitetssjekk er grønn og kjente avvik er dokumentert.

## Dokumentasjon er del av leveransen

En PR er ikke komplett dersom koden endrer:

- faglig rolle for et datasett
- analysemetode
- brukerflyt
- arkitektur
- cache-/ytelsesstrategi
- gjeldende temasider
- offentlig branding
- kjente begrensninger

uten at relevant levende dokumentasjon vurderes.

`docs/utviklingsplan.md` skal vurderes etter hver større vertikale leveranse.

## Nettleserbasert arbeidsmiljø

Arbeidsformen skal kunne gjennomføres fra nettleser med GitHub og Codex Web,
uten avhengighet til en bestemt lokal maskin.

Tjenester med løpende kostnader skal ikke innføres uten eksplisitt beslutning.

## Små leveranser

Store oppgaver skal deles i sekvensielle, testbare leveranser når det reduserer
risiko.

Eksempel fra oktober 2026:

- A: design og brukerflyt i analyseverkstedet
- B: tegnet polygon som analyseområde
- C: delt request-/flispipeline

Hver del skal kunne kvalitetssikres separat før neste bygger videre.
