import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {AnalysisContents} from '../src/features/analysis-ui/AnalysisContents'
afterEach(cleanup)
it('keeps focus while exploring native options and navigates only after confirmation',()=>{
 render(<section data-analysis-content><AnalysisContents sections={[["first","Første"],["second","Andre"]]}/><h3 data-analysis-section="first" tabIndex={-1}>Første innhold</h3><h3 data-analysis-section="second" tabIndex={-1}>Andre innhold</h3></section>)
 const select=screen.getByRole('combobox',{name:'Gå til analyseinnhold'}),go=screen.getByRole('button',{name:'Gå til valgt analyseinnhold'})
 expect(go).toBeDisabled();select.focus()
 fireEvent.change(select,{target:{value:'first'}});expect(select).toHaveFocus()
 fireEvent.change(select,{target:{value:'second'}});expect(select).toHaveFocus()
 fireEvent.click(go)
 expect(screen.getByRole('heading',{name:'Andre innhold'})).toHaveFocus()
 expect(select).toHaveValue('');expect(go).toBeDisabled()
})
