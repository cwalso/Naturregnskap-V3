import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {PlanAreaPanel} from '../src/features/plan-area/PlanAreaPanel'
import {PlanAreaPreview} from '../src/features/plan-area/PlanAreaPreview'
import {planAreaFixture} from './planAreaFixture'
afterEach(cleanup)
const props={result:planAreaFixture,loading:false,error:null,selection:{kind:'all'} as const,onSelect:vi.fn(),onFit:vi.fn(),onShowMap:vi.fn()}
it('maps each nature category, main categories and reset to distinct selections without implicit fit',()=>{
 render(<PlanAreaPanel {...props}/>)
 const table=screen.getByRole('table',{name:'Økosystemtyper innenfor planområder'})
 for(const c of planAreaFixture.categories.filter(c=>c.group==='nature')){
  fireEvent.click(within(table).getByRole('button',{name:c.label}))
  expect(props.onSelect).toHaveBeenLastCalledWith({kind:'category',id:c.id})
 }
 fireEvent.click(screen.getByRole('group',{name:'Velg arealer i kartet'}).querySelectorAll('button')[2])
 expect(props.onSelect).toHaveBeenLastCalledWith({kind:'agriculture'})
 fireEvent.click(screen.getByRole('button',{name:'Nullstill utvalg'}));expect(props.onSelect).toHaveBeenLastCalledWith({kind:'all'})
 expect(props.onFit).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Tilpass kart til utvalget'}));expect(props.onFit).toHaveBeenCalledOnce()
 expect(screen.getByText(/0 daa er ikke dokumentert fravær/)).toBeInTheDocument()
})
it('distinguishes classification failure from missing plan preparation and technical plan errors',()=>{
 const view=render(<PlanAreaPanel {...props} result={{...planAreaFixture,classification:{status:'error',unclassifiedDaa:planAreaFixture.natureDaa,reason:'503'}}}/>)
 expect(screen.getByRole('alert')).toHaveTextContent('Natur og jordbruk er beregnet')
 expect(screen.queryByRole('button',{name:'Skog'})).not.toBeInTheDocument()
 view.rerender(<PlanAreaPanel {...props} result={{status:'not_available',municipalityNumber:'0301',reason:'Rastegrunnlag mangler, ikke null treff'}}/>)
 expect(screen.getByRole('status')).toHaveTextContent('ikke null treff')
 view.rerender(<PlanAreaPanel {...props} error="Plan HTTP 503"/>)
 expect(screen.getByRole('alert')).toHaveTextContent('Planarealer er ikke beregnet')
})
it('uses the same analysis numbers in the overview, and rejects another municipality’s result',()=>{
 const view=render(<PlanAreaPreview result={planAreaFixture} state="idle" municipalityNumber="5001"/>)
 expect(screen.getByLabelText('Oppsummering av arealer i planområder')).toHaveTextContent('0,45 daa')
 view.rerender(<PlanAreaPreview result={planAreaFixture} state="idle" municipalityNumber="0301"/>)
 expect(screen.queryByLabelText('Oppsummering av arealer i planområder')).not.toBeInTheDocument()
})
