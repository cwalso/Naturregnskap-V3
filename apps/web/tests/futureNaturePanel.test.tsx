import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AnalysisPanel } from '../src/features/future-analysis/AnalysisPanel'
import { summarizeGeometricNature, type Analysis } from '../src/features/future-analysis/model'
const ring=[[0,0],[0,2],[2,2],[2,0],[0,0]]
const summary=summarizeGeometricNature([{attributes:{OBJECTID:1,KuverdiNaturtypeId:'VKU-BN1',Faktaark:'https://faktaark.naturbase.no/?id=VKU-BN1',FaktaarkLokalitet:'https://faktaark.naturbase.no/?id=BN1',Områdenavn:'Testmyra',Naturtype:'Rikmyr',Verdikategori:'Stor verdi'},geometry:{rings:[ring]}}],{kind:'planned',zoom:9,cx0:0,cy0:0,width:2,height:2,extent:[0,0,2,2],cleaned:new Uint8Array(4).fill(1),analysisMask:new Uint8Array(4).fill(1)})
const result={...summary, status:'available',municipalityNumber:'5001',analysisId:'test-v3',methodVersion:'future-valued-nature-geometry-v3',provenance:{gridMeters:21.15625,areaFactor:1,retrievedAt:'2026-10-13',computationMs:1,source:'test source',sourceVersion:'test',grunnkartVersion:'2025'}} as Analysis
afterEach(cleanup)
it('links value, type and searched locality to exact geographic selections and reset',()=>{
 const select=vi.fn();render(<AnalysisPanel result={result} loading={false} error={null} selection={{kind:'all'}} onSelect={select}/>)
 fireEvent.click(screen.getByRole('button',{name:/^Stor verdi/}));expect(select).toHaveBeenLastCalledWith({kind:'value',label:'Stor verdi'})
 const types=screen.getByRole('table',{name:'Naturtyper med overlapp'});fireEvent.click(within(types).getByRole('button',{name:'Rikmyr'}));expect(select).toHaveBeenLastCalledWith({kind:'type',label:'Rikmyr'})
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'Testmyra'}});fireEvent.click(screen.getByRole('button',{name:/Testmyra/}));expect(select).toHaveBeenLastCalledWith({kind:'locality',label:'BN1'})
 fireEvent.click(screen.getByRole('button',{name:'Vis hele analysen'}));expect(select).toHaveBeenLastCalledWith({kind:'all'})
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'notfound'}});expect(screen.queryByRole('button',{name:/Testmyra/})).not.toBeInTheDocument()
})
it('distinguishes missing preparation, technical error and valid zero hits',()=>{
 const props={loading:false,error:null,selection:{kind:'all'} as const,onSelect:vi.fn()}
 const {rerender}=render(<AnalysisPanel {...props} result={{status:'not_available',municipalityNumber:'0301',reason:'Grunnlag mangler, ikke null treff'}}/>);expect(screen.getByRole('status')).toHaveTextContent(/ikke null treff/)
 rerender(<AnalysisPanel {...props} result={null} error="Kildetjenesten feilet"/>);expect(screen.getByRole('alert')).toHaveTextContent(/ikke null treff/)
})
