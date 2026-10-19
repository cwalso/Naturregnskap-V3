# Mobil kart- og analyseflate: aktiv analyse og delt visning

19.10.2026. Besluttet av oppdragsgiver i B5.2a–b, PR #76.

## Beslutning

Alternativ C fra B5.1 er valgt, med Delt som mobilstandard og tilgjengelige
knapper for Mer kart, Delt og Mer resultat. Dette erstatter anbefalingen av A
i designrapporten; rapporten beholdes som historisk evaluering.

Aktiv analyse (`null`, Arealfordeling, Registrerte naturverdier) er uavhengig
av synlig panel. Eksisterende kommuneeier, identitet og resultatcache beholdes.
Analysens konsument og kartmarkering lever gjennom midlertidige panelbytter.
Søk/sortering beholdes i montert, skjult resultatpanel. Bytte av analysetype
eller kommune nullstiller de typespesifikke valgene. Avslutt analyse avbryter
konsumenten og fjerner markering/utvalg, uten å endre lag, opasitet eller utsnitt.

Mobilmodus er lokal presentasjonstilstand i eksisterende React-arbeidsflate.
Karttarget og OpenLayers-instans skal være de samme. Ordinære lag/detaljer
er midlertidige visninger; ved retur gjenopprettes tidligere visningsmodus.
Ingen drahåndtak eller ny global state-/kartarkitektur innføres.

## Faglig og teknisk avgrensning

Ingen beregningsmetode, geometri, klassifikasjon, datakilde, kildeversjon,
DiBK-filter, arealfaktor eller analyse-ID endres. Produksjonen bruker eksisterende
resultater; SVG og snapshots fra B5.1 skal ikke overføres. Planavsetning er ikke
faktisk/forventet naturtap. Manglende grunnlag, feil, delvis fordeling og null
har fortsatt forskjellige tilstander.

Lokalitetsvalgets eksisterende automatiske fit beholdes midlertidig som tillatt
i oppgaven. Eksplisitt tilpassing finnes fortsatt; øvrige analyse-/kategori-,
panel-/modus- og lagvalg skal bevare senter/oppløsning.

## Leveranse og kontroll

B5.2a testes og committes før B5.2b. Reelle analyser, geometrimarkering,
kommuneisolasjon og samme kartinstans kontrolleres i Chromium. Faktiske
kartmål, skjermbilder og avvik dokumenteres i
[kontrollrapporten](../validation/2026-10-19-mobile-split-view-b5-2ab.md).
Ingen Pages-publisering, merge, main-endring eller B5.2c/d inngår.
