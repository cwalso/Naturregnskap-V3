# Kommuneoversikt og Naturtapet – felles struktur

Dato: 14.10.2026. Autorisert på PR #76. Dette erstatter tidligere mangelvisning
for historisk nedbygging med tydelig merkede demodata for Trondheim.

Oversikt svarer på «Hva har vi?», «Hva har vi mistet?» og «Hva kan bli berørt?».
Beholdningskort og Grunnkart beholdes. En kort historisk forhåndsvisning leder til
Naturtapet. Planseksjonen forklarer mulige berørte arealer og leder til eksisterende
Utforsk/planoverlapp. Ingen samlet planarealverdi konstrueres.
Naturtapet viser brutto nedbygging, periodevalg, tidsutvikling, økosystemfordeling,
valgfri etterfølgende arealbruk, geografisk datamangel og metode/kilder.

## Intern datakontrakt

`features/historical-loss/model.ts` har kommuneeier, kilde/demo-status, versjon,
enhet (daa), mål (brutto nedbygging), ordnede ikke-overlappende perioder med
start/slutt og frie kategori-ID-er/navn. Hver variabel skiller registrert verdi
(også 0), manglende verdi og variabel som ikke inngår i leveransen. Fordelinger
kan være fullstendige eller delvise. Samlet areal/andel beregnes bare når riktig
grunnlag finnes; manglende verdier erstattes aldri med 0. Kategorier må ha samme
betydning gjennom valgte perioder; ved klassifikasjonsbrudd må adapteren levere
harmoniserte kategorier eller markere fordelingen som manglende.

Demokilden er atskilt fra modellen og presentasjonen. Den illustrerer
2016–2025, med 1 280 daa natur og 320 daa jordbruk, totalt 1 600 daa.
Ti årlige verdier summerer til totalsummene. Fem illustrative økosystemtyper
fordeles innen natur (60/18/12/8/2 %). Fire illustrative etterfølgende arealbrukstyper
fordeles innen samlet natur + jordbruk (45/25/20/10 %). Natur og jordbruk er disjunkte.
Dette er konstruerte tall for funksjonstest og formidling, ikke lokale funn.
Ingen nettoendring, geografiske polygoner eller prognose utledes.
Andre kommuner får mangelstatus, aldri Trondheims demotall.

Begge sider får samme kommuneeide datasett fra App. SSBs eksisterende beholdningstall,
Grunnkart og plan-/naturtypeanalyse leses separat. Historiske tall trekkes ikke
fra dagens beholdning og brukes ikke til andel av dagens naturareal.

## SSB-avklaringer før integrasjon

Statistikk forventes 25. november 2026, polygoner først i 2027. Dette er forventninger,
ikke bekreftede leveransekontrakter. `ssbAdapter.ts` definerer kun mapping fra en
ukjent leveranse til vår interne modell, samt validering. Ingen API/kolonner antas.

Presisering 14.10: forventet første periode er 2017–2024. Årsfordeling er ikke
bekreftet; én aggregert periode støttes av modell, periodevalg og visualisering.
En samlet verdi vises som én observasjon, uten konstruerte årstall. Dagens
illustrative 2016–2025-tidsserie beholdes som konseptdemo.

Før offisiell kilde kobles til må vi avklare tabell-ID/tilgang, variabler, enhet,
kommunekoder/grenseversjon, brutto/netto-definisjon, perioder og revisjoner,
natur/jordbruksavgrensning, økosystemklassifikasjon og sammenlignbarhet,
etterfølgende arealbruk, null/suppresjon/mangel, dekningsgrad, kildeversjon og
lisens. Økosystemer/arealbruk er ikke bekreftet i novemberleveransen.
Offisiell adapter må dokumentere dette og harmonisere data før aktivering.
