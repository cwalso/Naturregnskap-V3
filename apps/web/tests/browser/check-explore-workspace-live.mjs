import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'
import { exposeTestMap, viewState, waitForMapPaint, manualNavigation } from './map-browser-helpers.mjs'

const output = process.env.BROWSER_OUTPUT ?? '.browser-results/workspace'
await mkdir(output, { recursive: true })
const server = await createServer({ server: { host: '127.0.0.1', port: 5183, strictPort: true }, plugins: [exposeTestMap] })
let browser
let network
const errors = []
try {
  await server.listen()
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true })
  network = await request.newContext(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {})
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('https://**/*', async (route) => {
    try {
      const req = route.request()
      await route.fulfill({ response: await network.fetch(req.url(), { method: req.method(), data: req.postData() ?? undefined, headers: req.headers(), timeout: 30000 }) })
    } catch { await route.abort() }
  })
  await page.goto('http://127.0.0.1:5183')
  await page.getByRole('combobox', { name: 'Velg kommune' }).fill('Trondheim')
  await page.getByRole('option', { name: 'Trondheim 5001' }).click()
  await page.locator('summary[aria-label="Åpne meny"]').click()
  await page.getByRole('link', { name: 'Utforsk i kart', exact: true }).click()
  await page.locator('summary[aria-label="Åpne meny"]').click()
  await page.waitForFunction(() => globalThis.__exploreContext?.plan && globalThis.__exploreContext.showNatureAgriculture, null, { timeout: 180000 })
  await waitForMapPaint(page)
  await page.screenshot({ path: `${output}/workspace-nature.png`, fullPage: true })
  const navigation = await manualNavigation(page, page.locator('.explore-analysis-map__canvas'))
  const before = await viewState(page)
  const valuedRadio = page.getByRole('radio', { name: 'Verdsatte naturtyper', exact: true })
  const natureRadio = page.getByRole('radio', { name: 'Natur og jordbruk', exact: true })
  await valuedRadio.check()
  await page.waitForFunction(() => globalThis.__exploreContext?.valued, null, { timeout: 180000 })
  await waitForMapPaint(page)
  assert.deepEqual(await viewState(page), before)
  await page.screenshot({ path: `${output}/workspace-valued.png`, fullPage: true })
  await page.getByRole('button', { name: /^Stor verdi/ }).click()
  await waitForMapPaint(page)
  assert.deepEqual(await viewState(page), before, 'Value filter must preserve manual view')
  const list = page.getByRole('list', { name: 'Berørte lokaliteter' })
  await list.getByRole('button').first().click()
  await waitForMapPaint(page)
  assert.deepEqual(await viewState(page), before, 'Object selection must preserve manual view')
  assert.ok(await page.evaluate(() => !!globalThis.__exploreContext.selectedLocalityId))
  await page.screenshot({ path: `${output}/workspace-selected.png`, fullPage: true })
  const type = page.getByRole('combobox', { name: 'Naturtype', exact: true })
  const firstType = await type.locator('option').nth(1).getAttribute('value')
  await type.selectOption(firstType)
  await waitForMapPaint(page)
  assert.deepEqual(await viewState(page), before, 'Nature type filter must preserve manual view')
  await natureRadio.check()
  await waitForMapPaint(page)
  assert.deepEqual(await viewState(page), before)
  assert.ok(await page.evaluate(() => {
    const layers = globalThis.__exploreMap.getLayers().getArray()
    return ['explore-overlap', 'explore-valued-nature'].every((name) => !layers.find((layer) => layer.getClassName() === name).getVisible())
      && layers.find((layer) => layer.getClassName() === 'explore-selected-locality').getSource().getFeatures().length === 0
  }))
  await valuedRadio.check()
  await page.waitForFunction(() => globalThis.__exploreContext?.valued && globalThis.__exploreContext.selection.kind === 'all', null, { timeout: 180000 })
  await waitForMapPaint(page)
  assert.deepEqual(await viewState(page), before)
  await page.setViewportSize({ width: 390, height: 844 })
  await waitForMapPaint(page)
  assert.deepEqual(await viewState(page), before)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.screenshot({ path: `${output}/workspace-mobile.png`, fullPage: true })
  assert.equal(await page.getByRole('button', { name: /Zoom til treff|Finn resultatet|Eget område/ }).count(), 0)
  assert.equal(await page.getByRole('alert').count(), 0)
  assert.deepEqual(errors, [])
  await writeFile(`${output}/workspace-results.json`, JSON.stringify({ navigation, themeRoundTrip: true, valueFilter: true, objectSelection: true, mobileWidth: 390, errors }, null, 2))
  console.log('Live public route passed: real analysis, manual navigation, theme round trip, value/object selection and 390 px without view reset.')
} finally { await browser?.close(); await network?.dispose(); await server.close() }
