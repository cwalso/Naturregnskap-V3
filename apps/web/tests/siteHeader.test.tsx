import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SiteHeader } from '../src/components/SiteHeader'

afterEach(cleanup)

it('keeps one main navigation and marks theme pages as Naturtema', () => {
  const navigate = vi.fn()
  render(<SiteHeader activeView="tema-valued-nature" onNavigate={navigate} />)
  const navigation = screen.getByRole('navigation', { name: 'Hovednavigasjon' })
  expect(within(navigation).getAllByRole('link')).toHaveLength(4)
  expect(within(navigation).getByRole('link', { name: 'Naturtema' })).toHaveAttribute('aria-current', 'page')
  fireEvent.click(within(navigation).getByRole('link', { name: 'Utforsk i kart' }))
  expect(navigate).toHaveBeenCalledWith('utforsk-i-kart')
})

it('closes mobile navigation on selection and Escape, returning focus', () => {
  render(<SiteHeader activeView="oversikt" onNavigate={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Åpne meny' }))
  expect(screen.getByRole('button', { name: 'Lukk meny' })).toHaveAttribute('aria-expanded', 'true')
  fireEvent.keyDown(screen.getByRole('link', { name: 'Naturtema' }), { key: 'Escape' })
  expect(screen.getByRole('button', { name: 'Åpne meny' })).toHaveFocus()
  fireEvent.click(screen.getByRole('button', { name: 'Åpne meny' }))
  fireEvent.click(screen.getByRole('link', { name: 'Naturtema' }))
  expect(screen.getByRole('button', { name: 'Åpne meny' })).toHaveAttribute('aria-expanded', 'false')
})
