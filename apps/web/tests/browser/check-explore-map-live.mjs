import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'

const output = process.env.BROWSER_OUTPUT ?? '.browser-results/live'
await mkdir(output, { recursive: true })
const server = await createServer({
  server: { host: '127.0.0.1', port: 5181, strictPort: true },
  plugins: [{
    name: 'expose-test-map',
    transform(code, id) {
      if (id.endsWith('/src/map/exploreAnalysisMap.ts')) {
        return code.replace('  let destroyed = false', '  globalThis.__exploreMap = map\n  let destroyed = false')
      }
    },
  }],
})
const responses = []
const errors = []
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
      responses.push({ status: response.status(), source: req.url().split('?')[0] })
      await route.fulfill({ response })
    } catch (error) {
      responses.push({ error: error.message, source: route.request().url().split('?')[0] })
      await route.abort()
    }
  })
  await page.goto('http://127.0.0.1:5181/tests/browser/explore-map.html')
  await page.locator('.explore-valued-nature canvas').waitFor({ timeout: 60000 })
  await page.waitForFunction(() => !document.querySelector('[role="status"]'), null, { timeout: 60000 })
  await page.waitForTimeout(1000)
  assert.equal(await page.getByRole('alert').count(), 0)
  assert.ok(responses.some((r) => r.source.includes('naturtyper_kuverdi') && r.status === 200))
  await page.screenshot({ path: `${output}/A-valued-alone.png`, fullPage: true })
  const state = () => page.evaluate(() => ({ center: globalThis.__exploreMap.getView().getCenter(), resolution: globalThis.__exploreMap.getView().getResolution() }))
  const before = await state()
  const map = page.locator('.explore-analysis-map__canvas')
  await map.focus()
  const box = await map.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, -240)
  await page.waitForFunction((r) => globalThis.__exploreMap.getView().getResolution() < r && !globalThis.__exploreMap.getView().getAnimating(), before.resolution)
  const zoomed = await state()
  await page.mouse.wheel(0, 180)
  await page.waitForFunction((r) => globalThis.__exploreMap.getView().getResolution() > r && !globalThis.__exploreMap.getView().getAnimating(), zoomed.resolution)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 40, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(2000)
  const manual = await state()
  assert.notDeepEqual(manual, before)
  await page.waitForTimeout(1000)
  assert.deepEqual(await state(), manual)
  await page.screenshot({ path: `${output}/A-manual-navigation.png`, fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(1000)
  assert.deepEqual(await state(), manual)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.screenshot({ path: `${output}/A-mobile.png`, fullPage: true })
  assert.deepEqual(errors, [])
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.goto('http://127.0.0.1:5181/tests/browser/explore-map.html?stage=B')
  await page.waitForFunction(() => !document.querySelector('[role="status"]'), null, { timeout: 60000 })
  await page.waitForTimeout(1000)
  const planError = await page.getByRole('alert').allTextContents()
  await page.screenshot({ path: `${output}/B-plan-alone.png`, fullPage: true })
  const planRendered = await page.evaluate(() => globalThis.__exploreMap.getLayers().getArray().some((layer) => layer.getClassName() === 'explore-plan-area' && layer.getVisible()))
  await writeFile(`${output}/results.json`, JSON.stringify({ stageA: 'passed', stageB: planRendered && !planError.length ? 'requires visual review' : 'blocked', before, zoomed, manual, errors, planError, responses }, null, 2))
  console.log(`Live stage A checks passed. Stage B: ${planRendered && !planError.length ? 'inspect screenshot' : 'BLOCKED: plan source unavailable'}. Screenshots: ${output}. Visual approval is separate.`)
} finally {
  await browser?.close()
  await network?.dispose()
  await server.close()
}
