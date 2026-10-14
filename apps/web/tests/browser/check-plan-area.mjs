import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'
const output = process.env.BROWSER_OUTPUT ?? '.browser-results/plan-area'
await mkdir(output, { recursive: true })
const server = await createServer({ cacheDir: 'node_modules/.vite-plan-area', server: { host: '127.0.0.1', port: 5200, strictPort: true }, plugins: [{ name: 'plan-area-audit', enforce: 'pre', transform(code,id) {
  if (id.endsWith('/future-analysis/analysisMask.ts')) return code.replace("  return { kind: 'planned'", "  const result = { kind: 'planned'").replace('analysisMask: mask }', 'analysisMask: mask }; globalThis.__areaParent = result; return result')
} }] })
let browser, network
const rawTiles = [], errors = []
try {
  await server.listen()
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true })
  network = await request.newContext({ proxy: { server: process.env.HTTPS_PROXY } })
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('https://**/*', async route => {
    const req = route.request(), url = new URL(req.url())
    try {
      const response = await network.fetch(req.url(), { method: req.method(), data: req.postData() ?? undefined, headers: req.headers(), timeout: 60000 })
      if (url.hostname === 'wms.nibio.no' && (url.searchParams.get('sld_body') ?? '').includes('#ff00ff')) {
        const name = `classification-${rawTiles.length}.png`
        rawTiles.push({ name, bbox: url.searchParams.get('bbox').split(',').map(Number), status: response.status() })
        await writeFile(`${output}/${name}`, await response.body())
      }
      await route.fulfill({ response })
    } catch { await route.abort() }
  })
  await page.goto('http://127.0.0.1:5200')
  const result = await page.evaluate(async () => {
    const { calculatePlanArea } = await import('/src/features/plan-area/source.ts')
    const result = await calculatePlanArea('5001'); globalThis.__areaResult = result
    assertAvailable(result)
    function assertAvailable(r) { if (r.status !== 'available') throw new Error(r.reason) }
    const { planAreaGeometry } = await import('/src/features/plan-area/model.ts')
    const { geometryArea } = await import('/src/features/future-analysis/geometry.ts')
    const geometryAreas = result.categories.map(c => ({ id:c.id, projectedM2: geometryArea(planAreaGeometry(result,{kind:'category',id:c.id})) }))
    const { mask, ...grid } = result.grid
    return { ...result, grid, geometryAreas }
  })
  assert.notEqual(result.classification.status, 'error', 'The live classification source must succeed at checkpoint A')
  assert.ok(result.natureDaa > 0 && result.agricultureDaa > 0)
  assert.ok(Math.abs(result.categories.reduce((n,c)=>n+c.areaDaa,0)-result.totalDaa)<1e-8)
  for (const c of result.categories) assert.ok(Math.abs(result.geometryAreas.find(g=>g.id===c.id).projectedM2*result.provenance.areaFactor/1000-c.areaDaa)<1e-5)
  const bytes = await page.evaluate(() => {
    const base64 = array => { let s='';for(let i=0;i<array.length;i+=32768)s+=String.fromCharCode(...array.subarray(i,i+32768));return btoa(s) }
    const { analysisMask, cleaned, ...parent } = globalThis.__areaParent
    return { parent, parentBase64:base64(analysisMask), resultBase64:base64(globalThis.__areaResult.grid.mask) }
  })
  await writeFile(`${output}/parent-mask.bin`, Buffer.from(bytes.parentBase64,'base64'))
  await writeFile(`${output}/result-mask.bin`, Buffer.from(bytes.resultBase64,'base64'))
  await writeFile(`${output}/inputs.json`,JSON.stringify({ parent:bytes.parent, tiles:rawTiles },null,2))
  await writeFile(`${output}/result.json`,JSON.stringify(result,null,2))
  const unavailable=await page.evaluate(async()=>await(await import('/src/features/plan-area/source.ts')).calculatePlanArea('0301'))
  assert.equal(unavailable.status,'not_available')
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({natureDaa:result.natureDaa,agricultureDaa:result.agricultureDaa,totalDaa:result.totalDaa,categories:result.categories,classification:result.classification,analysisId:result.analysisId,tiles:rawTiles.length}))
} finally { await browser?.close();await network?.dispose();await server.close() }
