import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'
import { navigateSite } from './map-browser-helpers.mjs'

const live = process.env.OVERVIEW_LIVE === '1'
const output = process.env.BROWSER_OUTPUT ?? '.browser-results/overview'
await mkdir(output, { recursive: true })
const results = { source: live ? 'live services; policy-blocked photos retain fallback' : 'controlled external responses', screenshots: [], layouts: [], images: [], requests: [], errors: [], comparisonSection: 'omitted: no existing national comparison data' }
const server = await createServer({ cacheDir: 'node_modules/.vite-overview', server: { host: '127.0.0.1', port: 5196, strictPort: true }, plugins: [{ name: 'observe-overview-map', transform(code, id) {
  if (id.endsWith('/src/map/municipalityMap.ts')) return code.replace('  return {\n    showBoundary(boundary) {', '  globalThis.__overviewMap = map; globalThis.__overviewMapCreations = (globalThis.__overviewMapCreations ?? 0) + 1; return {\n    showBoundary(boundary) {')
  if (id.endsWith('/src/map/exploreThemeMap.ts')) return code.replace('  const accountSource = new XYZ', '  globalThis.__layerStatus = onStatus;\n  const accountSource = new XYZ')
} }] })
let browser, network, page, accountError = false, boundaryError = false
const municipalities = [{ kommunenummer: '5001', kommunenavnNorsk: 'Trondheim' }, { kommunenummer: '0301', kommunenavnNorsk: 'Oslo' }]
const ssbCodes = ['01', '02', '03', '04', '05', '06', '07', '08-09', '10-11', '12-13', '14', '15-16', '17', '18', '19', '20', '21', '24', '22.01', '22.02']
const image = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#b5c9b5"/><path d="M0 800L400 180L700 500L950 250L1200 800" fill="#638477"/></svg>'
const state = () => page.evaluate(() => ({ center: __overviewMap.getView().getCenter(), resolution: __overviewMap.getView().getResolution(), creations: __overviewMapCreations }))
async function screenshot(name, locator = page) { await locator.screenshot({ path: `${output}/${name}.png`, ...(locator === page ? { fullPage: true } : {}) }); results.screenshots.push(name) }
async function overview() { await navigateSite(page, 'Kommuneoversikt'); await page.getByRole('heading', { name: 'Naturregnskap for Trondheim kommune', exact: true }).waitFor() }
async function topOfPage() {
  await page.evaluate(() => scrollTo({ top: 0, left: 0, behavior: 'instant' }))
  await page.waitForFunction(() => scrollY === 0)
}
async function loadImages() {
  for (const photo of await page.locator('.overview-photo').all()) await photo.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => [...document.querySelectorAll('.overview-photo img')].every(image => image.complete && (image.naturalWidth > 0 || image.hidden)))
  await topOfPage()
}
try {
  await server.listen()
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true })
  network = await request.newContext(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {})
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('pageerror', error => results.errors.push(error.message))
  await page.route('https://**/*', async route => {
    const req = route.request(), url = new URL(req.url())
    if (live) {
      try {
        const response = await network.fetch(req.url(), { method: req.method(), data: req.postData() ?? undefined, headers: req.headers(), timeout: 40000 })
        results.requests.push({ url: req.url(), status: response.status() })
        await route.fulfill({ response })
      } catch (error) { results.requests.push({ url: req.url(), error: error.message }); await route.abort() }
      return
    }
    if (url.hostname === 'images.unsplash.com') return route.fulfill({ contentType: 'image/svg+xml', body: image })
    if (url.pathname.endsWith('/kommuneinfo/v1/kommuner')) return route.fulfill({ json: municipalities })
    if (url.pathname.endsWith('/omrade')) {
      if (boundaryError) return route.fulfill({ status: 503 })
      const oslo = url.pathname.includes('/0301/')
      return route.fulfill({ json: { kommunenummer: oslo ? '0301' : '5001', kommunenavn: oslo ? 'Oslo' : 'Trondheim', omrade: { type: 'Polygon', coordinates: [[[10.3, 63.3], [10.5, 63.3], [10.5, 63.5], [10.3, 63.5], [10.3, 63.3]]] } } })
    }
    if (url.hostname === 'data.ssb.no') {
      if (accountError) return route.fulfill({ status: 503 })
      const oslo = url.searchParams.get('valueCodes[Region]') === '0301'
      const values = ssbCodes.map(code => code === '17' ? (oslo ? 7 : 12) : code === '15-16' ? 2 : code === '01' ? 1 : 0)
      return route.fulfill({ json: { dimension: { ArealKlasse: { category: { index: Object.fromEntries(ssbCodes.map((code, index) => [code, index])) } }, Tid: { category: { index: { '2025': 0 } } } }, value: values } })
    }
    if (url.hostname.includes('miljodirektoratet.no') && url.pathname.includes('/rest/')) return route.fulfill({ json: { count: url.pathname.includes('/villrein/') ? 0 : 3, features: [] } })
    return route.abort()
  })
  await page.goto('http://127.0.0.1:5196')
  await page.getByRole('combobox', { name: 'Velg kommune' }).fill('Trondheim')
  await page.getByRole('option', { name: 'Trondheim 5001' }).click()
  await page.getByRole('heading', { name: 'Naturregnskap for Trondheim kommune', exact: true }).waitFor()
  await page.waitForFunction(() => !!globalThis.__overviewMap && document.querySelector('.overview-summary__number')?.textContent.includes('dekar'))
  await page.waitForFunction(() => !document.querySelector('.overview-home__map-status'))
  const categories = await page.locator('.overview-summary__number').allTextContents()
  assert.equal(categories.length, 3)
  assert.ok(categories.every(value => value.includes('dekar')))
  assert.equal(await page.locator('.overview-theme-card').count(), 6)
  const natureTable = page.getByRole('table', { name: 'Naturtyper og status for historisk nedbygging' })
  assert.equal(await natureTable.getByRole('rowheader').count(), 5)
  assert.equal(await natureTable.getByRole('cell', { name: 'Ikke tilgjengelig', exact: true }).count(), 5)
  assert.equal(await natureTable.locator('details, summary, a, button').count(), 0)
  assert.equal(await page.getByRole('link', { name: /^Utforsk .* i dag/ }).count(), 0)
  await loadImages()
  results.images = await page.locator('.overview-photo img').evaluateAll(images => images.map(image => ({ source: image.currentSrc, alt: image.alt, naturalWidth: image.naturalWidth, fallback: image.hidden, width: image.getBoundingClientRect().width })))
  assert.equal(results.images.length, 8)
  assert.ok(results.images.every(image => image.alt && image.source.startsWith('https://images.unsplash.com/')))
  if (!live) assert.ok(results.images.every(image => image.naturalWidth > 0 && !image.fallback), 'Controlled image success path must decode')
  for (const [width, height] of [[1440, 1000], [900, 1000], [390, 844], [320, 720]]) {
    await page.setViewportSize({ width, height })
    await topOfPage()
    await page.getByRole('region', { name: 'Kart over Trondheim', exact: true }).waitFor()
    await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))))
    const before = await state()
    const measurement = await page.evaluate(() => {
      const hero = document.querySelector('.overview-home__hero').getBoundingClientRect(), header = document.querySelector('.site-header').getBoundingClientRect(), map = document.querySelector('.overview-home__map-target').getBoundingClientRect()
      return { overflow: document.documentElement.scrollWidth - innerWidth, mapWidth: map.width, mapHeight: map.height, headerClearance: hero.top - header.bottom, h1Count: document.querySelectorAll('h1').length }
    })
    assert.ok(measurement.overflow <= 1 && measurement.mapWidth > 100 && measurement.mapHeight >= 250 && measurement.headerClearance >= -1, JSON.stringify({ width, height, ...measurement }))
    assert.equal(measurement.h1Count, 1)
    assert.equal(before.creations, 1, 'Overview resize must retain its map instance')
    assert.deepEqual(await state(), before, 'Resize must settle without repeated map creation')
    await screenshot(`overview-${width}`)
    for (const [name, selector] of [['hero', '.overview-home__hero'], ['naturtap', '.overview-home__loss'], ['fortelling', '.overview-story'], ['drivkrefter', '.overview-story--reverse'], ['temakort', '.overview-home__themes']]) await screenshot(`${name}-${width}`, page.locator(selector).first())
    results.layouts.push({ width, height, ...measurement, categories })
    if (width <= 700) {
      await topOfPage()
      await page.getByRole('button', { name: 'Åpne meny', exact: true }).click()
      await page.getByRole('navigation', { name: 'Hovednavigasjon', exact: true }).getByRole('link', { name: 'Naturtapet', exact: true }).focus()
      await page.keyboard.press('Escape')
      assert.ok(await page.getByRole('button', { name: 'Åpne meny', exact: true }).evaluate(button => button === document.activeElement))
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 }); await topOfPage()
  const mapTarget = page.getByRole('region', { name: 'Kart over Trondheim', exact: true })
  await mapTarget.focus()
  const beforeKeyboard = await state()
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(center => globalThis.__overviewMap.getView().getCenter().some((value, index) => value !== center[index]), beforeKeyboard.center)
  const question = page.getByText('Hva er et naturregnskap?', { exact: true })
  await question.focus(); await page.keyboard.press('Enter')
  assert.ok(await question.evaluate(summary => summary.parentElement.open))
  await page.keyboard.press('Enter')
  await page.getByRole('link', { name: 'Mer om naturtapet', exact: true }).click()
  await page.getByRole('heading', { name: 'Naturtapet i Trondheim', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => scrollY), 0, 'Navigation from a long overview must open the destination at the top')
  await overview()
  await page.getByRole('link', { name: 'Se alle naturtema', exact: true }).click()
  await page.getByRole('heading', { name: 'Hva slags natur har vi i Trondheim?', exact: true }).waitFor(); await overview()
  await page.getByRole('link', { name: 'Åpne Utforsk i kart', exact: true }).click()
  await page.getByRole('heading', { name: 'Utforsk i kart', exact: true }).waitFor()
  await page.waitForFunction(() => !!globalThis.__layerStatus)
  results.layerRows = []
  for (const [width, height] of [[1440, 1000], [900, 1000], [390, 844]]) {
    await page.setViewportSize({ width, height }); await topOfPage()
    if (width === 390) await page.getByRole('navigation', { name: 'Kartkontroller' }).getByRole('button', { name: /^Kartlag/ }).click()
    const checkbox = page.getByRole('checkbox', { name: 'Grunnkart nivå 0', exact: true })
    await checkbox.scrollIntoViewIfNeeded()
    assert.ok(await checkbox.isChecked())
    const measure = () => page.locator('.explore-themes__layer').evaluateAll(rows => rows.map(row => {
      const box = row.getBoundingClientRect(), input = row.querySelector('input').getBoundingClientRect(), settings = row.querySelector('button').getBoundingClientRect()
      return { height: box.height, checkboxX: input.x - box.x, checkboxY: input.y - box.y, settingsX: settings.x - box.x, settingsY: settings.y - box.y }
    }))
    const baseline = await measure()
    for (const status of ['loading', 'empty', 'error', 'ready']) {
      await page.evaluate(status => globalThis.__layerStatus('level0', status, '5001'), status)
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)))
      assert.deepEqual(await measure(), baseline, `Layer rows must retain height and control positions: ${width}px / ${status}`)
    }
    await checkbox.uncheck(); assert.equal(await checkbox.isChecked(), false)
    await checkbox.check(); assert.equal(await checkbox.isChecked(), true)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1))
    results.layerRows.push({ width, heights: baseline.map(row => row.height), stableThroughLoadingEmptyErrorReady: true, toggles: true })
    await screenshot(`map-layer-rows-${width}`)
  }
  await page.getByRole('button', { name: 'Innstillinger for Grunnkart nivå 0', exact: true }).click()
  await page.evaluate(() => globalThis.__layerStatus('level0', 'error', '5001'))
  await page.getByRole('complementary', { name: 'Innstillinger: Grunnkart nivå 0' }).getByRole('alert').filter({ hasText: 'Dette er en datafeil' }).waitFor()
  await page.setViewportSize({ width: 1440, height: 1000 }); await overview()
  for (const [theme, hash] of [['Skog', 'tema-forest'], ['Våtmark', 'tema-vatmark'], ['Verneområder', 'tema-protected-areas'], ['Verdsatte naturtyper', 'tema-valued-nature'], ['Inngrepsfri natur', 'tema-infrastructure-free-nature'], ['Villrein', 'tema-wild-reindeer-areas']]) {
    await page.getByRole('link', { name: new RegExp(`Åpne temasiden ${theme}$`) }).click()
    await page.waitForFunction(hash => location.hash === `#${hash}`, hash)
    assert.equal(await page.getByRole('combobox', { name: 'Velg kommune' }).inputValue(), 'Trondheim')
    await overview()
  }
  if (!live) {
    const photo = page.locator('.overview-photo img').first()
    await photo.evaluate(image => image.dispatchEvent(new Event('error')))
    await page.getByText('Bilde er ikke tilgjengelig akkurat nå.', { exact: true }).waitFor()
    await screenshot('controlled-image-fallback')
  }
  await page.getByRole('combobox', { name: 'Velg kommune' }).fill('Oslo')
  await page.getByRole('option', { name: 'Oslo 0301' }).click()
  await page.getByRole('heading', { name: 'Naturregnskap for Oslo kommune', exact: true }).waitFor()
  await page.waitForFunction(() => document.querySelector('.overview-summary__number')?.textContent.includes('dekar'))
  assert.equal(await page.getByRole('combobox', { name: 'Velg kommune' }).inputValue(), 'Oslo')
  assert.equal(new URL(page.url()).hash, '#oversikt')
  assert.equal(await page.getByRole('region', { name: 'Kart over Oslo', exact: true }).count(), 1)
  if (!live) {
    await page.reload(); accountError = true; boundaryError = true
    await page.getByRole('combobox', { name: 'Velg kommune' }).fill('Oslo'); await page.getByRole('option', { name: 'Oslo 0301' }).click()
    await page.getByText('Kunne ikke hente arealbalansen. Prøv igjen senere.', { exact: true }).waitFor()
    await page.getByText('Kommunegrensen kunne ikke hentes.', { exact: true }).waitFor()
    assert.equal(await page.locator('.overview-home__map-target .map').isVisible(), false, 'An unavailable boundary must not present another extent as the municipality')
    assert.equal(await page.getByText('Areal ikke tilgjengelig', { exact: true }).count(), 3)
    assert.ok(await page.getByRole('link', { name: 'Se alle naturtema', exact: true }).isVisible())
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0)
    await screenshot('controlled-data-failure')
  }
  assert.deepEqual(results.errors, [])
  results.navigation = { naturtapet: true, naturtema: true, map: true, allSixThemes: true, municipalitySwitch: true, accordionKeyboard: true }
  console.log(JSON.stringify({ layouts: results.layouts, images: results.images, navigation: results.navigation, errors: results.errors }))
} catch (error) { results.failure = error.message; if (page) await screenshot('failure').catch(() => {}); throw error }
finally {
  await writeFile(`${output}/checks.json`, JSON.stringify(results, null, 2))
  await browser?.close(); await network?.dispose(); await server.close()
}
