// Offline browser decoding check, without mounting or modifying the application.
import { chromium } from 'playwright'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const [reference, output] = process.argv.slice(2)
if (!reference || !output) throw new Error('Usage: node check-png-canvas.mjs REFERENCE OUTPUT')
await mkdir(output, { recursive: true })
const inputs = JSON.parse(await readFile(path.join(reference, 'inputs.json'), 'utf8'))
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true })
try {
  const page = await browser.newPage()
  for (const tile of inputs.tiles) {
    const encoded = (await readFile(path.join(reference, tile.name))).toString('base64')
    const rgba = await page.evaluate(async base64 => {
      const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob()
      const bitmap = await createImageBitmap(blob)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      context.drawImage(bitmap, 0, 0)
      bitmap.close()
      const bytes = context.getImageData(0, 0, canvas.width, canvas.height).data
      let binary = ''
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
      return btoa(binary)
    }, encoded)
    await writeFile(path.join(output, tile.name.replace('.png', '.rgba')), Buffer.from(rgba, 'base64'))
  }
  await writeFile(path.join(output, 'browser.json'), JSON.stringify({ chromium: browser.version(), pipeline: 'createImageBitmap → same-size Canvas drawImage → getImageData', scaled: false }, null, 2))
} finally {
  await browser.close()
}
