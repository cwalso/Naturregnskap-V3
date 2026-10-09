import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createServer } from 'vite'

// Synthetic WMS inputs check compositing/order/opacity in the real map engine.
// Visual acceptance uses the separate live Trondheim run.
const output = process.env.BROWSER_OUTPUT ?? '.browser-results/layers-render'
await mkdir(output, { recursive: true })
const server = await createServer({ server: { host: '127.0.0.1', port: 5186, strictPort: true }, plugins: [{ name: 'expose-layers-map', transform(code, id) {
  if (id.endsWith('/src/map/exploreThemeMap.ts')) return code.replace('  let destroyed = false', '  globalThis.__layersMap = map\n  let destroyed = false')
} }] })
let browser, rejectNextNature = false, releaseFailure, failureStarted
const errors = []
try {
  await server.listen()
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true })
  const page = await browser.newPage({ viewport: { width: 1000, height: 750 } })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('https://**/*', async (route) => {
    const url = new URL(route.request().url())
    const nature = url.pathname.includes('naturtyper_kuverdi')
    if (nature && rejectNextNature) {
      rejectNextNature = false; failureStarted?.()
      await new Promise((resolve) => { releaseFailure = resolve })
      await route.fulfill({ status: 503, body: 'Controlled late failure' }); return
    }
    const params = Object.fromEntries([...url.searchParams].map(([k, v]) => [k.toLowerCase(), v]))
    const bytes = await page.evaluate(({ bbox, width, height, kind }) => {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
      const ctx = canvas.getContext('2d')
      function rect(color, minX, minY, maxX, maxY) {
        const [x1, y1, x2, y2] = bbox; ctx.fillStyle = color
        ctx.fillRect((minX - x1) / (x2 - x1) * width, (y2 - maxY) / (y2 - y1) * height, (maxX - minX) / (x2 - x1) * width, (maxY - minY) / (y2 - y1) * height)
      }
      if (kind === 'account') {
        rect('#0000FF', 250000, 7000000, 270500, 7070000)
        rect('#00FF00', 270500, 7000000, 272000, 7070000)
        rect('#FF0000', 272000, 7000000, 290000, 7070000)
      } else if (kind === 'plan') rect('#000000', 267000, 7032000, 274000, 7034000)
      else if (kind === 'nature') {
        rect('#AF0C0C', 267000, 7032000, 269000, 7034000)
        rect('#AF0C0C', 264000, 7032000, 265500, 7034000)
      } else { ctx.fillStyle = '#dddddd'; ctx.fillRect(0, 0, width, height) }
      return canvas.toDataURL().split(',')[1]
    }, { bbox: params.bbox?.split(',').map(Number), width: Number(params.width ?? 256), height: Number(params.height ?? 256),
      kind: nature ? 'nature' : url.hostname === 'wms.nibio.no' ? 'account' : url.hostname === 'nap.ft.dibk.no' ? 'plan' : 'base' })
    await route.fulfill({ contentType: 'image/png', body: Buffer.from(bytes, 'base64') })
  })
  await page.goto('http://127.0.0.1:5186/tests/browser/layers-fixture.html')
  await page.waitForFunction(() => window.layersRenderFixture)
  const state = () => page.evaluate(() => ({ center: globalThis.__layersMap.getView().getCenter(), resolution: globalThis.__layersMap.getView().getResolution() }))
  async function paint() {
    await page.evaluate(() => new Promise((resolve, reject) => {
      const map = globalThis.__layersMap, timer = setTimeout(() => reject(new Error('Render timeout')), 20000)
      map.once('rendercomplete', () => { clearTimeout(timer); resolve() }); map.render()
    }))
  }
  async function set(id, visible, opacity) { await page.evaluate(({ id, visible, opacity }) => window.layersRenderFixture.layer(id, visible, opacity), { id, visible, opacity }); await paint() }
  async function pixel(coordinate) {
    const png = (await page.screenshot()).toString('base64')
    return page.evaluate(async ({ png, coordinate }) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob())
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height
      const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close()
      const point = globalThis.__layersMap.getPixelFromCoordinate(coordinate), box = document.querySelector('#map').getBoundingClientRect()
      return [...ctx.getImageData(Math.round(point[0] + box.x), Math.round(point[1] + box.y), 1, 1).data]
    }, { png, coordinate })
  }
  const close = (actual, expected) => assert.ok(expected.every((v, i) => Math.abs(actual[i] - v) <= 2), `${actual} != ${expected}`)
  await paint(); const before = await state()
  await set('level0', true, 1); close(await pixel([273000, 7033000]), [232, 100, 116, 255])
  await set('level0', false); await set('future-development', true)
  close(await pixel([270000, 7033000]), [158, 204, 115, 255])
  close(await pixel([271000, 7033000]), [255, 209, 110, 255])
  close(await pixel([273000, 7033000]), [221, 221, 221, 255]) // Built is excluded even inside plan.
  await set('level0', true, 0.7); await set('valued-nature', true)
  assert.deepEqual(await page.evaluate(() => window.layersRenderFixture.statuses), { level0: 'ready', 'future-development': 'ready', 'valued-nature': 'ready' })
  close(await pixel([268000, 7033000]), [175, 12, 12, 255]) // Nature above opaque plan/Grunnkart.
  close(await pixel([270000, 7033000]), [158, 204, 115, 255])
  close(await pixel([265000, 7033000]), [247, 249, 248, 255])
  close(await pixel([268500, 7030500]), [247, 249, 248, 255]) // Municipality hole.
  await page.screenshot({ path: `${output}/all-layers.png` })
  await set('valued-nature', true, 0.5); close(await pixel([268000, 7033000]), [167, 108, 64, 255])
  await page.screenshot({ path: `${output}/opacity-composite.png` })
  await page.evaluate(() => window.layersRenderFixture.set({ filter: { natureType: 'Testtype', value: null } })); await paint()
  close(await pixel([268000, 7033000]), [167, 108, 64, 255])
  close(await pixel([270000, 7033000]), [158, 204, 115, 255])
  await set('valued-nature', true, 1)
  const point = await page.evaluate(() => globalThis.__layersMap.getPixelFromCoordinate([268000, 7033000]))
  const box = await page.locator('#map').boundingBox(); await page.mouse.click(box.x + point[0], box.y + point[1])
  await page.waitForFunction(() => window.layersRenderFixture.selections.at(-1) === 'inside')
  assert.deepEqual(await state(), before)
  // Late WMS failure after disabling the layer cannot become an active error.
  await page.evaluate(() => window.layersRenderFixture.set({ filter: { natureType: null, value: null } })); await paint()
  const started = new Promise((resolve) => { failureStarted = resolve }); rejectNextNature = true
  await page.evaluate(() => globalThis.__layersMap.getLayers().getArray().find((l) => l.getClassName() === 'explore-registered-nature').getSource().refresh())
  await started; await set('valued-nature', false); releaseFailure(); await page.waitForTimeout(150)
  assert.equal(await page.evaluate(() => window.layersRenderFixture.statuses['valued-nature']), 'idle')
  close(await pixel([268000, 7033000]), [158, 204, 115, 255])
  await set('level0', false); await set('future-development', false)
  close(await pixel([268000, 7033000]), [221, 221, 221, 255])
  assert.deepEqual(await state(), before)
  await page.evaluate(() => window.layersRenderFixture.destroy())
  assert.equal(await page.locator('#map .ol-viewport').count(), 0)
  assert.deepEqual(errors, [])
  console.log('Layer render regression passed: real composed pixels, independent visibility/opacity, fixed order, filters, masking, selection, late inactive error and cleanup.')
} finally { await browser?.close(); await server.close() }
