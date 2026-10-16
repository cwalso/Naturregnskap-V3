// Isolated controls, separate from the unchanged production-build walkthrough.
// In-memory hooks expose the map and provide one explicitly synthetic multi-year period.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'
import { navigateSite } from './map-browser-helpers.mjs'

const root = process.env.UX_REVIEW_ROOT
if (!root) throw new Error('UX_REVIEW_ROOT must point to the verified published source tree')
const output = process.env.BROWSER_OUTPUT ?? '.browser-results/user-journeys-supplement'
await mkdir(output, { recursive: true })
const server = await createServer({ root, server: { host: '127.0.0.1', port: 5216, strictPort: true }, plugins: [{ name: 'isolated-journey-review', enforce: 'pre', transform(code, id) {
  if (id.endsWith('/src/map/exploreThemeMap.ts')) return code.replace('  let destroyed = false', '  globalThis.__reviewMap = map; let destroyed = false')
  if (id.endsWith('/historical-loss/demoSource.ts')) return code.replace('  return municipalityNumber ===', '  if (globalThis.__reviewHistorical?.municipalityNumber === municipalityNumber) return globalThis.__reviewHistorical; return municipalityNumber ===')
} }] })
const report = { mode: 'isolated source controls; in-memory map hook and synthetic aggregate period; not published UI state', checks: [], screenshots: [], javascriptErrors: [] }
let browser, network
try {
  await server.listen()
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true })
  network = await request.newContext({ proxy: { server: process.env.HTTPS_PROXY } })
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  page.setDefaultTimeout(180000)
  page.on('pageerror', e => report.javascriptErrors.push(e.message))
  await page.route('https://**/*', async route => {
    const req = route.request()
    try { await route.fulfill({ response: await network.fetch(req.url(), { method: req.method(), data: req.postData() ?? undefined, headers: req.headers(), timeout: 60000 }) }) }
    catch { await route.abort() }
  })
  async function capture(name) {
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: true })
    await writeFile(`${output}/${name}.txt`, await page.locator('body').innerText())
    report.screenshots.push({ name, width: await page.evaluate(() => innerWidth), pageOverflow: await page.evaluate(() => document.documentElement.scrollWidth-innerWidth) })
  }
  await page.goto('http://127.0.0.1:5216')
  await page.getByRole('combobox', { name: 'Velg kommune', exact: true }).fill('Trondheim')
  await page.getByRole('option', { name: 'Trondheim 5001', exact: true }).click()
  await page.evaluate(async () => {
    const { trondheimLossDemo } = await import('/src/features/historical-loss/demoSource.ts')
    const { summarizeLoss, available } = await import('/src/features/historical-loss/model.ts')
    const summary = summarizeLoss(trondheimLossDemo.periods.slice(1, 9))
    globalThis.__reviewHistorical = { ...trondheimLossDemo, source: { ...trondheimLossDemo.source, version: 'synthetic-aggregate-review' }, periods: [{ id: '2017-2024', label: '2017–2024', start: '2017-01-01', end: '2024-12-31', nature: available(summary.nature), agriculture: available(summary.agriculture), ecosystems: summary.ecosystems, destinations: { status: 'not-in-delivery', reason: 'Synthetic test: delivery variable unconfirmed' } }] }
  })
  await navigateSite(page, 'Naturtapet')
  for (const [width, height] of [[1440,960],[390,844],[320,720]]) {
    await page.setViewportSize({ width, height })
    assert.equal(await page.locator('.loss-timeline__period').count(), 1)
    assert.equal(await page.getByRole('combobox', { name: 'Fra periode' }).locator('option').count(), 1)
    await capture(`B-synthetic-aggregate-${width}`)
  }
  report.checks.push({ aggregatePeriod: 'one 2017–2024 period, one period option, demo source retained; destination unavailable, no annual interpolation' })
  await page.evaluate(() => { globalThis.__reviewHistorical = null })
  await page.setViewportSize({ width: 1440, height: 960 })
  await navigateSite(page, 'Naturtema')
  await page.getByRole('button', { name: /Myr \(våtmark\)/ }).click()
  await page.waitForFunction(() => !document.querySelector('.ecosystem-page')?.innerText.includes('Laster arealfordeling'), {}, { timeout: 180000 })
  await capture('A-wetland-entry-1440')
  await navigateSite(page, 'Naturtema')
  await page.getByRole('button', { name: /^♠?\s*Skog/ }).click()
  await page.getByRole('button', { name: 'Åpne Utforsk i kart', exact: true }).click()
  await capture('A-forest-map-link-1440')
  report.checks.push({ forestLinkOpensMap: await page.evaluate(() => location.hash), opensAnalysisPanel: await page.getByRole('group', { name: 'Velg plananalyse' }).isVisible() })
  await page.getByRole('button', { name: 'Analyser planområder', exact: true }).click()
  await page.getByRole('table', { name: 'Økosystemtyper innenfor planområder' }).waitFor()
  const mapRegion = page.getByRole('region', { name: 'Interaktivt kart i Trondheim', exact: true })
  const view = () => page.evaluate(() => ({ center: globalThis.__reviewMap.getView().getCenter(), resolution: globalThis.__reviewMap.getView().getResolution() }))
  const original = await view()
  await mapRegion.focus(); await page.keyboard.press('ArrowRight')
  await page.waitForFunction(() => !globalThis.__reviewMap.getView().getAnimating())
  const panned = await view()
  assert.notDeepEqual(panned.center, original.center)
  await page.getByRole('table', { name: 'Økosystemtyper innenfor planområder' }).getByRole('button', { name: 'Skog', exact: true }).click()
  assert.deepEqual(await view(), panned)
  await page.getByRole('group', { name: 'Velg plananalyse' }).getByRole('button', { name: 'Registrerte naturverdier', exact: true }).click()
  await page.getByText('Unikt overlappsareal', { exact: true }).waitFor()
  assert.deepEqual(await view(), panned)
  await page.getByRole('button', { name: 'Lukk detaljpanel', exact: true }).click()
  for (const name of ['Framtidig utbygging', 'Verdsatte naturtyper', 'Verneområder', 'Inngrepsfri natur (INON)', 'Villrein', 'Grå arealer']) {
    await page.getByRole('checkbox', { name, exact: true }).check()
    await page.getByRole('checkbox', { name, exact: true }).uncheck()
    assert.deepEqual(await view(), panned)
  }
  report.checks.push({ panned, original, preservedDuring: ['category selection', 'analysis switch', 'closing panel', 'six independent supplementary/plan layer toggles'] })
  await capture('F-preserved-map-after-toggles-1440')
  report.completed = true
} catch (error) { report.failure = error.message; process.exitCode = 1 }
finally {
  await writeFile(`${output}/supplement.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
  await browser?.close(); await network?.dispose(); await server.close()
}
