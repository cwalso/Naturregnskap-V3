import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'

const output = process.env.BROWSER_OUTPUT ?? '.browser-results/six-layers'
await mkdir(output, { recursive: true })
const server = await createServer({ server: { host: '127.0.0.1', port: 5187, strictPort: true }, plugins: [{
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
async function hatchPixels() {
  return page.evaluate(() => {
    const canvas = document.querySelector('.explore-future-development canvas')
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
    const colors = { natureInk: [40, 100, 59], agricultureInk: [150, 112, 0], natureTint: [158, 204, 115], agricultureTint: [255, 209, 110] }
    const counts = Object.fromEntries(Object.keys(colors).map((key) => [key, 0]))
    for (let i = 0; i < data.length; i += 4) {
      if (!data[i + 3]) continue
      for (const [key, color] of Object.entries(colors)) if (color.every((v, c) => Math.abs(v - data[i + c]) <= 3)) counts[key]++
    }
    return counts
  })
}
async function panelLayout() {
  const result = await page.evaluate(() => {
    const list = document.querySelector('.explore-themes__layer-list'), bounds = list.getBoundingClientRect()
    return { width: innerWidth, clientWidth: list.clientWidth, scrollWidth: list.scrollWidth,
      ranges: [...list.querySelectorAll('input[type=range]')].map((e) => ({ margin: getComputedStyle(e).margin, rightOverflow: e.getBoundingClientRect().right - bounds.right })),
      pageScrollWidth: document.documentElement.scrollWidth }
  })
  assert.equal(result.scrollWidth, result.clientWidth, JSON.stringify(result))
  assert.ok(result.ranges.every((range) => range.rightOverflow <= 0 && range.margin === '0px'), JSON.stringify(result))
  assert.ok(result.pageScrollWidth <= result.width)
  return result
}
const names = { level0: 'Grunnkart nivå 0', 'future-development': 'Framtidig utbygging', 'valued-nature': 'Verdsatte naturtyper', 'protected-areas': 'Verneområder', 'intact-nature': 'Inngrepsfri natur (INON)', 'wild-reindeer': 'Villrein' }
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
async function sourceVisual(id) {
  return page.evaluate((id) => {
    const map = globalThis.__themeMap, layer = map.getLayers().getArray().find((l) => l.get('mapLayerId') === id)
    const canvas = document.querySelector(`.${layer.getClassName()} canvas`)
    const context = canvas.getContext('2d'), data = context.getImageData(0, 0, canvas.width, canvas.height).data
    const rect = canvas.getBoundingClientRect(), target = document.querySelector('.explore-themes__canvas').getBoundingClientRect()
    // The border and mask both have geometries; select the one with municipality properties.
    const geometry = map.getLayers().getArray().flatMap((l) => l.getSource()?.getFeatures?.() ?? []).find((f) => f.get('number') === globalThis.__themeContext.boundary.properties.number)?.getGeometry()
    let count = 0, sample = null, checks = 0
    for (let i = 3; i < data.length; i += 4) {
      if (!data[i]) continue
      count++
      if (sample || data[i] < 50 || count % 11 || checks++ > 2000) continue
      const p = (i - 3) / 4, x = p % canvas.width, y = Math.floor(p / canvas.width)
      const pixel = [rect.left - target.left + (x + 0.5) * rect.width / canvas.width, rect.top - target.top + (y + 0.5) * rect.height / canvas.height]
      const coordinate = map.getCoordinateFromPixel(pixel)
      if (pixel[0] < 4 || pixel[1] < 4 || pixel[0] > target.width - 4 || pixel[1] > target.height - 4 || !geometry.intersectsCoordinate(coordinate)) continue
      sample = { pixel, coordinate, rgba: [...data.slice(i - 3, i + 1)] }
    }
    return { count, sample, visible: layer.getVisible(), opacity: layer.getOpacity(), zIndex: layer.getZIndex(), params: layer.getSource().getParams(), projection: map.getView().getProjection().getCode() }
  }, id)
}
async function screenPixel(pixel) {
  const bytes = await page.locator('.explore-themes__canvas').screenshot()
  return page.evaluate(async ({ bytes, pixel }) => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }))
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height
    const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close()
    return [...ctx.getImageData(Math.floor(pixel[0]), Math.floor(pixel[1]), 1, 1).data]
  }, { bytes: Array.from(bytes), pixel })
}
async function renderedProof(id) {
  const visual = await sourceVisual(id)
  assert.ok(visual.count > 0 && visual.sample, `No visible polygon inside municipality: ${JSON.stringify(visual)}`)
  assert.equal(visual.projection, 'EPSG:25833')
  const image = await screenPixel(visual.sample.pixel)
  await layers([]); const base = await screenPixel(visual.sample.pixel); await layers([id])
  assert.ok(image.some((value, i) => i < 3 && Math.abs(value - base[i]) > 10), `No composed polygon: ${image} vs ${base}`)
  return { ...visual, composedPixel: image, basePixel: base }
}
async function legends() {
  for (const img of await page.locator('.explore-themes__service-legend img').all()) {
    await img.scrollIntoViewIfNeeded()
    await img.evaluate((element) => element.decode())
    assert.ok(await img.evaluate((element) => element.naturalWidth > 0 && element.getBoundingClientRect().width <= element.parentElement.getBoundingClientRect().width))
  }
}
async function choose(name, number) {
  await page.getByRole('combobox', { name: 'Velg kommune' }).fill(name)
  await page.getByRole('option', { name: `${name} ${number}` }).click()
  await page.locator('summary[aria-label="Åpne meny"]').click(); await page.getByRole('link', { name: 'Utforsk i kart', exact: true }).click(); await page.locator('summary[aria-label="Åpne meny"]').click()
  await page.waitForFunction((number) => globalThis.__themeContext?.boundary?.properties.number === number, number)
}
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
  await page.goto('http://127.0.0.1:5187')
  await page.getByRole('combobox', { name: 'Velg kommune' }).fill('Trondheim')
  await page.getByRole('option', { name: 'Trondheim 5001' }).click()
  await page.locator('summary[aria-label="Åpne meny"]').click()
  await page.getByRole('link', { name: 'Utforsk i kart', exact: true }).click()
  await page.locator('summary[aria-label="Åpne meny"]').click()
  await page.waitForFunction(() => globalThis.__themeContext?.boundary)
  const initialView = await viewState(), newer = ['protected-areas', 'intact-nature', 'wild-reindeer']
  await gate('1-protected-alone', async () => {
    await layers(['protected-areas']); const proof = await renderedProof('protected-areas'); await legends(); await screenshot('1-protected-alone')
    assert.equal(proof.params.LAYERS, 'naturvern_klasser_omrade'); assert.deepEqual(await viewState(), initialView)
    return proof
  })
  await gate('2-INON-alone', async () => {
    await layers(['intact-nature']); const proof = await renderedProof('intact-nature'); await legends(); await screenshot('2-INON-alone')
    assert.ok(await page.getByText('Status: januar 2023', { exact: true }).isVisible()); assert.equal(proof.params.LAYERS, 'status'); assert.deepEqual(await viewState(), initialView)
    return proof
  })
  await gate('3-villrein-empty-Trondheim', async () => {
    await layers(['wild-reindeer']); await page.getByText(/Ingen registrerte leveområder for villrein/).waitFor({ timeout: 45000 })
    const visual = await sourceVisual('wild-reindeer'); assert.equal(visual.count, 0); assert.equal(await page.getByRole('alert').count(), 0)
    await legends(); await screenshot('3-villrein-empty-Trondheim'); return { ...visual, municipality: '5001', emptyIsValid: true }
  })
  for (const id of newer) await gate(`4-base-${id}`, async () => {
    await layers(['level0', id]); const before = await viewState(); await legends(); await screenshot(`4-base-${id}`)
    const state = await layerState(); assert.ok(state.some((l) => l.id === id && l.visible)); assert.ok(state.some((l) => l.id === 'level0' && l.visible))
    await transparency(id, 50); assert.deepEqual(await viewState(), before); await screenshot(`4-base-${id}-50`)
    await transparency(id, id === 'intact-nature' ? 35 : 0); return { state, keepsView: true }
  })
  await gate('5-new-layers', async () => { await layers(newer); await legends(); await screenshot('5-new-layers'); assert.equal(await page.getByRole('region', { name: /^Tegnforklaring:/ }).count(), 3); return { state: await layerState() } })
  await gate('6-all-six', async () => {
    await layers(Object.keys(names)); await legends(); await page.locator('.explore-themes__layer-list').evaluate((e) => { e.scrollTop = 0 }); await screenshot('6-all-six'); await page.locator('.explore-themes__layer-list').evaluate((e) => { e.scrollTop = e.scrollHeight }); await screenshot('6-all-six-panel-bottom'); assert.equal(await page.getByRole('checkbox').count(), 6); assert.equal(await page.getByRole('region', { name: /^Tegnforklaring:/ }).count(), 6)
    assert.deepEqual(await viewState(), initialView); return { state: await layerState(), layout: await panelLayout(), hatch: await hatchPixels() }
  })
  await gate('7-none', async () => { await layers([]); await screenshot('7-none'); assert.equal(await page.getByRole('region', { name: /^Tegnforklaring:/ }).count(), 0); assert.ok(await page.getByText(/Alle temalag er slått av/).isVisible()); return {} })
  await gate('8-opacity-independent', async () => {
    await layers(Object.keys(names)); const before = await viewState(), checks = []
    for (const id of newer) {
      const other = (await layerState()).filter((l) => l.id !== id)
      await transparency(id, 75); assert.deepEqual((await layerState()).filter((l) => l.id !== id), other); assert.deepEqual(await viewState(), before)
      checks.push(await layerState()); await screenshot(`8-opacity-${id}-75`)
      await transparency(id, 100); assert.deepEqual(await viewState(), before); await transparency(id, id === 'intact-nature' ? 35 : 0)
    }
    return { checks }
  })
  await gate('9-filter-six', async () => {
    const before = await viewState(), name = await page.evaluate(() => globalThis.__themeContext.data.natureTypes.find((n) => n.includes('furuskog')))
    await page.getByRole('combobox', { name: 'Naturtype', exact: true }).selectOption(name); await painted()
    const id = await page.evaluate(() => globalThis.__themeMap.getLayers().getArray().find((l) => l.getClassName() === 'explore-registered-localities').getSource().getFeatures()[0].getId())
    await page.getByRole('list', { name: 'Registrerte lokaliteter' }).getByRole('button').first().click(); await painted()
    for (const layer of newer) { await page.getByRole('checkbox', { name: names[layer], exact: true }).uncheck(); await painted(); await page.getByRole('checkbox', { name: names[layer], exact: true }).check(); await painted() }
    assert.equal(await page.getByRole('combobox', { name: 'Naturtype', exact: true }).inputValue(), name); assert.equal(await page.evaluate(() => globalThis.__themeContext.selectedId), id); assert.deepEqual(await viewState(), before)
    await screenshot('9-filter-six'); await page.getByRole('button', { name: 'Vis alle registrerte lokaliteter' }).click(); await painted(); return { natureType: name, selectedId: id }
  })
  await gate('10-navigation', async () => {
    const map = page.locator('.explore-themes__canvas'); await map.scrollIntoViewIfNeeded(); await map.focus()
    for (let i = 0; i < 2; i++) { await page.locator('.explore-themes__canvas .ol-zoom-in').click(); await page.waitForFunction(() => !globalThis.__themeMap.getView().getAnimating()) }
    await painted(); const zoomed = await viewState(), box = await map.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 30, { steps: 10 }); await page.mouse.up()
    await page.waitForFunction(() => !globalThis.__themeMap.getView().getAnimating() && !globalThis.__themeMap.getView().getInteracting()); await painted()
    const moved = await viewState(); assert.notDeepEqual(moved.center, zoomed.center); await screenshot('10-six-detail')
    await page.getByRole('button', { name: 'Vis hele kommunen' }).click(); await painted(); assert.deepEqual(await viewState(), initialView); return { zoomed, moved, manualReset: true }
  })
  await gate('11-mobile-six', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); const toggle = page.getByRole('button', { name: /Kartlag ·/ }), before = await viewState()
    await painted(); await panelLayout(); await legends(); await page.locator('.explore-themes__layer-list').evaluate((e) => { e.scrollTop = 0 }); await screenshot('11-mobile-open-six'); await page.locator('.explore-themes__layer-list').evaluate((e) => { e.scrollTop = e.scrollHeight }); await screenshot('11-mobile-panel-bottom')
    await toggle.click(); await painted(); await screenshot('11-mobile-closed-six'); assert.equal(await page.getByRole('region', { name: /^Tegnforklaring:/ }).count(), 6)
    await toggle.click(); await transparency('protected-areas', 50); assert.deepEqual(await viewState(), before); await transparency('protected-areas', 0)
    await toggle.click(); await page.getByRole('button', { name: 'Vis hele kommunen' }).click(); await painted(); await screenshot('11-mobile-reset-six')
    await toggle.click(); await layers([]); await toggle.click(); await screenshot('11-mobile-none')
    await toggle.click(); await page.setViewportSize({ width: 1440, height: 1100 }); return { width: 390, layout: 'no overflow or clipping', independentOpacity: true }
  })
  await gate('12-Dovre-positive-villrein', async () => {
    await choose('Dovre', '3431'); await layers(['wild-reindeer'])
    await page.getByText(/Kilden har registrerte leveområder/).waitFor({ timeout: 45000 })
    const proof = await renderedProof('wild-reindeer'); await legends(); await screenshot('12-Dovre-villrein'); assert.equal(proof.params.LAYERS, 'villrein_leveomrade'); assert.equal(await page.getByRole('alert').count(), 0)
    await layers(newer); await legends(); await screenshot('12-Dovre-new-layers')
    await page.setViewportSize({ width: 390, height: 844 }); const toggle = page.getByRole('button', { name: /Kartlag ·/ }); await panelLayout(); await toggle.click(); await page.getByRole('button', { name: 'Vis hele kommunen' }).click(); await painted(); await screenshot('12-Dovre-mobile-villrein-and-new')
    return { ...proof, municipality: '3431', actualRenderedPolygon: true }
  })
  await gate('13-municipality-cleanup', async () => {
    await page.setViewportSize({ width: 1440, height: 1100 }); await choose('Trondheim', '5001')
    const toggle = page.getByRole('button', { name: /Kartlag ·/ }); if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click()
    await layers(['wild-reindeer']); await page.getByText(/Ingen registrerte leveområder for villrein/).waitFor(); assert.equal((await sourceVisual('wild-reindeer')).count, 0)
    assert.equal(await page.getByText(/Kilden har registrerte leveområder/).count(), 0); await screenshot('13-back-to-Trondheim-empty')
    await layers(Object.keys(names)); await legends(); await screenshot('13-Trondheim-six-final'); assert.equal(await page.getByRole('alert').count(), 0)
    return { oldDovrePixelsGone: true, currentOwner: await page.evaluate(() => globalThis.__themeContext.boundary.properties.number) }
  })
  assert.deepEqual(results.errors, [])
} finally { await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2)); await browser?.close(); await network?.dispose(); await server.close() }
if (Object.values(results.gates).some((gate) => gate.status !== 'passed')) process.exitCode = 1
console.log(JSON.stringify(Object.fromEntries(Object.entries(results.gates).map(([name, gate]) => [name, { status: gate.status, message: gate.message }]))))
