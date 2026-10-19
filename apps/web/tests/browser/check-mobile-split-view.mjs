import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'
import { navigateSite } from './map-browser-helpers.mjs'

const stage = process.env.SPLIT_STAGE ?? 'a'
const output = process.env.BROWSER_OUTPUT ?? '.browser-results/mobile-split-view'
await mkdir(output,{recursive:true})
const report={stage,screens:[],checks:[],accessibility:[],javascriptErrors:[],networkFailures:[]}
const server=await createServer({server:{host:'127.0.0.1',port:5240,strictPort:true},plugins:[{name:'observe-split-view',enforce:'pre',transform(code,id){
  if(id.endsWith('/src/map/exploreThemeMap.ts'))return code.replace('  let destroyed = false','  globalThis.__b5Map=map; globalThis.__b5Creations=(globalThis.__b5Creations??0)+1; let destroyed = false')
    .replace('    setPlanArea(result, selection, fitSelection = false) {','    setPlanArea(result, selection, fitSelection = false) { globalThis.__b5Area={result,selection};')
    .replace('    setFutureNature(result, selection, fit = false) {','    setFutureNature(result, selection, fit = false) { globalThis.__b5Nature={result,selection};')
  for(const [path,name]of [['/plan-area/source.ts','calculatePlanArea'],['/future-analysis/model.ts','calculateFutureNature']])if(id.endsWith(path))return code.replace(new RegExp(`(export async function ${name}[^\\n]+\\{)`),`$1 globalThis.__b5Calls??={};globalThis.__b5Calls.${name}=(globalThis.__b5Calls.${name}??0)+1;`)
}}]})
let browser,network,page
const cache=new Map()
async function commune(name,number){await page.getByRole('combobox',{name:'Velg kommune',exact:true}).fill(name);await page.getByRole('option',{name:`${name} ${number}`,exact:true}).click()}
async function snapshot(){await page.waitForFunction(()=>globalThis.__b5Map&&!globalThis.__b5Map.getView().getAnimating()&&!globalThis.__b5Map.getView().getInteracting());return page.evaluate(async()=>{
  const map=globalThis.__b5Map,view=map.getView()
  const geometry=map.getLayers().getArray().filter(l=>['plan-area-categories','future-nature-overlap'].includes(l.getClassName())).map(l=>({name:l.getClassName(),visible:l.getVisible(),features:l.getSource().getFeatures().map(f=>({id:f.getId(),coordinates:f.getGeometry().getCoordinates()}))}))
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(geometry)))
  const area=globalThis.__b5Area,nature=globalThis.__b5Nature
  return {view:{center:view.getCenter(),resolution:view.getResolution()},creations:globalThis.__b5Creations,calls:{...globalThis.__b5Calls},areaId:area?.result?.analysisId??null,natureId:nature?.result?.analysisId??null,selection:area?.result?area.selection:nature?.result?nature.selection:null,geometryHash:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join(''),features:geometry.map(g=>({name:g.name,visible:g.visible,ids:g.features.map(f=>f.id??null)}))}
})}
function retained(before,after){assert.deepEqual(after.view,before.view);assert.equal(after.creations,before.creations);assert.deepEqual(after.calls,before.calls);assert.equal(after.areaId,before.areaId);assert.equal(after.natureId,before.natureId);assert.deepEqual(after.selection,before.selection);assert.equal(after.geometryHash,before.geometryHash)}
async function capture(name){
  await page.screenshot({path:`${output}/${name}.png`,fullPage:true})
  const metrics=await page.evaluate(()=>{const r=document.querySelector('.explore-themes__canvas').getBoundingClientRect();return {width:innerWidth,height:innerHeight,map:{width:r.width,height:r.height},overflow:document.documentElement.scrollWidth-innerWidth}})
  assert.equal(metrics.overflow,0,name)
  report.screens.push({name,...metrics})
  await writeFile(`${output}/${name}.txt`,await page.locator('body').innerText())
}
async function openAnalysis(){await page.getByRole('button',{name:'Analyser planområder',exact:true}).first().click();await page.getByRole('table',{name:'Økosystemtyper innenfor planområder'}).waitFor({timeout:180000})}
async function settings(name){await page.getByRole('button',{name:`Innstillinger for ${name}`,exact:true}).click()}
try{
  await server.listen();browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true});network=await request.newContext({proxy:{server:process.env.HTTPS_PROXY}})
  page=await browser.newPage({viewport:{width:1440,height:960}});page.setDefaultTimeout(30000)
  page.on('pageerror',e=>report.javascriptErrors.push(e.message))
  await page.route('https://**/*',async route=>{const req=route.request(),key=req.method()+req.url()+(req.postData()??'');try{let response=cache.get(key);if(!response){const r=await network.fetch(req.url(),{method:req.method(),data:req.postData()??undefined,headers:req.headers(),timeout:60000});response={status:r.status(),headers:r.headers(),body:await r.body()};if(r.status()>=400)report.networkFailures.push({status:r.status(),url:req.url()});if(r.status()===200&&cache.size<650)cache.set(key,response)}await route.fulfill(response)}catch{await route.abort()}})
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
  await page.getByRole('searchbox',{name:'Søk etter lokalitet',exact:true}).fill('BN00109936');await page.getByRole('button',{name:/Tanemsmyra.*BN00109936/}).click()
  await page.getByRole('region',{name:'Interaktivt kart i Trondheim'}).focus();await page.keyboard.press('ArrowRight')
  const nature=await snapshot();await settings('Grunnkart nivå 0');retained(nature,await snapshot());await capture('a-nature-settings-1440');await page.keyboard.press('Escape');retained(nature,await snapshot())
  assert.equal(await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).inputValue(),'BN00109936');await capture('a-locality-return-1440')
  report.checks.push({naturePanelsRetainSearch:true,localityFitRetainedException:true,...nature})
  await commune('Oslo','0301');await page.waitForFunction(()=>!globalThis.__b5Area?.result&&!globalThis.__b5Nature?.result)
  assert.equal(await page.getByRole('button',{name:'Registrerte naturverdier',exact:true}).getAttribute('aria-pressed'),'true');await capture('a-oslo-no-old-results-1440')
  await commune('Trondheim','5001');await page.locator('.future-nature-analysis__summary').waitFor({timeout:180000});await page.getByRole('button',{name:'Avslutt analyse',exact:true}).click()
  const closed=await snapshot();assert.equal(closed.areaId,null);assert.equal(closed.natureId,null);report.checks.push({endClearsAnalysis:true,closed})
  assert.deepEqual(report.javascriptErrors,[]);report.completed=true
}catch(error){report.failure=error.stack;if(page){await capture('failure');report.failureText=(await page.locator('body').innerText()).slice(-6000)}throw error}
finally{await writeFile(`${output}/checks.json`,JSON.stringify(report,null,2));if(browser)await browser.close();if(network)await network.dispose();await server.close();console.log(JSON.stringify({stage,completed:report.completed,screens:report.screens.length,failure:report.failure}))}
