import assert from 'node:assert/strict'

export async function runAnalysisInteractions({page,report,snapshot,retained,capture,commune,settings,stage}){
  const canvas=page.getByRole('region',{name:/Interaktivt kart i/})
  async function stableView(before){const after=await snapshot();assert.deepEqual(after.view,before.view);assert.equal(after.creations,before.creations);assert.deepEqual(after.calls,before.calls);assert.equal(after.areaId,before.areaId);assert.equal(after.natureId,before.natureId);return after}
  async function fitToOverlap(){
    await canvas.focus();await page.keyboard.press('ArrowLeft');const panned=await snapshot()
    await page.getByRole('button',{name:mobile?'Tilpass aktivt kartutvalg':'Tilpass kart til utvalget',exact:true}).click()
    const fitted=await snapshot()
    const dimensions=await page.evaluate(()=>{
      const map=globalThis.__b5Map,area=globalThis.__b5Area?.result
      const layer=map.getLayers().getArray().find(l=>l.getClassName()===(area?'plan-area-categories':'future-nature-overlap'))
      return {extent:layer.getSource().getExtent(),size:map.getSize()}
    })
    const [x1,y1,x2,y2]=dimensions.extent,[w,h]=dimensions.size
    const expected=Math.max((x2-x1)/(w-72),(y2-y1)/(h-72))
    assert.ok(Math.abs(fitted.view.resolution-expected)<expected*1e-8,JSON.stringify({fitted,expected}))
    const expectedCenter=[(x1+x2)/2,(y1+y2)/2]
    assert.ok(fitted.view.center.every((coordinate,index)=>Math.abs(coordinate-expectedCenter[index])<1e-6),JSON.stringify({fitted,expectedCenter}))
    fitObservations.push({changedView:JSON.stringify(fitted.view)!==JSON.stringify(panned.view),selection:fitted.selection,view:fitted.view,expectedResolution:expected,extent:dimensions.extent,size:dimensions.size,areaId:fitted.areaId,natureId:fitted.natureId})
    return fitted
  }
  const fitObservations=[]
  async function ordinaryLayers(){return page.evaluate(()=>globalThis.__b5Map.getLayers().getArray().filter(l=>l.getClassName().startsWith('explore-')).map(l=>({name:l.getClassName(),visible:l.getVisible(),opacity:l.getOpacity()})))}
  async function reset(){if(mobile&&await page.locator('.explore-themes__body').getAttribute('data-view-mode')==='map')await page.getByRole('combobox',{name:'Kartutvalg i analysen',exact:true}).selectOption('reset');else if(mobile)await page.getByRole('button',{name:'Nullstill utvalg',exact:true}).tap();else{await page.getByRole('button',{name:'Nullstill utvalg',exact:true}).focus();await page.keyboard.press('Enter')}}
  async function touchPan(){
    const box=await canvas.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2,before=await snapshot()
    const cdp=await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
    for(const delta of [10,20,30,45])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+delta,y}]})
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach()
    const after=await snapshot();assert.notDeepEqual(after.view.center,before.view.center);assert.equal(after.creations,before.creations);assert.equal(after.geometryHash,before.geometryHash);assert.deepEqual(after.calls,before.calls)
  }
  let mobile=false
  for(const size of [{width:320,height:720},{width:390,height:844},{width:900,height:900},{width:1440,height:960}]){
    mobile=size.width<701;await page.setViewportSize(size)
    async function mode(type){if(mobile)await page.getByRole('combobox',{name:'Velg aktiv plananalyse',exact:true}).selectOption(type);else await page.getByRole('button',{name:type==='area'?'Arealfordeling':'Registrerte naturverdier',exact:true}).click();await page.locator(type==='area'?'.plan-area-totals':'.future-nature-analysis__summary').waitFor({state:'attached',timeout:180000})}
    async function chooseArea(id){if(mobile)await page.getByRole('combobox',{name:'Kartutvalg i analysen',exact:true}).selectOption(`category:${id}`);else await page.getByRole('table',{name:'Økosystemtyper innenfor planområder'}).getByRole('button',{name:id==='skog'?'Skog':'Våtmark',exact:true}).click()}
    async function chooseNature(kind,label){if(mobile)await page.getByRole('combobox',{name:'Kartutvalg i analysen',exact:true}).selectOption(`${kind}:${label}`);else if(kind==='value')await page.getByRole('button',{name:new RegExp(`^${label}`)}).click();else if(kind==='type')await page.getByRole('table',{name:'Naturtyper med overlapp'}).getByRole('button',{name:label,exact:true}).click();else{await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).fill(label);await page.getByRole('button',{name:new RegExp(label)}).click()}}
    const modes=mobile?[['Delt','split'],['Mer kart','map'],['Mer resultat','results']]:[['Desktop','desktop']]
    const measurements=[]
    await mode('area')
    if(stage!=='c1'){
      const baseline=await snapshot(),contents=page.getByRole('combobox',{name:'Gå til analyseinnhold'})
      for(const section of ['ecosystems','unclassified','method','summary']){await contents.selectOption(section);retained(baseline,await snapshot());if(section==='method'){assert.equal(await page.locator('.plan-area-panel details').evaluate(el=>el.open),true);await capture(`${stage}-area-contents-${size.width}`)}}
    }
    for(const [label,key]of modes){
      if(mobile)await page.getByRole('button',{name:label,exact:true}).tap()
      const before=await snapshot();await chooseArea('skog');await stableView(before);await fitToOverlap()
      const selection=await snapshot();await chooseArea('vatmark');await stableView(selection)
      if(mobile){const summary=(await page.getByRole('region',{name:'Aktiv analyse og kartutvalg'}).innerText()).replaceAll('\u00a0',' ');assert.match(summary,/12,64/)}
      await chooseArea('skog');await fitToOverlap()
      if(stage==='c4'){
        if(mobile)await touchPan();else{await canvas.focus();await page.keyboard.press('ArrowRight')}
        const panned=await snapshot(),layers=await ordinaryLayers();await reset();const cleared=await stableView(panned);assert.equal(cleared.selection.kind,'all');assert.deepEqual(await ordinaryLayers(),layers);await capture(`${stage}-area-reset-${key}-${size.width}`)
        await chooseArea('skog');await fitToOverlap()
      }
      await capture(`${stage}-area-${key}-${size.width}`)
      const box=await page.locator('.explore-themes__canvas').boundingBox();measurements.push({mode:key,map:box})
      if(key==='split')assert.ok(box.height>=(size.width===320?200:260))
    }
    await mode('nature')
    if(stage!=='c1'){
      const baseline=await snapshot(),contents=page.getByRole('combobox',{name:'Gå til analyseinnhold'})
      if(stage==='c4'){await contents.focus();await page.keyboard.press('l')}else await contents.selectOption('localities');assert.equal(await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).evaluate(el=>el===document.activeElement),true)
      await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).fill('___finnes_ikke___')
      await contents.selectOption('values');retained(baseline,await snapshot())
      await contents.selectOption('method');assert.equal(await page.locator('.future-nature-analysis details').evaluate(el=>el.open),true);retained(baseline,await snapshot());await capture(`${stage}-nature-contents-${size.width}`)
      assert.equal(await page.locator('.future-nature-analysis input[type=search]').inputValue(),'___finnes_ikke___')
      await contents.selectOption('summary')
    }
    for(const [label,key]of modes){
      if(mobile)await page.getByRole('button',{name:label,exact:true}).tap()
      let before=await snapshot();await chooseNature('value','Stor verdi');await stableView(before);await fitToOverlap()
      const type=await page.evaluate(()=>globalThis.__b5Nature.result.types[0].label)
      before=await snapshot();await chooseNature('type',type);await stableView(before)
      // The quick selector deliberately lists only the selected locality. Use the existing list once.
      if(mobile&&key==='map')await page.getByRole('button',{name:'Delt',exact:true}).tap()
      await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).fill('BN00109936')
      before=await snapshot();await page.locator('.future-nature-analysis__table').getByRole('button',{name:/Tanemsmyra.*BN00109936/}).click();await stableView(before)
      if(mobile&&key==='map')await page.getByRole('button',{name:'Mer kart',exact:true}).tap()
      await fitToOverlap();await capture(`${stage}-locality-${key}-${size.width}`)
      if(['c3','c4'].includes(stage)){
        const beforeDetails=await snapshot()
        if(mobile)await page.getByRole('button',{name:/Åpne lokalitetsdetaljer for.*BN00109936/}).tap();else await page.getByRole('combobox',{name:'Gå til analyseinnhold'}).selectOption('selected-locality')
        await page.waitForFunction(()=>document.activeElement?.matches('[data-analysis-section=selected-locality]'))
        retained(beforeDetails,await snapshot())
        const details=page.getByRole('region',{name:'Valgt lokalitet',exact:true})
        assert.equal(await details.evaluate(el=>el===document.activeElement),true)
        const text=(await details.innerText()).replaceAll('\u00a0',' ');assert.match(text,/BN00109936/);assert.match(text,/Overlapp med framtidig planavsetning: 19,61 daa/);assert.match(text,/Hele lokaliteten: 38,33 daa/)
        if(mobile)assert.equal(await page.locator('.explore-themes__body').getAttribute('data-view-mode'),key==='map'?'results':key)
        await capture(`${stage}-details-${key}-${size.width}`)
        if(mobile&&key==='map')await page.getByRole('button',{name:'Mer kart',exact:true}).tap()
      }
      const selected=await snapshot()
      if(mobile)await page.locator('.mobile-analysis-toolbar').getByRole('button',{name:'Kartlag',exact:true}).tap();else{if(size.width===900)await page.getByRole('button',{name:'Skjul analyseresultater',exact:true}).click();await settings('Grunnkart nivå 0')}
      retained(selected,await snapshot())
      if(stage==='c4'){
        if(mobile)await page.getByRole('checkbox',{name:'Grå arealer',exact:true}).check()
        // Existing layer settings are used; no change to image/loading or analysis consumers.
        if(mobile)await settings('Grunnkart nivå 0')
        await page.getByRole('slider').fill('65');retained(selected,await snapshot());await capture(`${stage}-layers-${key}-${size.width}`)
      }
      await page.keyboard.press('Escape')
      if(size.width===900)await page.getByRole('button',{name:'Analyser planområder',exact:true}).first().click()
      retained(selected,await snapshot())
      if(stage==='c4'){
        const layers=await ordinaryLayers(),beforeReset=await snapshot();await reset();const cleared=await stableView(beforeReset)
        assert.equal(cleared.selection.kind,'all');assert.deepEqual(await ordinaryLayers(),layers)
        assert.equal(await page.locator('.future-nature-analysis input[type=search]').inputValue(),'')
        assert.equal(await page.locator('[data-analysis-section=selected-locality]').count(),0)
        await capture(`${stage}-nature-reset-${key}-${size.width}`)
        // Reset must clear a failed search even when the map selection is already all.
        if(mobile&&key==='map')await page.getByRole('button',{name:'Delt',exact:true}).tap()
        await page.getByRole('combobox',{name:'Gå til analyseinnhold'}).selectOption('localities')
        await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).fill('___ingen_treff___');await reset()
        assert.equal(await page.locator('.future-nature-analysis input[type=search]').inputValue(),'')
        const alternate=await page.evaluate(()=>globalThis.__b5Nature.result.localities.find(l=>l.name==='Tanemsmyra'&&l.id!=='BN00109936'))
        assert.ok(alternate);await page.getByRole('combobox',{name:'Gå til analyseinnhold'}).selectOption('localities');await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).fill(alternate.id)
        const beforeAlternate=await snapshot();await page.locator('.future-nature-analysis__table').getByRole('button',{name:new RegExp(alternate.id)}).click();await stableView(beforeAlternate)
        assert.equal((await snapshot()).selection.label,alternate.id)
        if(mobile){assert.equal((await page.getByRole('region',{name:'Aktiv analyse og kartutvalg'}).innerText()).includes('BN00109936'),false);assert.match(await page.getByRole('region',{name:'Aktiv analyse og kartutvalg'}).innerText(),new RegExp(alternate.id));if(key==='map')await page.getByRole('button',{name:'Mer kart',exact:true}).tap()}
        await capture(`${stage}-second-locality-${key}-${size.width}`)
      }
    }
    report.checks.push({stage,width:size.width,measurements,allSelectionsPreserveView:true,fitMatchesRenderedOverlap:true,sameMapAndConsumers:true})
    if(stage==='c4'){
      if(mobile)await page.getByRole('button',{name:'Delt',exact:true}).tap()
      const beforeWhole=await snapshot();await page.getByRole('button',{name:/^Vis hele kommunen/}).filter({visible:true}).click()
      const whole=await snapshot();assert.notDeepEqual(whole.view,beforeWhole.view);assert.equal(whole.geometryHash,beforeWhole.geometryHash);assert.deepEqual(whole.selection,beforeWhole.selection);assert.deepEqual(whole.calls,beforeWhole.calls)
      if(mobile){const beforeResize=await snapshot();for(const width of [900,1440,size.width]){await page.setViewportSize({width,height:width===900?900:width===1440?960:size.height});await page.waitForTimeout(100);retained(beforeResize,await snapshot())}}
    }
    if(stage==='c4'&&mobile){
      await page.getByRole('button',{name:'Mer resultat',exact:true}).tap();await commune('Oslo','0301');await page.waitForFunction(()=>!globalThis.__b5Area?.result&&!globalThis.__b5Nature?.result)
      assert.equal(await page.locator('.explore-themes__body').getAttribute('data-view-mode'),'results');assert.equal(await page.getByRole('combobox',{name:'Velg aktiv plananalyse'}).inputValue(),'nature');assert.equal(await page.getByRole('button',{name:'Tilpass aktivt kartutvalg'}).isEnabled(),false);assert.equal((await page.getByRole('region',{name:'Aktiv analyse og kartutvalg'}).innerText()).includes('BN00'),false)
      await capture(`${stage}-oslo-${size.width}`);await commune('Trondheim','5001');await page.locator('.future-nature-analysis__summary').waitFor({timeout:180000})
    }
    // Leave a visible panel for desktop and the next iteration; view changes preserve the same result.
    if(mobile)await page.getByRole('button',{name:'Delt',exact:true}).tap()
  }
  report.checks.push({explicitOverlapFits:fitObservations,resetAndTouchFlows:stage==='c4'})
  await page.setViewportSize({width:1440,height:960})
  await commune('Oslo','0301');await page.waitForFunction(()=>!globalThis.__b5Area?.result&&!globalThis.__b5Nature?.result)
  assert.equal(await page.getByRole('button',{name:'Tilpass kart til utvalget'}).count(),0)
  await capture(`${stage}-oslo-1440`)
  await commune('Trondheim','5001');await page.locator('.future-nature-analysis__summary').waitFor({timeout:180000})
}
