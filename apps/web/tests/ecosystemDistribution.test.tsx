import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { EcosystemDistributionTable } from '../src/features/account-overview/EcosystemDistributionTable'
import { ExploreNaturePage } from '../src/pages/ExploreNaturePage'
import type { EcosystemStatistics } from '../src/api/ecosystemStatistics'

afterEach(cleanup)
const stock: EcosystemStatistics = {status:'available',municipalityNumber:'5001',municipalityName:'Trondheim',source:'NIBIO Grunnkart for arealanalyse',sourceVersion:'2025',methodVersion:'ecosystem-types-raster-v2',municipalityMappedAreaKm2:4,natureAreaKm2:2,pixelMeters:10.578125,warnings:[],metrics:[{id:'skog',label:'Skog',color:'#9ECC73',areaKm2:1.5,shareOfNaturePercent:75,shareOfMappedMunicipalityPercent:37.5},{id:'vatmark',label:'Våtmark',color:'#C9B0EC',areaKm2:.5,shareOfNaturePercent:25,shareOfMappedMunicipalityPercent:12.5}]}
it('presents existing stock values, rejects another owner and distinguishes absent data from source error', () => {
  const props={statistics:stock,state:'idle' as const,municipalityNumber:'5001'}
  const view=render(<EcosystemDistributionTable {...props}/>)
  expect(screen.getByRole('table')).toHaveTextContent('1 500 dekar')
  expect(screen.getByRole('table')).toHaveTextContent('75 %')
  view.rerender(<EcosystemDistributionTable {...props} municipalityNumber="0301"/>)
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('ikke klargjort')
  view.rerender(<EcosystemDistributionTable {...props} state="error"/>)
  expect(screen.getByRole('alert')).toHaveTextContent('kunne ikke hentes')
  view.rerender(<EcosystemDistributionTable {...props} statistics={{status:'not_available',municipalityNumber:'5001',municipalityName:'Trondheim',reason:'Klargjort raster mangler'}}/>)
  expect(screen.getByRole('status')).toHaveTextContent('Klargjort raster mangler')
})
it('places current distribution and all seven themes in their correct roles without new destinations', () => {
  const urban=vi.fn()
  render(<ExploreNaturePage municipalityNumber="5001" municipalityName="Trondheim" statistics={stock} onOpenThemePage={vi.fn()} onOpenForestPage={vi.fn()} onOpenEcosystemPage={vi.fn()} onOpenUrbanNaturePage={urban}/>)
  expect(screen.getByRole('heading',{name:'Fordeling av dagens natur etter økosystemtype'})).toBeInTheDocument()
  expect(screen.getByRole('table')).toHaveTextContent('500 dekar')
  const basis=screen.getByRole('list',{name:'Temasider i regnskapsgrunnlaget'})
  expect(within(basis).getAllByRole('button')).toHaveLength(2)
  expect(within(basis).queryByRole('button',{name:/Bynaturen/})).not.toBeInTheDocument()
  expect(within(screen.getByRole('list',{name:'Supplerende temadata'})).getAllByRole('button')).toHaveLength(4)
  fireEvent.click(within(screen.getByRole('list',{name:'Analyse- og beslutningsstøtte'})).getByRole('button',{name:/Bynaturen/}))
  expect(urban).toHaveBeenCalledOnce()
  expect(screen.getByText(/ikke beregnet tilgjengelige eller egnede utbyggingsarealer/)).toBeInTheDocument()
})
