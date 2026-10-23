import {expect,it} from 'vitest'
import {localityDaa,localityPercent} from '../src/features/future-analysis/localityPresentation'
it.each([
 [0,'0'],[0.000001,'<0,01'],[0.004,'<0,01'],[0.009999,'<0,01'],[0.01,'0,01'],[1.234,'1,23'],
])('formats %s without hiding small positives or changing exact zero',(value,display)=>{
 expect(localityDaa(value)).toBe(`${display} daa`)
 expect(localityPercent(value)).toBe(`${display} %`)
})
