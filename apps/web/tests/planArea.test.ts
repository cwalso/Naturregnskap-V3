import { expect, it } from 'vitest'
import { applyClassificationTile, classifyPlanNature, createPlanAreaGrid, summarizePlanArea } from '../src/features/plan-area/model'
import { PLAN_PIXEL_METERS, type PlannedDevelopmentOverlayGrid } from '../src/map/plannedDevelopment'
const parent = (values: number[]): PlannedDevelopmentOverlayGrid => ({ kind: 'planned', zoom: 9, cx0: 0, cy0: 0, width: values.length, height: 1, extent: [0,0,values.length*PLAN_PIXEL_METERS,PLAN_PIXEL_METERS], cleaned: Uint8Array.from(values), analysisMask: Uint8Array.from(values) })
it('conserves every parent cell across nature, agriculture, subtypes and unclassified without including built/outside cells', () => {
  const p = parent([0,1,2,1]), grid = createPlanAreaGrid(p)
  const pixels = new Uint8ClampedArray(1024*1024*4)
  // First Nature parent: forest, wetland, unknown opaque, transparent forest.
  for (const [x,y,rgba] of [[2,0,[255,0,0,255]],[3,0,[255,0,255,255]],[2,1,[20,20,20,255]],[3,1,[255,0,0,0]]] as const) pixels.set(rgba,(y*1024+x)*4)
  applyClassificationTile(grid,p,[9,0,0],pixels)
  const s = summarizePlanArea(grid,1), cell = PLAN_PIXEL_METERS**2/1000
  expect(s.natureDaa).toBeCloseTo(2*cell);expect(s.agricultureDaa).toBeCloseTo(cell);expect(s.totalDaa).toBeCloseTo(3*cell)
  expect(s.categories.map(c=>c.cells)).toEqual([1,0,0,1,0,6,4])
  expect(s.categories.reduce((n,c)=>n+c.areaDaa,0)).toBeCloseTo(s.totalDaa)
})
it('does not force transparent, antialiased or unknown colors into a known ecosystem',()=>{
  expect(classifyPlanNature(255,0,0,255)).toBe(1)
  expect(classifyPlanNature(255,0,0,99)).toBe(6)
  expect(classifyPlanNature(254,0,0,255)).toBe(6)
  expect(classifyPlanNature(0,0,0,255)).toBe(6)
})
it('keeps zero hits distinct from unavailable and rejects foreign grids/invalid correction',()=>{
  expect(summarizePlanArea(createPlanAreaGrid(parent([0])),1).totalDaa).toBe(0)
  expect(()=>createPlanAreaGrid(parent([3]))).toThrow(/andre klasser/)
  expect(()=>summarizePlanArea(createPlanAreaGrid(parent([1])),NaN)).toThrow(/arealkorreksjon/)
})
