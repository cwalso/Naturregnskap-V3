import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createServer } from 'vite'

// Controlled inputs exercise real OpenLayers rendering. These images are not
// evidence that the live plan service or the visual acceptance gate works.
const output = process.env.BROWSER_OUTPUT ?? '.browser-results/render'
await mkdir(output, { recursive: true })
const server = await createServer({
  server: { host: '127.0.0.1', port: 5182, strictPort: true },
  plugins: [{ name: 'expose-test-map', transform(code, id) {
    if (id.endsWith('/src/map/exploreAnalysisMap.ts')) return code.replace('  let destroyed = false', '  globalThis.__exploreMap = map\n  let destroyed = false')
  } }],
})
let browser
const errors = []
try {
  await server.listen()
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true })
  const page = await browser.newPage({ viewport: { width: 1000, height: 750 } })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('https://**/*', async (route) => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('naturtyper_kuverdi')) return route.abort()
    const params = Object.fromEntries([...url.searchParams].map(([key, value]) => [key.toLowerCase(), value]))
    const png = await page.evaluate(({ bbox, width, height }) => {
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      const context = canvas.getContext('2d')
      context.fillStyle = '#ff8700'
      const [minX, minY, maxX, maxY] = bbox
      // One locality within the municipality and one outside it.
      for (const [x1, y1, x2, y2] of [[267000, 7032000, 269000, 7034000], [264000, 7032000, 265500, 7034000]]) {
        context.fillRect((x1 - minX) / (maxX - minX) * width, (maxY - y2) / (maxY - minY) * height, (x2 - x1) / (maxX - minX) * width, (y2 - y1) / (maxY - minY) * height)
      }
      return canvas.toDataURL().split(',')[1]
    }, { bbox: params.bbox.split(',').map(Number), width: Number(params.width), height: Number(params.height) })
    await route.fulfill({ contentType: 'image/png', body: Buffer.from(png, 'base64') })
  })
  await page.goto('http://127.0.0.1:5182/tests/browser/render-fixture.html')
  await page.waitForFunction(() => window.exploreRenderFixture?.statuses.at(-1) === 'ready')
  const state = () => page.evaluate(() => ({ center: globalThis.__exploreMap.getView().getCenter(), resolution: globalThis.__exploreMap.getView().getResolution() }))
  async function pixelAt(coordinate) {
    await page.waitForTimeout(150)
    const png = (await page.screenshot()).toString('base64')
    return page.evaluate(async ({ png, coordinate }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${png}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width; canvas.height = image.height
      const context = canvas.getContext('2d')
      context.drawImage(image, 0, 0)
      const pixel = globalThis.__exploreMap.getPixelFromCoordinate(coordinate)
      const box = document.querySelector('#map').getBoundingClientRect()
      return [...context.getImageData(Math.round(pixel[0] + box.x), Math.round(pixel[1] + box.y), 1, 1).data]
    }, { png, coordinate })
  }
  const orange = ([r, g, b]) => r > 220 && g > 80 && g < 170 && b < 40
  const blue = ([r, g, b]) => b > r * 1.5 && b > g * 1.3
  assert.ok(orange(await pixelAt([268000, 7033000])), 'WMS locality must be visible in the composited screenshot')
  assert.ok(!orange(await pixelAt([265000, 7033000])), 'Locality outside municipality must be masked')
  await page.screenshot({ path: `${output}/A-valued-fixture.png` })
  const before = await state()
  await page.evaluate(() => window.exploreRenderFixture.set({ showValuedNature: false, plan: window.exploreRenderFixture.plan }))
  await page.waitForFunction(() => !!document.querySelector('.explore-plan-area canvas'))
  assert.ok(blue(await pixelAt([270500, 7033500])), 'Whole valid plan mask must render even without Nature/Agri pixels')
  assert.ok(!orange(await pixelAt([268000, 7033000])), 'Theme switch must remove the old WMS pixels')
  assert.deepEqual(await state(), before, 'Context updates must not refit')
  await page.screenshot({ path: `${output}/B-plan-fixture.png` })
  await page.evaluate(() => window.exploreRenderFixture.set({ plan: { ...window.exploreRenderFixture.plan, analysisId: 'planned:other' } }))
  assert.ok(!blue(await pixelAt([270500, 7033500])), 'Stale analysis identity must remove plan pixels')
  await page.evaluate(() => window.exploreRenderFixture.set({ plan: { ...window.exploreRenderFixture.plan, municipalityNumber: '0301' } }))
  assert.ok(!blue(await pixelAt([270500, 7033500])), 'Other municipality must remove plan pixels')
  await page.evaluate(() => window.exploreRenderFixture.set({ plan: window.exploreRenderFixture.plan }))
  assert.ok(blue(await pixelAt([270500, 7033500])))
  const map = page.locator('#map')
  await map.focus()
  await page.mouse.move(450, 320)
  await page.mouse.wheel(0, -120)
  await page.waitForFunction((r) => globalThis.__exploreMap.getView().getResolution() < r && !globalThis.__exploreMap.getView().getAnimating(), before.resolution)
  await page.mouse.down()
  await page.mouse.move(480, 335, { steps: 10 })
  await page.mouse.up()
  await page.waitForFunction(() => !globalThis.__exploreMap.getView().getAnimating() && !globalThis.__exploreMap.getView().getInteracting())
  const manual = await state()
  assert.notDeepEqual(manual, before)
  assert.ok(blue(await pixelAt([270500, 7033500])), 'Plan pixels survive manual zoom/pan')
  await page.mouse.wheel(0, 120)
  await page.waitForFunction((r) => globalThis.__exploreMap.getView().getResolution() > r && !globalThis.__exploreMap.getView().getAnimating(), manual.resolution)
  assert.ok(blue(await pixelAt([270500, 7033500])), 'Plan pixels survive zoom out')
  const afterZoomOut = await state()
  await page.evaluate(() => window.exploreRenderFixture.set({ showValuedNature: true, plan: null }))
  await page.waitForFunction(() => window.exploreRenderFixture.statuses.at(-1) === 'ready')
  assert.ok(orange(await pixelAt([268000, 7033000])), 'Restored theme must actually render after navigation')
  assert.ok(!blue(await pixelAt([270500, 7033500])))
  assert.deepEqual(await state(), afterZoomOut, 'Theme change preserves user view')
  await page.evaluate(() => window.exploreRenderFixture.set({ boundary: { ...window.exploreRenderFixture.boundary } }))
  assert.deepEqual(await state(), afterZoomOut, 'Refreshing same municipality does not refit')
  await page.evaluate(() => {
    window.exploreRenderFixture.set({ showValuedNature: false })
    window.exploreRenderFixture.set({ showValuedNature: true })
  })
  await page.waitForFunction(() => window.exploreRenderFixture.statuses.at(-1) === 'ready')
  assert.ok(orange(await pixelAt([268000, 7033000])), 'Cached WMS image is restored with ready status')
  await page.evaluate(() => { window.exploreRenderFixture.destroy(); window.exploreRenderFixture.destroy() })
  await page.waitForTimeout(150)
  assert.equal(await page.locator('#map canvas').count(), 0, 'Destroy releases rendered map')
  assert.deepEqual(errors, [])
  console.log('Render regression passed: actual WMS pixels, municipality mask, whole plan mask, identity isolation, theme round trip, manual view and cleanup. Overlap is not implemented or tested.')
} finally { await browser?.close(); await server.close() }
