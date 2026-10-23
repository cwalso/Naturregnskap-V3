// Isolated text-resizing, touch and manual accessibility observations for B5.2d.
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {chromium,request} from 'playwright'
import {createServer} from 'vite'
import {navigateSite} from './map-browser-helpers.mjs'
const output=process.env.BROWSER_OUTPUT??'.browser-results/mobile-acceptance-supplement'
await mkdir(output,{recursive:true})
const report={date:new Date().toISOString(),requests:{replayed:0,fresh:0},checks:[],limitations:['No physical devices or screen reader','Prior dated HTTP replay used for presentation/touch checks, not cold performance or new data validation']}
const temp=await mkdtemp(`${tmpdir()}/b5-audit-`)
const server=await createServer({cacheDir:'node_modules/.vite-b5-audit-supplement',server:{host:'127.0.0.1',port:5251,strictPort:true},plugins:[{name:'read-only-map-observer',enforce:'pre',transform(code,id){if(id.endsWith('/src/map/exploreThemeMap.ts'))return code.replace('  let destroyed = false','  globalThis.__acceptanceMap=map; let destroyed = false')}}]});await server.listen()
const browser=await chromium.launchPersistentContext(`${temp}/profile`,{executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,viewport:{width:1440,height:960},hasTouch:true})
const network=await request.newContext(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})
let page=browser.pages()[0]??await browser.newPage()
page.setDefaultTimeout(20000)
await browser.route('https://**/*',async route=>{const req=route.request(),key=req.method()+req.url()+(req.postData()??''),hash=createHash('sha256').update(key).digest('hex');try{let response;try{const base=`${process.env.SPLIT_HTTP_CACHE??'/workspace/work/mobile-split/http-cache'}/${hash}`;response={...JSON.parse(await readFile(`${base}.json`,'utf8')),body:await readFile(`${base}.bin`)};report.requests.replayed++}catch{const r=await network.fetch(req.url(),{method:req.method(),data:req.postData()??undefined,headers:req.headers(),timeout:60000});response={status:r.status(),headers:r.headers(),body:await r.body()};report.requests.fresh++}await route.fulfill({...response,headers:{...response.headers,'access-control-allow-origin':'*'}})}catch(error){report.requests.lastError=String(error);report.requests.lastUrl=req.url().split('?')[0];await route.abort().catch(()=>{})}})
async function goContents(value){await page.getByRole('combobox',{name:'Gå til analyseinnhold'}).selectOption(value);await page.getByRole('button',{name:'Gå til valgt analyseinnhold'}).click()}
async function capture(name){await page.screenshot({path:`${output}/${name}.png`,fullPage:true});const metrics=await page.evaluate(()=>{const box=el=>{const r=el?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height}:null};return {mapView:globalThis.__acceptanceMap?{center:globalThis.__acceptanceMap.getView().getCenter(),resolution:globalThis.__acceptanceMap.getView().getResolution()}:null,viewport:{width:innerWidth,height:innerHeight},map:box(document.querySelector('.explore-themes__canvas')),summary:box(document.querySelector('.mobile-analysis-summary')),result:box(document.querySelector('.analysis-section-scroll')),overflow:{x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight},focus:document.activeElement.outerHTML,visibleText:document.body.innerText.slice(0,1400)}});report.checks.push({name,...metrics});await writeFile(`${output}/supplement.json`,JSON.stringify(report,null,2));return metrics}
try{
  await page.goto('http://127.0.0.1:5251/')
  await page.getByRole('combobox',{name:'Velg kommune',exact:true}).fill('Trondheim');await page.getByRole('option',{name:'Trondheim 5001',exact:true}).click();await navigateSite(page,'Utforsk i kart');await page.getByRole('button',{name:'Analyser planområder',exact:true}).first().click();await page.waitForFunction(()=>document.querySelector('.plan-area-totals')||document.querySelector('.plan-area-panel')||document.querySelector('.explore-themes__analysis-panel [role=alert]'),null,{timeout:45000});if(await page.locator('.explore-themes__analysis-panel [role=alert]').count())throw new Error(await page.locator('.explore-themes__analysis-panel').innerText())
  if(!process.env.SUPPLEMENT_NAV_ONLY){
  report.limitations.push('Native browser zoom was attempted separately, but the administrator disables extension loading. No bypass attempted. Viewport reflow and controlled font resizing are separate checks, not native zoom.')
  await capture('baseline-100')
  // Independent touch, font resizing and computed colour checks at 390.
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Delt',exact:true}).click()
  // Snapshot computed sizes before any mutation; avoid compounded inherited font scaling.
  for(const scale of [2,4]){
    await page.evaluate(scale=>{const fonts=[...document.querySelectorAll('body *')].map(el=>({el,size:getComputedStyle(el).fontSize,inline:el.style.fontSize}));for(const item of fonts){item.el.dataset.auditInline=item.inline;item.el.style.fontSize=`${parseFloat(item.size)*scale}px`}},scale)
    await capture(`font-only-${scale}00`)
    await page.evaluate(()=>{for(const el of document.querySelectorAll('[data-audit-inline]')){el.style.fontSize=el.dataset.auditInline;delete el.dataset.auditInline}})
  }
  const colours=await page.evaluate(()=>{const targets=['.site-header button[aria-label],.combobox__clear','.mobile-analysis-toolbar select','.mobile-analysis-modes button[aria-pressed=true]','.mobile-analysis-summary button','.analysis-contents select'];return targets.flatMap(selector=>[...document.querySelectorAll(selector)].filter(el=>el.getClientRects().length).map(el=>{const style=getComputedStyle(el);return {selector,label:el.getAttribute('aria-label')??el.textContent,color:style.color,background:style.backgroundColor,border:style.borderColor,outline:style.outlineColor,outlineWidth:style.outlineWidth}}))});report.checks.push({name:'computed-colours',colours})
  // Actual browser accessibility tree table semantics (not a screen reader).
  const cdp=await browser.newCDPSession(page)
  await page.getByRole('combobox',{name:'Velg aktiv plananalyse'}).selectOption('nature');await page.locator('.future-nature-analysis__summary').waitFor({timeout:180000})
  await goContents('localities');await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).fill('Tanemsmyra')
  report.checks.push({name:'legend-colours',colours:await page.locator('.future-nature-analysis__legend').evaluateAll(els=>els.map(el=>({text:el.textContent,color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor})))})
  const ax=await cdp.send('Accessibility.getFullAXTree');await writeFile(`${output}/table-accessibility-tree.json`,JSON.stringify(ax.nodes.filter(n=>['table','row','columnheader','cell','caption'].includes(n.role?.value)),null,2))
  await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).fill('___missing___');await capture('empty-table-keyboard')
  await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).fill('');await goContents('summary')
  // Pinch uses real touch events; retained vector identity is separately checked by C4.
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2})
  const canvas=page.locator('.explore-themes__canvas'),box=await canvas.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2
  async function transform(){return canvas.locator('.ol-layer canvas').evaluateAll(els=>els.map(el=>getComputedStyle(el).transform))}
  const viewBefore=await page.evaluate(()=>({center:globalThis.__acceptanceMap.getView().getCenter(),resolution:globalThis.__acceptanceMap.getView().getResolution()}));const before=await transform()
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:x-30,y},{id:2,x:x+30,y}]})
  for(const distance of [40,50,65,80]){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:x-distance,y},{id:2,x:x+distance,y}]});await page.waitForTimeout(40)}
  report.checks.push({name:'pinch-during',transforms:await transform()});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(350);report.checks.push({name:'emulated-pinch',viewBefore,viewAfter:await page.evaluate(()=>({center:globalThis.__acceptanceMap.getView().getCenter(),resolution:globalThis.__acceptanceMap.getView().getResolution()})),before,after:await transform()});await capture('emulated-pinch')
  await cdp.detach()
  await goContents('method');await capture('method-available')
  }
  await page.setViewportSize({width:390,height:844});await navigateSite(page,'Kommuneoversikt');await page.getByRole('link',{name:/Åpne temasiden Skog$/}).click()
  await page.locator('.plan-area-indicator .thematic-plan-cards__value').waitFor({timeout:45000});await page.getByRole('button',{name:/Vis skog i plananalysen/}).click();await page.locator('.plan-area-totals').waitFor();await page.goBack();await capture('mobile-browser-back-theme')
  report.checks.push({name:'mobile-browser-history',url:page.url(),municipality:await page.getByRole('combobox',{name:'Velg kommune',exact:true}).inputValue()})
  for(const name of ['Skog','Myr']){
    await navigateSite(page,'Naturtema');await page.getByRole('list',{name:'Temasider i regnskapsgrunnlaget'}).getByRole('button',{name:new RegExp(name)}).click()
    await page.locator('.plan-area-indicator .thematic-plan-cards__value').waitFor({timeout:45000});const indicator=await page.locator('.plan-area-indicator').innerText()
    await page.getByRole('button',{name:/Vis .* i plananalysen/}).click();await page.locator('.plan-area-totals').waitFor();const summary=await page.getByRole('region',{name:'Aktiv analyse og kartutvalg'}).innerText();await page.goBack();await capture(`nature-theme-${name}-back`)
    report.checks.push({name:`nature-theme-${name}`,indicator,summary,url:page.url()})
  }
  await page.getByRole('button',{name:/Vis .* i plananalysen/}).click();await page.locator('.plan-area-totals').waitFor();await page.getByRole('combobox',{name:'Velg aktiv plananalyse'}).selectOption('nature');await page.locator('.future-nature-analysis__summary').waitFor()
  await goContents('localities');await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).fill('BN00087495');await page.getByRole('button',{name:/Søra.*BN00087495/}).click()
  const tinyTable=await page.getByRole('region',{name:'Rullbar lokalitetsoversikt',exact:true}).innerText();await capture('tiny-overlap-table')
  await page.getByRole('button',{name:/Åpne lokalitetsdetaljer for.*BN00087495/}).click();await capture('tiny-overlap-details')
  report.checks.push({name:'tiny-overlap',table:tinyTable,summary:await page.getByRole('region',{name:'Aktiv analyse og kartutvalg'}).innerText(),details:await page.getByRole('region',{name:'Valgt lokalitet',exact:true}).innerText()})
  report.complete=true
}catch(error){report.error=String(error.stack);await capture('supplement-interrupted').catch(()=>{})}
finally{await writeFile(`${output}/supplement.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({complete:report.complete,error:report.error,checks:report.checks.length}));await browser.close();await network.dispose();await server.close();await rm(temp,{recursive:true,force:true})}
