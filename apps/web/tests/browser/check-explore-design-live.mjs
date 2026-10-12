import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'
const stage = process.env.DESIGN_GATE ?? 'A'
const output = process.env.BROWSER_OUTPUT ?? `.browser-results/design-${stage}`
await mkdir(output, { recursive: true })
const results = { stage, gates: {}, requests: [], errors: [] }
const server = await createServer({ server: { host: '127.0.0.1', port: 5194, strictPort: true }, plugins: [{ name: 'inspect-existing-map', transform(code, id) {
  if (!id.endsWith('/src/map/exploreThemeMap.ts')) return
  return code.replace('  let destroyed = false', '  globalThis.__themeMap = map\n  globalThis.__mapCreations = (globalThis.__mapCreations ?? 0) + 1\n  let destroyed = false').replace('    update(next) {', '    update(next) {\n      globalThis.__themeContext = next')
} }] })
let browser, network, page
const state = () => page.evaluate(() => ({ center: __themeMap.getView().getCenter(), resolution: __themeMap.getView().getResolution() }))
const settle = () => page.waitForFunction(() => !__themeMap.getView().getAnimating())
async function size() { return page.evaluate(() => {
  const b = document.querySelector('.explore-themes__canvas').getBoundingClientRect()
  return { width: b.width, height: b.height, overflow: document.documentElement.scrollWidth - innerWidth }
}) }
async function shot(name) { await page.screenshot({ path: `${output}/${name}.png`, fullPage: true }) }
async function settings(name) { await page.getByRole('button', { name: `Innstillinger for ${name}`, exact: true }).click() }
async function close() { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.explore-themes__info')) }
async function gate(name, run) { results.gates[name] = { status: 'passed', ...await run() }; console.log(`PASS ${name}`) }
try {
  await server.listen()
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true })
  network = await request.newContext({ proxy: { server: process.env.HTTPS_PROXY } })
  page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  page.on('pageerror', error => results.errors.push(error.message))
  await page.route('https://**/*', async route => {
    const req = route.request()
    try { const response = await network.fetch(req.url(), { method: req.method(), data: req.postData() ?? undefined, headers: req.headers(), timeout: 45000 }); results.requests.push({ url: req.url(), status: response.status() }); await route.fulfill({ response }) }
    catch (error) { results.requests.push({ url: req.url(), error: error.message }); await route.abort() }
  })
  await page.goto('http://127.0.0.1:5194')
  await page.getByRole('combobox', { name: 'Velg kommune' }).fill('Trondheim')
  await page.getByRole('option', { name: 'Trondheim 5001' }).click()
  await page.locator('summary[aria-label="Åpne meny"]').click()
  await page.getByRole('link', { name: 'Utforsk i kart', exact: true }).click()
  await page.locator('summary[aria-label="Åpne meny"]').click()
  await page.waitForFunction(() => __themeContext?.boundary?.properties.number === '5001')
  await gate('A-responsive-panels', async () => {
    const measurements = []
    for (const [width,height] of [[1440,960],[900,900],[390,844],[320,720]]) {
      await page.setViewportSize({ width,height }); await settle()
      const before = await state(), originalMap = await page.evaluate(() => { globalThis.__originalMap = __themeMap; return __mapCreations })
      await shot(`A-${width}-closed`)
      if (width <= 700) await page.getByRole('button', { name: /^Kartlag \(/ }).click()
      await settings('Grunnkart nivå 0')
      await page.waitForTimeout(100)
      assert.deepEqual(await state(), before)
      assert.equal(await page.evaluate(() => __themeMap === __originalMap), true)
      const dimensions = await size()
      assert.equal(dimensions.overflow,0,JSON.stringify(dimensions))
      assert.ok(dimensions.width >= (width === 1440 ? 827 : width === 900 ? 647 : width-1),JSON.stringify(dimensions))
      assert.ok(dimensions.height >= (width <= 700 ? 185 : 650),JSON.stringify(dimensions))
      await shot(`A-${width}-settings`)
      await close(); assert.deepEqual(await state(), before)
      if(width<=700) {
        await page.getByRole('button', { name: /^Kartlag \(/ }).click(); const open = await size(); assert.ok(open.height >=185)
        await page.keyboard.press('Escape'); assert.ok(await page.getByRole('button', { name: /^Kartlag \(/ }).evaluate(e=>document.activeElement===e))
      } else assert.ok(await page.getByRole('button', { name: 'Innstillinger for Grunnkart nivå 0', exact: true }).evaluate(e=>document.activeElement===e))
      measurements.push({width,height,...dimensions,mapCreations:originalMap})
    }
    return { measurements }
  })
  await gate('A-existing-navigation', async () => {
    await page.setViewportSize({ width:1440,height:960 }); await page.getByRole('button',{name:'Vis hele kommunen'}).click(); await settle()
    const before=await state(); const bounds=await page.locator('.explore-themes__canvas').boundingBox()
    await page.locator('.explore-themes__canvas').focus()
    await page.mouse.move(bounds.x+bounds.width*.7,bounds.y+bounds.height*.45); await page.mouse.wheel(0,-180)
    await page.waitForFunction(old => __themeMap.getView().getResolution() < old, before.resolution); await settle()
    const zoom=await state(); assert.ok(zoom.resolution<before.resolution)
    await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5); await page.mouse.down(); await page.mouse.move(bounds.x+bounds.width*.5+60,bounds.y+bounds.height*.5+30,{steps:10}); await page.mouse.up(); await settle()
    assert.notDeepEqual((await state()).center,zoom.center)
    await page.locator('.ol-zoom-out').click(); await settle(); assert.ok((await state()).resolution>zoom.resolution)
    return {before,after:await state()}
  })
  assert.deepEqual(results.errors,[])
} catch(error) { results.failure=error.stack; console.error(error); if(page) await shot('failure').catch(()=>{}); process.exitCode=1 }
finally { await writeFile(`${output}/checks.json`,JSON.stringify(results,null,2)); await browser?.close(); await network?.dispose(); await server.close() }
