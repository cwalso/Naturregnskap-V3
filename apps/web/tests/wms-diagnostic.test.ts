import { describe, expect, it } from 'vitest'

import { buildForestTileUrl } from '../src/api/forestStatistics'

describe('WMS diagnostic', () => {
  it('returns an image for forest tile in Trondheim', async () => {
    const url = buildForestTileUrl([10, 511, 372])
    const response = await fetch(url)
    const bytes = new Uint8Array(await response.arrayBuffer())

    console.log('FOREST_WMS', {
      status: response.status,
      contentType: response.headers.get('content-type'),
      bytes: bytes.length,
      signature: Array.from(bytes.slice(0, 8)),
      urlLength: url.length,
    })

    expect(response.ok).toBe(true)
    expect(response.headers.get('content-type') ?? '').toContain('image/')
    expect(bytes.length).toBeGreaterThan(1000)
  }, 20000)
})
