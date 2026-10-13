import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCompleteNatureFeatures } from '../src/features/future-analysis/source'
afterEach(()=>vi.unstubAllGlobals())
const attrs={OBJECTID:1,KuverdiNaturtypeId:'VKU-BN1',Faktaark:'https://faktaark.naturbase.no/?id=VKU-BN1',FaktaarkLokalitet:'https://faktaark.naturbase.no/?id=BN1'}
describe('full source retrieval contract',()=>{
 it('retrieves every object globally by original ID without clipping or simplifying its geometry',async()=>{
  const calls:URLSearchParams[]=[]
  const responses=[{objectIds:[1]},{features:[{attributes:attrs,geometry:{rings:[]}}]},{objectIds:[1,2]},{features:[{attributes:attrs,geometry:{rings:[]}}, {attributes:{...attrs,OBJECTID:2},geometry:{rings:[]}}]}]
  vi.stubGlobal('fetch',vi.fn(async(_url,options)=>{calls.push(options.body);return{ok:true,json:async()=>responses.shift()}}))
  const f=await fetchCompleteNatureFeatures([0,0,1,1]);expect(f).toHaveLength(2)
  expect(calls[0].get('where')).toBe('1=1')
  expect(calls[2].get('where')).toBe("KuverdiNaturtypeId IN ('VKU-BN1','VKU-UN-BN1')")
  expect(calls[2].has('geometry')).toBe(false)
  expect(calls[3].get('returnGeometry')).toBe('true');expect(calls[3].get('outSR')).toBe('25833')
  for(const key of ['geometry','geometryPrecision','maxAllowableOffset'])expect(calls[3].has(key)).toBe(false)
 })
 it('does not present service failure or an incomplete ID list as zero results',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status:503})));await expect(fetchCompleteNatureFeatures([0,0,1,1])).rejects.toThrow(/503/)
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({objectIds:[],exceededTransferLimit:true})})));await expect(fetchCompleteNatureFeatures([0,0,1,1])).rejects.toThrow(/Ufullstendig/)
 })
 it('respects consumer abort before reading or returning a result',async()=>{
  const abort=new AbortController();abort.abort();const fetch=vi.fn();vi.stubGlobal('fetch',fetch)
  await expect(fetchCompleteNatureFeatures([0,0,1,1],abort.signal)).rejects.toThrow();expect(fetch).not.toHaveBeenCalled()
 })
})
