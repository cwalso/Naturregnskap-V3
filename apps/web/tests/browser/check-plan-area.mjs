import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'
import { navigateSite } from './map-browser-helpers.mjs'
const output = process.env.BROWSER_OUTPUT ?? '.browser-results/plan-area'
await mkdir(output, { recursive: true })
const server = await createServer({ cacheDir: 'node_modules/.vite-plan-area', server: { host: '127.0.0.1', port: 5200, strictPort: true }, plugins: [{ name: 'plan-area-audit', enforce: 'pre', transform(code,id) {
  if (id.endsWith('/future-analysis/analysisMask.ts')) return code.replace("  return { kind: 'planned'", "  const result = { kind: 'planned'").replace('analysisMask: mask }', 'analysisMask: mask }; globalThis.__areaParent = result; return result')
  if (id.endsWith('/src/map/exploreThemeMap.ts')) return code.replace('  let destroyed = false', '  globalThis.__planAreaMap = map; globalThis.__planMapCreations=(globalThis.__planMapCreations??0)+1; let destroyed = false').replace('    update(next) {','    update(next) { globalThis.__planAreaContext=next;')
  if (id.endsWith('/historical-loss/demoSource.ts')) return code.replace('  return municipalityNumber ===','  if(globalThis.__historicalOverride?.municipalityNumber===municipalityNumber)return globalThis.__historicalOverride; return municipalityNumber ===')
} }] })
let browser, network
const rawTiles = [], errors = []
let failPlan=false
try {
  await server.listen()
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true })
  network = await request.newContext({ proxy: { server: process.env.HTTPS_PROXY } })
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('https://**/*', async route => {
    const req = route.request(), url = new URL(req.url())
    if(failPlan&&url.hostname==='nap.ft.dibk.no')return route.fulfill({status:503,body:'Controlled plan-service failure'})
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
  await page.evaluate(async()=>{
    const {createExploreLayerMap}=await import('/src/map/exploreThemeMap.ts')
    const {getMunicipalityBoundary}=await import('/src/api/municipalities.ts')
    const {initialMapLayers}=await import('/src/features/explore-map/mapThemes.ts')
    const target=document.createElement('div');globalThis.__areaAuditTarget=target;target.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:100;background:white';document.body.append(target)
    globalThis.__areaController=createExploreLayerMap(target,()=>{})
    globalThis.__areaContext={boundary:await getMunicipalityBoundary('5001'),layers:initialMapLayers(),data:null,filter:{natureType:null,value:null},selectedId:null}
    __areaController.update(__areaContext)
    __areaController.setPlanArea(__areaResult,{kind:'all'})
  })
  const view=()=>page.evaluate(()=>({center:__planAreaMap.getView().getCenter(),resolution:__planAreaMap.getView().getResolution()}))
  await page.waitForFunction(()=>__planAreaMap.getSize()?.[0]>100)
  const before=await view(),mapChecks=[]
  for(const selection of [{kind:'all'},{kind:'nature'},{kind:'agriculture'},...result.categories.map(c=>({kind:'category',id:c.id}))]){
    await page.evaluate(s=>__areaController.setPlanArea(__areaResult,s),selection)
    const mapped=await page.evaluate(()=>__planAreaMap.getLayers().getArray().find(l=>l.getClassName()==='plan-area-categories').getSource().getFeatures().map(f=>({id:f.getId(),area:f.getGeometry().getArea()})))
    const expected=result.categories.filter(c=>c.cells>0&&(selection.kind==='all'||(selection.kind==='category'?c.id===selection.id:c.group===selection.kind)))
    assert.deepEqual(mapped.map(m=>m.id).sort(),expected.map(c=>c.id).sort())
    for(const metric of expected)assert.ok(Math.abs(mapped.find(m=>m.id===metric.id).area*result.provenance.areaFactor/1000-metric.areaDaa)<1e-5)
    assert.deepEqual(await view(),before,'Category choice moved the map')
    mapChecks.push({selection,mapped})
  }
  await page.evaluate(()=>__areaController.setPlanArea(__areaResult,{kind:'category',id:'skog'},true))
  assert.notDeepEqual(await view(),before,'Explicit fit did not adjust the view')
  await page.screenshot({path:`${output}/forest-map-1440.png`})
  await page.evaluate(()=>__areaController.setPlanArea(null,{kind:'all'}))
  assert.equal(await page.evaluate(()=>__planAreaMap.getLayers().getArray().find(l=>l.getClassName()==='plan-area-categories').getVisible()),false)
  await writeFile(`${output}/map-checks.json`,JSON.stringify(mapChecks,null,2))
  await page.evaluate(()=>{__areaController.destroy();__areaAuditTarget.remove()})
  await page.getByRole('combobox',{name:'Velg kommune'}).fill('Trondheim')
  await page.getByRole('option',{name:'Trondheim 5001'}).click()
  await page.getByLabel('Oppsummering av arealer i planområder').waitFor()
  assert.match(await page.getByLabel('Oppsummering av arealer i planområder').textContent(),/2\s788,8/)
  const uiChecks=[]
  for(const [width,height] of [[1440,960],[900,900],[390,844],[320,720]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}))
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0)
    await page.screenshot({path:`${output}/overview-${width}.png`,fullPage:true})
  }
  await page.setViewportSize({width:1440,height:960})
  await page.getByRole('link',{name:'Åpne arealfordelingen i kart',exact:true}).click()
  await page.getByRole('complementary',{name:'Arealer avsatt til framtidig utbygging',exact:true}).waitFor()
  await page.getByRole('table',{name:'Økosystemtyper innenfor planområder'}).waitFor()
  assert.equal(await page.getByRole('combobox',{name:'Velg kommune'}).inputValue(),'Trondheim')
  await page.getByRole('checkbox',{name:'Framtidig utbygging',exact:true}).check()
  const instance=await page.evaluate(()=>__planMapCreations)
  const layerState=await page.evaluate(()=>__planAreaContext.layers)
  for(const [width,height] of [[1440,960],[900,900],[390,844],[320,720]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}))
    const table=page.getByRole('table',{name:'Økosystemtyper innenfor planområder'})
    await table.waitFor()
    await page.getByRole('button',{name:'Nullstill utvalg',exact:true}).click()
    await page.getByRole('button',{name:'Vis hele kommunen',exact:true}).click()
    await page.evaluate(()=>document.querySelector('.explore-themes__detail-scroll').scrollTop=0)
    await page.evaluate(()=>__planAreaMap.renderSync())
    await page.screenshot({path:`${output}/all-${width}.png`,fullPage:true})
    const stable=await view()
    for(const category of result.categories.filter(c=>c.group==='nature')){
      await table.getByRole('button',{name:category.label,exact:true}).click()
      const mapped=await page.evaluate(()=>__planAreaMap.getLayers().getArray().find(l=>l.getClassName()==='plan-area-categories').getSource().getFeatures().map(f=>({id:f.getId(),area:f.getGeometry().getArea()})))
      assert.deepEqual(mapped.map(m=>m.id),category.cells?[category.id]:[])
      if(category.cells)assert.ok(Math.abs(mapped[0].area*result.provenance.areaFactor/1000-category.areaDaa)<1e-5)
      assert.deepEqual(await view(),stable)
    }
    for(const kind of ['nature','agriculture']){
      await page.getByRole('group',{name:'Velg arealer i kartet'}).getByRole('button',{name:kind==='nature'?'Natur':'Jordbruk',exact:true}).click()
      const ids=await page.evaluate(()=>__planAreaMap.getLayers().getArray().find(l=>l.getClassName()==='plan-area-categories').getSource().getFeatures().map(f=>f.getId()))
      assert.deepEqual(ids.sort(),result.categories.filter(c=>c.group===kind&&c.cells).map(c=>c.id).sort())
      assert.deepEqual(await view(),stable)
    }
    await table.getByRole('button',{name:'Skog',exact:true}).focus();await page.keyboard.press('Enter')
    assert.equal(await table.getByRole('button',{name:'Skog',exact:true}).getAttribute('aria-pressed'),'true')
    await page.getByRole('button',{name:'Tilpass kart til utvalget',exact:true}).click()
    await page.evaluate(()=>__planAreaMap.renderSync())
    await page.screenshot({path:`${output}/forest-${width}.png`,fullPage:true})
    if(width<=390){
      await page.getByRole('button',{name:'Vis kart',exact:true}).click()
      assert.equal(await page.getByRole('table',{name:'Økosystemtyper innenfor planområder'}).count(),0)
      assert.equal(await page.evaluate(()=>__planAreaMap.getLayers().getArray().find(l=>l.getClassName()==='plan-area-categories').getVisible()),true)
      await page.screenshot({path:`${output}/forest-map-${width}.png`,fullPage:true})
      await page.getByRole('button',{name:'Analyser planområder',exact:true}).filter({visible:true}).click()
      await table.waitFor();assert.equal(await table.getByRole('button',{name:'Skog',exact:true}).getAttribute('aria-pressed'),'true')
    }
    assert.equal(await page.evaluate(()=>__planMapCreations),instance)
    assert.deepEqual(await page.evaluate(()=>__planAreaContext.layers),layerState)
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=1))
    const dimensions=await page.evaluate(()=>{const map=document.querySelector('.explore-themes__canvas').getBoundingClientRect(),panel=document.querySelector('.explore-themes__info').getBoundingClientRect();return{mapWidth:map.width,mapHeight:map.height,panelWidth:panel.width,panelHeight:panel.height}})
    assert.ok(dimensions.mapWidth>=100&&dimensions.mapHeight>=100)
    if(width===1440)assert.equal(dimensions.panelWidth,420)
    if(width===900)assert.equal(dimensions.panelWidth,340)
    uiChecks.push({width,height,...dimensions,categoriesMapToExactResult:true,layersPreserved:true,instancePreserved:true,overflow:0})
  }
  await page.getByRole('group',{name:'Velg plananalyse'}).getByRole('button',{name:'Registrerte naturverdier',exact:true}).click()
  await page.getByText('Unikt overlappsareal',{exact:true}).waitFor({timeout:180000})
  assert.match(await page.locator('.future-nature-analysis__summary').textContent(),/119,38/)
  assert.match(await page.locator('.future-nature-analysis__summary').textContent(),/70/)
  assert.equal(await page.evaluate(()=>__planAreaMap.getLayers().getArray().find(l=>l.getClassName()==='plan-area-categories').getVisible()),false)
  await page.screenshot({path:`${output}/valued-nature-320.png`,fullPage:true})
  await page.setViewportSize({width:1440,height:960});await page.screenshot({path:`${output}/valued-nature-1440.png`,fullPage:true})
  await page.getByRole('group',{name:'Velg plananalyse'}).getByRole('button',{name:'Arealfordeling',exact:true}).click()
  await page.getByRole('table',{name:'Økosystemtyper innenfor planområder'}).waitFor()
  assert.equal(await page.evaluate(()=>__planMapCreations),instance)
  await page.evaluate(async()=>{
    const {trondheimLossDemo}=await import('/src/features/historical-loss/demoSource.ts'),{summarizeLoss,available}=await import('/src/features/historical-loss/model.ts')
    const summary=summarizeLoss(trondheimLossDemo.periods.slice(1,9))
    globalThis.__historicalOverride={...trondheimLossDemo,source:{...trondheimLossDemo.source,version:'aggregate-browser-test'},periods:[{id:'2017-2024',label:'2017–2024',start:'2017-01-01',end:'2024-12-31',nature:available(summary.nature),agriculture:available(summary.agriculture),ecosystems:summary.ecosystems,destinations:{status:'not-in-delivery',reason:'Not confirmed'}}]}
  })
  await navigateSite(page,'Naturtapet')
  assert.equal(await page.locator('.loss-timeline__period').count(),1)
  assert.equal(await page.getByRole('combobox',{name:'Fra periode'}).locator('option').count(),1)
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${output}/aggregate-period-390.png`,fullPage:true})
  await page.evaluate(()=>{globalThis.__historicalOverride=null})
  await page.getByRole('combobox',{name:'Velg kommune'}).fill('Oslo');await page.getByRole('option',{name:'Oslo 0301'}).click()
  await page.getByText(/Klargjort kommunevis Grunnkart mangler/).waitFor()
  assert.equal(await page.getByLabel('Oppsummering av arealer i planområder').count(),0)
  await page.getByRole('link',{name:'Åpne arealfordelingen i kart',exact:true}).click()
  await page.getByText(/Klargjort kommunevis Grunnkart mangler/).waitFor()
  failPlan=true;await page.reload()
  await page.getByRole('combobox',{name:'Velg kommune'}).fill('Trondheim');await page.getByRole('option',{name:'Trondheim 5001'}).click()
  await page.getByText('Planarealene kunne ikke beregnes. Dette betyr ikke null treff.',{exact:true}).waitFor()
  await page.getByRole('link',{name:'Åpne arealfordelingen i kart',exact:true}).click()
  await page.getByRole('complementary',{name:'Arealer avsatt til framtidig utbygging'}).getByRole('alert').waitFor()
  await writeFile(`${output}/ui-checks.json`,JSON.stringify({uiChecks,primaryLinkOpensArea:true,valuedNatureRetained:true,aggregatePeriod:true,municipalityIsolation:true,planServiceFailure:true,errors},null,2))
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({natureDaa:result.natureDaa,agricultureDaa:result.agricultureDaa,totalDaa:result.totalDaa,categories:result.categories,classification:result.classification,analysisId:result.analysisId,tiles:rawTiles.length}))
} finally { await browser?.close();await network?.dispose();await server.close() }
