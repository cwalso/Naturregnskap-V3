import { municipalValueLegend } from '../../api/municipalValuedNature'

export const mapThemes = [
  {
    id: 'level0', name: 'Grunnkart nivå 0', role: 'Regnskapsgrunnlag', source: 'NIBIO · Grunnkart for arealanalyse 2025',
    description: 'Heldekkende inndeling i Natur, Jordbruk og Bebygd innenfor kommunen.',
    note: 'Eksisterende nivå-0-klassifisering og farger. Vann vises med egen blå symbolikk som kontekst.',
    legend: [{ label: 'Natur', color: '#9ECC73' }, { label: 'Jordbruk', color: '#FFD16E' }, { label: 'Bebygd', color: '#E86474' }, { label: 'Vann (kontekst)', color: '#6BAED6' }],
  },
  {
    id: 'valued-nature', name: 'Verdsatte naturtyper', role: 'Supplerende temadata', source: 'Miljødirektoratet · naturtyper med KU-verdi',
    description: 'Registrerte naturtypelokaliteter i kommunen, uavhengig av framtidig utbygging.',
    note: 'Datasettet er ikke heldekkende. Manglende registrering betyr ikke fravær av naturverdi.', legend: municipalValueLegend,
  },
  {
    id: 'future-development', name: 'Framtidig utbygging', role: 'Plandata', source: 'DiBK · kommuneplanens arealdel',
    description: 'Natur og jordbruk innenfor områder avsatt til framtidige utbyggingsformål i kommuneplanen.',
    note: 'Bebygd areal, vann og ukjente piksler skjules. Kartet viser dagens arealdekke innenfor planavsetninger, ikke bokført naturtap eller en prognose for faktisk framtidig naturtap.',
    legend: [{ label: 'Natur', color: '#9ECC73' }, { label: 'Jordbruk', color: '#FFD16E' }],
  },
] as const
export type MapThemeId = typeof mapThemes[number]['id']
export const mapThemeById = (id: MapThemeId) => mapThemes.find((theme) => theme.id === id)!
