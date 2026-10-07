export interface SharedImageRequestStats {
  readonly cacheEntries: number
  readonly inFlight: number
  readonly queued: number
  readonly active: number
}

interface CachedImage {
  readonly bytes: ArrayBuffer
  readonly contentType: string
}

interface WaitingRequest {
  readonly run: () => void
}

const MAX_CONCURRENT_PER_SOURCE = 4
const MAX_CACHE_ENTRIES_PER_SOURCE = 400

class ImageRequestPool {
  private readonly cache = new Map<string, CachedImage>()
  private readonly inFlight = new Map<string, Promise<CachedImage>>()
  private readonly queue: WaitingRequest[] = []
  private active = 0

  load(url: string): Promise<CachedImage> {
    const cached = this.cache.get(url)
    if (cached) {
      this.cache.delete(url)
      this.cache.set(url, cached)
      return Promise.resolve(cached)
    }

    const running = this.inFlight.get(url)
    if (running) return running

    const request = new Promise<CachedImage>((resolve, reject) => {
      this.queue.push({
        run: () => {
          this.active += 1
          void this.fetchImage(url)
            .then(resolve, reject)
            .finally(() => {
              this.active -= 1
              this.inFlight.delete(url)
              this.drain()
            })
        },
      })
      this.drain()
    })

    this.inFlight.set(url, request)
    return request
  }

  clear() {
    this.cache.clear()
  }

  stats(): SharedImageRequestStats {
    return {
      cacheEntries: this.cache.size,
      inFlight: this.inFlight.size,
      queued: this.queue.length,
      active: this.active,
    }
  }

  private drain() {
    while (this.active < MAX_CONCURRENT_PER_SOURCE && this.queue.length > 0) {
      this.queue.shift()?.run()
    }
  }

  private async fetchImage(url: string): Promise<CachedImage> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Karttjenesten feilet med HTTP ${response.status}`)
    }

    const contentType = response.headers.get('content-type') ?? 'image/png'
    if (contentType && !contentType.startsWith('image/')) {
      throw new Error('Karttjenesten returnerte ikke et bilde')
    }

    const item: CachedImage = {
      bytes: await response.arrayBuffer(),
      contentType,
    }
    this.cache.set(url, item)

    while (this.cache.size > MAX_CACHE_ENTRIES_PER_SOURCE) {
      const oldest = this.cache.keys().next().value
      if (!oldest) break
      this.cache.delete(oldest)
    }

    return item
  }
}

const pools = new Map<string, ImageRequestPool>()

function sourceKey(url: string): string {
  try {
    const parsed = new URL(url, window.location.href)
    if (parsed.hostname === 'wms.nibio.no') return 'nibio'
    if (parsed.hostname.endsWith('dibk.no')) return 'dibk'
    return parsed.origin
  } catch {
    return 'local'
  }
}

function poolFor(url: string): ImageRequestPool {
  const key = sourceKey(url)
  let pool = pools.get(key)
  if (!pool) {
    pool = new ImageRequestPool()
    pools.set(key, pool)
  }
  return pool
}

export async function loadSharedImageBlob(
  url: string,
  signal?: AbortSignal,
): Promise<Blob> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const item = await poolFor(url).load(url)

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  return new Blob([item.bytes], { type: item.contentType })
}

export function clearSharedImageRequestCache() {
  for (const pool of pools.values()) pool.clear()
}

export function sharedImageRequestStats(url: string): SharedImageRequestStats {
  return poolFor(url).stats()
}
