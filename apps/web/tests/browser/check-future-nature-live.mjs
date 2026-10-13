import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'
const output=process.env.BROWSER_OUTPUT ?? '.browser-results/future-nature-live'
await mkdir(output,{recursive:true})
const server=await createServer({server:{host:'127.0.0.1',port:5198,strictPort:true},plugins:[{name:'analysis-audit',enforce:'pre',transform(code,id){
 if(id.endsWith('/src/map/exploreThemeMap.ts'))return code.replace('  let destroyed = false','  globalThis.__themeMap = map; globalThis.__mapCreations = (globalThis.__mapCreations ?? 0) + 1; let destroyed = false').replace('    update(next) {','    update(next) { globalThis.__themeContext = next;').replace('      const key = JSON.stringify(selection)','      globalThis.__analysisMap = { result: active, selection }; const key = JSON.stringify(selection)')
 if(id.endsWith('/future-analysis/source.ts'))return code.replace('  return complete','  globalThis.__completeFeatures = complete; return complete')
 if(id.endsWith('/future-analysis/analysisMask.ts'))return code.replace("  return { kind: 'planned'","  const result = { kind: 'planned'").replace('analysisMask: mask }','analysisMask: mask }; globalThis.__futureMask = result; return result')
}}]})
let browser,network,page
const errors=[], failures=[]
try {
 await server.listen();browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true});network=await request.newContext({proxy:{server:process.env.HTTPS_PROXY}})
 page=await browser.newPage({viewport:{width:1440,height:960}});page.on('pageerror',e=>errors.push(e.message))
 await page.route('https://**/*',async route=>{const req=route.request();try{const response=await network.fetch(req.url(),{method:req.method(),data:req.postData()??undefined,headers:req.headers(),timeout:60000});if(response.status()!==200)failures.push({url:req.url(),status:response.status()});await route.fulfill({response})}catch(e){failures.push({url:req.url(),error:e.message});await route.abort()}})
 await page.goto('http://127.0.0.1:5198')
 const data=await page.evaluate(async()=>{const start=performance.now();const result=await(await import('/src/features/future-analysis/model.ts')).calculateFutureNature('5001');globalThis.__computedResult=result;return{result,elapsedMs:performance.now()-start}})
 assert.equal(data.result.status,'available');data.heapUsedAfterCompute=await page.evaluate(()=>performance.memory?.usedJSHeapSize??null)
 await writeFile(output+'/result.json',JSON.stringify(data,null,2));await writeFile(output+'/source-features.json',JSON.stringify(await page.evaluate(()=>__completeFeatures)))
 console.log('COMPUTED',data.result.uniqueAreaDaa,data.result.localityCount,data.elapsedMs)
 const compare=await page.evaluate(async()=>{
  const oldModule=await import('/src/map/plannedDevelopment.ts'),oldValued=await import('/src/map/plannedValuedNature.ts')
  const oldPlan=await oldModule.calculatePlannedDevelopment('5001');if(oldPlan.status!=='available')throw new Error('Gammelt grunnlag mangler')
  const old=oldValued.summarizeValuedNatureFeaturesForTest(__completeFeatures,oldPlan.overlay), midpoint=oldValued.summarizeValuedNatureFeaturesForTest(__completeFeatures,__futureMask)
  const oldActual=await oldValued.calculatePlannedValuedNatureAnalysis(oldPlan)
  const cell=oldModule.PLAN_PIXEL_METERS**2*__computedResult.provenance.areaFactor/1000
  return{oldLiveOriginalAreaDaa:oldActual.uniqueOverlapAreaKm2*1000,oldLiveOriginalObjects:oldActual.affectedFeatureCount,oldCandidateObjects:oldActual.candidateFeatureCount,oldSameSourceAreaDaa:old.uniquePixelCount*cell,oldSameSourceObjects:old.affectedFeatureCount,natureMidpointAreaDaa:midpoint.uniquePixelCount*cell,natureMidpointObjects:midpoint.affectedFeatureCount,newAreaDaa:__computedResult.uniqueAreaDaa,newLocalities:__computedResult.localityCount,sourceHash:__computedResult.provenance.sourceHash}
 })
 await writeFile(output+'/method-comparison.json',JSON.stringify(compare,null,2));console.log('COMPARISON',JSON.stringify(compare))
 await page.getByRole('combobox',{name:'Velg kommune'}).fill('Trondheim');await page.getByRole('option',{name:/Trondheim.*5001/}).click()
 await page.locator('summary[aria-label="Åpne meny"]').click();await page.getByRole('link',{name:'Utforsk i kart',exact:true}).click();await page.locator('summary[aria-label="Åpne meny"]').click()
 await page.waitForFunction(()=>globalThis.__themeContext?.boundary?.properties.number==='5001')
 for(const name of ['Framtidig utbygging','Verdsatte naturtyper','Verneområder','Inngrepsfri natur (INON)','Villrein','Grå arealer'])await page.getByRole('checkbox',{name,exact:true}).setChecked(true)
 const state=()=>page.evaluate(()=>({center:__themeMap.getView().getCenter(),resolution:__themeMap.getView().getResolution(),layers:__themeContext.layers,instances:__mapCreations}))
 const original=await state(),screens=[]
 async function painted(){await page.evaluate(()=>new Promise((resolve,reject)=>{const map=__themeMap;const timeout=setTimeout(()=>{map.un('rendercomplete',done);reject(new Error('Kartet ble ikke ferdig rendret'))},90000);function done(){clearTimeout(timeout);resolve()};map.once('rendercomplete',done);map.render()}))}
 await page.getByRole('button',{name:'Analyser planoverlapp',exact:true}).click();await page.getByText('Unikt overlappsareal',{exact:true}).waitFor({timeout:180000})
 for(const [width,height] of [[1440,960],[900,900],[390,844],[320,720]]) {
  await page.setViewportSize({width,height});await page.waitForTimeout(350);const before=await state()
  await page.getByRole('button',{name:/^Stor verdi.*daa/}).click();await page.waitForFunction(()=>__analysisMap.selection.kind==='value');assert.deepEqual(await state(),before,'Verdifilter flyttet kartet')
  const type=data.result.types[0].label;await page.getByRole('table',{name:'Naturtyper med overlapp'}).getByRole('button',{name:type,exact:true}).click();await page.waitForFunction(()=>__analysisMap.selection.kind==='type');assert.deepEqual(await state(),before,'Naturtypefilter flyttet kartet')
  const locality=data.result.localities.slice().sort((a,b)=>b.overlapAreaDaa-a.overlapAreaDaa)[0]
  await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).fill(locality.id);await page.getByRole('button',{name:new RegExp(locality.id)}).click();await page.waitForFunction(()=>__analysisMap.selection.kind==='locality');await painted()
  await page.screenshot({path:output+`/locality-${width}.png`,fullPage:true})
  const dimensions=await page.evaluate(()=>{const r=document.querySelector('.explore-themes__canvas').getBoundingClientRect();return{width:r.width,height:r.height,overflow:document.documentElement.scrollWidth-innerWidth}})
  assert.ok(dimensions.overflow<=1&&dimensions.width>=100&&dimensions.height>=100,JSON.stringify(dimensions))
  const geometry=await page.evaluate(()=>{const layers=__themeMap.getLayers().getArray(),whole=layers.find(l=>l.getClassName()==='future-nature-whole').getSource(),overlap=layers.find(l=>l.getClassName()==='future-nature-overlap').getSource();return{wholeArea:whole.getFeatures().reduce((n,f)=>n+f.getGeometry().getArea(),0),overlapArea:overlap.getFeatures().reduce((n,f)=>n+f.getGeometry().getArea(),0),planShown:layers.find(l=>l.getClassName()==='future-nature-plan-mask').getVisible()}})
  assert.ok(geometry.overlapArea>0);assert.ok(Math.abs(geometry.overlapArea*data.result.provenance.areaFactor/1000-locality.overlapAreaDaa)<.00001)
  await page.getByRole('button',{name:'Vis hele analysen'}).click();await page.getByRole('searchbox').fill('');await page.waitForFunction(()=>__analysisMap.selection.kind==='all');await page.getByRole('button',{name:'Vis hele kommunen',exact:true}).click();await page.evaluate(()=>document.querySelector('.explore-themes__detail-scroll').scrollTop=0);await painted();await page.screenshot({path:output+`/all-${width}.png`,fullPage:true})
  assert.deepEqual((await state()).layers,original.layers);assert.equal((await state()).instances,original.instances)
  screens.push({width,height,dimensions,geometry,filtersPreservedViewport:true,layersPreserved:true,singleMapInstance:true})
 }
 await writeFile(output+'/browser-checks.json',JSON.stringify(screens,null,2));console.log('SCREENS',JSON.stringify(screens))
 const unavailable=await page.evaluate(async()=>await(await import('/src/features/future-analysis/model.ts')).calculateFutureNature('0301'));assert.equal(unavailable.status,'not_available');await writeFile(output+'/unsupported-municipality.json',JSON.stringify(unavailable,null,2))
 await page.setViewportSize({width:1440,height:960})
 await page.getByRole('button',{name:'Lukk detaljpanel',exact:true}).click()
 await page.evaluate(()=>{location.hash='#tema-valued-nature'})
 await page.getByRole('button',{name:'Åpne overlappsanalyse',exact:true}).waitFor()
 await page.waitForFunction(()=>document.querySelector('.thematic-plan-cards__value')?.textContent.includes('119'))
 await page.screenshot({path:output+'/theme-card-1440.png',fullPage:true})
 await page.getByRole('button',{name:'Åpne overlappsanalyse',exact:true}).click()
 await page.getByRole('complementary',{name:'Planoverlapp – naturtyper',exact:true}).waitFor()
 await page.getByText('Unikt overlappsareal',{exact:true}).waitFor()
 assert.deepEqual(errors,[])
} catch(e){console.error(e);await page?.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{});process.exitCode=1}
finally{await writeFile(output+'/network.json',JSON.stringify({errors,failures},null,2));await browser?.close();await network?.dispose();await server.close()}
