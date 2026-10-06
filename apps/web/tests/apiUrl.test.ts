import { describe, expect, it } from 'vitest'

import { buildApiUrl } from '../src/api/url'

describe('buildApiUrl', () => {
  it('keeps local API paths unchanged', () => {
    expect(buildApiUrl('/api/health')).toBe('/api/health')
  })

  it('rejects non-absolute API paths', () => {
    expect(() => buildApiUrl('api/health')).toThrow(
      'API-stien må starte med /',
    )
  })
})
