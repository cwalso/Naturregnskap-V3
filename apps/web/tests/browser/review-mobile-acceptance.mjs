// B5.2d: independent acceptance observations. Does not modify application sources.
// Failed scenarios are recorded and the audit continues; findings are not acceptance assertions.
import { mkdir, writeFile } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'
import { chromium, request } from 'playwright'
import { preview } from 'vite'
import { navigateSite } from './map-browser-helpers.mjs'
const output=process.env.BROWSER_OUTPUT??'.browser-results/mobile-acceptance'
await mkdir(output,{recursive:true})
const report={started:new Date().toISOString(),sourceSha:process.env.AUDIT_SOURCE_SHA,scenarios:[],screens:[],requests:[],errors:[],limitations:['Expert audit, no planner participants','Chromium emulation, no physical devices or screen reader','Viewport reduction is a reflow equivalent, not native browser zoom','In-run HTTP replay is explicitly logged; not proof of cold-load performance']}
const server=await preview({preview:{host:'127.0.0.1',port:5250,strictPort:true}})
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true})
const proxy=process.env.HTTPS_PROXY
const network=await request.newContext(proxy?{proxy:{server:proxy}}:{})
const responses=new Map()
let page,context,fault=null,step=0
const pngCache=new Map()
function transparentPng(width,height){
  const key=`${width}x${height}`;if(pngCache.has(key))return pngCache.get(key)
  function chunk(type,data){const t=Buffer.from(type),length=Buffer.alloc(4);length.writeUInt32BE(data.length);let crc=0xffffffff;for(const byte of Buffer.concat([t,data])){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}const sum=Buffer.alloc(4);sum.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([length,t,data,sum])}
  const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6
  const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc((width*4+1)*height))),chunk('IEND',Buffer.alloc(0))]);pngCache.set(key,png);return png
}
const tidy=s=>s.replaceAll('\u00a0',' ')
async function fresh(size={width:390,height:844}){
  if(context)await context.close()
  context=await browser.newContext({viewport:size,hasTouch:true,isMobile:size.width<701})
  page=await context.newPage();page.setDefaultTimeout(20000)
  page.on('pageerror',error=>report.errors.push(error.message))
  await page.route('https://**/*',async route=>{
    const req=route.request(),url=req.url(),key=req.method()+url+(req.postData()??''),start=Date.now()
    try{
      const activeFault=fault; const match=activeFault&&activeFault.match.test(url)
      if(match&&activeFault.delay)await new Promise(resolve=>setTimeout(resolve,activeFault.delay))
      if(match&&activeFault.abort){await route.abort(activeFault.abort);report.requests.push({url,fault:activeFault.abort});return}
      if(match&&activeFault.status){await route.fulfill({status:activeFault.status,body:'Injected acceptance audit service failure'});report.requests.push({url,fault:activeFault.status});return}
      if(match&&activeFault.empty){await route.fulfill({status:200,contentType:'image/png',body:transparentPng(Number(new URL(url).searchParams.get('width')??new URL(url).searchParams.get('WIDTH')??256),Number(new URL(url).searchParams.get('height')??new URL(url).searchParams.get('HEIGHT')??256))});report.requests.push({url,fault:'empty-image'});return}
      let response=responses.get(key),replayed=Boolean(response)
      if(!response){const res=await network.fetch(url,{method:req.method(),data:req.postData()??undefined,headers:req.headers(),timeout:60000});response={status:res.status(),headers:res.headers(),body:await res.body()};if(response.status===200)responses.set(key,response)}
      report.requests.push({url,status:response.status,replayed,injectedDelay:match?(activeFault.delay??0):0,milliseconds:Date.now()-start})
      await route.fulfill(response)
    }catch(error){report.requests.push({url,error:String(error),milliseconds:Date.now()-start});await route.abort().catch(()=>{})}
  })
  await page.goto('http://127.0.0.1:5250/Naturregnskap-V3/')
}
async function commune(name,id){await page.getByRole('combobox',{name:'Velg kommune',exact:true}).fill(name);await page.getByRole('option',{name:`${name} ${id}`,exact:true}).click();step+=2}
async function click(name){await page.getByRole('button',{name,exact:true}).filter({visible:true}).first().click();step++}
async function select(name,value){await page.getByRole('combobox',{name,exact:true}).selectOption(value);step++}
async function area(){await navigateSite(page,'Utforsk i kart');await click('Analyser planområder');await page.locator('.plan-area-totals').waitFor({timeout:180000});step++}
async function nature(){if(page.viewportSize().width<=700)await select('Velg aktiv plananalyse','nature');else await click('Registrerte naturverdier');await page.locator('.future-nature-analysis__summary').waitFor({timeout:180000})}
async function screen(name){
  await page.screenshot({path:`${output}/${name}.png`,fullPage:true})
  await writeFile(`${output}/${name}.txt`,await page.locator('body').innerText())
  const observation=await page.evaluate(()=>{
    const rect=el=>{const r=el?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height}:null}
    const active=document.activeElement,canvas=document.querySelector('.explore-themes__canvas')
    const controls=[...document.querySelectorAll('button,select,input,a[href]')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden').map(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {name:el.getAttribute('aria-label')??el.textContent.trim().slice(0,100),tag:el.tagName,rect:rect(el),visibleInViewport:r.y>=0&&r.bottom<=innerHeight,hit:hit===el||el.contains(hit),font:getComputedStyle(el).fontSize}})
    return {viewport:{width:innerWidth,height:innerHeight},map:rect(canvas),pageOverflow:{x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight},mode:document.querySelector('.explore-themes__body')?.dataset.viewMode,focus:{tag:active.tagName,name:active.getAttribute('aria-label')??active.textContent?.slice(0,100),rect:rect(active),visible:active.getClientRects().length>0,focusVisible:active.matches(':focus-visible')},controls,tableRows:[...document.querySelectorAll('.future-nature-analysis__table table')].map(el=>({caption:el.caption?.textContent,headers:[...el.querySelectorAll('th')].map(th=>({text:th.textContent,scope:th.scope})),rows:[...el.querySelectorAll('tbody tr')].map(tr=>tr.textContent)})),colours:[...document.querySelectorAll('.mobile-analysis-toolbar select,.mobile-analysis-summary button,.analysis-contents select,.mobile-analysis-modes button,[data-analysis-section=summary]')].map(el=>{const s=getComputedStyle(el);return {label:el.getAttribute('aria-label')??el.textContent?.slice(0,60),color:s.color,background:s.backgroundColor,border:s.borderColor,outline:s.outlineColor}}),status:[...document.querySelectorAll('[role=status],[role=alert]')].filter(el=>el.getClientRects().length).map(el=>({role:el.getAttribute('role'),text:el.textContent})),scrolls:[...document.querySelectorAll('.analysis-section-scroll,.explore-themes__detail-scroll')].map(el=>({class:el.className,top:el.scrollTop,client:el.clientHeight,total:el.scrollHeight}))}
  })
  report.screens.push({name,...observation});return observation
}
async function audit(name){if(!process.env.UX_AXE_PATH)return;await page.addScriptTag({path:process.env.UX_AXE_PATH});const result=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:r.violations,incomplete:r.incomplete,passes:r.passes.map(x=>x.id)}});await writeFile(`${output}/${name}-axe.json`,JSON.stringify(result,null,2));return {violations:result.violations.map(x=>x.id),incomplete:result.incomplete.map(x=>x.id)}}
async function scenario(id,fn){step=0;const start=Date.now();try{const detail=await fn();report.scenarios.push({id,completed:true,actions:step,milliseconds:Date.now()-start,...detail})}catch(error){report.scenarios.push({id,completed:false,actions:step,milliseconds:Date.now()-start,error:String(error.stack)});if(page&&!page.isClosed())await screen(`${id}-interrupted`).catch(()=>{})}finally{fault=null;await writeFile(`${output}/acceptance.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report.scenarios.at(-1)))}}
try{
if(process.env.AUDIT_PHASE!=='fault-only'){
for(const size of [{width:320,height:720},{width:390,height:844},{width:900,height:900},{width:1440,height:960}])await scenario(`A1-A3-${size.width}`,async()=>{
  await fresh(size);await commune('Trondheim','5001');await area()
  const total=tidy(await page.locator('.plan-area-totals').innerText()),mobile=size.width<=700
  async function category(id){if(mobile)await select('Kartutvalg i analysen',`category:${id}`);else await page.getByRole('table',{name:'Økosystemtyper innenfor planområder'}).getByRole('button',{name:id==='skog'?'Skog':'Våtmark',exact:true}).click();step++}
  await category('skog');await screen(`A1-forest-${size.width}`)
  await click(mobile?'Tilpass aktivt kartutvalg':'Tilpass kart til utvalget');await page.getByRole('region',{name:'Interaktivt kart i Trondheim'}).focus();await page.keyboard.press('ArrowRight');step++
  await category('vatmark');await screen(`A1-wetland-${size.width}`)
  if(mobile)await select('Kartutvalg i analysen','reset');else await click('Nullstill utvalg')
  const modes=[]
  if(mobile)for(const label of ['Mer kart','Mer resultat','Delt']){await click(label);modes.push(await screen(`A3-${label.replaceAll(' ','-')}-${size.width}`))}
  await nature();const natureTotal=tidy(await page.locator('.future-nature-analysis__summary').innerText())
  await select('Gå til analyseinnhold','localities');await page.getByRole('searchbox',{name:'Søk etter lokalitet',exact:true}).fill('Tanemsmyra');step++
  const duplicateRows=await page.getByRole('region',{name:'Rullbar lokalitetsoversikt',exact:true}).locator('tbody').innerText()
  await page.locator('.future-nature-analysis__table').getByRole('button',{name:/Tanemsmyra.*BN00109936/}).click();step++
  if(mobile)await page.getByRole('button',{name:/Åpne lokalitetsdetaljer for.*BN00109936/}).click();else await select('Gå til analyseinnhold','selected-locality');step++
  const details=tidy(await page.getByRole('region',{name:'Valgt lokalitet',exact:true}).innerText());await screen(`A2-details-${size.width}`)
  await click(mobile?'Tilpass aktivt kartutvalg':'Tilpass kart til utvalget')
  if(mobile){const focusBefore=await page.evaluate(()=>document.activeElement.outerHTML);await click('Kartlag');await screen(`A2-layers-${size.width}`);await page.keyboard.press('Escape');step++;await screen(`A2-return-focus-${size.width}`);report.scenarios.push({id:`focus-return-${size.width}`,focusBefore,focusAfter:await page.evaluate(()=>document.activeElement.outerHTML)})}
  if(mobile)await select('Kartutvalg i analysen','reset');else await click('Nullstill utvalg')
  await select('Gå til analyseinnhold','localities');await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).fill('___missing___');await screen(`A2-empty-search-${size.width}`)
  const emptyAxe=await audit(`A2-empty-search-${size.width}`)
  await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).fill('');await select('Gå til analyseinnhold','summary');await screen(`A2-total-${size.width}`)
  const axeResult=await audit(`A2-total-${size.width}`)
  return {total,natureTotal,duplicateRows,details,modes:modes.map(x=>({viewport:x.viewport,map:x.map,mode:x.mode})),emptyAxe,axe:axeResult}
})
await scenario('A4-pending-owner',async()=>{
  await fresh();await commune('Trondheim','5001');await area();await nature();await commune('Oslo','0301');await page.waitForTimeout(1500);await screen('A4-oslo');const oslo=await page.locator('body').innerText();await commune('Trondheim','5001');await page.locator('.future-nature-analysis__summary').waitFor({timeout:180000});await screen('A4-trondheim-return');return {oslo}
})
await scenario('A5-navigation',async()=>{
  await fresh({width:1440,height:960});await commune('Trondheim','5001');await page.getByLabel('Oppsummering av arealer i planområder').waitFor({timeout:180000});await screen('A5-overview');const overviewLinks=await page.locator('a').evaluateAll(els=>els.map(el=>({text:el.textContent,href:el.getAttribute('href')})));const thematic=[]
  for(const theme of ['Skog','Våtmark']){
    await page.getByRole('link',{name:new RegExp(`Åpne temasiden ${theme}$`)}).click();step++
    await page.locator('.plan-area-indicator .thematic-plan-cards__value').waitFor({timeout:180000})
    const indicator=await page.locator('.plan-area-indicator').innerText();await screen(`A5-${theme}`)
    await page.getByRole('button',{name:new RegExp(`Vis .* i plananalysen`)}).click();step++
    await page.locator('.plan-area-totals').waitFor({timeout:180000});await screen(`A5-${theme}-analysis`)
    const selected=await page.locator('.plan-area-panel [role=status]').innerText();await page.goBack();step++
    await screen(`A5-${theme}-back`);thematic.push({theme,indicator,selected,backUrl:page.url()})
    await navigateSite(page,'Kommuneoversikt');step++
  }
  report.scenarios.push({id:'A5-theme-roundtrips',thematic})
  await navigateSite(page,'Naturtema');await screen('A5-nature-themes');const themeLinks=await page.locator('a').evaluateAll(els=>els.map(el=>({text:el.textContent,href:el.getAttribute('href')})));return {overviewLinks,themeLinks}
})
await scenario('responsive-low-height-and-reflow',async()=>{
  await fresh();await commune('Trondheim','5001');await area()
  const observations=[]
  for(const size of [{width:360,height:640},{width:700,height:650},{width:701,height:650},{width:844,height:390},{width:390,height:500},{width:320,height:400},{width:720,height:480},{width:360,height:240}]){await page.setViewportSize(size);await page.waitForTimeout(150);observations.push(await screen(`reflow-${size.width}-${size.height}`))}
  await page.setViewportSize({width:390,height:844})
  const cdp=await context.newCDPSession(page)
  for(const scale of [2,4]){try{await cdp.send('Emulation.setEmulatedOSTextScale',{scale});await screen(`os-text-${scale}00`)}catch(error){report.limitations.push(`OS text scale ${scale}: ${error}`)}}
  await cdp.send('Emulation.setEmulatedOSTextScale',{scale:1}).catch(()=>{});await cdp.detach()
  // Explicit font-only stress test, independently of viewport reduction.
  for(const scale of [2,4]){await page.evaluate(s=>{const els=[...document.querySelectorAll('body *')];for(const el of els)if(!el.dataset.auditFont)el.dataset.auditFont=getComputedStyle(el).fontSize;for(const el of els)el.style.fontSize=`${parseFloat(el.dataset.auditFont)*s}px`},scale);await screen(`font-only-${scale}00`)}
  return {observations:observations.map(x=>({viewport:x.viewport,map:x.map,overflow:x.pageOverflow}))}
})
await scenario('keyboard-native-selector-and-focus',async()=>{
  await fresh();await commune('Trondheim','5001');await area();const selector=page.getByRole('combobox',{name:'Gå til analyseinnhold'});await selector.focus();await page.keyboard.press('ArrowDown');await screen('keyboard-closed-select-arrowdown');const afterArrow=await page.evaluate(()=>document.activeElement.outerHTML);await selector.focus();await page.keyboard.press('Space');await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');await screen('keyboard-native-cancel');const sequence=[];await page.getByRole('combobox',{name:'Velg aktiv plananalyse'}).focus();for(let i=0;i<26;i++){sequence.push(await page.evaluate(()=>({tag:document.activeElement.tagName,label:document.activeElement.getAttribute('aria-label')??document.activeElement.textContent?.slice(0,80),visible:document.activeElement.getClientRects().length>0,focusVisible:document.activeElement.matches(':focus-visible')})));await page.keyboard.press('Tab')}return {afterArrow,sequence}
})
}
for(const test of [{id:'zero-plan',match:/dibk.*wms/i,empty:true},{id:'http-plan',match:/wms\.dibk\.no|dibk.*wms/i,status:503},{id:'http-ecosystem',match:/wms\.nibio\.no.*okosystemtypeniva1/i,status:503},{id:'timeout-nature',match:/naturtyper_kuverdi\/MapServer.*query/i,abort:'timedout'},{id:'empty-wms',match:/wms\.nibio\.no/i,empty:true},{id:'slow-switch',match:/wms\.dibk\.no|dibk.*wms/i,delay:7000}].filter(test=>!process.env.AUDIT_FAULTS||process.env.AUDIT_FAULTS.split(',').includes(test.id)))await scenario(`fault-${test.id}`,async()=>{
  fault=test;const requestStart=report.requests.length;await fresh();await commune('Trondheim','5001');await navigateSite(page,'Utforsk i kart');await click('Analyser planområder');await page.waitForTimeout(test.delay?1200:18000)
  if(test.id==='timeout-nature'){await select('Velg aktiv plananalyse','nature');await page.waitForTimeout(20000)}
  if(test.delay){await click('Kartlag');await page.keyboard.press('Escape');await commune('Oslo','0301');await page.waitForTimeout(8500)}
  await screen(`fault-${test.id}`);const text=await page.locator('body').innerText();return {text,interceptions:report.requests.slice(requestStart).filter(x=>x.fault||x.injectedDelay)}
})
report.completed=new Date().toISOString()
}finally{await writeFile(`${output}/acceptance.json`,JSON.stringify(report,null,2));await context?.close();await browser.close();await network.dispose();await server.httpServer.close()}
