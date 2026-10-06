import { describe, expect, it } from 'vitest'

import { buildApiUrl } from '../src/api/url'

describe('buildApiUrl', () => {
  it('keeps relative API paths for local development', () => {
    expect(buildApiUrl('/api/health', '')).toBe('/api/health')
  })

  it('uses a configured API origin for static frontend deployments', () => {
    expect(buildApiUrl('/api/health', 'https://api.example.test/')).toBe(
      'https://api.example.test/api/health',
    )
  })

  it('rejects non-absolute API paths', () => {
    expect(() => buildApiUrl('api/health', 'https://api.example.test')).toThrow(
      'API-stien må starte med /',
    )
  })
})
