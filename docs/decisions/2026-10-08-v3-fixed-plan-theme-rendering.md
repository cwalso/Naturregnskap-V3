# Fast plananalyse, ett tema og separat rasteroverlapp

Dato: 08.10.2026

Status: produktbeslutning implementert på arbeidsbranch; visuell tjenesteacceptance gjenstår

Presiserer/erstatter presentasjons- og navigasjonsdelene i
`2026-10-08-v3-analysis-workbench.md`, `2026-10-08-v3-drawn-analysis-area.md`
og `2026-10-08-v3-locality-presentation-and-value-priority.md`.
Faglig beregningsmetode og verdi-prioritet videreføres.

## Bakgrunn

Manuell kontroll av offentlig prototype viste at Verdsatte naturtyper var
vanskelig å se selv med tall i panelet. Arbeidsflaten slo av ordinært temakart;
berørte REST-lokaliteter hadde svært svakt kontekstfyll, mens sterke treff
ble tegnet med egendefinert canvas-klipping. Dette var en skjør visningsmodell.
Reproduksjon med reell planmask i utviklingsmiljøet ble blokkert av DiBK HTTP 403;
dette bekrefter ikke en bestemt render-pixel-transformasjonsfeil.

## Beslutning

- Arbeidsflaten bruker fast framtidig utbygging × ett radio-valgt tema.
- Bare Natur/Jordbruk og Verdsatte naturtyper eksponeres.
- Tegne- og polygonanalysemoduler beholdes, men Appens inngang og øktflyt skjules.
- Verdsatte naturtyper bruker ordinær WMS-kilde til temakontekst.
- Berørte REST-kildepolygoner tegnes moderat, uten canvas-klipping.
- Beregnede pixelindekser tegnes som separat sterkt rasteroverlapp på samme grid.
- Valgt objekt får egen outline over treffene; kontekst og valg har separate kilder.
- Planområdet har rolig blått fyll og egen kant over trefflaget, slik at
  det fortsatt er synlig når treff dekker hele området; Natur/Jordbruk-treff er grønn/oransje,
  Verdsatte naturtypers overlapp er lilla.
- Resultat vises automatisk. Filter, objektvalg og temabytte beholder zoom/sentrum.
  Bare kommunevalg og eksplisitt `Vis hele kommunen` tilpasser kommuneutsnittet.
- Hovedtall, verdifordeling og liste prioriteres; metode/dekning er sekundært.

## Konsekvenser og kontroll

Ingen endring i nivå 0, rastermaskens nevner, 21,15625 m grid, DiBK-filter,
UTM-korreksjon, høyeste verdi, kilder eller geografisk klargjøring.
Resultatene er prototypebeslutningsstøtte, ikke autoritative regnskapstall.

Browserregresjon må lese faktiske OpenLayers-canvaspiksler for plan, lokalitet
og overlapp, temabytte og filter, og verifisere bevart manuell navigasjon.
Kontrollerte geometrier gjør denne testen deterministisk, men erstatter ikke
visuell acceptance med reelle Trondheim-data. PR skal ikke opprettes før
reell plan, tema og overlapp er synlige og alle acceptance-scenarioer er bestått.
