import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'

const output = process.env.BROWSER_OUTPUT ?? '.browser-results/themes'
await mkdir(output, { recursive: true })
const server = await createServer({ server: { host: '127.0.0.1', port: 5184, strictPort: true }, plugins: [{
  name: 'expose-theme-map-for-review', transform(code, id) {
    if (!id.endsWith('/src/map/exploreThemeMap.ts')) return
    return code.replace('  let destroyed = false', '  globalThis.__themeMap = map\n  let destroyed = false')
      .replace('    update(next) {', '    update(next) {\n      globalThis.__themeContext = next')
  },
}] })
const results = { gates: {}, requests: [], errors: [] }
let browser, network, page
const viewState = () => page.evaluate(() => ({ center: globalThis.__themeMap.getView().getCenter(), resolution: globalThis.__themeMap.getView().getResolution() }))
async function painted() {
  await page.evaluate(() => new Promise((resolve, reject) => {
    const map = globalThis.__themeMap
    const timeout = setTimeout(() => { map.un('rendercomplete', done); reject(new Error('Kartet ble ikke ferdig rendret')) }, 45000)
    function done() { clearTimeout(timeout); resolve() }
    map.once('rendercomplete', done); map.render()
  }))
}
async function screenshot(name) {
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo({ top: 0, behavior: 'instant' }) })
  await page.waitForFunction(() => scrollY === 0)
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true })
}
async function pixels() {
  const bytes = await page.locator('.explore-themes__canvas').screenshot()
  return page.evaluate(async (bytes) => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }))
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height
    const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close()
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const colors = { nature: [158, 204, 115], agriculture: [255, 209, 110], built: [232, 100, 116], valued: [175, 12, 12], plan: [24, 111, 205] }
    const counts = Object.fromEntries(Object.keys(colors).map((key) => [key, 0]))
    for (let i = 0; i < data.length; i += 4) for (const [key, color] of Object.entries(colors)) {
      if (color.every((value, channel) => Math.abs(data[i + channel] - value) < 12)) counts[key]++
    }
    return counts
  }, Array.from(bytes))
}
function theme(name) { return page.getByRole('combobox', { name: 'Velg karttema' }).selectOption(name) }
async function gate(name, run) {
  try { results.gates[name] = { status: 'passed', ...await run() } }
  catch (error) { results.gates[name] = { status: 'failed', message: error.message }; await screenshot(`${name}-failure`).catch(() => {}); console.error(name, error.message) }
}
try {
  await server.listen()
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true })
  network = await request.newContext(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {})
  page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
  page.on('pageerror', (error) => results.errors.push(error.message))
  await page.route('https://**/*', async (route) => {
    const req = route.request()
    try {
      const response = await network.fetch(req.url(), { method: req.method(), data: req.postData() ?? undefined, headers: req.headers(), timeout: 40000 })
      results.requests.push({ url: req.url(), status: response.status(), contentType: response.headers()['content-type'] })
      await route.fulfill({ response })
    } catch (error) { results.requests.push({ url: req.url(), error: error.message }); await route.abort() }
  })
  await page.goto('http://127.0.0.1:5184')
  await page.getByRole('combobox', { name: 'Velg kommune' }).fill('Trondheim')
  await page.getByRole('option', { name: 'Trondheim 5001' }).click()
  await page.locator('summary[aria-label="Åpne meny"]').click()
  await page.getByRole('link', { name: 'Utforsk i kart', exact: true }).click()
  await page.locator('summary[aria-label="Åpne meny"]').click()
  await page.waitForFunction(() => globalThis.__themeContext?.boundary)
  await gate('A-level0', async () => {
    await painted(); await screenshot('A-level0')
    const counts = await pixels()
    assert.ok(counts.nature > 500 && counts.agriculture > 50 && counts.built > 50, JSON.stringify(counts))
    assert.equal(counts.plan, 0)
    assert.equal(results.requests.filter((req) => req.url.includes('dibk.no')).length, 0, 'Nivå 0 skal ikke starte plananalyse')
    return { pixels: counts }
  })
  const initialView = await viewState()
  await gate('B-valued', async () => {
    await theme('valued-nature')
    await page.waitForFunction(() => globalThis.__themeContext?.data?.localities.length > 0, null, { timeout: 180000 })
    await painted(); await screenshot('B-valued')
    assert.deepEqual(await viewState(), initialView)
    const counts = await pixels(); assert.ok(counts.valued > 30, JSON.stringify(counts)); assert.equal(counts.plan, 0)
    return { pixels: counts, ...await page.evaluate(() => ({ localities: globalThis.__themeContext.data.localities.length, types: globalThis.__themeContext.data.natureTypes.length })) }
  })
  await gate('C-future', async () => {
    await theme('future-development'); await painted(); await screenshot('C-future')
    assert.deepEqual(await viewState(), initialView)
    const counts = await pixels(); assert.ok(counts.plan > 500, JSON.stringify(counts)); assert.equal(counts.valued, 0)
    const visible = await page.evaluate(() => globalThis.__themeMap.getLayers().getArray().filter((layer) => layer.getVisible()).map((layer) => layer.getClassName()))
    assert.ok(!visible.includes('explore-registered-nature') && !visible.includes('explore-level0-overview'))
    return { pixels: counts, visible }
  })
  await gate('D-roundtrip', async () => {
    await theme('level0'); await painted(); await screenshot('D-roundtrip')
    assert.deepEqual(await viewState(), initialView)
    assert.ok(await page.evaluate(() => globalThis.__themeContext.data === null && globalThis.__themeContext.selectedId === null
      && globalThis.__themeMap.getLayers().getArray().find((layer) => layer.getClassName() === 'explore-registered-localities').getSource().getFeatures().length === 0))
    return { preservesView: true, clearsSelection: true }
  })
  await gate('E-filter', async () => {
    await theme('valued-nature')
    await page.waitForFunction(() => globalThis.__themeContext?.data?.localities.length > 0, null, { timeout: 180000 })
    const name = await page.evaluate(() => globalThis.__themeContext.data.natureTypes.find((name) => name.includes('furuskog')) ?? globalThis.__themeContext.data.natureTypes[0])
    await page.getByRole('searchbox', { name: 'Søk i naturtyper' }).fill(name)
    assert.equal(await page.getByRole('combobox', { name: 'Naturtype', exact: true }).locator('option').count(), 2)
    await page.getByRole('combobox', { name: 'Naturtype', exact: true }).selectOption(name)
    await painted()
    assert.deepEqual(await viewState(), initialView)
    await page.getByRole('list', { name: 'Registrerte lokaliteter' }).getByRole('button').first().click()
    await painted(); assert.deepEqual(await viewState(), initialView)
    assert.ok(await page.getByRole('region', { name: 'Valgt lokalitet' }).isVisible())
    await page.locator('.explore-themes__canvas').scrollIntoViewIfNeeded()
    const pixel = await page.evaluate(() => {
      const map = globalThis.__themeMap
      const feature = map.getLayers().getArray().find((layer) => layer.getClassName() === 'explore-registered-localities').getSource().getFeatures()[0]
      const geometry = feature.getGeometry()
      const point = geometry.getInteriorPoint ? geometry.getInteriorPoint().getCoordinates() : geometry.getInteriorPoints().getCoordinates()[0]
      return map.getPixelFromCoordinate(point.slice(0, 2))
    })
    const mapBox = await page.locator('.explore-themes__canvas').boundingBox()
    await page.getByRole('button', { name: 'Fjern valg' }).click()
    await page.locator('.explore-themes__canvas').scrollIntoViewIfNeeded()
    const clickBox = await page.locator('.explore-themes__canvas').boundingBox()
    assert.ok(pixel && mapBox)
    await page.mouse.click(clickBox.x + pixel[0], clickBox.y + pixel[1])
    await page.waitForFunction(() => globalThis.__themeContext.selectedId !== null)
    assert.deepEqual(await viewState(), initialView)
    await screenshot('E-filter')
    const filterCount = await page.evaluate(() => globalThis.__themeMap.getLayers().getArray().find((layer) => layer.getClassName() === 'explore-registered-localities').getSource().getFeatures().length)
    await theme('future-development'); await theme('valued-nature')
    await page.waitForFunction(() => globalThis.__themeContext?.data?.localities.length > 0)
    assert.equal(await page.getByRole('searchbox', { name: 'Søk i naturtyper' }).inputValue(), '')
    assert.equal(await page.getByRole('combobox', { name: 'Naturtype', exact: true }).inputValue(), '')
    assert.equal(await page.getByRole('region', { name: 'Valgt lokalitet' }).count(), 0)
    return { name, filterCount, selectionCleared: true, actualMapClick: true }
  })
  await gate('F-navigation', async () => {
    await theme('level0'); await painted()
    const before = await viewState(), map = page.locator('.explore-themes__canvas')
    await map.scrollIntoViewIfNeeded(); await map.focus()
    const box = await map.boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, -180)
    await page.waitForFunction((resolution) => globalThis.__themeMap.getView().getResolution() < resolution && !globalThis.__themeMap.getView().getAnimating(), before.resolution)
    for (let i = 0; i < 3; i++) await page.locator('.explore-themes__canvas .ol-zoom-in').click()
    await page.waitForFunction(() => !globalThis.__themeMap.getView().getAnimating())
    await painted(); const zoomed = await viewState(); await screenshot('F-detail')
    const counts = await pixels(); assert.ok(counts.nature > 100 && counts.built > 30, JSON.stringify(counts))
    await map.scrollIntoViewIfNeeded(); await map.focus()
    const dragBox = await map.boundingBox()
    await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2)
    await page.mouse.down(); await page.mouse.move(dragBox.x + dragBox.width / 2 + 70, dragBox.y + dragBox.height / 2 + 30, { steps: 10 }); await page.mouse.up()
    await page.waitForFunction(() => !globalThis.__themeMap.getView().getAnimating() && !globalThis.__themeMap.getView().getInteracting())
    await painted(); const moved = await viewState(); assert.notDeepEqual(moved.center, zoomed.center)
    await theme('future-development'); await painted(); assert.deepEqual(await viewState(), moved)
    await theme('level0'); await painted(); assert.deepEqual(await viewState(), moved)
    await map.scrollIntoViewIfNeeded(); await map.focus()
    const wheelBox = await map.boundingBox()
    await page.mouse.move(wheelBox.x + wheelBox.width / 2, wheelBox.y + wheelBox.height / 2)
    await page.mouse.wheel(0, 180)
    await page.waitForFunction((resolution) => globalThis.__themeMap.getView().getResolution() > resolution && !globalThis.__themeMap.getView().getAnimating(), moved.resolution)
    await page.getByRole('button', { name: 'Vis hele kommunen' }).click(); await painted()
    assert.deepEqual(await viewState(), initialView)
    return { before, zoomed, moved, detailPixels: counts }
  })
  await gate('G-mobile', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    const mobileView = await viewState()
    for (const [id, name] of [['level0', 'G-mobile-level0'], ['valued-nature', 'G-mobile-valued'], ['future-development', 'G-mobile-future'], ['level0', 'G-mobile-roundtrip']]) {
      await theme(id); await painted()
      assert.deepEqual(await viewState(), mobileView)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horisontal scrolling')
      await screenshot(name)
    }
    return { width: 390, preservesView: true, horizontalScroll: false }
  })
  assert.deepEqual(results.errors, [])
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2))
  await browser?.close(); await network?.dispose(); await server.close()
}
if (Object.values(results.gates).some((gate) => gate.status !== 'passed')) process.exitCode = 1
console.log(JSON.stringify(results.gates, null, 2))
