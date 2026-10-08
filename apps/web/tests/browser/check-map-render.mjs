import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from 'vite'

// Controlled geometries and analysis masks isolate the real canvas pipeline.
// Passing this test never substitutes for Trondheim acceptance with live data.
const output = resolve(process.env.BROWSER_OUTPUT_DIR || '.browser-results')
await mkdir(output, { recursive: true })
const server = await createServer({
  server: { host: '127.0.0.1', port: 5181, strictPort: true },
  plugins: [{
    name: 'capture-test-map', enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/map/municipalityMap.ts')) return
      // Expose the real instance only in the test server, never in production.
      return code.replace('  function refreshMapSize()', '  globalThis.renderMap = map;\n  function refreshMapSize()')
    },
  }],
})
await server.listen()
let browser
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined })
  const page = await browser.newPage({ viewport: { width: 1100, height: 820 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  // External network and basemap colors must not influence deterministic pixels.
  await page.route('https://**/*', (route) => route.abort())
  await page.goto('http://127.0.0.1:5181/tests/browser/map-render.html')
  await page.waitForFunction(() => window.renderFixture && window.renderMap && window.renderMap.getView().getResolution() < 100)
  async function counts() {
    return page.evaluate(() => {
      const roles = {}
      for (const name of ['analysis-area', 'valued-localities-context', 'analysis-overlap', 'valued-localities-selection']) {
        let count = 0
        for (const canvas of document.querySelectorAll(`.${name} canvas`)) {
          if (canvas.closest(`.${name}`).style.display === 'none') continue
          const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
          for (let i = 3; i < data.length; i += 4) if (data[i] > 25) count++
        }
        roles[name] = count
      }
      return roles
    })
  }
  async function visibleColors() {
    // Decode the browser's actual composited screenshot, after layer opacity,
    // stacking and municipality masking. Source/canvas pixels alone could pass
    // even when another layer hides the whole result.
    const png = await page.locator('#map').screenshot()
    return page.evaluate(async (url) => {
      const image = new Image()
      image.src = url
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, image.width, image.height).data
      const colors = { plan: 0, locality: 0, overlap: 0, nature: 0 }
      for (let i = 0; i < pixels.length; i += 4) {
        const [r, g, b] = pixels.subarray(i, i + 3)
        if (b > r * 1.1 && g > r * 1.15 && b > g * 1.05) colors.plan++
        if (r > g * 1.12 && g > b * 1.08) colors.locality++
        if (r > g * 1.15 && b > r * 1.05) colors.overlap++
        if (g > r * 1.2 && g > b * 1.05) colors.nature++
      }
      colors.samples = Object.fromEntries(Object.entries({
        boundary: [262000 + 8.5 * 21.15625, 7038400],
        locality: [262080, 7038480],
        firstHit: [262250, 7038400],
        secondHit: [262520, 7038350],
      }).map(([name, coordinate]) => {
        const [x, y] = window.renderMap.getPixelFromCoordinate(coordinate).map(Math.floor)
        assertInMap(x, y)
        return [name, Array.from(pixels.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 3))]
      }))
      function assertInMap(x, y) {
        if (x < 0 || y < 0 || x >= image.width || y >= image.height) throw new Error('Sample outside visible map')
      }
      return colors
    }, `data:image/png;base64,${png.toString('base64')}`)
  }
  function assertVisibleValued(colors) {
    for (const role of ['plan', 'locality', 'overlap']) assert.ok(colors[role] > 1000, `${role} must be visible in final screenshot: ${colors[role]}`)
    const [pr, pg, pb] = colors.samples.boundary
    assert.ok(pg > pr * 1.15 && pb > pg * 1.05, 'Plan edge must be visibly blue at its actual coordinate')
    const [lr, lg, lb] = colors.samples.locality
    assert.ok(lr > lg * 1.1 && lg > lb * 1.05, 'Source locality must be visibly orange outside the plan')
    const [hr, hg, hb] = colors.samples.firstHit
    assert.ok(hr > hg * 1.15 && hb > hr * 1.05, 'Actual overlap coordinate must be visibly purple')
  }
  async function waitPaint() {
    await page.evaluate(() => new Promise((done, fail) => {
      const timeout = setTimeout(() => fail(new Error('Map did not complete rendering')), 10000)
      window.renderMap.once('rendercomplete', () => { clearTimeout(timeout); done() })
      window.renderMap.renderSync()
    }))
  }
  const view = () => page.evaluate(() => ({ center: window.renderMap.getView().getCenter(), resolution: window.renderMap.getView().getResolution() }))
  await waitPaint()
  const a = await counts()
  for (const name of ['analysis-area', 'valued-localities-context', 'analysis-overlap']) assert.ok(a[name] > 1000, `${name} must paint visible pixels: ${a[name]}`)
  const visibleA = await visibleColors()
  assertVisibleValued(visibleA)
  await page.screenshot({ path: resolve(output, 'A-valued.png') })
  const initialView = await view()
  await page.click('#nature')
  await waitPaint()
  const b = await counts()
  assert.equal(b['valued-localities-context'], 0, 'Old locality canvas must be cleared')
  assert.equal(b['valued-localities-selection'], 0)
  assert.ok(b['analysis-overlap'] > 1000)
  assert.deepEqual(await view(), initialView)
  const visibleB = await visibleColors()
  assert.ok(visibleB.plan > 1000 && visibleB.nature > 1000 && visibleB.locality > 1000, JSON.stringify(visibleB))
  assert.equal(visibleB.overlap, 0, 'Old purple overlap must be absent in composited map')
  const [nr, ng, nb] = visibleB.samples.firstHit
  assert.ok(ng > nr * 1.3 && nb > ng * .75 && nb < ng, 'Nature must be visible at its actual hit coordinate')
  const [ar, ag, ab] = visibleB.samples.secondHit
  assert.ok(ar > ag * 1.3 && ag > ab * 1.3, 'Agriculture must be visible at its actual hit coordinate')
  const [br, bg, bb] = visibleB.samples.boundary
  assert.ok(bg > br * 1.15 && bb > bg * 1.05, 'Plan boundary must survive a full-area overlap')
  await page.screenshot({ path: resolve(output, 'B-nature-agriculture.png') })
  await page.click('#valued')
  await waitPaint()
  const c = await counts()
  assert.deepEqual(c, a, 'Round trip must restore the same rendered roles without stale layers')
  assert.deepEqual(await view(), initialView)
  const visibleC = await visibleColors()
  assert.deepEqual(visibleC, visibleA)
  await page.screenshot({ path: resolve(output, 'C-theme-roundtrip.png') })
  const map = page.locator('#map')
  await map.focus()
  const box = await map.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, -220)
  await page.waitForFunction((before) => window.renderMap.getView().getResolution() !== before && !window.renderMap.getView().getAnimating(), initialView.resolution)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 55, box.y + box.height / 2 + 25, { steps: 10 })
  await page.mouse.up()
  await page.waitForFunction(() => !window.renderMap.getView().getAnimating())
  await waitPaint()
  const manualView = await view()
  assert.notDeepEqual(manualView, initialView)
  const d = await counts()
  for (const name of ['analysis-area', 'valued-localities-context', 'analysis-overlap']) assert.ok(d[name] > 1000, `${name} must survive manual navigation`)
  const visibleD = await visibleColors()
  assertVisibleValued(visibleD)
  await page.screenshot({ path: resolve(output, 'D-manual-navigation.png') })
  await page.click('#filter')
  await waitPaint()
  const filtered = await counts()
  assert.ok(filtered['analysis-overlap'] > 1000 && filtered['analysis-overlap'] < d['analysis-overlap'], 'Filter must change actual painted overlap')
  assert.ok(filtered['valued-localities-context'] < d['valued-localities-context'])
  const visibleFiltered = await visibleColors()
  assert.ok(visibleFiltered.overlap > 1000 && visibleFiltered.overlap < visibleD.overlap)
  assert.deepEqual(await view(), manualView, 'Filter must preserve user view')
  await page.click('#select')
  await waitPaint()
  assert.ok((await counts())['valued-localities-selection'] > 1000, 'Selection must actually paint an outline')
  assert.deepEqual(await view(), manualView, 'Selecting a locality must preserve user view')
  await page.screenshot({ path: resolve(output, 'E-filter-selection.png') })
  // A real map click must choose the source object, not just a list fixture.
  await page.click('#all')
  await waitPaint()
  const pixel = await page.evaluate(() => window.renderMap.getPixelFromCoordinate([262520, 7038350]))
  await page.mouse.click(box.x + pixel[0], box.y + pixel[1])
  await page.waitForFunction(() => window.renderFixture.selectedId === '2')
  await waitPaint()
  assert.deepEqual(await view(), manualView, 'Map object click must preserve user view')
  assert.ok((await counts())['valued-localities-selection'] > 1000)
  assert.deepEqual(errors, [])
  await writeFile(resolve(output, 'render-results.json'), JSON.stringify({ fixture: true, serviceAcceptance: false, a, b, c, d, filtered, visibleA, visibleB, visibleC, visibleD, visibleFiltered, initialView, manualView }, null, 2))
  console.log('Chromium canvas regression passed: plan, source locality, overlap, theme switch, manual navigation, filter and selection.')
} finally {
  await browser?.close()
  await server.close()
}
