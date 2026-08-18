import { useEffect, useState } from 'react'

import { getHealth } from '../api/health'

type BackendState = 'loading' | 'available' | 'unavailable'

export function App() {
  const [backendState, setBackendState] = useState<BackendState>('loading')

  useEffect(() => {
    const controller = new AbortController()

    getHealth(controller.signal)
      .then(() => setBackendState('available'))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        setBackendState('unavailable')
      })

    return () => controller.abort()
  }, [])

  const statusText = {
    loading: 'Kontakter backend…',
    available: 'Backend svarer',
    unavailable: 'Backend svarer ikke',
  }[backendState]

  return (
    <main className="app-shell">
      <h1>Kommunale naturregnskap V3</h1>
      <p role="status" data-state={backendState}>
        {statusText}
      </p>
    </main>
  )
}
