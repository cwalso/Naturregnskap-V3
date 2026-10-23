// Focused D-01–D-03 check, using existing navigation/map setup. At most two screenshots.
import assert from 'node:assert/strict'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {chromium,request} from 'playwright'
import {createServer} from 'vite'
import {navigateSite} from './map-browser-helpers.mjs'
const output=process.env.BROWSER_OUTPUT??'.browser-results/final-fixes'
await mkdir(output,{recursive:true})
const server=await createServer({cacheDir:'node_modules/.vite-final-fixes',server:{host:'127.0.0.1',port:5255,strictPort:true},plugins:[{name:'observe-existing-map',enforce:'pre',transform(code,id){if(id.endsWith('/src/map/exploreThemeMap.ts'))return code.replace('  let destroyed = false','  globalThis.__fixMap=map;globalThis.__fixCreations=(globalThis.__fixCreations??0)+1;let destroyed = false')}}]})
await server.listen()
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true})
const network=await request.newContext(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true})
page.setDefaultTimeout(20000)
const report={checks:[],javascriptErrors:[],cacheHits:0,freshRequests:0}
page.on('pageerror',e=>report.javascriptErrors.push(e.message))
await page.route('https://**/*',async route=>{const req=route.request(),key=req.method()+req.url()+(req.postData()??'');try{let response;try{if(!process.env.SPLIT_HTTP_CACHE)throw new Error('No replay configured');const path=`${process.env.SPLIT_HTTP_CACHE}/${createHash('sha256').update(key).digest('hex')}`;response={...JSON.parse(await readFile(path+'.json','utf8')),body:await readFile(path+'.bin')};report.cacheHits++}catch{const r=await network.fetch(req.url(),{method:req.method(),data:req.postData()??undefined,headers:req.headers(),timeout:45000});response={status:r.status(),headers:r.headers(),body:await r.body()};report.freshRequests++}await route.fulfill({...response,headers:{...response.headers,'access-control-allow-origin':'*'}})}catch{await route.abort().catch(()=>{})}})
const button=name=>page.getByRole('button',{name,exact:true})
async function contents(section){await page.getByRole('combobox',{name:'Gå til analyseinnhold'}).selectOption(section);await button('Gå til valgt analyseinnhold').click()}
async function mapState(){await page.waitForFunction(()=>!globalThis.__fixMap.getView().getAnimating());return page.evaluate(()=>({creations:globalThis.__fixCreations,center:globalThis.__fixMap.getView().getCenter(),resolution:globalThis.__fixMap.getView().getResolution()}))}
async function usable(locator){await locator.scrollIntoViewIfNeeded();const b=await locator.boundingBox();assert.ok(b&&b.width>0&&b.height>0);assert.ok(await locator.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return el===hit||el.contains(hit)}),`Control obscured: ${await locator.getAttribute('aria-label')??await locator.innerText()} ${JSON.stringify(b)}`)}
// A text section can be taller than its scroller at 400%; check its visible portion.
async function readable(locator){await locator.scrollIntoViewIfNeeded();assert.ok(await locator.evaluate(el=>{const r=el.getBoundingClientRect();let left=Math.max(0,r.left),top=Math.max(0,r.top),right=Math.min(innerWidth,r.right),bottom=Math.min(innerHeight,r.bottom);for(let p=el.parentElement;p;p=p.parentElement){if(getComputedStyle(p).overflow!=='visible'){const b=p.getBoundingClientRect();left=Math.max(left,b.left);top=Math.max(top,b.top);right=Math.min(right,b.right);bottom=Math.min(bottom,b.bottom)}}const hit=document.elementFromPoint((left+right)/2,(top+bottom)/2);return bottom>top&&right>left&&(el===hit||el.contains(hit))}),'Text not reachable in its scroll region')}
async function metrics(){return page.evaluate(()=>({map:document.querySelector('.explore-themes__canvas').getBoundingClientRect().height,result:document.querySelector('.analysis-section-scroll')?.clientHeight,overflow:document.documentElement.scrollWidth-innerWidth,appScrollHeight:document.querySelector('.app-shell--explore').scrollHeight,appHeight:document.querySelector('.app-shell--explore').clientHeight}))}
try{
 await page.goto('http://127.0.0.1:5255/');await page.getByRole('combobox',{name:'Velg kommune',exact:true}).fill('Trondheim');await page.getByRole('option',{name:'Trondheim 5001',exact:true}).click();await navigateSite(page,'Utforsk i kart');await button('Analyser planområder').first().click();await page.locator('.plan-area-totals').waitFor({timeout:180000})
 for(const size of [{width:390,height:844},{width:320,height:720},{width:360,height:240}]){
  await page.setViewportSize(size);await button('Delt').click();const before=await mapState()
  for(const mode of ['Delt','Mer kart','Mer resultat']){
   await button(mode).click();await usable(button('Tilpass aktivt kartutvalg'));await usable(page.locator('.explore-themes__canvas'));const m=await metrics();assert.ok(m.map>=100);assert.ok(m.overflow<=1)
   if(mode!=='Mer kart'){await contents('ecosystems');await readable(page.getByRole('heading',{name:'Natur etter økosystemtype'}));assert.ok(m.result>=120)}
   if(size.height>=720&&mode==='Delt')assert.ok(m.map>=(size.width===320?200:260))
   assert.deepEqual(await mapState(),before);report.checks.push({size,mode,...m})
  }
 }
 await page.setViewportSize({width:390,height:844});await button('Delt').click()
 const select=page.getByRole('combobox',{name:'Gå til analyseinnhold'});await select.focus();await page.keyboard.press('ArrowDown');assert.equal(await select.evaluate(el=>el===document.activeElement),true);await page.keyboard.press('ArrowDown');assert.equal(await select.inputValue(),'ecosystems');await page.keyboard.press('Tab');await page.keyboard.press('Enter');assert.equal(await page.getByRole('heading',{name:'Natur etter økosystemtype'}).evaluate(el=>el===document.activeElement),true);report.checks.push({keyboardConfirmation:true})
 for(const scale of [2,4]){
  await page.evaluate(scale=>{const fonts=[...document.querySelectorAll('body *')].map(el=>({el,font:getComputedStyle(el).fontSize,inline:el.style.fontSize}));for(const f of fonts){f.el.dataset.originalFont=f.inline;f.el.style.fontSize=`${parseFloat(f.font)*scale}px`}},scale)
  assert.ok(await page.evaluate(()=>document.querySelector('.site-header').getBoundingClientRect().bottom<=document.querySelector('.map-page__intro').getBoundingClientRect().top+1),'Header overlaps title')
  for(const name of ['Kartlag','Mer resultat','Tilpass aktivt kartutvalg'])await usable(button(name))
  await contents('ecosystems');await readable(page.getByRole('heading',{name:'Natur etter økosystemtype'}));assert.ok((await metrics()).overflow<=1)
  if(scale===2)await page.screenshot({path:`${output}/text-200.png`,fullPage:true})
  report.checks.push({fontScale:scale,...await metrics()})
  await page.evaluate(()=>{for(const el of document.querySelectorAll('[data-original-font]')){el.style.fontSize=el.dataset.originalFont;delete el.dataset.originalFont}})
 }
 await page.getByRole('combobox',{name:'Kartutvalg i analysen'}).selectOption('category:skog');const forest=await mapState();await button('Tilpass aktivt kartutvalg').click();assert.notDeepEqual(await mapState(),forest)
 await button('Kartlag').click();await page.getByRole('checkbox',{name:'Grå arealer',exact:true}).check();await page.keyboard.press('Escape');assert.equal(await page.getByRole('combobox',{name:'Kartutvalg i analysen'}).inputValue(),'category:skog')
 await page.getByRole('combobox',{name:'Velg aktiv plananalyse'}).selectOption('nature');await page.locator('.future-nature-analysis__summary').waitFor({timeout:180000});assert.match(await page.locator('.future-nature-analysis__summary').innerText(),/119,38 daa/)
 await contents('localities');await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).fill('BN00087495');const row=page.getByRole('region',{name:'Rullbar lokalitetsoversikt'});assert.match(await row.innerText(),/<0,01 daa/);assert.match(await row.innerText(),/<0,01 %/);await row.getByRole('button',{name:/Søra/}).click();assert.match(await page.getByRole('region',{name:'Aktiv analyse og kartutvalg'}).innerText(),/<0,01 daa/);await page.getByRole('button',{name:/Åpne lokalitetsdetaljer for.*BN00087495/}).click();const details=await page.getByRole('region',{name:'Valgt lokalitet',exact:true}).innerText();assert.match(details,/<0,01 daa/);assert.match(details,/<0,01 %/)
 await page.setViewportSize({width:360,height:240});await button('Delt').click();await contents('selected-locality');await readable(page.getByRole('region',{name:'Valgt lokalitet',exact:true}));await page.screenshot({path:`${output}/low-height.png`,fullPage:true});const selectedMap=await mapState();await button('Nullstill utvalg').click();assert.equal(await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).inputValue(),'');assert.deepEqual(await mapState(),selectedMap)
 report.checks.push({smallPositiveTableSummaryDetails:true,normalMapFitLayersReset:true});assert.deepEqual(report.javascriptErrors,[]);report.completed=true
}catch(error){report.failure=error.stack;await page.screenshot({path:`${output}/failure.png`,fullPage:true});throw error}
finally{await writeFile(`${output}/checks.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();await network.dispose();await server.close()}
