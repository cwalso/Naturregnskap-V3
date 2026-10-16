import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { NaturtapetPage } from '../src/pages/NaturtapetPage'
import { demoLabel, trondheimLossDemo } from '../src/features/historical-loss/demoSource'
import { available, summarizeLoss, validateHistoricalLoss } from '../src/features/historical-loss/model'
const props = { municipalityNumber: '5001', municipalityName: 'Trondheim', historicalLoss: trondheimLossDemo, onNavigate: vi.fn() }
afterEach(() => { cleanup(); vi.clearAllMocks() })
it('shows one aggregate 2017–2024 period without inventing annual observations',()=>{
  const sum=summarizeLoss(trondheimLossDemo.periods.slice(1,9))
  const data=validateHistoricalLoss({...trondheimLossDemo,source:{...trondheimLossDemo.source,version:'aggregate-test'},periods:[{id:'2017-2024',label:'2017–2024',start:'2017-01-01',end:'2024-12-31',nature:available(sum.nature!),agriculture:available(sum.agriculture!),ecosystems:sum.ecosystems,destinations:{status:'not-in-delivery',reason:'Ikke bekreftet variabel'}}]})
  render(<NaturtapetPage {...props} historicalLoss={data}/>)
  expect(screen.getByLabelText('Nøkkeltall for brutto nedbygging')).toHaveTextContent('1 030 dekar')
  expect(screen.getByRole('combobox',{name:'Fra periode'})).toHaveTextContent('2017–2024')
  expect(document.querySelectorAll('.loss-timeline__period')).toHaveLength(1)
  fireEvent.click(screen.getByText('Se tallene i tabell'))
  expect(within(screen.getByRole('table',{name:'Nedbygging per periode, 2017–2024'})).getAllByRole('row')).toHaveLength(2)
  expect(screen.queryByRole('option',{name:'2017'})).not.toBeInTheDocument()
})
it('shows clearly marked gross development, a consistent period and accessible distributions', () => {
  render(<NaturtapetPage {...props} />)
  expect(screen.getAllByText(demoLabel)).toHaveLength(4)
  expect(screen.getByLabelText('Nøkkeltall for brutto nedbygging')).toHaveTextContent('1 280 dekar')
  expect(screen.getByLabelText('Nøkkeltall for brutto nedbygging')).toHaveTextContent('320 dekar')
  expect(screen.getByLabelText('Nøkkeltall for brutto nedbygging')).toHaveTextContent('1 600 dekar')
  expect(screen.getByRole('table', { name: 'Nedbygd natur etter økosystemtype' })).toHaveTextContent('60 %')
  expect(screen.getByRole('table', { name: 'Nedbygging etter etterfølgende arealbruk' })).toHaveTextContent('45 %')
  fireEvent.click(screen.getByText('Se tallene i tabell'))
  expect(within(screen.getByRole('table', { name: 'Nedbygging per periode, 2016–2025' })).getAllByRole('row')).toHaveLength(11)
  expect(screen.queryByText(/XX dekar/)).not.toBeInTheDocument()
})
it('updates totals, timeline and distributions together for a selected period and restores the full range', () => {
  render(<NaturtapetPage {...props} />)
  fireEvent.change(screen.getByRole('combobox', { name: 'Til periode' }), { target: { value: '1' } })
  expect(screen.getByLabelText('Nøkkeltall for brutto nedbygging')).toHaveTextContent('205 dekar')
  expect(screen.getByRole('table', { name: 'Nedbygd natur etter økosystemtype' })).toHaveTextContent('123')
  fireEvent.change(screen.getByRole('combobox', { name: 'Fra periode' }), { target: { value: '9' } })
  expect(screen.getByRole('combobox', { name: 'Til periode' })).toHaveValue('9')
  expect(screen.getByLabelText('Nøkkeltall for brutto nedbygging')).toHaveTextContent('155 dekar')
  fireEvent.click(screen.getByRole('button', { name: 'Vis hele perioden' }))
  expect(screen.getByLabelText('Nøkkeltall for brutto nedbygging')).toHaveTextContent('1 280 dekar')
})
it('hides optional undelivered destinations, distinguishes missing values and prevents another municipality’s demo', () => {
  const absent = { status: 'not-in-delivery', reason: 'No purpose variable' } as const
  const view = render(<NaturtapetPage {...props} historicalLoss={{ ...trondheimLossDemo, periods: trondheimLossDemo.periods.map(p => ({ ...p, agriculture: { status: 'missing', reason: 'No data' }, destinations: absent })) }} />)
  expect(screen.queryByRole('heading', { name: 'Hva har arealene blitt bygget ned til?' })).not.toBeInTheDocument()
  expect(screen.getByLabelText('Nøkkeltall for brutto nedbygging')).toHaveTextContent('Ikke tilgjengelig')
  view.rerender(<NaturtapetPage {...props} municipalityNumber="0301" municipalityName="Oslo" />)
  expect(screen.queryByLabelText('Nøkkeltall for brutto nedbygging')).not.toBeInTheDocument()
  expect(screen.getByText(/Historiske nedbyggingsdata er ikke tilgjengelige for Oslo/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('link', { name: 'Tilbake til Kommuneoversikt' }))
  expect(props.onNavigate).toHaveBeenLastCalledWith('oversikt')
  fireEvent.click(screen.getByRole('link', { name: 'Se planområder i kart' }))
  expect(props.onNavigate).toHaveBeenLastCalledWith('utforsk-i-kart')
})
