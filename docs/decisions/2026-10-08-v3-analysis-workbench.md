# ADR – Utforsk i kart som analyseverksted

**Dato:** 08.10.2026  
**Status:** Godkjent for V3-prototypen

## Kontekst

Den tidlige kartflaten var på vei mot en generell GIS-lagvelger. Primærbrukeren
er en kommunal arealplanlegger som først og fremst trenger svar på et spørsmål,
ikke et stort antall kartlag.

## Beslutning

`Utforsk i kart` skal være et analyseverksted med denne primærflyten:

1. velg analyseområde
2. velg datagrunnlag
3. les resultat
4. finn resultatet i kartet

Kartet er et hjelpemiddel for stedfesting. Hovedresultatet skal kunne forstås
som tekst og tall uten å tolke kartet.

Sekundære kartinnstillinger og tegnforklaring kan ligge i et mer tilbaketrukket
felt.

## Implementert i prototypen

Analyseområder:

- framtidig utbygging
- eget tegnet polygon

Analysegrunnlag:

- Natur og jordbruk
- Verdsatte naturtyper

## Konsekvenser

- nye analyser skal passe inn i samme arbeidsflyt
- nye kartlag skal ikke automatisk bli nye analysevalg
- hovedresultater prioriteres visuelt foran karttekniske kontroller
- mobil skal støtte samme oppgaveflyt

## Ikke besluttet

ADR-en betyr ikke at avansert scenarioanalyse, full KPA-sammenligning eller
rapportgenerering er del av første versjon.
