import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  clearSharedImageRequestCache,
  loadSharedImageBlob,
  sharedImageRequestStats,
} from '../src/map/sharedImageRequests'

afterEach(() => {
  clearSharedImageRequestCache()
  vi.restoreAllMocks()
})

describe('shared image request pipeline', () => {
  it('shares an in-flight request and reuses the cached image', async () => {
    const resolvers: Array<(response: Response) => void> = []
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise<Response>((resolve) => {
        resolvers.push(resolve)
      }),
    )

    const url = 'https://wms.nibio.no/cgi-bin/grunnkart_arealanalyse?tile=shared'
    const first = loadSharedImageBlob(url)
    const second = loadSharedImageBlob(url)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    resolvers[0](new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    }))

    await Promise.all([first, second])
    await loadSharedImageBlob(url)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(sharedImageRequestStats(url).cacheEntries).toBe(1)
  })

  it('limits each source to four concurrent network requests', async () => {
    const resolvers: Array<(response: Response) => void> = []
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise<Response>((resolve) => {
        resolvers.push(resolve)
      }),
    )

    const urls = Array.from(
      { length: 6 },
      (_, index) => `https://wms.nibio.no/cgi-bin/grunnkart_arealanalyse?tile=${index}`,
    )
    const requests = urls.map((url) => loadSharedImageBlob(url))

    await Promise.resolve()
    expect(fetchSpy).toHaveBeenCalledTimes(4)
    expect(sharedImageRequestStats(urls[0])).toMatchObject({
      active: 4,
      queued: 2,
    })

    resolvers.splice(0, 4).forEach((resolve) => resolve(
      new Response(new Uint8Array([1]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    ))
    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(6)
    })
    resolvers.forEach((resolve) => resolve(
      new Response(new Uint8Array([1]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    ))
    await Promise.all(requests)
  })
})
