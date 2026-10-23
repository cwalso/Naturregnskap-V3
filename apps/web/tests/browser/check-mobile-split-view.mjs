import { runAnalysisInteractions } from './mobile-analysis-interactions.mjs'
import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'
import { navigateSite } from './map-browser-helpers.mjs'

const stage = process.env.SPLIT_STAGE ?? 'a'
const output = process.env.BROWSER_OUTPUT ?? '.browser-results/mobile-split-view'
await mkdir(output,{recursive:true})
const report={stage,screens:[],checks:[],accessibility:[],javascriptErrors:[],networkFailures:[]}
const server=await createServer({cacheDir:'node_modules/.vite-mobile-split',server:{host:'127.0.0.1',port:5240,strictPort:true},plugins:[{name:'observe-split-view',enforce:'pre',transform(code,id){
  if(id.endsWith('/src/map/exploreThemeMap.ts'))return code.replace('  let destroyed = false','  globalThis.__b5Map=map; globalThis.__b5Creations=(globalThis.__b5Creations??0)+1; let destroyed = false')
    .replace('    setPlanArea(result, selection, fitSelection = false) {','    setPlanArea(result, selection, fitSelection = false) { globalThis.__b5Area={result,selection};')
    .replace('    setFutureNature(result, selection, fit = false) {','    setFutureNature(result, selection, fit = false) { globalThis.__b5Nature={result,selection};')
  for(const [path,name]of [['/plan-area/source.ts','calculatePlanArea'],['/future-analysis/model.ts','calculateFutureNature']])if(id.endsWith(path))return code.replace(new RegExp(`(export async function ${name}[^\\n]+\\{)`),`$1 globalThis.__b5Calls??={};globalThis.__b5Calls.${name}=(globalThis.__b5Calls.${name}??0)+1;`)
}}]})
let browser,network,page
const cache=new Map()
const axePath=process.env.UX_AXE_PATH
const httpCache=process.env.SPLIT_HTTP_CACHE
if(httpCache)await mkdir(httpCache,{recursive:true})
async function commune(name,number){await page.getByRole('combobox',{name:'Velg kommune',exact:true}).fill(name);await page.getByRole('option',{name:`${name} ${number}`,exact:true}).click()}
async function snapshot(){await page.waitForFunction(()=>{const map=globalThis.__b5Map;if(!map||map.getView().getAnimating()||map.getView().getInteracting())return false;const rect=document.querySelector('.explore-themes__canvas').getBoundingClientRect(),size=map.getSize();return Math.abs(rect.width-size[0])<1&&Math.abs(rect.height-size[1])<1});return page.evaluate(async()=>{
  const map=globalThis.__b5Map,view=map.getView()
  const geometry=map.getLayers().getArray().filter(l=>['plan-area-categories','future-nature-overlap'].includes(l.getClassName())).map(l=>({name:l.getClassName(),visible:l.getVisible(),features:l.getSource().getFeatures().map(f=>({id:f.getId(),coordinates:f.getGeometry().getCoordinates()}))}))
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(geometry)))
  const area=globalThis.__b5Area,nature=globalThis.__b5Nature
  return {view:{center:view.getCenter(),resolution:view.getResolution()},creations:globalThis.__b5Creations,calls:{...globalThis.__b5Calls},areaId:area?.result?.analysisId??null,natureId:nature?.result?.analysisId??null,selection:area?.result?area.selection:nature?.result?nature.selection:null,geometryHash:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join(''),features:geometry.map(g=>({name:g.name,visible:g.visible,ids:g.features.map(f=>f.id??null)}))}
})}
function retained(before,after){assert.deepEqual(after.view,before.view);assert.equal(after.creations,before.creations);assert.deepEqual(after.calls,before.calls);assert.equal(after.areaId,before.areaId);assert.equal(after.natureId,before.natureId);assert.deepEqual(after.selection,before.selection);assert.equal(after.geometryHash,before.geometryHash)}
async function capture(name){
  await page.screenshot({path:`${output}/${name}.png`,fullPage:true})
  const metrics=await page.evaluate(()=>{const r=document.querySelector('.explore-themes__canvas').getBoundingClientRect();return {width:innerWidth,height:innerHeight,map:{width:r.width,height:r.height},overflow:document.documentElement.scrollWidth-innerWidth,overflowY:document.documentElement.scrollHeight-innerHeight}})
  assert.equal(metrics.overflow,0,name)
  if(stage==='c4')assert.ok(metrics.overflowY<=1,`${name}: vertical page overflow ${metrics.overflowY}`)
  const controls=await page.evaluate(()=>Array.from(document.querySelectorAll('.mobile-analysis-toolbar button,.mobile-analysis-toolbar select,.mobile-analysis-modes button,.mobile-analysis-summary button,.mobile-analysis-summary select,.explore-themes__mobile-whole,.has-analysis .ol-zoom button,.has-analysis .ol-attribution button,.analysis-contents select,.analysis-contents button')).filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden').map(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {newControl:Boolean(el.closest('.mobile-analysis-toolbar,.mobile-analysis-modes,.mobile-analysis-summary,.analysis-contents'))||el.matches('.explore-themes__mobile-whole'),label:el.getAttribute('aria-label')??el.textContent,width:r.width,height:r.height,uncovered:hit===el||el.contains(hit)}}))
  for(const c of controls){assert.ok(c.uncovered,`${name}: covered control ${c.label}`);if(c.newControl||metrics.width<=700)assert.ok(c.width>=44,`${name}: narrow control ${c.label}`);assert.ok(c.height>=44,`${name}: small control ${c.label}`)}
  report.screens.push({name,...metrics,controls})
  if((stage==='b'||stage.startsWith('c'))&&axePath){
    await page.addScriptTag({path:axePath})
    const audit=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),incomplete:r.incomplete.map(v=>v.id)}})
    report.accessibility.push({name,...audit});assert.equal(audit.violations.length,0,JSON.stringify(audit.violations))
  }
  await writeFile(`${output}/${name}.txt`,await page.locator('body').innerText())
}
async function openAnalysis(){await page.getByRole('button',{name:'Analyser planområder',exact:true}).first().click();await page.getByRole('table',{name:'Økosystemtyper innenfor planområder'}).waitFor({timeout:180000})}
async function settings(name){await page.getByRole('button',{name:`Innstillinger for ${name}`,exact:true}).click()}
async function mobileChecks(){
  for(const size of [{width:320,height:720},{width:390,height:844}]){
    await page.setViewportSize(size)
    const selectMode=page.getByRole('combobox',{name:'Velg aktiv plananalyse',exact:true})
    await selectMode.selectOption('area')
    await page.getByRole('button',{name:'Delt',exact:true}).click()
    await page.getByRole('table',{name:'Økosystemtyper innenfor planområder'}).waitFor()
    await page.getByRole('combobox',{name:'Kartutvalg i analysen',exact:true}).selectOption('all')
    // Use the explicit fit action for the overview screenshot; category changes alone retain the view.
    await page.getByRole('button',{name:'Tilpass aktivt kartutvalg',exact:true}).click();await snapshot()
    await page.locator('.explore-themes__analysis-panel .explore-themes__detail-scroll').evaluate(el=>el.scrollTop=0)
    await capture(`b-split-area-${size.width}`)
    await page.getByRole('combobox',{name:'Kartutvalg i analysen',exact:true}).selectOption('category:skog')
    assert.match((await page.getByRole('region',{name:'Aktiv analyse og kartutvalg'}).innerText()).replaceAll('\u00a0',' '),/2 032,22/)
    await page.getByRole('region',{name:'Interaktivt kart i Trondheim'}).focus();await page.keyboard.press('ArrowLeft')
    const beforeFit=await snapshot()
    await page.getByRole('button',{name:'Tilpass aktivt kartutvalg',exact:true}).click()
    const fitted=await snapshot();assert.notDeepEqual(fitted.view,beforeFit.view)
    await page.getByRole('region',{name:'Interaktivt kart i Trondheim'}).focus();await page.keyboard.press('ArrowRight')
    const before=await snapshot(),modes=[]
    assert.notDeepEqual(before.view.center,fitted.view.center)
    const keyboardMode=page.getByRole('button',{name:'Mer kart',exact:true})
    await keyboardMode.focus();await page.keyboard.press('Space')
    assert.equal(await keyboardMode.getAttribute('aria-pressed'),'true')
    assert.equal(await keyboardMode.evaluate(el=>el.matches(':focus-visible')),true)
    await page.keyboard.press('Tab');await page.keyboard.press('Enter')
    assert.equal(await page.getByRole('button',{name:'Delt',exact:true}).getAttribute('aria-pressed'),'true')
    retained(before,await snapshot())
    for(const [label,key]of [['Delt','split'],['Mer kart','map'],['Mer resultat','results']]){
      await page.getByRole('button',{name:label,exact:true}).click()
      await page.waitForFunction(()=>{const r=document.querySelector('.explore-themes__canvas').getBoundingClientRect(),size=globalThis.__b5Map.getSize();return Math.abs(size[0]-r.width)<2&&Math.abs(size[1]-r.height)<2})
      retained(before,await snapshot())
      const box=await page.locator('.explore-themes__canvas').boundingBox();modes.push({key,...box})
      if(key==='split')assert.ok(box.height>=(size.width===320?200:260),JSON.stringify(box))
      if(key==='results')assert.equal(await page.locator('.explore-themes__canvas .ol-zoom').isVisible(),false)
      if(key==='map')await capture(`b-map-forest-${size.width}`)
    }
    const scroll=page.locator('.explore-themes__analysis-panel .explore-themes__detail-scroll')
    await scroll.hover();await page.mouse.wheel(0,340);await page.waitForTimeout(100);retained(before,await snapshot())
    await page.getByRole('combobox',{name:'Kartutvalg i analysen',exact:true}).selectOption('category:vatmark')
    assert.match((await page.getByRole('region',{name:'Aktiv analyse og kartutvalg'}).innerText()).replaceAll('\u00a0',' '),/12,64/)
    assert.equal(await page.locator('.explore-themes__body').getAttribute('data-view-mode'),'results')
    await selectMode.selectOption('nature');await page.locator('.future-nature-analysis__summary').waitFor({timeout:180000})
    await capture(`b-more-results-nature-${size.width}`)
    await page.getByRole('searchbox',{name:'Søk etter lokalitet',exact:true}).fill('BN00109936')
    await page.locator('.future-nature-analysis__table').getByRole('button',{name:/Tanemsmyra.*BN00109936/}).click()
    await page.getByRole('region',{name:'Valgt lokalitet',exact:true}).scrollIntoViewIfNeeded()
    assert.equal(await page.locator('.explore-themes__body').getAttribute('data-view-mode'),'results')
    await capture(`b-locality-${size.width}`)
    const locality=await snapshot()
    await page.locator('.mobile-analysis-toolbar').getByRole('button',{name:'Kartlag',exact:true}).click()
    retained(locality,await snapshot());await capture(`b-active-layers-${size.width}`)
    await page.getByRole('checkbox',{name:'Grå arealer',exact:true}).check();await settings('Grunnkart nivå 0');await page.getByRole('slider').fill('65')
    await page.keyboard.press('Escape');retained(locality,await snapshot())
    assert.equal(await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).inputValue(),'BN00109936')
    assert.equal(await page.locator('.explore-themes__body').getAttribute('data-view-mode'),'results')
    const focus=await page.evaluate(()=>({text:document.activeElement.textContent,visible:document.activeElement.getClientRects().length>0}))
    assert.equal(focus.visible,true)
    await commune('Oslo','0301');await page.waitForFunction(()=>!globalThis.__b5Area?.result&&!globalThis.__b5Nature?.result)
    await capture(`b-oslo-${size.width}`)
    assert.equal(await selectMode.inputValue(),'nature');await commune('Trondheim','5001');await page.locator('.future-nature-analysis__summary').waitFor({timeout:180000})
    report.checks.push({mobileWidth:size.width,modes,sameInstanceAndGeometry:true,scrollPreservesMap:true,explicitFitAndPan:true,keyboardModesAndVisibleFocus:true,sourceCallsRetained:true,localitySelectionPreservesView:true,layerReturnFocus:focus})
    await page.getByRole('button',{name:'Delt',exact:true}).click()
    const responsiveBefore=await snapshot()
    for(const width of [900,1440,size.width]){await page.setViewportSize({width,height:width===1440?960:width===900?900:size.height});await page.waitForTimeout(100);retained(responsiveBefore,await snapshot());if(width>=900){assert.equal(await page.locator('.explore-themes__mobile-whole').isVisible(),false);assert.equal(await page.getByRole('button',{name:'Delt',exact:true}).isVisible(),false);await capture(`b-desktop-${width}-from-${size.width}`)}}
  }
  await page.setViewportSize({width:1440,height:960})
}
try{
  await server.listen();browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true});network=await request.newContext({proxy:{server:process.env.HTTPS_PROXY}})
  page=await browser.newPage({hasTouch:stage.startsWith('c'),viewport:{width:1440,height:960}});page.setDefaultTimeout(30000)
  page.on('pageerror',e=>report.javascriptErrors.push(e.message))
  await page.route('https://**/*',async route=>{const req=route.request(),key=req.method()+req.url()+(req.postData()??'');try{let response=cache.get(key);const diskKey=httpCache?`${httpCache}/${createHash('sha256').update(key).digest('hex')}`:null;if(!response&&diskKey){try{response={...JSON.parse(await readFile(diskKey+'.json','utf8')),body:await readFile(diskKey+'.bin')}}catch{}}if(!response){const r=await network.fetch(req.url(),{method:req.method(),data:req.postData()??undefined,headers:req.headers(),timeout:60000});response={status:r.status(),headers:r.headers(),body:await r.body()};if(r.status()>=400)report.networkFailures.push({status:r.status(),url:req.url()});if(r.status()===200){if(cache.size<650)cache.set(key,response);if(diskKey){await writeFile(diskKey+'.bin',response.body);await writeFile(diskKey+'.json',JSON.stringify({status:response.status,headers:response.headers,retrievedAt:new Date().toISOString()}))}}}await route.fulfill(response)}catch{await route.abort()}})
  await page.goto('http://127.0.0.1:5240');await commune('Trondheim','5001');await page.getByLabel('Oppsummering av arealer i planområder').waitFor({timeout:180000});await navigateSite(page,'Utforsk i kart');await openAnalysis()
  const table=page.getByRole('table',{name:'Økosystemtyper innenfor planområder'})
  assert.match((await table.innerText()).replaceAll('\u00a0',' '),/2 032,22/)
  assert.match((await table.innerText()).replaceAll('\u00a0',' '),/706,71/)
  await table.getByRole('button',{name:'Skog',exact:true}).click()
  await page.getByRole('region',{name:'Interaktivt kart i Trondheim'}).focus();await page.keyboard.press('ArrowRight')
  const area=await snapshot();assert.deepEqual(area.features.find(f=>f.name==='plan-area-categories').ids,['skog'])
  await settings('Grunnkart nivå 0');retained(area,await snapshot());await page.getByRole('slider').fill('55');await capture('a-area-settings-1440');await page.getByRole('button',{name:'Lukk detaljpanel',exact:true}).click();retained(area,await snapshot())
  await page.getByRole('button',{name:'Tegnforklaring',exact:true}).first().click();retained(area,await snapshot());await page.keyboard.press('Escape');retained(area,await snapshot());await capture('a-area-return-1440')
  report.checks.push({areaPanelsRetain:true,...area})
  await page.getByRole('button',{name:'Registrerte naturverdier',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.future-nature-analysis__summary')||document.querySelector('.explore-themes__analysis-panel [role=alert]'),null,{timeout:180000});assert.equal(await page.locator('.explore-themes__analysis-panel [role=alert]').count(),0,await page.locator('.explore-themes__analysis-panel').innerText())
  assert.match((await page.locator('.future-nature-analysis__summary').innerText()).replaceAll('\u00a0',' '),/119,38 daa/)
  await page.getByRole('searchbox',{name:'Søk etter lokalitet',exact:true}).fill('BN00109936');await page.locator('.future-nature-analysis__table').getByRole('button',{name:/Tanemsmyra.*BN00109936/}).click()
  await page.getByRole('region',{name:'Interaktivt kart i Trondheim'}).focus();await page.keyboard.press('ArrowRight')
  const nature=await snapshot();await settings('Grunnkart nivå 0');retained(nature,await snapshot());await capture('a-nature-settings-1440');await page.keyboard.press('Escape');retained(nature,await snapshot())
  assert.equal(await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).inputValue(),'BN00109936');await capture('a-locality-return-1440')
  report.checks.push({naturePanelsRetainSearch:true,localitySelectionPreservesView:true,...nature})
  if(stage==='b')await mobileChecks()
  if(stage.startsWith('c'))await runAnalysisInteractions({page,report,snapshot,retained,capture,commune,settings,stage})
  await commune('Oslo','0301');await page.waitForFunction(()=>!globalThis.__b5Area?.result&&!globalThis.__b5Nature?.result)
  assert.equal(await page.getByRole('button',{name:'Registrerte naturverdier',exact:true}).getAttribute('aria-pressed'),'true');await capture('a-oslo-no-old-results-1440')
  await commune('Trondheim','5001');await page.locator('.future-nature-analysis__summary').waitFor({timeout:180000});const beforeEnd=await snapshot();const endLayers=await page.evaluate(()=>globalThis.__b5Map.getLayers().getArray().filter(l=>l.getClassName().startsWith('explore-')).map(l=>[l.getClassName(),l.getVisible(),l.getOpacity()]));await page.getByRole('button',{name:'Avslutt analyse',exact:true}).click()
  const closed=await snapshot();assert.deepEqual(closed.view,beforeEnd.view);assert.equal(closed.creations,beforeEnd.creations);assert.deepEqual(closed.calls,beforeEnd.calls);assert.deepEqual(await page.evaluate(()=>globalThis.__b5Map.getLayers().getArray().filter(l=>l.getClassName().startsWith('explore-')).map(l=>[l.getClassName(),l.getVisible(),l.getOpacity()])),endLayers);assert.equal(closed.areaId,null);assert.equal(closed.natureId,null);report.checks.push({endClearsAnalysis:true,closed})
  assert.deepEqual(report.javascriptErrors,[]);report.completed=true
}catch(error){report.failure=error.stack;if(page){await capture('failure');report.failureText=(await page.locator('body').innerText()).slice(-6000)}throw error}
finally{await writeFile(`${output}/checks.json`,JSON.stringify(report,null,2));if(browser)await browser.close();if(network)await network.dispose();await server.close();console.log(JSON.stringify({stage,completed:report.completed,screens:report.screens.length,failure:report.failure}))}
