import type RenderEvent from 'ol/render/Event'

// Screen-space presentation only. The source's class/coverage pixels stay unchanged.
const spacing = 8
const lineWidth = 2
const tintOpacity = 0.24
const symbols = [
  { label: 'Natur', color: '#28643B', rgb: [40, 100, 59], background: '#9ECC73', tint: [158, 204, 115], direction: 1 },
  { label: 'Jordbruk', color: '#967000', rgb: [150, 112, 0], background: '#FFD16E', tint: [255, 209, 110], direction: -1 },
] as const

export const futureDevelopmentLegend = symbols.map((symbol) => ({
  label: symbol.label,
  color: symbol.color,
  background: `repeating-linear-gradient(${symbol.direction === 1 ? 135 : 45}deg, ${symbol.color} 0 ${lineWidth / Math.SQRT2}px, transparent ${lineWidth / Math.SQRT2}px ${spacing / Math.SQRT2}px), ${symbol.background}3D`,
}))

export function hatchFutureDevelopment(event: RenderEvent) {
  if (!(event.context instanceof CanvasRenderingContext2D) || !event.frameState) return
  const context = event.context, { width, height } = context.canvas
  const image = context.getImageData(0, 0, width, height), data = image.data
  const ratio = event.frameState.pixelRatio
  for (let y = 0, i = 0; y < height; y++) {
    const sy = Math.floor(y / ratio)
    for (let x = 0; x < width; x++, i += 4) {
      if (!data[i + 3]) continue
      // The isolated plan canvas contains only the existing green/yellow class mask.
      const symbol = symbols[data[i + 1] > data[i] ? 0 : 1]
      const phase = ((Math.floor(x / ratio) + symbol.direction * sy) % spacing + spacing) % spacing
      const stripe = phase < lineWidth
      const color = stripe ? symbol.rgb : symbol.tint
      data[i] = color[0]; data[i + 1] = color[1]; data[i + 2] = color[2]
      if (!stripe) data[i + 3] = Math.round(data[i + 3] * tintOpacity)
    }
  }
  // putImageData keeps original pixel locations; CSS layer opacity still controls both ink and tint.
  context.putImageData(image, 0, 0)
}
