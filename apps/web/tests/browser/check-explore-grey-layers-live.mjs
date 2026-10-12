import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'

const output = process.env.BROWSER_OUTPUT ?? '.browser-results/grey-layers'
await mkdir(output, { recursive: true })
const server = await createServer({ server: { host: '127.0.0.1', port: 5188, strictPort: true }, plugins: [{
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
  await legends()
  await page.waitForFunction(() => ![...document.querySelectorAll('[role=status]')].some((element) => element.textContent.startsWith('Laster ')), null, { timeout: 90000 })
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
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
const names = { level0: 'Grunnkart nivå 0', 'future-development': 'Framtidig utbygging', 'valued-nature': 'Verdsatte naturtyper', 'protected-areas': 'Verneområder', 'intact-nature': 'Inngrepsfri natur (INON)', 'wild-reindeer': 'Villrein', 'grey-areas': 'Grå arealer' }
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
      const response = await network.fetch(req.url(), { method: req.method(), data: req.postData() ?? undefined, headers: req.headers(), timeout: 45000 })
      results.requests.push({ url: req.url(), status: response.status(), contentType: response.headers()['content-type'] })
      await route.fulfill({ response })
    } catch (error) { results.requests.push({ url: req.url(), error: error.message }); await route.abort() }
  })
  await page.goto('http://127.0.0.1:5188')
  await choose('Trondheim', '5001')
  const initial = await viewState()
  async function closer() {
    while ((await viewState()).resolution >= 70) {
      await page.locator('.explore-themes__canvas .ol-zoom-in').click()
      await page.waitForFunction(() => !globalThis.__themeMap.getView().getAnimating())
    }
    await painted()
  }
  async function presentation(layer) {
    const before = await viewState(), others = (await layerState()).filter((l) => l.id !== 'grey-areas')
    await page.getByRole('combobox', { name: 'Framstilling – Grå arealer' }).selectOption(layer); await painted(); await legends()
    assert.deepEqual(await viewState(), before); assert.deepEqual((await layerState()).filter((l) => l.id !== 'grey-areas'), others)
    assert.equal((await sourceVisual('grey-areas')).params.LAYERS, layer)
  }
  await gate('1-grey-alone', async () => {
    await layers(['grey-areas']); assert.deepEqual(await viewState(), initial)
    if (initial.resolution >= 70) { await page.getByText(/Zoom inn for å se kartdata/).waitFor(); await screenshot('1-grey-scale-limit') }
    await closer(); const proof = await renderedProof('grey-areas'); await legends(); await screenshot('1-grey-alone')
    while ((await viewState()).resolution < 70) { await page.locator('.explore-themes__canvas .ol-zoom-out').click(); await page.waitForFunction(() => !globalThis.__themeMap.getView().getAnimating()) }
    await painted(); await page.getByText(/Zoom inn for å se kartdata/).waitFor(); await screenshot('1-grey-scale-limit'); await closer(); return proof
  })
  await gate('2-grey-combinations', async () => {
    const before = await viewState()
    for (const id of ['level0','future-development']) { await layers(['grey-areas',id]); await legends(); assert.deepEqual(await viewState(), before); await screenshot(`2-grey-${id}`) }
    await layers(Object.keys(names)); await legends(); assert.equal(await page.getByRole('checkbox').count(), 7); assert.equal(await page.getByRole('region', { name: /^Tegnforklaring:/ }).count(), 7)
    assert.equal(await page.getByRole('checkbox', { name: /FKB/ }).count(), 0)
    await page.locator('.explore-themes__layer-list').evaluate((e) => { e.scrollTop = 0 }); await screenshot('2-all-seven')
    await page.locator('.explore-themes__layer-list').evaluate((e) => { e.scrollTop = e.scrollHeight }); await screenshot('2-all-seven-panel-bottom')
    assert.deepEqual(await viewState(), before); return { layers: await layerState(), layout: await panelLayout(), hatch: await hatchPixels() }
  })
  await gate('3-native-presentations', async () => {
    await layers(['grey-areas']); const proof = {}
    for (const layer of ['andel_uten_vegetasjon','andel_med_vegetasjon','graa_arealer']) {
      await presentation(layer); proof[layer] = await renderedProof('grey-areas'); await screenshot(`3-${layer}`)
    }
    return proof
  })
  await gate('4-opacity-and-none', async () => {
    await layers(Object.keys(names)); const before = await viewState(), other = (await layerState()).filter((l) => l.id !== 'grey-areas'), screens = {}
    for (const value of [0,50,75,100]) { await transparency('grey-areas', value); assert.deepEqual((await layerState()).filter((l) => l.id !== 'grey-areas'), other); assert.deepEqual(await viewState(), before); await screenshot(`4-grey-opacity-${value}`); screens[value] = (await layerState()).find((l) => l.id === 'grey-areas') }
    await transparency('grey-areas',25); await layers([]); assert.equal(await page.getByRole('region', { name: /^Tegnforklaring:/ }).count(),0); await screenshot('4-none'); return screens
  })
  await gate('5-filter-selection', async () => {
    await layers(Object.keys(names)); const before = await viewState(), name = await page.evaluate(() => globalThis.__themeContext.data.natureTypes.find((n) => n.includes('furuskog')))
    await page.getByRole('combobox', { name: 'Naturtype', exact: true }).selectOption(name); await painted()
    await page.getByRole('list', { name: 'Registrerte lokaliteter' }).getByRole('button').first().click(); await painted()
    const selected = await page.evaluate(() => globalThis.__themeContext.selectedId)
    await presentation('andel_med_vegetasjon'); await page.getByRole('checkbox', { name: 'Grå arealer',exact: true }).uncheck(); await painted(); await page.getByRole('checkbox', { name: 'Grå arealer',exact: true }).check(); await painted()
    assert.equal(await page.evaluate(() => globalThis.__themeContext.selectedId), selected); assert.equal(await page.getByRole('combobox', { name: 'Naturtype',exact:true }).inputValue(),name); assert.deepEqual(await viewState(),before)
    await screenshot('5-filter-and-selection'); await page.getByRole('button', { name: 'Vis alle registrerte lokaliteter' }).click(); await painted(); return {name,selected}
  })
  await gate('6-navigation-mobile', async () => {
    const target = page.locator('.explore-themes__canvas'); await target.scrollIntoViewIfNeeded()
    await page.locator('.explore-themes__canvas .ol-zoom-in').click(); await page.waitForFunction(() => !globalThis.__themeMap.getView().getAnimating()); await painted()
    const before = await viewState(), box = await target.boundingBox()
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down(); await page.mouse.move(box.x+box.width/2+60,box.y+box.height/2+20,{steps:10}); await page.mouse.up()
    await page.waitForFunction(() => !globalThis.__themeMap.getView().getAnimating() && !globalThis.__themeMap.getView().getInteracting()); await painted(); assert.notDeepEqual((await viewState()).center,before.center); await screenshot('6-detail-pan')
    await page.getByRole('button', {name:'Vis hele kommunen'}).click(); await painted(); assert.deepEqual(await viewState(),initial)
    await page.setViewportSize({width:390,height:844}); await painted(); const resized = await viewState(); await panelLayout()
    await page.locator('.explore-themes__layer-list').evaluate((e) => {e.scrollTop=0}); await screenshot('6-mobile-open')
    await page.locator('.explore-themes__layer-list').evaluate((e) => {e.scrollTop=e.scrollHeight}); await screenshot('6-mobile-panel-bottom')
    await presentation('graa_arealer'); await transparency('grey-areas',50); assert.deepEqual(await viewState(),resized)
    const toggle=page.getByRole('button',{name:/Kartlag ·/}); await toggle.click(); await screenshot('6-mobile-closed')
    await closer(); await screenshot('6-mobile-grey-detail')
    await toggle.click(); await layers([]); await toggle.click(); await screenshot('6-mobile-none')
    await page.setViewportSize({width:1440,height:1100}); return {width:390,noOverflow:true,explicitReset:true}
  })
  await gate('7-Dovre-real-grey', async () => {
    await choose('Dovre','3431'); const toggle=page.getByRole('button',{name:/Kartlag ·/}); if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click()
    await layers(['grey-areas']); await closer(); const proof = await renderedProof('grey-areas'); await screenshot('7-Dovre-grey')
    for(const layer of ['andel_uten_vegetasjon','andel_med_vegetasjon']) {await presentation(layer);await renderedProof('grey-areas');await screenshot(`7-Dovre-${layer}`)}
    await layers(['grey-areas','protected-areas','intact-nature','wild-reindeer']); await legends(); await screenshot('7-Dovre-supplemental'); return {...proof,municipality:'3431'}
  })
  await gate('8-municipality-cleanup', async () => {
    await choose('Trondheim','5001'); await layers(['grey-areas']); await closer(); await presentation('graa_arealer'); const proof = await renderedProof('grey-areas'); assert.equal(await page.evaluate(()=>globalThis.__themeContext.boundary.properties.number),'5001'); await screenshot('8-Trondheim-return')
    await layers(Object.keys(names)); await legends(); await screenshot('8-Trondheim-seven-final'); assert.equal(await page.getByRole('alert').count(),0); return {...proof,oldMunicipalityGone:true}
  })
  assert.deepEqual(results.errors,[])
} finally { await writeFile(`${output}/results.json`, JSON.stringify(results,null,2)); await browser?.close(); await network?.dispose(); await server.close() }
if(Object.values(results.gates).some((g)=>g.status!=='passed'))process.exitCode=1
console.log(JSON.stringify(Object.fromEntries(Object.entries(results.gates).map(([name,g])=>[name,{status:g.status,message:g.message}]))))
