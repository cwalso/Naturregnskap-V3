# Planområder × heldekkende arealkategorier

Dato: 14.10.2026. Status: leveranse A kontrollert mot reelle Trondheim-data og
uavhengig råbilde-/GEOS-beregning. Autorisert prototypeanalyse på PR #76.

## Beregningsgrunnlag

`planned-land-cover-area-v1` gjenbruker `loadFutureNatureMask` uendret.
Dette er nivå-9-planvisningens Natur/Jordbruk-støtte, med smale komponenter,
DiBK `arealbruksstatus=2`, formål 1000/2000, alpha ≥128 og gyldig Grunnkart
alpha ≥100. Bebygd/vann inngår ikke. Kommuneeierskap og UTM33-korreksjon
gjenbrukes; juridisk planstatus vurderes ikke utover eksisterende filter.

Klargjort Trondheim-raster: 2025-prototypegrunnlag, hentet 05.10.2026,
ca. 19,72 m. Det representerer nivå 0, ikke detaljerte økosystemtyper.
Den allerede etablerte NIBIO-WMS-en `grunnkart_arealanalyse`, lag `okosystemtype`,
støtter nivå 1 (GetCapabilities kontrollert 14.10). Eksisterende SLD bruker
`okosystemtypeniva1` og klassene skog, heiBuskmark, liteVegetertMark, vatmark,
kyststrenderSvabergDyner. Ingen ny kilde eller økosystemklassifikasjon innføres.
Jordbruk beholdes samlet (eksisterende Dyrket mark + Grasmark-regel), uten
udokumenterte underkategorier.

Planruter er 21,15625 m. Hver Natur-rute deles i 2×2 delruter på 10,578125 m
og leser eksisterende 1024×1024 økosystemfliser for samme tile-bbox. Jordbruk
beholder hovedklassifiseringen, med fire like delruter for entydig kartstøtte.
Alle arealer er celletelling × delruteareal × kommunens eksisterende arealfaktor
/1000 daa. Detaljering endrer ikke planavgrensning eller nivå-0-totaler.

## Eksplisitt regel for manglende/tvetydig klassifikasjon

Bare eksakt SLD-klassefarge og alpha ≥100 identifiserer en naturkategori.
Transparente, antialias-blandede og ukjente farger er **ufordelt natur**.
Ingen nærmeste-farge-regel eller forholdsmessig fordeling brukes i denne analysen.
Kjente kategoriområder er dermed konservativt identifiserte delarealer;
0 identifiserte celler dokumenterer ikke at typen mangler i hele planområdet.

Dette er en delvis fordeling, ikke en fullstendig/autorativ klassifikasjon.
Hvis klassifikasjonstjenesten feiler, beholdes dokumenterte nivå-0-totaler, men
alle subtypeverdier trekkes tilbake og natur vises ufordelt med teknisk feil.
Hvis plan-/grunnkart-/korreksjonskilden feiler, publiseres ikke arealtall.
Manglende kommuneraster er utilgjengelig analyse, ikke null treff.
Gyldig tom maske er et dokumentert nullresultat under samme metode.

## Identitet, kart og avgrensning

Resultatet har egen metode/identitet, kommune, maske-/klassifikasjonshash,
råflishasher, kilde-URL, uttrekksdato, oppløsning og arealfaktor. WMS og DiBK
er løpende tjenester; 2025 er det etablerte prototypegrunnlaget, ikke en
garantert låst årsdistribusjon. Uttak lagres for etterprøvbar kontroll.

Kartutvalg bygges fra nøyaktig samme klassifiserte delruter som tallene,
aldri fra et generelt skog-/våtmarkslag. Cellens fulle flate tegnes; det er ikke
eksakte originalpolygoner eller bedre geografisk presisjon enn kildene.
Natur + Jordbruk og alle detaljkategorier (inkludert ufordelt) er additive.
Dette er heldekkende arealkontekst innen planmasken, adskilt fra KU/lokaliteter.
119,38 daa /70 lokaliteter skal ikke summeres med disse resultatene.

Samme OpenLayers-instans, lag/opasitet og pan/zoom beholdes. Utvalg gjør ikke
fit; tilpassing er en eksplisitt handling. De to analysene har egne resultater
og utvalg, og viser kartmarkeringer bare når den respektive analysen er aktiv.
Ingen historisk/faktisk naturtap, nettoendring eller prognose beregnes.

[Kontrollpunkt A og referansetall](../validation/2026-10-14-plan-area.md).
