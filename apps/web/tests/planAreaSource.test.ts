import { afterEach, expect, it, vi } from 'vitest'
import { calculatePlanArea } from '../src/features/plan-area/source'
import { PLAN_PIXEL_METERS } from '../src/map/plannedDevelopment'
const {maskRequest,images,decode}=vi.hoisted(()=>({maskRequest:vi.fn(),images:vi.fn(),decode:vi.fn()}))
vi.mock('../src/features/future-analysis/analysisMask',()=>({loadFutureNatureMask:maskRequest}))
vi.mock('../src/map/sharedImageRequests',()=>({loadSharedImageBlob:images}))
vi.mock('../src/map/futureDevelopmentDisplay',()=>({futureDevelopmentPixels:decode}))
vi.mock('../src/map/utmArea',()=>({getMunicipalityAreaFactor:async()=>1}))
vi.stubGlobal('crypto',{subtle:{digest:async()=>new Uint8Array(32).buffer}})
const fixture=()=>({kind:'planned',zoom:9,cx0:0,cy0:0,width:2,height:1,extent:[0,0,PLAN_PIXEL_METERS*2,PLAN_PIXEL_METERS],cleaned:Uint8Array.from([1,2]),analysisMask:Uint8Array.from([1,2])})
afterEach(()=>vi.clearAllMocks())
it('distinguishes unavailable preparation, failed plan source and failed subtype source',async()=>{
 maskRequest.mockResolvedValueOnce(null)
 expect(await calculatePlanArea('no-raster')).toMatchObject({status:'not_available'})
 maskRequest.mockRejectedValueOnce(new Error('Plan HTTP 503'))
 await expect(calculatePlanArea('failed-plan')).rejects.toThrow('503')
 maskRequest.mockResolvedValueOnce(fixture());images.mockRejectedValueOnce(new Error('NIBIO HTTP 503'))
 const result=await calculatePlanArea('failed-classification')
 expect(result.status).toBe('available')
 if(result.status==='available'){
  expect(result.natureDaa).toBeGreaterThan(0);expect(result.agricultureDaa).toBeGreaterThan(0)
  expect(result.classification).toMatchObject({status:'error',reason:'NIBIO HTTP 503',unclassifiedDaa:result.natureDaa})
  expect(result.categories[0].areaDaa).toBe(0)
 }
})
it('shares preparation, completed results and isolates an aborted consumer',async()=>{
 let release!: (value:unknown)=>void
 maskRequest.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve}))
 images.mockResolvedValue({arrayBuffer:async()=>new Uint8Array([1]).buffer})
 const pixels=new Uint8ClampedArray(1024*1024*4);for(let i=0;i<pixels.length;i+=4)pixels.set([255,0,0,255],i)
 decode.mockResolvedValue(pixels)
 const abort=new AbortController(),stale=calculatePlanArea('shared',abort.signal),active=calculatePlanArea('shared')
 const rejection=expect(stale).rejects.toThrow();abort.abort();release(fixture())
 const result=await active;await rejection
 expect(result.status).toBe('available');expect(maskRequest).toHaveBeenCalledTimes(1)
 expect(await calculatePlanArea('shared')).toBe(result);expect(maskRequest).toHaveBeenCalledTimes(1)
})
