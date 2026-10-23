import { planDaa } from '../plan-area/model'
const percentFormat=new Intl.NumberFormat('nb-NO',{maximumFractionDigits:2})

/** A positive, very small overlap must not be presented as zero. */
export function localityDaa(area: number) {
  return area>0&&area<0.01?'<0,01 daa':planDaa(area)
}

/** Display percentage points without rounding a positive overlap share to zero. */
export function localityPercent(value: number) {
  return `${value>0&&value<0.01?'<0,01':percentFormat.format(value)} %`
}
