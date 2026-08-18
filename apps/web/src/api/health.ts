export interface HealthResponse {
  status: 'ok'
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/health', { signal })

  if (!response.ok) {
    throw new Error(`Helsesjekken feilet med HTTP ${response.status}`)
  }

  const data: unknown = await response.json()
  if (!isHealthResponse(data)) {
    throw new Error('Helsesjekken returnerte et ugyldig svar')
  }

  return data
}

function isHealthResponse(value: unknown): value is HealthResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    value.status === 'ok'
  )
}
