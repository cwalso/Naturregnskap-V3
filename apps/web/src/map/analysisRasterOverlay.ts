export interface AnalysisRasterOverlay {
  readonly width: number
  readonly height: number
  readonly extent: readonly [number, number, number, number]
  readonly mask: Uint8Array
  readonly fillColor: string
  readonly strokeColor?: string
}

export async function createAnalysisRasterBlob(
  overlay: AnalysisRasterOverlay,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = overlay.width
  canvas.height = overlay.height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Nettleseren kunne ikke opprette analyseoverlay')

  const image = context.createImageData(overlay.width, overlay.height)
  const pixels = image.data
  const fill = hexToRgb(overlay.fillColor)
  const stroke = hexToRgb(overlay.strokeColor ?? overlay.fillColor)

  for (let index = 0; index < overlay.mask.length; index += 1) {
    if (!overlay.mask[index]) continue

    const rgba = index * 4
    const edge = isEdge(index, overlay.mask, overlay.width, overlay.height)
    const color = edge ? stroke : fill

    pixels[rgba] = color[0]
    pixels[rgba + 1] = color[1]
    pixels[rgba + 2] = color[2]
    pixels[rgba + 3] = edge ? 235 : 92
  }

  context.putImageData(image, 0, 0)

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
