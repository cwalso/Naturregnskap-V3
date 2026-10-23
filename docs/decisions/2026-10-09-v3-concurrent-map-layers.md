# Uavhengige, samtidige kartlag i Utforsk

Dato: 09.10.2026

Status: implementert på feat/explore-analysis-map, levert for brukertest før merge.

## Bakgrunn og beslutning

De tre selvstendige kartvisningene og korrigert Natur/Jordbruk-visning er
manuelt godkjent av brukeren. Ny bestilling erstatter ett-tema-modellen i
[tidligere beslutning](2026-10-09-v3-independent-map-themes.md) med uavhengig
lagstyring. [Godkjent planpresentasjon](2026-10-09-v3-future-development-display.md)
og alle analysemessige avgrensninger beholdes.

Bare eksisterende Grunnkart nivå 0, Framtidig utbygging og Verdsatte naturtyper
implementeres. Avkryssing støtter alle åtte kombinasjoner. Lagvelgeren grupperer
Regnskapsgrunnlag, Plandata og Supplerende temadata. Alle av viser basen.
Aktive lag har egen gjennomsiktighet og tegnforklaring. Desktop har sidepanel;
mobil starter med lukket velger over kartet, med tegnforklaring/filter under.

Én eksisterende OpenLayers-instans beholdes. Typet register eier stabil ID,
navn/rolle/kilde, forklaring/forbehold/legend, synlighets- og opasitetsstandard,
zIndex og filtertype. Fem ID-er er reservert for villrein, verneområder,
inngrepsfri natur, grå arealer og FKB-Grønnstruktur. Nye implementasjoner må
legge til registerdefinisjon og kilde/livssyklus i kartmotoren; de kan gjenbruke
velger, state, opasitet, status og legend uten ny navigasjon. Ingen tomme
avkryssinger eller nye kildekall legges inn nå. Dette er ingen generell GIS-klient.

## Tegnerekkefølge og interaksjon

Fast rekkefølge fra bunnen:

1. Bakgrunnskart.
2. Nivå 0, zIndex 10; oversiktsraster/detaljfliser deler synlighet/opasitet.
3. Godkjent Natur/Jordbruk-planpresentasjon, zIndex 20.
4. Naturtype-WMS, zIndex 30; filtrert kildegeometri/objektvalg, zIndex 31.
5. Kommunemaske og grense, zIndex 1000/1001.

Nivå 0 har 30 % gjennomsiktighet som standard, øvrige lag 0 %. Samme
klassefarger beholdes; svakere nivå-0-farge gjør planfeltene mer synlige.
Ingen drag-and-drop. Med alle lag av eller 100 % gjennomsiktighet skjules
kommunemasken, slik at basen er brukbar; kommunegrensen beholdes.

Alle lagendringer, opasitet, filter, objektvalg og resize bevarer utsnittet.
Bare kommunevalg og «Vis hele kommunen» tilpasser kartet. Naturtypefilteret
bruker hele kommunens registreringer og påvirker bare naturtypelaget. Andre
lagvalg bevarer filter og objektvalg. Å skjule naturtypelaget fjerner valgt
objekt, men beholder filteret til gjenåpning. Å endre opasitet sletter ikke valg.

REST-kall avbrytes ved skjuling/kommunebytte. Fullførte kommunevise resultater
kan fortsatt gjenbrukes av eksisterende cache. Sene svar og status fra gamle
kilder får ikke overta ny kommunekontekst. Skjulte lag viser ikke lastefeil.
Rasterstatus leser aktuelle viewport-fliser fra den eksisterende renderer-
cachen i OpenLayers 10; direkte source.getTile ville skapt nye IDLE-fliser.
Ingen request-/resultatcache er bygget om.

## Faglig avgrensning og validering

Planlaget viser fortsatt bare Natur/Jordbruk innenfor uendret DiBK-filter,
ikke blå planflater, Bebygd/vann/ukjent, bokført naturtap eller prognose.
Verdsatte naturtyper bruker samme WMS, fire kategorier og kildegeometri.
Kombinert kartpresentasjon beregner ingen nye overlapper eller tall og aktiverer
ikke kryssanalysen. Grid, UTM-korreksjon, nevnere, verdi-/overlappsregler,
analyse-ID, datasett og cachelogikk er uendret.

[Kontrollrapport](../validation/2026-10-09-concurrent-map-layers.md) dokumenterer
reell Trondheim-render A–L, screenshots, råpikselregresjon og kontrollert
Chromium-test av sammensatte piksler, filterisolasjon og sene feil.
Testpublisering gjøres fra eksisterende PR #76 til eksisterende Pages;
ingen merge eller main-endring inngår.
