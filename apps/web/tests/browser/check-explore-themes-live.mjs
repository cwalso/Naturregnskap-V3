import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'

const output = process.env.BROWSER_OUTPUT ?? '.browser-results/layers'
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
const names = { level0: 'Grunnkart nivå 0', 'future-development': 'Framtidig utbygging', 'valued-nature': 'Verdsatte naturtyper' }
async function layers(ids) {
  for (const [id, name] of Object.entries(names)) await page.getByRole('checkbox', { name, exact: true }).setChecked(ids.includes(id))
  if (ids.includes('valued-nature')) await page.waitForFunction(() => globalThis.__themeContext?.data?.localities.length > 0, null, { timeout: 180000 })
  await painted()
  assert.equal(await page.getByText(/^Laster (grunnkart|framtidig utbygging|verdsatte naturtyper)/i).count(), 0, 'Aktive lag skal være ferdig lastet etter rendercomplete')
}
async function transparency(id, value) {
  await page.getByRole('slider', { name: `Gjennomsiktighet – ${names[id]}` }).evaluate((element, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, String(value))
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
  await page.waitForFunction(({ id, value }) => Math.abs(globalThis.__themeContext.layers[id].opacity - (1 - value / 100)) < 1e-6, { id, value })
  await painted()
}
const layerState = () => page.evaluate(() => globalThis.__themeMap.getLayers().getArray().filter((layer) => layer.get('mapLayerId')).map((layer) => ({ id: layer.get('mapLayerId'), name: layer.getClassName(), visible: layer.getVisible(), opacity: layer.getOpacity(), zIndex: layer.getZIndex() })))
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
  const initialView = await viewState()
  await gate('A-level0', async () => {
    await painted()
    assert.equal(await page.getByRole('slider', { name: 'Gjennomsiktighet – Grunnkart nivå 0' }).inputValue(), '30')
    await transparency('level0', 0); await screenshot('A-level0')
    const counts = await pixels(); assert.ok(counts.nature > 500 && counts.agriculture > 50 && counts.built > 50, JSON.stringify(counts))
    assert.equal(results.requests.filter((req) => req.url.includes('dibk.no')).length, 0)
    await transparency('level0', 30)
    return { defaultTransparency: 30, pixelsAtFullOpacity: counts }
  })
  const combinations = [
    ['B-future', ['future-development']], ['C-valued', ['valued-nature']],
    ['D-level0-future', ['level0', 'future-development']], ['E-level0-valued', ['level0', 'valued-nature']],
    ['F-future-valued', ['future-development', 'valued-nature']], ['G-all', Object.keys(names)], ['H-none', []],
  ]
  for (const [name, ids] of combinations) await gate(name, async () => {
    await layers(ids); await screenshot(name); assert.deepEqual(await viewState(), initialView)
    const state = await layerState()
    for (const id of Object.keys(names)) assert.equal(state.some((layer) => layer.id === id && layer.visible), ids.includes(id), JSON.stringify(state))
    assert.equal(await page.getByRole('region', { name: /^Tegnforklaring:/ }).count(), ids.length)
    const counts = await pixels()
    if (ids.includes('valued-nature')) assert.ok(counts.valued > 30, JSON.stringify(counts))
    if (ids.includes('future-development')) assert.ok(counts.nature > 100 && counts.agriculture > 30, JSON.stringify(counts))
    if (ids.length === 0) {
      assert.deepEqual(counts, { nature: 0, agriculture: 0, built: 0, valued: 0, plan: 0 })
      assert.ok(await page.evaluate(() => globalThis.__themeMap.getLayers().getArray()[0].getVisible()))
      assert.ok(await page.getByText('Alle temalag er slått av. Bakgrunnskartet vises.').isVisible())
    }
    assert.equal(counts.plan, 0)
    return { active: ids, pixels: counts, layers: state }
  })
  await layers(Object.keys(names))
  await gate('I-opacity-order', async () => {
    const before = await viewState(), state = await layerState()
    assert.ok(state.find((l) => l.id === 'level0').zIndex < state.find((l) => l.id === 'future-development').zIndex)
    assert.ok(state.find((l) => l.id === 'future-development').zIndex < state.find((l) => l.id === 'valued-nature').zIndex)
    const snapshots = []
    for (const id of Object.keys(names)) {
      await transparency(id, 50); assert.deepEqual(await viewState(), before)
      snapshots.push(await layerState()); await screenshot(`I-opacity-${id}`)
      await transparency(id, 100); assert.deepEqual(await viewState(), before)
      assert.ok((await layerState()).filter((layer) => layer.id === id).every((layer) => layer.opacity === 0))
      await transparency(id, id === 'level0' ? 30 : 0)
    }
    await transparency('valued-nature', 100)
    assert.equal((await pixels()).valued, 0)
    await transparency('valued-nature', 0)
    return { preservesView: true, fixedOrder: state, snapshots }
  })
  await gate('J-filter', async () => {
    const before = await viewState()
    const name = await page.evaluate(() => globalThis.__themeContext.data.natureTypes.find((name) => name.includes('furuskog')) ?? globalThis.__themeContext.data.natureTypes[0])
    await page.getByRole('searchbox', { name: 'Søk i naturtyper' }).fill(name)
    assert.equal(await page.getByRole('combobox', { name: 'Naturtype', exact: true }).locator('option').count(), 2)
    await page.getByRole('combobox', { name: 'Naturtype', exact: true }).selectOption(name); await painted()
    assert.deepEqual(await viewState(), before)
    const state = await layerState()
    assert.ok(state.some((l) => l.id === 'level0' && l.visible) && state.some((l) => l.id === 'future-development' && l.visible))
    await page.getByRole('list', { name: 'Registrerte lokaliteter' }).getByRole('button').first().click(); await painted()
    assert.deepEqual(await viewState(), before)
    assert.ok(await page.getByRole('region', { name: 'Valgt lokalitet' }).isVisible())
    await page.getByRole('checkbox', { name: names['future-development'], exact: true }).uncheck()
    await page.getByRole('checkbox', { name: names['future-development'], exact: true }).check()
    await painted(); assert.equal(await page.getByRole('combobox', { name: 'Naturtype', exact: true }).inputValue(), name)
    assert.ok(await page.getByRole('region', { name: 'Valgt lokalitet' }).isVisible())
    const pixel = await page.evaluate(() => {
      const map = globalThis.__themeMap
      const geometry = map.getLayers().getArray().find((layer) => layer.getClassName() === 'explore-registered-localities').getSource().getFeatures()[0].getGeometry()
      const point = geometry.getInteriorPoint ? geometry.getInteriorPoint().getCoordinates() : geometry.getInteriorPoints().getCoordinates()[0]
      return map.getPixelFromCoordinate(point.slice(0, 2))
    })
    await page.getByRole('button', { name: 'Fjern valg' }).click()
    const map = page.locator('.explore-themes__canvas'); await map.scrollIntoViewIfNeeded(); const box = await map.boundingBox()
    await page.mouse.click(box.x + pixel[0], box.y + pixel[1]); await page.waitForFunction(() => globalThis.__themeContext.selectedId !== null)
    assert.deepEqual(await viewState(), before); await screenshot('J-filter-with-layers')
    const filterCount = await page.evaluate(() => globalThis.__themeMap.getLayers().getArray().find((layer) => layer.getClassName() === 'explore-registered-localities').getSource().getFeatures().length)
    await page.getByRole('combobox', { name: 'Verdikategori', exact: true }).selectOption('Stor verdi'); await painted(); assert.deepEqual(await viewState(), before)
    await screenshot('J-value-filter-with-layers')
    await page.getByRole('button', { name: 'Vis alle registrerte lokaliteter' }).click(); await painted()
    return { name, filterCount, preservesOtherLayers: true, actualMapClick: true }
  })
  await gate('K-navigation', async () => {
    await layers(Object.keys(names))
    const before = await viewState(), map = page.locator('.explore-themes__canvas')
    await map.scrollIntoViewIfNeeded(); await map.focus(); const box = await map.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.wheel(0, -180)
    await page.waitForFunction((r) => globalThis.__themeMap.getView().getResolution() < r && !globalThis.__themeMap.getView().getAnimating(), before.resolution)
    for (let i = 0; i < 3; i++) { await page.locator('.explore-themes__canvas .ol-zoom-in').click(); await page.waitForFunction(() => !globalThis.__themeMap.getView().getAnimating()) }
    await painted(); const zoomed = await viewState(); await screenshot('K-all-detail')
    await map.scrollIntoViewIfNeeded(); await map.focus(); const drag = await map.boundingBox()
    await page.mouse.move(drag.x + drag.width / 2, drag.y + drag.height / 2); await page.mouse.down()
    await page.mouse.move(drag.x + drag.width / 2 + 70, drag.y + drag.height / 2 + 30, { steps: 10 }); await page.mouse.up()
    await page.waitForFunction(() => !globalThis.__themeMap.getView().getAnimating() && !globalThis.__themeMap.getView().getInteracting()); await painted()
    const moved = await viewState(); assert.notDeepEqual(moved.center, zoomed.center)
    for (const ids of [['future-development'], ['valued-nature'], [], Object.keys(names)]) { await layers(ids); assert.deepEqual(await viewState(), moved) }
    await screenshot('K-roundtrip-detail')
    await page.getByRole('button', { name: 'Vis hele kommunen' }).click(); await painted(); assert.deepEqual(await viewState(), initialView)
    return { before, zoomed, moved, manualReset: true }
  })
  await gate('L-mobile', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    const map = page.locator('.explore-themes__canvas'), toggle = page.getByRole('button', { name: /Kartlag ·/ })
    const before = await viewState()
    if (await toggle.getAttribute('aria-expanded') === 'true') await toggle.click()
    await painted(); await screenshot('L-mobile-closed')
    assert.equal(await page.getByRole('checkbox').count(), 0)
    assert.equal(await page.getByRole('region', { name: /^Tegnforklaring:/ }).count(), 3)
    await toggle.click(); assert.equal(await page.getByRole('checkbox').count(), 3); await screenshot('L-mobile-open')
    for (const [ids, name] of [[['future-development'], 'L-mobile-future'], [Object.keys(names), 'L-mobile-all'], [[], 'L-mobile-none']]) {
      await layers(ids); assert.deepEqual(await viewState(), before)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      await toggle.click(); await screenshot(name); await toggle.click()
    }
    await layers(Object.keys(names)); await transparency('valued-nature', 50); assert.deepEqual(await viewState(), before)
    await toggle.click(); await map.scrollIntoViewIfNeeded(); await map.focus()
    await page.locator('.explore-themes__canvas .ol-zoom-in').click(); await page.waitForFunction(() => !globalThis.__themeMap.getView().getAnimating()); await painted()
    await screenshot('L-mobile-detail')
    return { width: 390, collapsedPicker: true, opacityControl: true, preservesView: true, horizontalScroll: false }
  })
  await gate('H-real-raster-exclusion', async () => {
    const checked = await page.evaluate(async () => {
      const { planTileGrid, buildPlanTileUrl, buildRawAccountPlanTileUrl } = await import('/src/map/plannedDevelopment.ts')
      const { classifyAccountPixel } = await import('/src/map/accountOverviewRaster.ts')
      const map = globalThis.__themeMap
      const layer = map.getLayers().getArray().find((item) => item.getClassName() === 'explore-future-development')
      const tc = planTileGrid.getTileCoordForCoordAndZ([267000, 7031500], 11)
      const tile = layer.getSource().getTile(...tc, 1, map.getView().getProjection())
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Detaljflisen ble ikke lastet')), 45000)
        function done() {
          if (tile.getState() === 2) { clearTimeout(timeout); tile.removeEventListener('change', done); resolve() }
          if (tile.getState() === 3) { clearTimeout(timeout); tile.removeEventListener('change', done); reject(new Error('Detaljflisen feilet')) }
        }
        tile.addEventListener('change', done); tile.load(); done()
      })
      function imagePixels(image) {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512
        const context = canvas.getContext('2d'); context.drawImage(image, 0, 0)
        return context.getImageData(0, 0, 512, 512).data
      }
      async function raw(url) {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Kildekontroll: HTTP ${response.status}`)
        const bitmap = await createImageBitmap(await response.blob())
        try { return imagePixels(bitmap) } finally { bitmap.close() }
      }
      const [account, plan] = await Promise.all([
        raw(buildRawAccountPlanTileUrl('https://wms.nibio.no/cgi-bin/grunnkart_arealanalyse', tc)), raw(buildPlanTileUrl(tc)),
      ])
      const actual = imagePixels(tile.getImage())
      const counts = { nature: 0, agriculture: 0, builtWithinPlan: 0, waterWithinPlan: 0, invalid: 0, outsidePlan: 0, mismatches: 0 }
      for (let i = 0; i < actual.length; i += 4) {
        const k = classifyAccountPixel(account[i], account[i + 1], account[i + 2])
        let color = null
        if (account[i + 3] < 100) counts.invalid++
        else if (plan[i + 3] < 128) counts.outsidePlan++
        else if (k === 2) { counts.nature++; color = [158, 204, 115, 255] }
        else if (k === 1) { counts.agriculture++; color = [255, 209, 110, 255] }
        else if (k === 0) counts.builtWithinPlan++
        else counts.waterWithinPlan++
        if (color ? color.some((v, c) => actual[i + c] !== v) : actual[i + 3] !== 0) counts.mismatches++
      }
      return { tileCoord: tc, extent: planTileGrid.getTileCoordExtent(tc), counts }
    })
    assert.equal(checked.counts.mismatches, 0, JSON.stringify(checked))
    for (const key of ['nature', 'agriculture', 'builtWithinPlan', 'outsidePlan']) assert.ok(checked.counts[key] > 0, JSON.stringify(checked))
    return checked
  })
  assert.deepEqual(results.errors, [])
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2))
  await browser?.close(); await network?.dispose(); await server.close()
}
if (Object.values(results.gates).some((gate) => gate.status !== 'passed')) process.exitCode = 1
console.log(JSON.stringify(results.gates, null, 2))
