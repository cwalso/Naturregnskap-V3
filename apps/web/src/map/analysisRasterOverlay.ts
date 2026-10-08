export interface AnalysisRasterOverlay {
  readonly width: number
  readonly height: number
  readonly extent: readonly [number, number, number, number]
  readonly mask: Uint8Array
  readonly fillColor: string
  readonly strokeColor?: string
  readonly palette?: Readonly<Record<number, string>>
  readonly outlineOnly?: boolean
  readonly strong?: boolean
  readonly area?: boolean
  readonly calm?: boolean
}

export interface AnalysisRasterWindow {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export function createAnalysisRasterCanvas(
  overlay: AnalysisRasterOverlay,
  window: AnalysisRasterWindow = { x: 0, y: 0, width: overlay.width, height: overlay.height },
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = window.width
  canvas.height = window.height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Nettleseren kunne ikke opprette analyseoverlay')

  const image = context.createImageData(window.width, window.height)
  const pixels = image.data
  const fill = hexToRgb(overlay.fillColor)
  const stroke = hexToRgb(overlay.strokeColor ?? overlay.fillColor)
  const palette = Object.fromEntries(Object.entries(overlay.palette ?? {}).map(([value, color]) => [value, hexToRgb(color)]))

  for (let y = 0; y < window.height; y += 1) {
    const row = window.y + y
    if (row < 0 || row >= overlay.height) continue
    for (let x = 0; x < window.width; x += 1) {
      const column = window.x + x
      if (column < 0 || column >= overlay.width) continue
      const index = row * overlay.width + column
      const rgba = (y * window.width + x) * 4
      const value = overlay.mask[index]
      if (value) {
        // Neighbours come from the full mask, so tile borders do not become edges.
        const edge = isEdge(index, overlay.mask, overlay.width, overlay.height)
        if (overlay.outlineOnly && !edge) continue
        const color = palette[value] ?? (edge ? stroke : fill)
        pixels[rgba] = color[0]
        pixels[rgba + 1] = color[1]
        pixels[rgba + 2] = color[2]
        pixels[rgba + 3] = overlay.outlineOnly ? 230 : overlay.area ? (edge ? 230 : 60) : overlay.calm ? (edge ? 225 : 170) : overlay.strong ? (edge ? 255 : 210) : edge ? 235 : 92
      } else if (overlay.strong && (
        (column > 0 && overlay.mask[index - 1]) || (column < overlay.width - 1 && overlay.mask[index + 1])
        || (row > 0 && overlay.mask[index - overlay.width]) || (row < overlay.height - 1 && overlay.mask[index + overlay.width])
      )) {
        pixels.set([255, 255, 255, 240], rgba)
      }
    }
  }

  context.putImageData(image, 0, 0)

  return canvas
}

export async function createAnalysisRasterBlob(
  overlay: AnalysisRasterOverlay,
  window?: AnalysisRasterWindow,
): Promise<Blob> {
  const canvas = createAnalysisRasterCanvas(overlay, window)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Nettleseren kunne ikke lage analyseoverlay'))
    }, 'image/png')
  })
}

export function maskExtent(
  overlay: Pick<AnalysisRasterOverlay, 'width' | 'height' | 'extent' | 'mask'>,
): readonly [number, number, number, number] | null {
  const [minX, minY, maxX, maxY] = overlay.extent
  const pixelWidth = (maxX - minX) / overlay.width
  const pixelHeight = (maxY - minY) / overlay.height

  let minColumn = overlay.width
  let maxColumn = -1
  let minRow = overlay.height
  let maxRow = -1

  for (let index = 0; index < overlay.mask.length; index += 1) {
    if (!overlay.mask[index]) continue
    const column = index % overlay.width
    const row = Math.floor(index / overlay.width)
    minColumn = Math.min(minColumn, column)
    maxColumn = Math.max(maxColumn, column)
    minRow = Math.min(minRow, row)
    maxRow = Math.max(maxRow, row)
  }

  if (maxColumn < minColumn || maxRow < minRow) return null

  return [
    minX + minColumn * pixelWidth,
    maxY - (maxRow + 1) * pixelHeight,
    minX + (maxColumn + 1) * pixelWidth,
    maxY - minRow * pixelHeight,
  ]
}

function isEdge(
  index: number,
  mask: Uint8Array,
  width: number,
  height: number,
): boolean {
  const column = index % width
  const row = Math.floor(index / width)

  if (column === 0 || row === 0 || column === width - 1 || row === height - 1) {
    return true
  }

  return !mask[index - 1]
    || !mask[index + 1]
    || !mask[index - width]
    || !mask[index + width]
}

function hexToRgb(hex: string): readonly [number, number, number] {
  const normalized = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return [0, 91, 66]

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ]
}
