// Read-only capture of existing calculations. Hooks retain intermediate arrays;
// neither calculation, request parameters, nor classification rules are changed.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import path from 'node:path'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'

const output = path.resolve(process.argv[2] ?? '../../work/overlap-differences/capture')
await mkdir(output, { recursive: true })
const server = await createServer({ server: { host: '127.0.0.1', port: 5217, strictPort: true }, plugins: [{ name: 'retain-existing-intermediates', enforce: 'pre', transform(code, id) {
  if (!id.endsWith('/src/map/plannedDevelopment.ts')) return
  return code.replace('    const cleaned = removeNarrowPlanStrips(planned, width)', '    globalThis.__overlapRaw = planned; globalThis.__overlapPlanAny = plannedAny; const cleaned = removeNarrowPlanStrips(planned, width)')
    .replace('  return {\n    tileCoord,\n    planned,', '  (globalThis.__overlapTiles ??= []).push({tileCoord, classes, plan}); return {\n    tileCoord,\n    planned,')
} }] })
const report = { capturedAt: new Date().toISOString(), sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), node: process.version, network: [], errors: [] }
report.overviewSha256 = createHash('sha256').update(await readFile('public/data/grunnkart/2025/overview/5001.png')).digest('hex')
let browser, network
const cache = new Map()
try {
  await server.listen()
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true })
  report.chromium = browser.version()
  network = await request.newContext({ proxy: { server: process.env.HTTPS_PROXY } })
  const page = await browser.newPage()
  page.on('pageerror', e => report.errors.push(e.message))
  await page.route('https://**/*', async route => {
    const req = route.request(), url = req.url()
    try {
      let response = cache.get(url)
      if (!response) {
        const r = await network.fetch(url, { headers: req.headers(), timeout: 60000 })
        assert.equal(r.status(), 200, url)
        const body = await r.body(), name = `response-${createHash('sha256').update(url).digest('hex').slice(0, 20)}.${r.headers()['content-type']?.includes('image') ? 'png' : 'json'}`
        response = { status: r.status(), headers: r.headers(), body }
        cache.set(url, response)
        await writeFile(`${output}/${name}`, body)
        report.network.push({ url, name, sha256: createHash('sha256').update(body).digest('hex'), bytes: body.length, status: r.status() })
      }
      await route.fulfill(response)
    } catch (error) { report.errors.push(error.message); await route.abort() }
  })
  await page.goto('http://127.0.0.1:5217')
  await page.evaluate(async () => {
    const old = await import('/src/map/plannedDevelopment.ts')
    globalThis.__overlapOld = await old.calculatePlannedDevelopment('5001')
    if (__overlapOld.status !== 'available') throw new Error('Old method unavailable')
    globalThis.__overlapBreakdown = await old.calculatePlannedNatureBreakdown(__overlapOld)
    globalThis.__overlapNew = await (await import('/src/features/plan-area/source.ts')).calculatePlanArea('5001')
    globalThis.__overlapParent = await (await import('/src/features/future-analysis/analysisMask.ts')).loadFutureNatureMask('5001')
  })
  report.results = await page.evaluate(() => {
    const { overlay, ...old } = __overlapOld
    const { cleaned, analysisMask, ...oldGrid } = overlay
    const { grid, ...newResult } = __overlapNew
    const { mask, ...newGrid } = grid
    const { cleaned: ignored, analysisMask: ignoredMask, ...parentGrid } = __overlapParent
    void cleaned; void analysisMask; void mask; void ignored; void ignoredMask
    return { old, oldGrid, oldBreakdown: __overlapBreakdown, newResult, newGrid, parentGrid }
  })
  const arrays = {
    'old-raw.bin': '__overlapRaw', 'old-plan-any.bin': '__overlapPlanAny',
    'old-clean.bin': '__overlapOld.overlay.cleaned', 'old-analysis-mask.bin': '__overlapOld.overlay.analysisMask',
    'new-parent.bin': '__overlapParent.analysisMask', 'new-detail.bin': '__overlapNew.grid.mask',
  }
  async function saveArray(name, expression) {
    const encoded = await page.evaluate(expression => {
      const array = (0, eval)(expression); let s = ''
      for (let i = 0; i < array.length; i += 32768) s += String.fromCharCode(...array.subarray(i, i+32768))
      return btoa(s)
    }, expression)
    await writeFile(`${output}/${name}.gz`, gzipSync(Buffer.from(encoded, 'base64')))
  }
  for (const [name, expression] of Object.entries(arrays)) await saveArray(name, expression)
  const coordinates = await page.evaluate(() => __overlapTiles.map(t => t.tileCoord))
  report.intermediateTiles = []
  for (let i = 0; i < coordinates.length; i++) {
    const name = `old-sampled-${coordinates[i].join('-')}.rgba`
    await saveArray(name, `__overlapTiles[${i}].classes`)
    report.intermediateTiles.push({ coordinate: coordinates[i], name: name+'.gz' })
  }
  report.completed = true
  console.log(JSON.stringify({ old: report.results.oldBreakdown.metrics, oldNatureDaa: report.results.old.natureKm2*1000, new: report.results.newResult.categories, capturedResponses: report.network.length }))
} catch (error) { report.failure = error.stack; process.exitCode = 1 }
finally {
  await writeFile(`${output}/capture.json`, JSON.stringify(report, null, 2))
  await browser?.close(); await network?.dispose(); await server.close()
}
