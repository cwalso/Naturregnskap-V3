function normalizeApiOrigin(origin: string | undefined): string {
  const value = origin?.trim()
  if (!value) return ''
  return value.replace(/\/+$/, '')
}

export function buildApiUrl(
  path: string,
  origin: string | undefined = import.meta.env.VITE_API_ORIGIN,
): string {
  if (!path.startsWith('/')) {
    throw new Error('API-stien må starte med /')
  }
  return `${normalizeApiOrigin(origin)}${path}`
}
