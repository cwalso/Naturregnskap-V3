import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PlanAreaIndicator } from '../src/features/plan-area/PlanAreaIndicator'
import { planDaa } from '../src/features/plan-area/model'
import { planAreaFixture } from './planAreaFixture'

afterEach(cleanup)
const props = { municipalityNumber: '5001', result: planAreaFixture, state: 'idle' as const, categoryId: 'skog', label: 'skog', onOpenMap: vi.fn() }
it('uses the supplied analysis identity and category value for both theme indicators', () => {
  const view = render(<PlanAreaIndicator {...props} />)
  expect(view.container.querySelector('[data-analysis-id]')).toHaveAttribute('data-analysis-id', planAreaFixture.analysisId)
  expect(screen.getByText(planDaa(planAreaFixture.categories[0].areaDaa))).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Vis skog i plananalysen' }))
  expect(props.onOpenMap).toHaveBeenCalledOnce()
  view.rerender(<PlanAreaIndicator {...props} categoryId="vatmark" label="våtmark" />)
  expect(screen.getByText(planDaa(planAreaFixture.categories[3].areaDaa))).toBeInTheDocument()
  expect(screen.getByText(/Delvis fordeling/)).toBeInTheDocument()
})
it('separates zero, another municipality, loading, absent preparation and source errors', () => {
  const view = render(<PlanAreaIndicator {...props} categoryId="kyst" label="kystnatur" />)
  expect(screen.getByText('0 daa')).toBeInTheDocument()
  expect(screen.getByText(/dokumenterer ikke fravær/)).toBeInTheDocument()
  view.rerender(<PlanAreaIndicator {...props} municipalityNumber="0301" />)
  expect(screen.getByRole('status')).toHaveTextContent('ikke tilgjengelig for kommunen')
  expect(view.container.querySelector('.thematic-plan-cards__value')).toBeNull()
  view.rerender(<PlanAreaIndicator {...props} state="loading" />)
  expect(screen.getByRole('status')).toHaveTextContent('Henter')
  view.rerender(<PlanAreaIndicator {...props} result={{status:'not_available',municipalityNumber:'5001',reason:'Raster mangler, ikke null treff'}} />)
  expect(screen.getByRole('status')).toHaveTextContent('Raster mangler')
  view.rerender(<PlanAreaIndicator {...props} result={{...planAreaFixture,classification:{status:'error',unclassifiedDaa:planAreaFixture.natureDaa,reason:'503'}}} />)
  expect(screen.getByRole('alert')).toHaveTextContent('kildefeil')
  expect(view.container.querySelector('.thematic-plan-cards__value')).toBeNull()
  view.rerender(<PlanAreaIndicator {...props} state="error" />)
  expect(screen.getByRole('alert')).toHaveTextContent('ikke null treff')
})
