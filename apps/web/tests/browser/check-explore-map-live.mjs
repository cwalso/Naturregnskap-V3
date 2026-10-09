import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'
import { exposeTestMap, viewState, waitForMapPaint, manualNavigation } from './map-browser-helpers.mjs'

const output = process.env.BROWSER_OUTPUT ?? '.browser-results/live'
await mkdir(output, { recursive: true })
const server = await createServer({ server: { host: '127.0.0.1', port: 5181, strictPort: true }, plugins: [exposeTestMap] })
const responses = []
const errors = []
const navigation = {}
let browser
let network
try {
  await server.listen()
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true })
  network = await request.newContext(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {})
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('https://**/*', async (route) => {
    try {
      const req = route.request()
      const response = await network.fetch(req.url(), { method: req.method(), data: req.postData() ?? undefined, headers: req.headers(), timeout: 30000 })
      const item = { status: response.status(), source: req.url().split('?')[0], method: req.method() }
      if (req.url().includes('nap.ft.dibk.no')) Object.assign(item, { contentType: response.headers()['content-type'], bytes: (await response.body()).length, prefix: (await response.body()).subarray(0, 8).toString('hex') })
      responses.push(item)
      await route.fulfill({ response })
    } catch (error) { responses.push({ error: error.message, source: route.request().url().split('?')[0] }); await route.abort() }
  })
  await page.goto('http://127.0.0.1:5181/tests/browser/explore-map.html')
  const map = page.locator('.explore-analysis-map__canvas')
  async function ready(stage) {
    await page.waitForFunction((stage) => {
      const context = globalThis.__exploreContext
      if (!context || document.querySelector('[role="status"]')) return false
      if (stage === 'A') return context.showValuedNature && !context.plan
      if (!context.plan) return false
      if (stage === 'B') return !context.showValuedNature && !context.showNatureAgriculture
      if (stage === 'C') return context.showValuedNature && !context.valued
      if (stage === 'D') return context.showValuedNature && context.valued
      return !context.showValuedNature && context.showNatureAgriculture
    }, stage, { timeout: 180000 })
    assert.equal(await page.getByRole('alert').count(), 0)
    await waitForMapPaint(page)
  }
  for (const stage of ['A', 'B', 'C', 'D', 'E']) {
    const before = stage === 'A' ? null : await viewState(page)
    if (stage !== 'A') await page.getByRole('button', { name: `Trinn ${stage}`, exact: true }).click()
    await ready(stage)
    if (before) assert.deepEqual(await viewState(page), before, `Stage ${stage} must preserve the user's view`)
    await page.screenshot({ path: `${output}/${stage}.png`, fullPage: true })
    navigation[stage] = await manualNavigation(page, map)
    await page.screenshot({ path: `${output}/${stage}-manual.png`, fullPage: true })
    console.log(`Stage ${stage}: real data rendered and navigation passed; inspect screenshots for visual acceptance.`)
  }
  const beforeRoundTrip = await viewState(page)
  await page.getByRole('button', { name: 'Trinn D', exact: true }).click()
  await ready('D')
  assert.deepEqual(await viewState(page), beforeRoundTrip)
  const layers = await page.evaluate(() => globalThis.__exploreMap.getLayers().getArray().map((layer) => ({ name: layer.getClassName(), visible: layer.getVisible() })))
  assert.ok(layers.some((layer) => layer.name === 'explore-overlap' && layer.visible))
  assert.ok(layers.some((layer) => layer.name === 'explore-nature-agriculture' && !layer.visible))
  await page.setViewportSize({ width: 390, height: 844 })
  await waitForMapPaint(page)
  assert.deepEqual(await viewState(page), beforeRoundTrip)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.screenshot({ path: `${output}/D-mobile.png`, fullPage: true })
  const planResponses = responses.filter((response) => response.source.includes('nap.ft.dibk.no'))
  assert.ok(planResponses.length > 0)
  assert.ok(planResponses.every((response) => response.status === 200 && response.prefix === '89504e470d0a1a0a'))
  assert.deepEqual(errors, [])
  await writeFile(`${output}/results.json`, JSON.stringify({ completed: ['A', 'B', 'C', 'D', 'E'], visualApproval: 'requires image review', navigation, layers, errors, responses }, null, 2))
} finally { await browser?.close(); await network?.dispose(); await server.close() }
