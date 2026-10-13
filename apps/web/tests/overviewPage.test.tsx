import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { OverviewPage } from '../src/pages/OverviewPage'
import type { AccountOverviewData } from '../src/features/account-overview/model'
import type { ThematicCoverageResponse } from '../src/api/thematicCoverage'

const account: AccountOverviewData = { municipalityNumber: '5001', municipalityName: 'Trondheim', period: '2025', status: 'available', sourceKind: 'ssb-prototype', metrics: [
  { id: 'nature', areaKm2: 12, sharePercent: null }, { id: 'agriculture', areaKm2: 0, sharePercent: 0 }, { id: 'built', areaKm2: 1, sharePercent: 10 },
] }
const coverage: ThematicCoverageResponse = { municipalityNumber: '5001', municipalityName: 'Trondheim', methodVersion: 'thematic-intersection-v1', warnings: [], results: [
  { datasetId: 'protected-areas', status: 'hit', featureCount: 3, note: '' },
  { datasetId: 'wild-reindeer-areas', status: 'no_hit', featureCount: 0, note: '' },
  { datasetId: 'valued-nature', status: 'unavailable', featureCount: null, note: '' },
] }
const defaults = { accountData: account, accountState: 'idle' as const, municipalityNumber: '5001', municipalityName: 'Trondheim', mapContent: <div>Kart</div>, provenanceContent: null, thematicCoverage: coverage, thematicCoverageState: 'idle' as const, onNavigate: vi.fn() }
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('shows existing areas and supplied percentages, preserving zero without fabricating shares or losses', () => {
  render(<OverviewPage {...defaults} />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Naturregnskap for Trondheim kommune')
  const summary = screen.getByLabelText('Arealoversikt')
  expect(summary).toHaveTextContent('12 000 dekar')
  expect(summary).toHaveTextContent('0 dekar')
  expect(summary).toHaveTextContent('0 % av landarealet')
  expect(summary).toHaveTextContent('10 % av landarealet')
  expect(within(summary).getAllByText('Andel av landarealet er ikke oppgitt.')).toHaveLength(1)
  expect(screen.queryByText(/XX|Top 3|Bunn 3|Top 20/)).not.toBeInTheDocument()
  expect(screen.getByText(/Historisk nedbygging per naturtype er foreløpig ikke tilgjengelig/)).toBeInTheDocument()
})

it('does not reuse another municipality’s areas or registrations and distinguishes source failure from no hits', () => {
  const view = render(<OverviewPage {...defaults} />)
  expect(screen.getByText('3 kildeobjekter med treff')).toBeInTheDocument()
  expect(screen.getByText('Ingen registrerte treff i kilden')).toBeInTheDocument()
  expect(screen.getByText('Registreringsstatus ikke tilgjengelig')).toBeInTheDocument()
  view.rerender(<OverviewPage {...defaults} municipalityNumber="0301" municipalityName="Oslo" />)
  expect(screen.getAllByText('Areal ikke tilgjengelig')).toHaveLength(3)
  expect(screen.queryByText('3 kildeobjekter med treff')).not.toBeInTheDocument()
  expect(screen.queryByText('Ingen registrerte treff i kilden')).not.toBeInTheDocument()
})

it('keeps navigation usable during loading, account failure and missing individual metrics', () => {
  const view = render(<OverviewPage {...defaults} accountState="loading" />)
  expect(screen.getByRole('status')).toHaveTextContent('Laster arealbalanse')
  fireEvent.click(screen.getByRole('link', { name: 'Åpne Utforsk i kart' }))
  expect(defaults.onNavigate).toHaveBeenLastCalledWith('utforsk-i-kart')
  view.rerender(<OverviewPage {...defaults} accountState="error" />)
  expect(screen.getByRole('alert')).toHaveTextContent('Kunne ikke hente arealbalansen')
  expect(screen.getAllByText('Areal ikke tilgjengelig')).toHaveLength(3)
  view.rerender(<OverviewPage {...defaults} accountData={{ ...account, metrics: [{ id: 'nature', areaKm2: 12, sharePercent: null }] }} />)
  expect(screen.getAllByText('Areal ikke tilgjengelig')).toHaveLength(2)
})

it('opens all six existing themes and the historical-loss page', () => {
  render(<OverviewPage {...defaults} />)
  const themes = screen.getByRole('region', { name: 'Utforsk naturen i Trondheim' })
  for (const [title, view] of [['Skog', 'tema-forest'], ['Våtmark', 'tema-vatmark'], ['Verneområder', 'tema-protected-areas'], ['Verdsatte naturtyper', 'tema-valued-nature'], ['Inngrepsfri natur', 'tema-infrastructure-free-nature'], ['Villrein', 'tema-wild-reindeer-areas']]) {
    fireEvent.click(within(themes).getByRole('link', { name: new RegExp(`Åpne temasiden ${title}$`) }))
    expect(defaults.onNavigate).toHaveBeenLastCalledWith(view)
  }
  fireEvent.click(screen.getByRole('link', { name: 'Mer om naturtapet' }))
  expect(defaults.onNavigate).toHaveBeenLastCalledWith('naturtapet')
})

it('provides a readable image failure state and keeps the source and theme link', () => {
  render(<OverviewPage {...defaults} />)
  const image = screen.getByRole('img', { name: /Høye furutrær/ })
  fireEvent.error(image)
  expect(screen.getByText('Bilde er ikke tilgjengelig akkurat nå.')).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: 'Barnabas Davoti / Unsplash' })).toHaveLength(2)
  expect(screen.getByRole('link', { name: /Åpne temasiden Skog$/ })).toBeInTheDocument()
})
