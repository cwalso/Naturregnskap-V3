import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {MobileAnalysisControls} from '../src/features/explore-map/MobileAnalysisControls'
import {AnalysisPanel} from '../src/features/future-analysis/AnalysisPanel'
import {natureFixture} from './natureFixture'
const longName='Svært langt lokalitetsnavn med flere deler og presiseringer som skal kunne leses i sin helhet'
const result={...natureFixture,localities:[{...natureFixture.localities[0],id:'BN-A',name:longName,value:'',natureType:'',kuIds:[],objectIds:[],overlapAreaDaa:0.004},{...natureFixture.localities[0],id:'BN-B',name:longName}]}
const props={mode:'nature' as const,viewMode:'split' as const,area:null,nature:result,loading:false,error:null,areaSelection:{kind:'all'} as const,natureSelection:{kind:'locality',label:'BN-A'} as const,onMode:vi.fn(),onView:vi.fn(),onArea:vi.fn(),onNature:vi.fn(),onFit:vi.fn(),onLayers:vi.fn(),onEnd:vi.fn(),onDetails:vi.fn(),onReset:vi.fn(),canFit:true,layersOpen:false,panelId:'test-panel'}
afterEach(()=>{cleanup();vi.clearAllMocks()})
it('exposes a full long name and stable ID, labels overlap and keeps a small positive overlap above zero',()=>{
 const view=render(<MobileAnalysisControls {...props}/>)
 const summary=screen.getByRole('region',{name:'Aktiv analyse og kartutvalg'})
 expect(summary).toHaveTextContent('<0,01 daa overlapp');expect(summary).toHaveTextContent('BN-A')
 fireEvent.click(screen.getByRole('button',{name:`Åpne lokalitetsdetaljer for ${longName} (BN-A)`}));expect(props.onDetails).toHaveBeenCalledOnce()
 view.rerender(<MobileAnalysisControls {...props} natureSelection={{kind:'locality',label:'BN-B'}}/>)
 expect(summary).toHaveTextContent('BN-B');expect(summary).not.toHaveTextContent('BN-A')
 view.rerender(<MobileAnalysisControls {...props} nature={null} loading canFit={false}/>)
 expect(summary).not.toHaveTextContent(longName);expect(summary).not.toHaveTextContent('BN-A')
 expect(screen.queryByRole('button',{name:/Åpne lokalitetsdetaljer/})).not.toBeInTheDocument()
})
it('opens existing details with full name, ID and separately labelled full area/overlap, with optional attribute fallbacks',()=>{
 render(<AnalysisPanel result={result} loading={false} error={null} selection={{kind:'locality',label:'BN-A'}} onSelect={vi.fn()}/>)
 fireEvent.change(screen.getByRole('combobox',{name:'Gå til analyseinnhold'}),{target:{value:'selected-locality'}})
 fireEvent.click(screen.getByRole('button',{name:'Gå til valgt analyseinnhold'}))
 const details=screen.getByRole('region',{name:'Valgt lokalitet'})
 expect(details).toHaveFocus();expect(within(details).getByRole('heading',{name:longName})).toBeInTheDocument()
 expect(details).toHaveTextContent('Faglig lokalitets-ID: BN-A')
 expect(details).toHaveTextContent('KU-verdi: Ikke oppgitt')
 expect(details).toHaveTextContent('Overlapp med framtidig planavsetning: <0,01 daa')
 expect(details).toHaveTextContent('Hele lokaliteten:')
 expect(details).toHaveTextContent('KU-ID: Ikke oppgitt')
})

it('uses the same small-positive display in totals, rows, shares, quick summary and details',()=>{
 const small={...natureFixture,uniqueAreaDaa:0.004,highestAreaDaa:0.004,
  values:natureFixture.values.map(value=>({...value,areaDaa:0.004,sharePercent:0.004})),
  types:[{...natureFixture.types[0],areaDaa:0.004}],
  localities:[{...natureFixture.localities[0],overlapAreaDaa:0.004,overlapSharePercent:0.004,totalAreaDaa:0.004}]}
 const view=render(<AnalysisPanel result={small} loading={false} error={null} selection={{kind:'locality',label:small.localities[0].id}} onSelect={vi.fn()}/>)
 const row=within(screen.getByRole('region',{name:'Rullbar lokalitetsoversikt'})).getAllByRole('row')[1]
 expect(row).toHaveTextContent('<0,01 daa');expect(row).toHaveTextContent('<0,01 %')
 const details=screen.getByRole('region',{name:'Valgt lokalitet'})
 expect(details).toHaveTextContent('Hele lokaliteten: <0,01 daa');expect(details).toHaveTextContent('Overlappsandel av hele lokaliteten: <0,01 %')
 expect(screen.getByRole('table',{name:'Naturtyper med overlapp'})).toHaveTextContent('<0,01 daa')
 view.rerender(<MobileAnalysisControls {...props} nature={small} natureSelection={{kind:'all'}}/>)
 expect(screen.getByRole('region',{name:'Aktiv analyse og kartutvalg'})).toHaveTextContent('<0,01 daa')
})
