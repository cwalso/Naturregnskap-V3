# Visuelle føringer for Kommunale naturregnskap

## Kilde og status

Miljødirektoratet Designmanual v1.2 2026 og det offentlige komponentbiblioteket
[`miljodir/md-components`](https://github.com/miljodir/md-components) er førende
designkilder for prototypen. Dette dokumentet oppsummerer bare de delene som er
tatt i bruk og erstatter ikke designmanualen eller designsystemet.

Brukerflaten er fortsatt en prototype. Bruken av designsystemets kilder betyr
ikke at løsningen er ferdig eller profilgodkjent.

## Farger

Primærfargene som brukes i prototypen er:

- Sjøgrønn mørk: `#005E5D`
- Sjøgrønn mellom: `#337E7D`
- Sjøgrønn 6: `#669E9D`
- Sjøgrønn 2: `#CCDFDE`
- Sjøgrønn 1: `#E5EEEE`

Verdiene følger de offisielle tokenene `--md-color-green-10`,
`--md-color-green-8`, `--md-color-green-6`, `--md-color-green-2` og
`--md-color-green-1` i
[`color-variables.css`](https://github.com/miljodir/md-components/blob/main/packages/css/src/tokens/color-variables.css).

Sekundærfarger som er tilgjengelige ved behov:

- Beige mørk: `#ECE7D2`
- Beige mellom: `#F5F1E5`
- Beige lys: `#FCFAF6`
- Oransje mørk: `#D86018`
- Oransje lys: `#EFBE7D`

Sjøgrønn skal oppleves som den tydeligste identitetsfargen. Beige brukes som rolig støttebakgrunn. Oransje brukes begrenset til enkeltstående fremheving eller fokusmarkering.

## Typografi

Designmanualens hovedfont er Sofia Pro. For digitale flater benyttes også Open Sans.

Prototypen bruker fontstacken:

`"Open Sans", Arial, sans-serif`

Ingen lisensierte eller proprietære fontfiler skal legges i repoet uten særskilt avklaring. Dersom Open Sans ikke finnes i brukerens miljø, brukes systemets fallback-font.

## Avsender og logo

Miljødirektoratet skal fremstå som avsender. Headeren bruker den offisielle
primærlogoen `assets/logo-primary.svg` fra `miljodir/md-components`, hentet
2026-08-18 fra
[`raw.githubusercontent.com`](https://raw.githubusercontent.com/miljodir/md-components/main/assets/logo-primary.svg).
Den uendrede, lokale kopien ligger i
`apps/web/src/assets/miljodirektoratet-logo-primary.svg`; logoen hotlinkes ikke.

Logo skal ikke rekonstrueres, recolores, strekkes eller hentes fra tilfeldige
eksterne kilder. Originalt sideforhold og tilstrekkelig luft skal bevares.

Headeren er en enkel, lys toppflate med `--md-color-green-1` (`#E5EEEE`) som
bakgrunn og `--md-color-green-10` (`#005E5D`) som mørk profilfarge. Logo,
diskret «Prototype»-status og produktnavnet «Kommunale naturregnskap» skal være
lesbare også på smale skjermer, samtidig som kartet beholder mest mulig arbeidsflate.

## Kartografi

Faglig kartografi skal ikke recolores for å tilpasses den visuelle profilen. Kartverkets bakgrunnskart, Grunnkart for arealanalyse og framtidige faglag beholder sine faglige tegneregler.

Miljødirektoratets profil brukes i grensesnitt, navigasjon, tekst og kontrollflater – ikke som erstatning for kartlagenes faglige symbolisering.

Alle faglige kartlag som visualiseres i løsningen skal ha en tilgjengelig og
forståelig tegnforklaring. Tegnforklaringen skal alltid være tilgjengelig ved
kartet og følge hvilke faglag som er aktive. Når ingen faglag er aktive, skal
panelet vise dette i stedet for utdaterte eller misvisende symboler.
Bakgrunnskartet fra Kartverket trenger ikke egen tegnforklaring. For WMS-lag
skal en validert `GetLegendGraphic` fra tjenesten foretrekkes slik at symbolene
følger den faktiske kartstilen; manuell symbolikk skal ikke gjettes.

## Bruksprinsipper

- Kartet skal være den dominerende arbeidsflaten.
- Kontrollene skal være enkle, luftige og tydelige.
- Bruk sjøgrønt som identitets- og interaksjonsfarge, men unngå at profilen konkurrerer med kartinnholdet.
- Bruk få profilfarger samtidig.
- Unngå dekorasjon som ikke støtter oppgaven.
- Lesbarhet, tilgjengelighet og brukerbehov for kommunale arealplanleggere går foran dekorative profilelementer.
