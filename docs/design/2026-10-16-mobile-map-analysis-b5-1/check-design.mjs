import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { chromium } from '../../../apps/web/node_modules/playwright/index.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const output = resolve(process.env.DESIGN_OUTPUT || `${root}/evidence`);
const axePath = process.env.UX_AXE_PATH;
await mkdir(output,{recursive:true});
const report = { date:'2026-10-16', kind:'expert-design-review-not-user-testing', chromium:null, screenshots:[], gallery:[], tasks:[], keyboard:[], accessibility:[], contrasts:[], errors:[], checks:[] };
const server = createServer(async (req,res) => {
  try {
    const path = resolve(root, `.${decodeURIComponent(new URL(req.url,'http://localhost').pathname)}`);
    if (!path.startsWith(`${root}/`)) {res.writeHead(403);res.end();return;}
    const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'};
    const body=await readFile(path);
    res.writeHead(200,{'Content-Type':mime[extname(path)]||'text/plain'});res.end(body);
  } catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(5232,'127.0.0.1',resolve));
const base='http://127.0.0.1:5232';
let browser;
const dimensions=[{width:390,height:844},{width:320,height:720}];
const snapshot=page=>page.evaluate(()=>designState());
const view=s=>JSON.stringify([s.view.x,s.view.y,s.view.zoom]);
async function capture(page,name,axe=true) {
  await page.screenshot({path:`${output}/${name}.png`});
  const metrics=await page.evaluate(()=>{
    const rect=selector=>{const r=document.querySelector(selector)?.getBoundingClientRect();return r?{width:r.width,height:r.height}:null;};
    return {viewport:{width:innerWidth,height:innerHeight},pageOverflowX:document.documentElement.scrollWidth-innerWidth,pageOverflowY:document.documentElement.scrollHeight-innerHeight,map:rect('.map-pane'),results:rect('.result-scroll'),selection:document.querySelector('#summary').innerText,view:designState().view};
  });
  assert.equal(metrics.pageOverflowX,0,name+' horizontal overflow');
  assert.equal(metrics.pageOverflowY,0,name+' vertical page overflow');
  report.screenshots.push({name,...metrics});
  if(axe&&axePath){
    await page.addScriptTag({path:axePath});
    const audit=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {version:r.testEngine.version,violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),incomplete:r.incomplete.map(v=>v.id)};});
    report.accessibility.push({name,...audit});
    assert.equal(audit.violations.length,0,name+' axe violations '+JSON.stringify(audit.violations));
  }
  const text=await page.locator('body').innerText();
  await writeFile(`${output}/${name}.txt`,text);
}
async function go(page,alternative,scene){await page.goto(`${base}/app.html?alternative=${alternative}&scene=${scene}`);}
async function tabTo(page,id){
  for(let i=0;i<90;i++){
    if(await page.evaluate(id=>document.activeElement.id===id,id))return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Could not tab to '+id);
}
async function taskFlow(page,alternative,size) {
  await go(page,alternative,'entry');
  await page.evaluate(()=>{
    window.scrollReview={pixels:0,events:0};const previous=new WeakMap();
    document.addEventListener('scroll',event=>{const el=event.target;if(!el.classList?.contains('result-scroll')&&!el.classList?.contains('layer-scroll'))return;const old=previous.get(el)||0;scrollReview.pixels+=Math.abs(el.scrollTop-old);scrollReview.events++;previous.set(el,el.scrollTop);},true);
  });
  let actions=0;
  const click=async selector=>{const target=page.locator(selector);await target.scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await target.click();actions++;};
  const select=async(selector,value)=>{await page.locator(selector).selectOption(value);actions++;};
  const fill=async(selector,value)=>{await page.locator(selector).fill(value);actions++;};
  async function record(task,fn){
    const before=await page.evaluate(()=>({...scrollReview})),initial=actions;
    await fn();await page.evaluate(()=>new Promise(requestAnimationFrame));
    const after=await page.evaluate(()=>({...scrollReview}));
    report.tasks.push({alternative,width:size.width,task,actions:actions-initial,scrollPixels:Math.round(after.pixels-before.pixels),scrollEvents:after.events-before.events,state:await snapshot(page)});
  }
  await record('1 Finn skog',async()=>{
    await click('#start');const v=view(await snapshot(page));
    await select('#quick-selection','skog');assert.equal(view(await snapshot(page)),v);
    assert.match(await page.locator('#summary').innerText(),/2\s032,22 daa/);
  });
  await record('2 Se hvor skogarealet ligger',async()=>{
    if(!await page.locator('.map-pane').isVisible())await click('#results-toggle');
    await click('#fit');assert.equal((await snapshot(page)).view.kind,'selection');
  });
  await record('3 Bytt til våtmark',async()=>{
    const v=view(await snapshot(page));await select('#quick-selection','vatmark');
    assert.equal(view(await snapshot(page)),v);assert.match(await page.locator('#summary').innerText(),/12,64 daa/);
  });
  await record('4 Finn registrert lokalitet',async()=>{
    const v=view(await snapshot(page));await select('#analysis-mode','nature');assert.equal(view(await snapshot(page)),v);
    if((await snapshot(page)).panel!=='results')await click('#results-toggle');
    await fill('#locality-search','BN00109936');
    await click('[data-selection="BN00109936"]');
    assert.equal((await snapshot(page)).selection,'BN00109936');assert.equal(view(await snapshot(page)),v);
    assert.match(await page.locator('#summary').innerText(),/19,61 daa/);
  });
  await record('5 Tilbake til samlet resultat',async()=>{
    const v=view(await snapshot(page));await click('#reset');const s=await snapshot(page);
    assert.equal(s.selection,'all');assert.equal(s.search,'');assert.equal(view(s),v);
    assert.match(await page.locator('#summary').innerText(),/119,38 daa/);
  });
  await record('6 Åpne ordinære kartlag og returner',async()=>{
    const before=await snapshot(page);await click('#layers-button');await click('#layer-grey');await click('#close-layers');
    const after=await snapshot(page);assert.equal(after.panel,before.panel);assert.equal(after.mode,before.mode);assert.equal(after.selection,before.selection);assert.equal(view(after),view(before));assert.equal(after.layers.grey,true);
  });
  // Separate checks, outside task action counts.
  await page.locator('#layers-button').click();
  await page.locator('#layers').getByText('Grå arealer: innstillinger og kilde',{exact:true}).click();
  await page.locator('#layers input[type=range]').focus();await page.keyboard.press('ArrowRight');
  assert.equal((await snapshot(page)).opacity,26);await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'layers-button');
  const before=await snapshot(page);await page.locator('#commune').selectOption('Oslo');const oslo=await snapshot(page);
  assert.equal(oslo.mode,'nature');assert.equal(oslo.selection,'all');assert.notEqual(view(oslo),view(before));
  assert.equal(await page.locator('.stat-grid').count(),0);assert.match(await page.locator('#summary').innerText(),/ikke null treff/);
  await page.locator('#commune').selectOption('Trondheim');
  await page.locator('#close-analysis').click();assert.equal((await snapshot(page)).active,false);assert.equal((await snapshot(page)).layers.grey,true);
  report.checks.push({alternative,width:size.width,layersPreserved:true,opacityKeyboard:true,communeResetNoOldResults:true,closeRemovesOnlyAnalysis:true});
  if(alternative==='A'){
    await go(page,'A','forest');await page.locator('#fit').click();await page.locator('#quick-selection').selectOption('vatmark');
    await page.evaluate(()=>{window.scrollReview={pixels:0};const previous=new WeakMap();document.addEventListener('scroll',e=>{if(!e.target.classList?.contains('result-scroll'))return;const old=previous.get(e.target)||0;scrollReview.pixels+=Math.abs(e.target.scrollTop-old);previous.set(e.target,e.target.scrollTop);},true);});
    await page.locator('#analysis-mode').selectOption('nature');await page.locator('#results-toggle').click();await page.locator('#expand-results').click();
    await page.locator('#locality-search').fill('BN00109936');await page.locator('[data-selection="BN00109936"]').click();
    await page.evaluate(()=>new Promise(requestAnimationFrame));
    report.tasks.push({alternative,width:size.width,task:'4b Finn lokalitet med Utvid',actions:5,scrollPixels:Math.round(await page.evaluate(()=>scrollReview.pixels)),state:await snapshot(page)});
  }
  // All information is reachable without passing 70 locality rows.
  await go(page,alternative,'nature-all');
  const original=view(await snapshot(page));
  await page.locator('#result-view').selectOption('values');await page.locator('[data-selection^="value:"]').first().click();assert.equal(view(await snapshot(page)),original);
  await page.locator('#result-view').selectOption('types');assert.equal(await page.locator('[data-selection^="type:"]').count(),23);
  await page.locator('[data-selection^="type:"]').first().click();assert.equal(view(await snapshot(page)),original);
  await page.locator('#result-view').selectOption('method');await page.locator('.result-scroll code').waitFor();
  await page.locator('#result-view').selectOption('localities');
  await page.locator('.result-scroll').hover();await page.mouse.wheel(0,250);await page.waitForTimeout(100);assert.equal(view(await snapshot(page)),original);
  await go(page,alternative,'locality');
  const chosen=await snapshot(page);await page.locator('#layers-button').click();await page.locator('#close-layers').click();
  assert.equal((await snapshot(page)).selection,chosen.selection);assert.equal((await snapshot(page)).panel,chosen.panel);
  await page.locator('#results-toggle').click();if((await snapshot(page)).panel==='results')await page.locator('#results-toggle').click();
  const rect=await page.locator('#map').boundingBox();
  const touch=await page.context().newCDPSession(page),x=rect.x+rect.width*.55,y=rect.y+rect.height*.5;
  const previous=view(await snapshot(page));
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+38,y:y+20}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.notEqual(view(await snapshot(page)),previous);assert.equal((await snapshot(page)).selection,chosen.selection);await touch.detach();
  report.checks.push({alternative,width:size.width,quickAccessToMethodValuesTypes:true,scrollDoesNotPanMap:true,selectedLocalitySurvivesLayers:true,emulatedTouchPan:true});
}
async function keyboardFlow(page,alternative,size){
  await go(page,alternative,'entry');await tabTo(page,'start');await page.keyboard.press('Enter');
  await tabTo(page,'quick-selection');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  assert.equal((await snapshot(page)).selection,'skog');
  if((await snapshot(page)).panel==='results'){await tabTo(page,'results-toggle');await page.keyboard.press('Enter');}
  await tabTo(page,'results-toggle');await page.keyboard.press('Enter');assert.equal((await snapshot(page)).panel,'results');
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'results-toggle');assert.equal((await snapshot(page)).selection,'skog');
  await tabTo(page,'map');const before=await snapshot(page);await page.keyboard.press('ArrowRight');assert.notEqual(view(await snapshot(page)),view(before));
  await tabTo(page,'results-toggle');
  const focus=await page.locator('#results-toggle').evaluate(el=>({visible:el.matches(':focus-visible'),outline:getComputedStyle(el).outlineStyle,width:getComputedStyle(el).outlineWidth}));
  assert.equal(focus.visible,true);assert.equal(focus.outline,'solid');
  report.keyboard.push({alternative,width:size.width,tabEnterNativeSelect:true,escapeFocusReturn:true,arrowPan:true,focus});
}
try {
  const referenceText=await readFile(resolve(root,'reference-data.js'),'utf8');
  const reference=JSON.parse(referenceText.split('window.DesignReference = ')[1].trim().replace(/;$/,''));
  const area=JSON.parse(await readFile(resolve(root,'../../validation/2026-10-14-plan-area/final-result.json'),'utf8'));
  const nature=JSON.parse(gunzipSync(await readFile(resolve(root,'../../validation/2026-10-13-future-nature/result.json.gz')))).result;
  for(const [kind,source]of [['area',area],['nature',nature]])for(const [key,value]of Object.entries(reference[kind])){
    if(key==='values'||key==='types')assert.deepEqual(value,source[key].map(row=>Object.fromEntries(Object.entries(row).filter(([k])=>!k.toLowerCase().includes('geometry')))));
    else if(key==='localities')assert.deepEqual(value,source[key].map(row=>Object.fromEntries(Object.keys(value[0]).map(k=>[k,row[k]]))));
    else assert.deepEqual(value,source[key]);
  }
  assert.equal(reference.nature.localities.length,70);
  report.checks.push({existingReferenceSnapshotsMatch:true,localities:70,noGeometriesOrNewAnalysis:true});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});
  report.chromium=browser.version();
  const page=await browser.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',e=>report.errors.push(e.message));
  for(const size of dimensions)for(const alternative of ['A','B','C']){
    await page.setViewportSize(size);
    for(const scene of ['area-all','forest','nature-all','locality','pan','missing']){
      await go(page,alternative,scene);await capture(page,`${alternative}-${scene}-${size.width}`);
      if(scene==='locality')assert.match(await page.locator('#summary').innerText(),/19,61 daa/);
    }
    await taskFlow(page,alternative,size);
    await keyboardFlow(page,alternative,size);
    if(alternative==='C'){
      await go(page,'C','forest');const before=view(await snapshot(page));
      await page.locator('[data-size=results]').click();assert.equal(view(await snapshot(page)),before);
      assert.equal(await page.locator('.zoom').isVisible(),false);
      await page.locator('#fit').click();assert.equal((await snapshot(page)).selection,'skog');
      await capture(page,`C-more-results-${size.width}`);
      await page.locator('[data-size=map]').click();assert.equal((await snapshot(page)).panel,'none');
      assert.equal(await page.locator('.zoom').isVisible(),true);
      report.checks.push({alternative,width:size.width,allSizePresets:true,compactControlsDoNotCompete:true});
    }
    if(alternative==='A'){
      await go(page,'A','nature-all');await page.locator('#expand-results').click();assert.equal((await snapshot(page)).resultFocus,true);
      assert.equal(await page.locator('.map-pane').isVisible(),false);await capture(page,`A-expanded-results-${size.width}`);
    }
  }
  for(const size of [{width:900,height:900},{width:1440,height:960}])for(const alternative of ['A','B','C']){
    await page.setViewportSize(size);
    for(const scene of ['forest','nature-all']){
      await go(page,alternative,scene);await capture(page,`${alternative}-${scene}-${size.width}`);
      assert.ok((await page.locator('.map-pane').boundingBox()).width>=550);
      const initial=await snapshot(page);await page.setViewportSize({width:390,height:844});await page.setViewportSize(size);assert.equal(view(await snapshot(page)),view(initial));assert.equal((await snapshot(page)).selection,initial.selection);
    }
  }
  // Actual computed foreground/background pairs, including hover and visible keyboard focus.
  await page.setViewportSize({width:390,height:844});await go(page,'A','forest');
  async function contrast(selector,state){
    const value=await page.locator(selector).evaluate(el=>{
      const rgb=value=>value.match(/[\d.]+/g).slice(0,3).map(Number);
      const luminance=c=>c.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
      const style=getComputedStyle(el);let bg=style.backgroundColor,parent=el;
      while(bg==='rgba(0, 0, 0, 0)'&&parent.parentElement){parent=parent.parentElement;bg=getComputedStyle(parent).backgroundColor;}
      const f=luminance(rgb(style.color)),b=luminance(rgb(bg));return {foreground:style.color,background:bg,ratio:(Math.max(f,b)+.05)/(Math.min(f,b)+.05)};
    });
    assert.ok(value.ratio>=4.5,selector+' contrast');report.contrasts.push({selector,state,...value});
  }
  await contrast('#fit','normal');await page.locator('#fit').hover();await page.waitForTimeout(150);await contrast('#fit','hover');
  await page.locator('#fit').focus();await contrast('#fit','focus');await contrast('.summary strong','normal');await contrast('#map-disclaimer','normal');
  await go(page,'C','forest');await contrast('[data-size=split]','selected');await page.locator('[data-size=split]').hover();await page.waitForTimeout(150);await contrast('[data-size=split]','selected-hover');
  await page.setViewportSize({width:1440,height:1400});await page.goto(`${base}/index.html`);
  for(const width of [390,320]){
    await page.locator('#size').selectOption(String(width));await page.locator('#scene').selectOption('forest');
    for(const element of await page.locator('iframe').elementHandles()){
      const frame=await element.contentFrame();await frame.waitForFunction(width=>typeof designState==='function'&&designState().selection==='skog'&&innerWidth===width,width);
    }
    const name=`comparison-${width}`;await page.screenshot({path:`${output}/${name}.png`});report.gallery.push({name,frameWidth:width,frameHeight:width===390?844:720});
  }
  assert.deepEqual(report.errors,[]);report.completed=true;
} catch(error) { report.failure=error.stack;throw error; }
finally {
  await writeFile(`${output}/checks.json`,JSON.stringify(report,null,2));
  if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify({completed:report.completed,screenshots:report.screenshots.length,axe:report.accessibility.length,tasks:report.tasks.length,failure:report.failure}));
}
