import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from '../src/app/App'

describe('backendstatus', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('viser at backend svarer når helsesjekken lykkes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent('Kontakter backend…')
    expect(await screen.findByText('Backend svarer')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/health', {
      signal: expect.any(AbortSignal),
    })
  })
})
