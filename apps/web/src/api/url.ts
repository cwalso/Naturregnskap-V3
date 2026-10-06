export function buildApiUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error('API-stien må starte med /')
  }
  return path
}
