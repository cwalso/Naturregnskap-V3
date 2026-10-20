import { planDaa } from '../plan-area/model'

/** A positive, very small overlap must not be presented as zero. */
export function localityDaa(area: number) {
  return area>0&&area<0.01?'<0,01 daa':planDaa(area)
}
