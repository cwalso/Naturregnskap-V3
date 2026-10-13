import type { SiteView } from '../../components/SiteHeader'
import type { ThematicDatasetId } from '../../datasets/registry'

export interface OverviewImage {
  readonly id: string
  readonly photoId: string
  readonly photographer: string
  readonly location: string
  readonly alt: string
}

// Free Unsplash photo pages verified 13.10.2026. Illustrations, not municipality evidence.
export const overviewImages = {
  coast: { id: 'RfAYgPcfnKI', photoId: '1602836948312-9815af8d4a79', photographer: 'Taneli Lahtinen', location: 'Norge', alt: 'Flyfoto av en norsk kystbygd med veier, bebyggelse og grønt landskap.' },
  road: { id: 'Pz3thr4MRFI', photoId: '1643240337036-fa77dbc87c13', photographer: 'Ingrid Martinussen', location: 'Hamar, Norge', alt: 'En vei gjennom skogen ved Hamar, sett ovenfra.' },
  forest: { id: 'TxhP8ZNgzLA', photoId: '1749063590560-2439a8db7a18', photographer: 'Barnabas Davoti', location: 'Rødberg, Norge', alt: 'Høye furutrær i en norsk skog med tåke mellom stammene.' },
  wetland: { id: 'jyOh06o0NpE', photoId: '1771232274335-fb94d93d1e2f', photographer: 'Harri P', location: 'Salla, Finland', alt: 'Åpent myrlandskap med små vannspeil og spredte furutrær i Nord-Finland.' },
  protected: { id: 'LsNYl_G5SNk', photoId: '1666270661899-4a3d380c2fc5', photographer: 'Roar Skotte', location: 'Jotunheimen, Norge', alt: 'Fjell og vann ved Urdalstinden i Jotunheimen.' },
  valued: { id: 'HFf-A1RnAy8', photoId: '1761605733193-aabc9c729f99', photographer: 'Kirill Prikhodko', location: 'Lofoten, Norge', alt: 'Blomsterik eng ved kysten i Lofoten, med fjell og sjø i bakgrunnen.' },
  intact: { id: 'T8R3MiQ0rs8', photoId: '1778694782496-1aa9d4a756c2', photographer: 'Danny Rienecker', location: 'Ånderdalen, Senja, Norge', alt: 'Sammenhengende naturlandskap med myr, furutrær og fjell i Ånderdalen.' },
  reindeer: { id: 'O_WnxG6t2fU', photoId: '1659339975480-2933955465e6', photographer: 'Barnabas Davoti', location: 'Norefjell, Norge', alt: 'Rein i åpent fjellandskap ved Høgevarde på Norefjell.' },
} as const satisfies Record<string, OverviewImage>

export interface OverviewTheme {
  readonly title: string
  readonly view: SiteView
  readonly description: string
  readonly image: OverviewImage
  readonly datasetId?: ThematicDatasetId
}

export const overviewEcosystems: readonly OverviewTheme[] = [
  { title: 'Skog', view: 'tema-forest', description: 'Se skogareal, utbredelse og hvilke skogtyper som finnes.', image: overviewImages.forest },
  { title: 'Våtmark', view: 'tema-vatmark', description: 'Utforsk myr og våtmark i det heldekkende arealgrunnlaget.', image: overviewImages.wetland },
]
export const overviewNatureThemes: readonly OverviewTheme[] = [
  { title: 'Verneområder', view: 'tema-protected-areas', description: 'Områder med formelt vern – et supplement til arealoversikten.', image: overviewImages.protected, datasetId: 'protected-areas' },
  { title: 'Verdsatte naturtyper', view: 'tema-valued-nature', description: 'Kartlagte lokaliteter og registrerte naturverdier.', image: overviewImages.valued, datasetId: 'valued-nature' },
  { title: 'Inngrepsfri natur', view: 'tema-infrastructure-free-nature', description: 'Se naturens avstand til tyngre tekniske inngrep.', image: overviewImages.intact, datasetId: 'infrastructure-free-nature' },
  { title: 'Villrein', view: 'tema-wild-reindeer-areas', description: 'Undersøk registrerte leveområder og geografisk dekning.', image: overviewImages.reindeer, datasetId: 'wild-reindeer-areas' },
]
