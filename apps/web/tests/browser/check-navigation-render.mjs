import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { chromium } from 'playwright'
import { navigateSite } from './map-browser-helpers.mjs'

// Controlled external inputs verify layout and entry points in the built bundle.
// This is not a live Pages or analysis-data check.
const output = process.env.BROWSER_OUTPUT ?? '.browser-results/navigation'
await mkdir(output, { recursive: true })
const results = [], errors = []
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true })
async function check(root, baseline = false) {
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname.replace(/^\/Naturregnskap-V3\//, '').replace(/^\/+/, '') || 'index.html'
    const file = resolve(root, path)
    if (!file.startsWith(resolve(root) + '/')) { res.writeHead(403).end(); return }
    try {
      const body = await readFile(file)
      res.setHeader('content-type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' })[extname(file)] ?? 'application/octet-stream')
      res.end(body)
    } catch { res.writeHead(404).end() }
  })
  await new Promise(done => server.listen(0, '127.0.0.1', done))
  const page = await browser.newPage({ viewport: { width: 1440, height: baseline ? 720 : 960 } })
  page.on('pageerror', error => errors.push(error.message))
  await page.route('https://**/*', route => {
    const url = route.request().url()
    if (url.endsWith('/kommuneinfo/v1/kommuner')) return route.fulfill({ json: [{ kommunenummer: '5001', kommunenavnNorsk: 'Trondheim' }] })
    if (url.endsWith('/5001/omrade')) return route.fulfill({ json: { kommunenummer: '5001', kommunenavn: 'Trondheim', omrade: { type: 'Polygon', coordinates: [[[10.3, 63.3], [10.5, 63.3], [10.5, 63.5], [10.3, 63.5], [10.3, 63.3]]] } } })
    return route.abort()
  })
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/Naturregnskap-V3/`)
    await page.getByRole('combobox', { name: 'Velg kommune' }).fill('Trondheim')
    await page.getByRole('option', { name: 'Trondheim 5001' }).click()
    if (baseline) {
      await page.locator('summary[aria-label="Åpne meny"]').click()
      await page.getByRole('link', { name: 'Utforsk i kart', exact: true }).click()
      await page.locator('summary[aria-label="Åpne meny"]').click()
    } else await navigateSite(page, 'Utforsk i kart')
    await page.getByRole('region', { name: 'Interaktivt kart i Trondheim' }).waitFor()
    const entry = page.getByRole('button', { name: 'Analyser planoverlapp', exact: true }).filter({ visible: true })
    assert.equal(await entry.count(), 1)
    const isInViewport = () => entry.evaluate(button => {
      const r = button.getBoundingClientRect(), list = document.querySelector('.explore-themes__layer-list').getBoundingClientRect()
      return { page: r.top >= 0 && r.bottom <= innerHeight, list: r.top >= list.top && r.bottom <= list.bottom, hiddenByList: r.bottom <= list.top }
    })
    const before = await isInViewport()
    await page.locator('.explore-themes__layer-list').evaluate(list => { list.scrollTop = list.scrollHeight })
    const after = await isInViewport()
    assert.ok(before.page)
    if (baseline) {
      assert.ok(before.list && after.hiddenByList, 'Original entry scrolls completely out of the layer list')
      results.push({ baseline: true, before, after, buttonRendersInDeployedArtifact: true })
      await page.screenshot({ path: `${output}/baseline-scrolled.png` })
      return
    }
    assert.ok(after.page, 'Pinned entry must stay visible after scrolling')
    assert.equal(await entry.evaluate(button => !!button.closest('.explore-themes__layer-list')), false)
    for (const [width, height] of [[1440, 960], [900, 900], [832, 900], [701, 900], [700, 844], [390, 844], [320, 720]]) {
      await page.setViewportSize({ width, height })
      const navigation = page.getByRole('navigation', { name: 'Hovednavigasjon', exact: true })
      const menu = page.getByRole('button', { name: 'Åpne meny', exact: true })
      if (width > 832) {
        assert.ok(await navigation.isVisible())
        assert.equal(await menu.isVisible(), false)
        assert.equal(await navigation.getByRole('link', { name: 'Utforsk i kart', exact: true }).getAttribute('aria-current'), 'page')
      } else {
        assert.equal(await navigation.isVisible(), false)
        await menu.click()
        assert.ok(await navigation.isVisible())
        await navigation.getByRole('link', { name: 'Naturtema', exact: true }).focus()
        await page.keyboard.press('Escape')
        assert.equal(await navigation.isVisible(), false)
        assert.ok(await menu.evaluate(button => button === document.activeElement))
      }
      const visibleEntry = page.getByRole('button', { name: 'Analyser planoverlapp', exact: true }).filter({ visible: true })
      assert.equal(await visibleEntry.count(), 1)
      await visibleEntry.click()
      await page.getByRole('complementary', { name: 'Planoverlapp – naturtyper', exact: true }).waitFor()
      await page.keyboard.press('Escape')
      const measurements = await page.evaluate(() => {
        const r = document.querySelector('.explore-themes__canvas').getBoundingClientRect()
        return { overflow: document.documentElement.scrollWidth - innerWidth, mapWidth: r.width, mapHeight: r.height }
      })
      assert.ok(measurements.overflow <= 1 && measurements.mapWidth >= 100 && measurements.mapHeight >= 100, JSON.stringify({ width, measurements }))
      results.push({ width, height, ...measurements, analysisEntryOpens: true, navigationCorrect: true })
      await page.screenshot({ path: `${output}/navigation-${width}.png`, fullPage: true })
    }
  } finally { await page.close(); await new Promise(done => server.close(done)) }
}
try {
  if (process.env.PAGES_ARTIFACT) await check(process.env.PAGES_ARTIFACT, true)
  await check(resolve('dist'))
  assert.deepEqual(errors, [])
  await writeFile(`${output}/checks.json`, JSON.stringify({ results, errors, externalInputs: 'controlled', livePagesChecked: false }, null, 2))
  console.log(JSON.stringify({ results, errors }))
} finally { await browser.close() }
