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
let browser, rejectNextNature = false, rejectNextProtected = false, emptyReindeer = false, releaseFailure, failureStarted
const errors = []
try {
  await server.listen()
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true })
  const page = await browser.newPage({ viewport: { width: 1000, height: 750 }, deviceScaleFactor: Number(process.env.BROWSER_DPR ?? 1) })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('https://**/*', async (route) => {
    const url = new URL(route.request().url())
    const nature = url.pathname.includes('naturtyper_kuverdi')
    if ((nature && rejectNextNature) || (url.pathname.includes('/vern/') && rejectNextProtected)) {
      rejectNextNature = false; rejectNextProtected = false; failureStarted?.()
      await new Promise((resolve) => { releaseFailure = resolve })
      await route.fulfill({ status: 503, body: 'Controlled late failure' }); return
    }
    const params = Object.fromEntries([...url.searchParams].map(([k, v]) => [k.toLowerCase(), v]))
    const bytes = await page.evaluate(({ bbox, width, height, kind, empty }) => {
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
      else if (kind === 'grey') rect('#555555', 267000, 7032000, 269000, 7034000)
      else if (kind === 'protected') rect('#D440C4', 267000, 7032000, 269000, 7034000)
      else if (kind === 'inon') rect('#7EAF40', 270000, 7032000, 273000, 7034000)
      else if (kind === 'reindeer') { if (!empty) rect('#008ED5', 270000, 7032000, 271000, 7034000) }
      else if (kind === 'nature') {
        rect('#AF0C0C', 267000, 7032000, 269000, 7034000)
        rect('#AF0C0C', 264000, 7032000, 265500, 7034000)
      } else { ctx.fillStyle = '#dddddd'; ctx.fillRect(0, 0, width, height) }
      return canvas.toDataURL().split(',')[1]
    }, { bbox: params.bbox?.split(',').map(Number), width: Number(params.width ?? 256), height: Number(params.height ?? 256),
      empty: emptyReindeer, kind: !params.bbox ? 'base' : url.pathname.includes('graastruktur') ? 'grey' : url.pathname.includes('/vern/') ? 'protected' : url.pathname.includes('inngrepsfrinatur') ? 'inon' : url.pathname.includes('/villrein/') ? 'reindeer' : nature ? 'nature' : url.hostname === 'wms.nibio.no' ? 'account' : url.hostname === 'nap.ft.dibk.no' ? 'plan' : 'base' })
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
      return [...ctx.getImageData(Math.round((point[0] + box.x) * devicePixelRatio), Math.round((point[1] + box.y) * devicePixelRatio), 1, 1).data]
    }, { png, coordinate })
  }
  async function hatchPatch(coordinate) {
    const png = (await page.screenshot()).toString('base64')
    return page.evaluate(async ({ png, coordinate }) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob())
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height
      const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close()
      const point = globalThis.__layersMap.getPixelFromCoordinate(coordinate), box = document.querySelector('#map').getBoundingClientRect()
      const data = ctx.getImageData(Math.round((point[0] + box.x) * devicePixelRatio), Math.round((point[1] + box.y) * devicePixelRatio), 16 * devicePixelRatio, 16 * devicePixelRatio).data
      return Array.from({ length: data.length / 4 }, (_, i) => [...data.slice(i * 4, i * 4 + 4)])
    }, { png, coordinate })
  }
  const contains = (patch, color) => assert.ok(patch.some((pixel) => color.every((v, i) => Math.abs(v - pixel[i]) <= 2)), `Missing composed color ${color}`)
  const close = (actual, expected) => assert.ok(expected.every((v, i) => Math.abs(actual[i] - v) <= 2), `${actual} != ${expected}`)
  await paint(); const before = await state()
  await set('level0', true, 1); close(await pixel([273000, 7033000]), [232, 100, 116, 255])
  await set('level0', false); await set('future-development', true)
  contains(await hatchPatch([270000, 7033000]), [40, 100, 59, 255])
  contains(await hatchPatch([270000, 7033000]), [206, 217, 196, 255]) // Transparent green tint over grey base.
  contains(await hatchPatch([271000, 7033000]), [150, 112, 0, 255])
  contains(await hatchPatch([271000, 7033000]), [229, 218, 194, 255]) // Transparent yellow tint.
  await page.screenshot({ path: `${output}/plan-hatch-alone.png` })
  // Repeated rendering must not compound alpha or erase any stripes.
  const first = await hatchPatch([270000, 7033000]); await paint()
  assert.deepEqual(await hatchPatch([270000, 7033000]), first)
  // Opacity is applied to the complete hatch/tint layer, exposing the base.
  await set('future-development', true, 0.5)
  contains(await hatchPatch([270000, 7033000]), [131, 161, 140, 255])
  await set('future-development', true, 1)
  close(await pixel([273000, 7033000]), [221, 221, 221, 255]) // Built is excluded even inside plan.
  await set('level0', true, 0.7)
  const belowNature = await pixel([268000, 7033000])
  await set('valued-nature', true)
  assert.deepEqual(await page.evaluate(() => window.layersRenderFixture.statuses), { level0: 'ready', 'future-development': 'ready', 'valued-nature': 'ready', 'protected-areas': 'idle', 'intact-nature': 'idle', 'wild-reindeer': 'idle', 'grey-areas': 'idle' })
  close(await pixel([268000, 7033000]), [175, 12, 12, 255]) // Nature above opaque plan/Grunnkart.
  contains(await hatchPatch([270000, 7033000]), [40, 100, 59, 255])
  close(await pixel([265000, 7033000]), [247, 249, 248, 255])
  close(await pixel([268500, 7030500]), [247, 249, 248, 255]) // Municipality hole.
  await page.screenshot({ path: `${output}/all-layers.png` })
  await set('valued-nature', true, 0.5); close(await pixel([268000, 7033000]), [...belowNature.slice(0, 3).map((value, i) => Math.round((value + [175, 12, 12][i]) / 2)), 255])
  await page.screenshot({ path: `${output}/opacity-composite.png` })
  await page.evaluate(() => window.layersRenderFixture.set({ filter: { natureType: 'Testtype', value: null } })); await paint()
  close(await pixel([268000, 7033000]), [...belowNature.slice(0, 3).map((value, i) => Math.round((value + [175, 12, 12][i]) / 2)), 255])
  contains(await hatchPatch([270000, 7033000]), [40, 100, 59, 255])
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
  close(await pixel([268000, 7033000]), belowNature)
  await set('level0', false); await set('future-development', false)
  close(await pixel([268000, 7033000]), [221, 221, 221, 255])
  assert.deepEqual(await state(), before)
  await set('grey-areas', true, 1); close(await pixel([268000, 7033000]), [85, 85, 85, 255])
  await set('grey-areas', true, 0.5); close(await pixel([268000, 7033000]), [153, 153, 153, 255])
  await page.evaluate(() => window.layersRenderFixture.set({ greyPresentation: 'andel_med_vegetasjon' })); await paint()
  assert.equal(await page.evaluate(() => globalThis.__layersMap.getLayers().getArray().find((l) => l.get('mapLayerId') === 'grey-areas').getSource().getParams().LAYERS), 'andel_med_vegetasjon')
  assert.deepEqual(await state(), before)
  await page.evaluate(() => { globalThis.__layersMap.getView().setResolution(100) }); await paint()
  assert.equal(await page.evaluate(() => window.layersRenderFixture.statuses['grey-areas']), 'out-of-scale')
  await page.evaluate((before) => { globalThis.__layersMap.getView().setResolution(before.resolution) }, before); await paint()
  await set('grey-areas', false)
  // New official-service adapters: controlled pixels prove actual compositing and isolation.
  await set('wild-reindeer', true, 1); close(await pixel([270500, 7033000]), [0, 142, 213, 255])
  await set('wild-reindeer', true, 0.5); close(await pixel([270500, 7033000]), [111, 182, 217, 255])
  await set('wild-reindeer', true, 1); await set('intact-nature', true, 1)
  close(await pixel([270500, 7033000]), [0, 142, 213, 255]) // Villrein above broad INON fill.
  close(await pixel([272000, 7033000]), [126, 175, 64, 255])
  await set('protected-areas', true, 1); close(await pixel([268000, 7033000]), [212, 64, 196, 255])
  const ids = ['level0', 'future-development', 'valued-nature', 'protected-areas', 'intact-nature', 'wild-reindeer', 'grey-areas']
  for (let bits = 0; bits < 128; bits++) {
    const visibility = await page.evaluate(({ bits, ids }) => {
      ids.forEach((id, i) => window.layersRenderFixture.layer(id, !!(bits & (1 << i))))
      return globalThis.__layersMap.getLayers().getArray().filter((l) => l.get('mapLayerId')).map((l) => ({ id: l.get('mapLayerId'), visible: l.getVisible() }))
    }, { bits, ids })
    visibility.forEach((l) => assert.equal(l.visible, !!(bits & (1 << ids.indexOf(l.id)))))
  }
  await paint(); close(await pixel([268000, 7033000]), [212, 64, 196, 255]) // Vern above existing nature polygons.
  emptyReindeer = true
  await page.evaluate(() => globalThis.__layersMap.getLayers().getArray().find((l) => l.get('mapLayerId') === 'wild-reindeer').getSource().updateParams({ VALIDATION_EMPTY: 'yes' }))
  await paint(); await page.waitForFunction(() => window.layersRenderFixture.statuses['wild-reindeer'] === 'empty')
  const protectedStarted = new Promise((resolve) => { failureStarted = resolve }); rejectNextProtected = true
  await page.evaluate(() => globalThis.__layersMap.getLayers().getArray().find((l) => l.get('mapLayerId') === 'protected-areas').getSource().updateParams({ VALIDATION_LATE_ERROR: 'yes' }))
  await protectedStarted; await set('protected-areas', false); releaseFailure(); await page.waitForTimeout(150)
  assert.equal(await page.evaluate(() => window.layersRenderFixture.statuses['protected-areas']), 'idle')
  assert.deepEqual(await state(), before)
  await page.evaluate(() => window.layersRenderFixture.destroy())
  assert.equal(await page.locator('#map .ol-viewport').count(), 0)
  // Check the real React picker with its production CSS, not a copy of its markup.
  await page.evaluate(() => window.layersRenderFixture.mountWorkspace())
  await page.getByRole('checkbox', { name: 'Framtidig utbygging', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Grå arealer', exact: true }).check()
  for (const width of [1440, 1000, 900, 390]) {
    await page.setViewportSize({ width, height: 750 })
    const dimensions = await page.evaluate(() => {
      const list = document.querySelector('.explore-themes__layer-list'), rect = list.getBoundingClientRect()
      return { client: list.clientWidth, scroll: list.scrollWidth, width: innerWidth, page: document.documentElement.scrollWidth,
        rangesInside: [...list.querySelectorAll('input[type=range]')].every((e) => e.getBoundingClientRect().right <= rect.right && getComputedStyle(e).margin === '0px') }
    })
    assert.equal(dimensions.client, dimensions.scroll, JSON.stringify(dimensions))
    assert.ok(dimensions.rangesInside && dimensions.page <= dimensions.width, JSON.stringify(dimensions))
  }
  await page.evaluate(() => window.layersRenderFixture.unmountWorkspace())
  assert.deepEqual(errors, [])
  console.log('Layer render regression passed: real composed pixels, screen-space hatch/tint, repeat-render and device ratio, new layer composition, 128 combinations, empty WMS and late inactive error, real picker width/slider bounds, independent visibility/opacity, fixed order, filters, masking, selection, late inactive error and cleanup.')
} finally { await browser?.close(); await server.close() }
