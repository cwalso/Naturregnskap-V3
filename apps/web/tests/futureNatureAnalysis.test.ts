import { describe, expect, it } from 'vitest'
import { summarizeGeometricNature, selectionGeometry, selectionLocalities, METHOD_VERSION, type Analysis } from '../src/features/future-analysis/model'
import { sourceGeometry, geometryArea, clipToMask } from '../src/features/future-analysis/geometry'
import { localityIdentity, type SourceFeature } from '../src/features/future-analysis/source'
import type { PlannedDevelopmentOverlayGrid } from '../src/map/plannedDevelopment'
const ring = (x0 = 0, y0 = 0, x1 = 2, y1 = 2) => [[x0, y0], [x0, y1], [x1, y1], [x1, y0], [x0, y0]]
const grid = (mask = [1, 1, 1, 1]): PlannedDevelopmentOverlayGrid => ({kind:'planned',zoom:9,cx0:0,cy0:0,width:2,height:2,extent:[0,0,2,2],cleaned:Uint8Array.from(mask),analysisMask:Uint8Array.from(mask)})
function feature(id: number, value = 'Stor verdi', type = 'Skog', rings = [ring()], original = `BN${id}`): SourceFeature {
 return {attributes:{OBJECTID:id, KuverdiNaturtypeId:`VKU-${original}`,Faktaark:`https://faktaark.naturbase.no/?id=VKU-${original}`,FaktaarkLokalitet:`https://faktaark.naturbase.no/?id=${original}`,Verdikategori:value,Naturtype:type,Områdenavn:`Sted ${id}`},geometry:{rings}}
}
describe('geometrisk overlapp mot rasteravgrensning', () => {
 it('uses partial cell area and includes a thin polygon without a cell centre',()=>{
  const s=summarizeGeometricNature([feature(1,'Stor verdi','Skog',[ring(.1,1.1,.2,1.2)])],grid([1,0,0,0]))
  expect(s.localityCount).toBe(1);expect(s.uniqueAreaDaa).toBeCloseTo(.00001,10);expect(s.localities[0].overlapSharePercent).toBeCloseTo(100)
 })
 it('counts a binary plan cell once and excludes cells outside the shared mask',()=>{
  expect(summarizeGeometricNature([feature(1)],grid([1,0,0,0])).uniqueAreaDaa).toBeCloseTo(.001)
  expect(summarizeGeometricNature([feature(1)],grid([0,0,0,0])).localityCount).toBe(0)
 })
 it('unions same-value overlapping localities and preserves their separate counts',()=>{
  const s=summarizeGeometricNature([feature(1),feature(2)],grid())
  expect(s.uniqueAreaDaa).toBe(.004);expect(s.values[1].areaDaa).toBe(.004);expect(s.values[1].count).toBe(2)
 })
 it('assigns the highest KU value without changing actual category counts',()=>{
  const s=summarizeGeometricNature([feature(1),feature(2,'Svært stor verdi','Myr',[ring(0,0,1,2)])],grid())
  expect(s.values[0].areaDaa).toBe(.002);expect(s.values[1].areaDaa).toBe(.002);expect(s.highestCount).toBe(2)
  expect(s.values.reduce((a,m)=>a+m.areaDaa,0)).toBeCloseTo(s.uniqueAreaDaa,10)
  expect(s.values.reduce((a,m)=>a+m.sharePercent,0)).toBeCloseTo(100)
 })
 it('retains a lower-value locality even when all of its area belongs to a higher category',()=>{
  const s=summarizeGeometricNature([feature(1),feature(2,'Svært stor verdi')],grid())
  expect(s.values[1]).toMatchObject({areaDaa:0,count:1});expect(s.localityCount).toBe(2)
 })
 it('unions within a nature type but allows overlapping types',()=>{
  const s=summarizeGeometricNature([feature(1),feature(2),feature(3,'Stor verdi','Myr')],grid())
  expect(s.types.find(t=>t.label==='Skog')).toMatchObject({areaDaa:.004,count:2})
  expect(s.types.reduce((a,t)=>a+t.areaDaa,0)).toBe(.008);expect(s.uniqueAreaDaa).toBe(.004)
 })
 it('reports every actual KU category associated with a nature type',()=>{
  const s=summarizeGeometricNature([feature(1),feature(2,'Middels verdi')],grid())
  expect(s.types[0].values).toEqual(['Stor verdi','Middels verdi'])
 })
 it('groups multiple complete geometry objects by original locality ID',()=>{
  const s=summarizeGeometricNature([feature(1,'Stor verdi','Skog',[ring(0,0,1,2)],'BN99'),feature(2,'Stor verdi','Skog',[ring(1,0,2,2)],'BN99')],grid())
  expect(s.localityCount).toBe(1);expect(s.localities[0].objectIds).toEqual([1,2]);expect(s.uniqueAreaDaa).toBe(.004)
 })
 it('uses the entire source locality as denominator, including parts outside the grid',()=>{
  const s=summarizeGeometricNature([feature(1,'Stor verdi','Skog',[ring(-2,-2,2,2)])],grid())
  expect(s.localities[0].totalAreaDaa).toBe(.016);expect(s.localities[0].overlapSharePercent).toBe(25)
  expect(geometryArea(s.localities[0].fullGeometry)).toBe(16);expect(geometryArea(s.localities[0].overlapGeometry)).toBe(4)
 })
 it('applies consistent terrain correction to numerator and denominator',()=>{
  const s=summarizeGeometricNature([feature(1,'Stor verdi','Skog',[ring(-2,-2,2,2)])],grid(),.9)
  expect(s.uniqueAreaDaa).toBeCloseTo(.0036);expect(s.localities[0].totalAreaDaa).toBeCloseTo(.0144);expect(s.localities[0].overlapSharePercent).toBe(25)
 })
 it('reports excluded/unknown categories instead of silently dropping them',()=>{
  const s=summarizeGeometricNature([feature(1,'Ikke gitt verdi'),feature(2,'Ikke oppgitt')],grid())
  expect(s.quality.excludedCategories).toEqual({'Ikke gitt verdi':1,'Ikke oppgitt':1});expect(s.localityCount).toBe(0)
 })
 it('fails closed on missing geometry, zero area, open rings and self-crossings',()=>{
  const invalid=[undefined,[[[0,0],[1,1],[2,2],[0,0]]],[[[0,0],[0,2],[2,2],[2,0]]],[[[0,0],[2,2],[0,2],[2,0],[0,0]]]]
  for(const rings of invalid){const f=feature(1);f.geometry=rings?{rings}:undefined;expect(()=>summarizeGeometricNature([f],grid())).toThrow(/geometri/)}
 })
 it('fails closed on conflicting category or nature type for the same original locality',()=>{
  expect(()=>summarizeGeometricNature([feature(1),feature(2,'Middels verdi','Skog',[ring()],'BN1')],grid())).toThrow(/motstridende/)
 })
 it('verifies the business ID from both source factsheet links, independent of OBJECTID',()=>{
  const f=feature(1);expect(localityIdentity(f.attributes)).toBe('BN1');f.attributes.OBJECTID=999;expect(localityIdentity(f.attributes)).toBe('BN1')
  f.attributes.Faktaark='https://faktaark.naturbase.no/?id=VKU-other';expect(()=>localityIdentity(f.attributes)).toThrow(/konsistente/)
  f.attributes.FaktaarkLokalitet=null;expect(()=>localityIdentity(f.attributes)).toThrow()
 })
 it('preserves holes and multipart polygons, including large UTM offsets',()=>{
  const geometry=sourceGeometry([ring(250000,7000000,250004,7000004),[...ring(250001,7000001,250003,7000003)].reverse(),ring(250010,7000010,250011,7000011)])
  expect(geometryArea(geometry)).toBe(13)
 })
 it('returns no area for polygons outside the mask extent',()=>{
  expect(clipToMask(sourceGeometry([ring(10,10,12,12)]),grid())).toEqual([])
 })
 it('uses the same computed geographic selection for tables and map',()=>{
  const s=summarizeGeometricNature([feature(1),feature(2,'Svært stor verdi','Myr')],grid()) as Analysis
  expect(selectionGeometry(s,{kind:'all'})).toEqual(s.uniqueGeometry)
  expect(selectionGeometry(s,{kind:'value',label:'Stor verdi'})).toEqual([])
  expect(selectionLocalities(s,{kind:'value',label:'Stor verdi'})).toHaveLength(1)
  expect(geometryArea(selectionGeometry(s,{kind:'type',label:'Skog'}))).toBe(4)
  expect(selectionGeometry(s,{kind:'locality',label:'BN1'})).toEqual(s.localities[0].overlapGeometry)
  expect(METHOD_VERSION).toBe('future-valued-nature-geometry-v3')
 })
})
