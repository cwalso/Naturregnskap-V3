# Utforsk i kart – godkjent designprototype V2 i eksisterende kart

Dato: 12.10.2026. Status: implementert på PR #76, før visuell brukeraksept.

## Beslutning

Den godkjente, kjørbare V2-designleveransen fra commit
`edc7bbde475b2dd582e89ce6d2c0027cd668b580` bestemmer layout og samspill.
PR #76 ved `fa6a0c938d83540ce5e8f9c18d5aa1787aef7333` bestemmer
kartmotor, datametode og funksjoner. Ingen ny designutredning gjennomføres.
Dette erstatter tidligere side-/mobilplassering av kontroller, uten å endre
beslutningene om kartografi, datasett, lisenser, beregninger eller cache.

Desktop har 274 px lagpanel og 338 px kontekstpanel som åpnes ved behov.
Ved 701–1100 px erstatter detaljer laglistens 252 px plass. På mobil
opptar ett bunnpanel 260–300 px, med egen kartflate over og intern scrolling.
Lave skjermer bruker vertikal reflow. Ingen horisontal scrolling kreves.
Den ordinære headerens kommunevalg og meny beholdes; mobile kontroller
står i to kompakte rader for å gi plass til et reelt kommunevalg.

`ExploreThemesWorkspace` eier panelvalg/fokus og eksisterende lag-/filterstate.
`RegisteredNaturePanel` og `RegisteredNatureDetails` er rene presentasjons-
komponenter for eksisterende kommunedata. Kartklikk og listevalg viser samme
objektpanel. Retur til filter bevarer filter og objekt; fjerning av objekt
bevarer filter. Escape og lukkeknapp returnerer fokus til åpner eller kart.
Panelene er ikke modale og fanger ikke fokus. Eksplisitt trykk/berøring i
kartflaten gir karttarget fokus før eksisterende OpenLayers-interaksjon
håndterer input; zoom-/attributionknapper beholder eget fokus.

Gjennomsiktighet og gråarealenes tre radiovalg ligger ved lagets innstillinger.
Tegnforklaring viser bare aktive lag, i rekkefølge fra øverst til nederst.
Kilde/forbehold kan utvides per lag. INON januar 2023 og kildeversjoner bevares.
Aktivt naturtypefilter vises som tekst i lagraden og som snarvei ved kartet.

## Avgrensning og konsekvenser

`exploreThemeMap`, kilder, klassifisering, DiBK-filter, planskravur, geografisk
naturtypefilter, analysegrid/UTM/nevnere/verdiregler, analyse-ID og cache er
uendret. OpenLayers-instansen og dens ResizeObserver/navigation brukes videre.
Prototypens bildebaserte pan/zoom eller illustrerte kartmarkør overføres ikke.
Faktisk valgt kildegeometri får det eksisterende omrisset. Kommunebytte følger
fortsatt ordinær navigasjon til oversikten. Kryssanalyse og FKB aktiveres ikke.

Endringer er isolert til Utforsk-ruten. Testporter A/B/C og reelle kildetjenester
må være bestått før eksisterende Pages erstattes. PR #76 skal ikke merges som
del av denne leveransen. [Kontrollrapport](../validation/2026-10-12-explore-design-v2.md).
