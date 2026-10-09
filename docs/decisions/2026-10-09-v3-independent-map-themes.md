# Tre selvstendige karttemaer i Utforsk

Dato: 09.10.2026

Status: implementert på feat/explore-analysis-map; manuell godkjenning gjenstår.

## Bakgrunn og beslutning

Før nye kryssanalyser kobles inn, skal tre datagrunnlag kunne undersøkes
selvstendig. Dette erstatter den aktive Utforsk-presentasjonen i
[forrige beslutning](2026-10-09-v3-explore-analysis-map.md), uten å omskrive
analysemetode eller historiske beslutninger.

Utforsk har ett aktivt tema: Grunnkart nivå 0 (standard), Verdsatte naturtyper
eller Framtidig utbygging. Et lite typet register eier rolle, kilde,
forklaring og tegnforklaring. Nye temaer kan senere legges til med egen
presentasjon; ingen ytterligere temaer eller generell lagkatalog innføres nå.

Nivå 0 gjenbruker klargjort kommuneoversikt og eksisterende klassifiserte
WMS-fliser, grid og farger. WMS-lagenes maksimalmålestokk er 1:50 000; en
transparent kommuneforespørsel i grovere målestokk skal ikke tolkes som
manglende data. Bare Trondheim har klargjort oversikt i repoet.

Verdsatte naturtyper bruker samme WMS-tjeneste som før, med fire native
verdidelag. Et eget REST-kall mot kommunepolygonet henter alle objekt-ID-er
før fullstendige attributter og kildegeometrier hentes i begrensede batcher.
Filteret bygger på denne registreringslisten, aldri på plananalysens treff.
Filtrert kart og objektvalg bruker kildepolygoner og kildeverdienes farger.
Feil og manglende registrering formidles forskjellig.

Planvisningen gjenbruker eksisterende WMS-filter: arealbruksstatus = 2 og
arealformål starter med 1 eller 2. Bare presentasjonsfargen endres. Den viser
planavsetning, også eksisterende bebyggelse, fortetting og transformasjon;
ikke naturtap, renset analysemaske eller plan minus Bebygd.

## Interaksjon og konsekvenser

Temabytte rydder filtre, objekter og gamle temalag og bevarer senter og
oppløsning. Filter, objektvalg og resize skal heller ikke tilpasse utsnitt.
Bare kommunevalg og eksplisitt reset gjør dette. Nye kommuneresultater må
ha riktig eier; avbrutte eller sene svar skal ikke vises eller cachelagres.

Analyseverksted, tegning, grid, UTM-korreksjon, nevnere, analyse-ID-er og
resultatcache beholdes med regresjonstester. Utforsk-ruten starter ingen
kryssanalyse; eksisterende analyser på andre sider berøres ikke. Verkstedet
kan kobles tilbake etter egen oppgave og manuell godkjenning av de tre temaene.

[Valideringsrapport](../validation/2026-10-09-independent-map-themes.md)
dokumenterer ekte Trondheim-render A–G og gjenstående begrensninger.
Ekstern publisering inngår ikke i denne leveransen.
