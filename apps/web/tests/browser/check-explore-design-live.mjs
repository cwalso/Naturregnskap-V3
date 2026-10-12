import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'
const stage = process.env.DESIGN_GATE ?? 'A'
const output = process.env.BROWSER_OUTPUT ?? `.browser-results/design-${stage}`
await mkdir(output, { recursive: true })
const results = { stage, gates: {}, requests: [], errors: [] }
const server = await createServer({ server: { host: '127.0.0.1', port: 5194, strictPort: true }, plugins: [{ name: 'inspect-existing-map', transform(code, id) {
  if (!id.endsWith('/src/map/exploreThemeMap.ts')) return
  return code.replace('  let destroyed = false', '  globalThis.__themeMap = map\n  globalThis.__mapCreations = (globalThis.__mapCreations ?? 0) + 1\n  let destroyed = false').replace('    update(next) {', '    update(next) {\n      globalThis.__themeContext = next')
} }] })
let browser, network, page
const state = () => page.evaluate(() => ({ center: __themeMap.getView().getCenter(), resolution: __themeMap.getView().getResolution() }))
const settle = () => page.waitForFunction(() => !__themeMap.getView().getAnimating())
async function size() { return page.evaluate(() => {
  const b = document.querySelector('.explore-themes__canvas').getBoundingClientRect()
  return { width: b.width, height: b.height, overflow: document.documentElement.scrollWidth - innerWidth }
}) }
async function shot(name) { await page.screenshot({ path: `${output}/${name}.png`, fullPage: true }) }
async function settings(name) { await page.getByRole('button', { name: `Innstillinger for ${name}`, exact: true }).click() }
async function close() { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.explore-themes__info')); await page.waitForFunction(() => { const b=document.querySelector('.explore-themes__canvas').getBoundingClientRect(),s=__themeMap.getSize();return Math.abs(s[0]-b.width)<1 && Math.abs(s[1]-b.height)<1 }); await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))) }
async function gate(name, run) { results.gates[name] = { status: 'passed', ...await run() }; console.log(`PASS ${name}`) }
async function sourceVisual(id) {
  return page.evaluate((id) => {
    const map = globalThis.__themeMap, layer = map.getLayers().getArray().find((l) => l.get('mapLayerId') === id && l.getVisible() && map.getView().getResolution() >= l.getMinResolution() && map.getView().getResolution() < l.getMaxResolution())
    const canvas = document.querySelector(`.${layer.getClassName()} canvas`)
    const context = canvas.getContext('2d'), data = context.getImageData(0, 0, canvas.width, canvas.height).data
    const rect = canvas.getBoundingClientRect(), target = document.querySelector('.explore-themes__canvas').getBoundingClientRect()
    // The border and mask both have geometries; select the one with municipality properties.
    const geometry = map.getLayers().getArray().flatMap((l) => l.getSource()?.getFeatures?.() ?? []).find((f) => f.get('number') === globalThis.__themeContext.boundary.properties.number)?.getGeometry()
    let count = 0, sample = null, checks = 0
    for (let i = 3; i < data.length; i += 4) {
      if (!data[i]) continue
      count++
      if (sample || data[i] < 50 || count % 11 || checks++ > 20000) continue
      const p = (i - 3) / 4, x = p % canvas.width, y = Math.floor(p / canvas.width)
      const pixel = [rect.left - target.left + (x + 0.5) * rect.width / canvas.width, rect.top - target.top + (y + 0.5) * rect.height / canvas.height]
      const coordinate = map.getCoordinateFromPixel(pixel)
      if (pixel[0] < 4 || pixel[1] < 4 || pixel[0] > target.width - 4 || pixel[1] > target.height - 4 || !geometry.intersectsCoordinate(coordinate)) continue
      if (pixel[0] < 76 && pixel[1] < 125 || pixel[0] < 220 && pixel[1] > target.height - 85) continue
      if ([[5,0],[-5,0],[0,5],[0,-5]].some(([dx,dy]) => !geometry.intersectsCoordinate(map.getCoordinateFromPixel([pixel[0]+dx,pixel[1]+dy])))) continue
      sample = { pixel, coordinate, rgba: [...data.slice(i - 3, i + 1)] }
    }
    return { count, sample, visible: layer.getVisible(), opacity: layer.getOpacity(), zIndex: layer.getZIndex(), params: layer.getSource().getParams?.() ?? {}, projection: map.getView().getProjection().getCode() }
  }, id)
}
async function screenPixel(pixel) {
  const bytes = await page.locator('.explore-themes__canvas').screenshot()
  return page.evaluate(async ({ bytes, pixel }) => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }))
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height
    const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close()
    return [...ctx.getImageData(Math.floor(pixel[0]), Math.floor(pixel[1]), 1, 1).data]
  }, { bytes: Array.from(bytes), pixel })
}
const names = { level0:'Grunnkart nivå 0','future-development':'Framtidig utbygging','valued-nature':'Verdsatte naturtyper','protected-areas':'Verneområder','intact-nature':'Inngrepsfri natur (INON)','wild-reindeer':'Villrein','grey-areas':'Grå arealer' }
async function painted() {
  await page.evaluate(()=>new Promise((resolve,reject)=>{
    const map=__themeMap; const timeout=setTimeout(()=>{map.un('rendercomplete',done);reject(new Error('Kartet ble ikke ferdig rendret'))},90000)
    function done(){clearTimeout(timeout);resolve()};map.once('rendercomplete',done);map.render()
  }))
}
async function layers(ids) {
  for(const [id,name] of Object.entries(names)) await page.getByRole('checkbox',{name,exact:true}).setChecked(ids.includes(id))
  if(ids.includes('valued-nature')) await page.waitForFunction(()=>__themeContext?.data?.localities.length>0,null,{timeout:180000})
  await painted()
}
async function transparency(id,value) {
  await settings(names[id])
  await page.getByRole('slider',{name:`Gjennomsiktighet – ${names[id]}`}).evaluate((element,value)=>{
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(element,String(value));element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}))
  },value)
  await page.waitForFunction(({id,value})=>Math.abs(__themeContext.layers[id].opacity-(1-value/100))<1e-6,{id,value})
  await painted();await close()
}
async function proof(id) {
  const source=await sourceVisual(id)
  assert.ok(source.count>0 && source.sample,`Ingen synlig geometri: ${id} ${JSON.stringify(source)}`)
  const composed=await screenPixel(source.sample.pixel)
  const before=await state();await layers([]);const base=await screenPixel(source.sample.pixel);await layers([id]);assert.deepEqual(await state(),before)
  assert.ok(composed.some((v,i)=>i<3 && Math.abs(v-base[i])>10),`Usynlig sammensatt ${id}: ${composed} / ${base}`)
  return {...source,composedPixel:composed,basePixel:base}
}
async function chooseMunicipality(name,number) {
  await page.getByRole('combobox',{name:'Velg kommune'}).fill(name);await page.getByRole('option',{name:`${name} ${number}`}).click()
  await page.locator('summary[aria-label="Åpne meny"]').click();await page.getByRole('link',{name:'Utforsk i kart',exact:true}).click();await page.locator('summary[aria-label="Åpne meny"]').click()
  await page.waitForFunction(number=>__themeContext?.boundary?.properties.number===number,number,{timeout:90000});await painted()
}
try {
  await server.listen()
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true })
  network = await request.newContext({ proxy: { server: process.env.HTTPS_PROXY } })
  page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  page.on('pageerror', error => results.errors.push(error.message))
  await page.route('https://**/*', async route => {
    const req = route.request()
    try { const response = await network.fetch(req.url(), { method: req.method(), data: req.postData() ?? undefined, headers: req.headers(), timeout: 45000 }); results.requests.push({ url: req.url(), status: response.status() }); await route.fulfill({ response }) }
    catch (error) { results.requests.push({ url: req.url(), error: error.message }); await route.abort() }
  })
  await page.goto('http://127.0.0.1:5194')
  await page.getByRole('combobox', { name: 'Velg kommune' }).fill('Trondheim')
  await page.getByRole('option', { name: 'Trondheim 5001' }).click()
  await page.locator('summary[aria-label="Åpne meny"]').click()
  await page.getByRole('link', { name: 'Utforsk i kart', exact: true }).click()
  await page.locator('summary[aria-label="Åpne meny"]').click()
  await page.waitForFunction(() => __themeContext?.boundary?.properties.number === '5001')
  if(stage!=='AXE_ONLY') {
  await gate('A-responsive-panels', async () => {
    const measurements = []
    for (const [width,height] of [[1440,960],[900,900],[390,844],[320,720]]) {
      await page.setViewportSize({ width,height }); await settle()
      const before = await state(), originalMap = await page.evaluate(() => { globalThis.__originalMap = __themeMap; return __mapCreations })
      await shot(`A-${width}-closed`)
      if (width <= 700) await page.getByRole('button', { name: /^Kartlag \(/ }).click()
      await settings('Grunnkart nivå 0')
      await page.waitForTimeout(100)
      assert.deepEqual(await state(), before)
      assert.equal(await page.evaluate(() => __themeMap === __originalMap), true)
      const dimensions = await size()
      assert.equal(dimensions.overflow,0,JSON.stringify(dimensions))
      assert.ok(dimensions.width >= (width === 1440 ? 827 : width === 900 ? 647 : width-1),JSON.stringify(dimensions))
      assert.ok(dimensions.height >= (width <= 700 ? 185 : 650),JSON.stringify(dimensions))
      await shot(`A-${width}-settings`)
      await close(); assert.deepEqual(await state(), before)
      if(width<=700) {
        await page.getByRole('button', { name: /^Kartlag \(/ }).click(); const open = await size(); assert.ok(open.height >=185)
        await page.keyboard.press('Escape'); assert.ok(await page.getByRole('button', { name: /^Kartlag \(/ }).evaluate(e=>document.activeElement===e))
      } else assert.ok(await page.getByRole('button', { name: 'Innstillinger for Grunnkart nivå 0', exact: true }).evaluate(e=>document.activeElement===e))
      measurements.push({viewportWidth:width,viewportHeight:height,...dimensions,mapCreations:originalMap})
    }
    return { measurements }
  })
  await gate('A-existing-navigation', async () => {
    await page.setViewportSize({ width:1440,height:960 }); await page.getByRole('button',{name:'Vis hele kommunen'}).click(); await settle()
    const before=await state(); const bounds=await page.locator('.explore-themes__canvas').boundingBox()
    await page.locator('.explore-themes__canvas').focus()
    await page.mouse.move(bounds.x+bounds.width*.7,bounds.y+bounds.height*.45); await page.mouse.wheel(0,-180)
    await page.waitForFunction(old => __themeMap.getView().getResolution() < old, before.resolution); await settle()
    const zoom=await state(); assert.ok(zoom.resolution<before.resolution)
    await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5); await page.mouse.down(); await page.mouse.move(bounds.x+bounds.width*.5+60,bounds.y+bounds.height*.5+30,{steps:10}); await page.mouse.up(); await settle()
    assert.notDeepEqual((await state()).center,zoom.center)
    await page.locator('.ol-zoom-out').click(); await settle(); assert.ok((await state()).resolution>zoom.resolution)
    return {before,after:await state()}
  })
  }
  if(stage==='B' || stage==='C') {
    await page.setViewportSize({width:1440,height:960});await page.getByRole('button',{name:'Vis hele kommunen'}).click();await settle();await painted()
    await gate('B-seven-layers-and-geography',async()=>{
      const evidence={}
      for(const id of Object.keys(names)) {
        await layers([id])
        if(id==='grey-areas') {
          while((await state()).resolution>=70){await page.locator('.ol-zoom-in').click();await settle()};await painted()
        }
        if(id==='wild-reindeer') {
          const source=await sourceVisual(id);assert.equal(source.count,0);evidence[id]={validEmptyTrondheim:true,...source}
        } else evidence[id]=await proof(id)
        await shot(`B-alone-${id}`)
      }
      await layers(Object.keys(names));const before=await state();await shot('B-all-seven')
      const order=await page.evaluate(()=>__themeMap.getLayers().getArray().filter(l=>l.get('mapLayerId')).map(l=>({id:l.get('mapLayerId'),z:l.getZIndex(),visible:l.getVisible()})))
      assert.ok(order.every(l=>l.visible));assert.equal(order.find(l=>l.id==='protected-areas').z,40)
      await transparency('level0',50);assert.deepEqual(await state(),before);await shot('B-all-seven-opacity')
      await layers([]);assert.deepEqual(await state(),before);await shot('B-none')
      return {evidence,order}
    })
    await gate('B-nature-filter-and-object',async()=>{
      await layers(['level0','future-development','valued-nature']);await settings('Verdsatte naturtyper')
      await page.getByRole('combobox',{name:'Naturtype',exact:true}).selectOption('Frisk lågurtfuruskog');await painted()
      await page.getByRole('combobox',{name:'Verdikategori',exact:true}).selectOption('Stor verdi');await painted()
      const before=await state(), filter=await page.evaluate(()=>__themeContext.filter)
      await shot('B-filter-desktop')
      await page.locator('.explore-themes__localities button').first().click()
      const selected=await page.evaluate(()=>__themeContext.selectedId);assert.ok(selected)
      await page.getByRole('region',{name:'Valgt lokalitet'}).waitFor();assert.deepEqual(await state(),before);await shot('B-object-desktop')
      await close()
      assert.ok(await page.locator('.explore-themes__canvas').evaluate(element=>document.activeElement===element), 'Closing list-selected details returns focus to the map when the opener was removed')
      assert.equal(await page.evaluate(()=>__themeContext.selectedId),selected)
      await settings('Verdsatte naturtyper');await page.locator('.explore-themes__localities button').first().click()
      await page.getByRole('button',{name:'Tilbake til naturtypefilter'}).click()
      assert.deepEqual(await page.evaluate(()=>__themeContext.filter),filter);assert.equal(await page.evaluate(()=>__themeContext.selectedId),selected)
      await close();await page.getByRole('checkbox',{name:'Verneområder',exact:true}).check();assert.deepEqual(await page.evaluate(()=>__themeContext.filter),filter);assert.equal(await page.evaluate(()=>__themeContext.selectedId),selected)
      await settings('Verdsatte naturtyper');await page.getByRole('button',{name:'Vis alle registrerte lokaliteter'}).click();await painted();await close()
      return {selected,filter,preservesView:true}
    })
    await gate('B-grey-presentations-and-legends',async()=>{
      await layers(['grey-areas']);await settings('Grå arealer');const before=await state();const products={}
      for(const name of ['Grå arealer','Andel uten vegetasjon','Andel med vegetasjon']) {
        await page.getByRole('radio',{name,exact:true}).check();await painted()
        const img=page.locator('.explore-themes__service-legend img');await img.evaluate(e=>e.decode())
        assert.ok(await img.evaluate(e=>e.naturalWidth>0 && e.getBoundingClientRect().width<=e.parentElement.getBoundingClientRect().width))
        assert.deepEqual(await state(),before);products[name]=await sourceVisual('grey-areas');assert.ok(products[name].sample)
        await shot(`B-grey-${products[name].params.LAYERS}`)
      }
      await close();await layers(Object.keys(names));await page.getByRole('button',{name:'Tegnforklaring',exact:true}).first().click()
      const order=await page.locator('.explore-themes__layer-info h3').allTextContents()
      assert.deepEqual(order,['Verneområder','Verdsatte naturtyper','Framtidig utbygging','Villrein','Inngrepsfri natur (INON)','Grå arealer','Grunnkart nivå 0'])
      await page.getByText('Status: januar 2023',{exact:true}).waitFor()
      for(const img of await page.locator('.explore-themes__service-legend img').all())await img.evaluate(e=>e.decode())
      await shot('B-legends');await close();return {products,order}
    })
    await gate('B-municipality-and-reindeer',async()=>{
      await layers(['wild-reindeer']);await chooseMunicipality('Dovre','3431');await layers(['wild-reindeer'])
      const evidence=await proof('wild-reindeer');await shot('B-Dovre-villrein')
      assert.equal(await page.evaluate(()=>__themeContext.selectedId),null);assert.deepEqual(await page.evaluate(()=>__themeContext.filter),{natureType:null,value:null})
      await chooseMunicipality('Trondheim','5001');await layers(['wild-reindeer']);assert.equal((await sourceVisual('wild-reindeer')).count,0);await shot('B-Trondheim-villrein-empty')
      return {evidence,municipalityReset:true}
    })
  }
  if(stage==='C' || stage==='C_ONLY') {
    await gate('C-responsive-filter-and-map-selection',async()=>{
      await layers(['level0','valued-nature']);const checks=[]
      for(const [width,height] of [[1440,960],[900,900],[390,844],[320,720]]) {
        await page.setViewportSize({width,height});await settle()
        if(width<=700) await page.getByRole('button',{name:'Naturtypefilter',exact:true}).click()
        else await settings('Verdsatte naturtyper')
        await page.getByRole('combobox',{name:'Naturtype',exact:true}).selectOption('Frisk lågurtfuruskog')
        await page.getByRole('combobox',{name:'Verdikategori',exact:true}).selectOption('Stor verdi');await painted()
        const before=await state();const dimensions=await size();assert.equal(dimensions.overflow,0);assert.ok(dimensions.height>=185)
        await page.getByRole('combobox',{name:'Naturtype',exact:true}).scrollIntoViewIfNeeded();await shot(`C-${width}-filter`)
        await close();assert.deepEqual(await state(),before);await painted()
        const point=await page.evaluate(()=>{
          const map=__themeMap,layer=map.getLayers().getArray().find(l=>l.getClassName()==='explore-registered-localities'),size=map.getSize()
          const boundary=map.getLayers().getArray().flatMap(l=>l.getSource()?.getFeatures?.()??[]).find(f=>f.get('number')==='5001').getGeometry()
          for(const feature of layer.getSource().getFeatures()) {
            const geometry=feature.getGeometry(),points=geometry.getType()==='MultiPolygon'?geometry.getInteriorPoints().getCoordinates():[geometry.getInteriorPoint().getCoordinates()]
            for(const point of points){const pixel=map.getPixelFromCoordinate(point);if(pixel[0]>80 && pixel[0]<size[0]-10 && pixel[1]>100 && pixel[1]<size[1]-60 && boundary.intersectsCoordinate(point))return {id:String(feature.getId()),pixel}}
          }
          return null
        })
        // A municipality-wide view is intentionally preserved across resizes. At
        // small widths the selected locality may lie outside that cropped view;
        // normal user navigation can explicitly center it for the click test.
        if(!point) {
          await page.evaluate(()=>{
            const feature=__themeMap.getLayers().getArray().find(l=>l.getClassName()==='explore-registered-localities').getSource().getFeatures()[0]
            const geometry=feature.getGeometry(),coordinate=geometry.getType()==='MultiPolygon'?geometry.getInteriorPoints().getCoordinates()[0]:geometry.getInteriorPoint().getCoordinates()
            __themeMap.getView().setCenter(coordinate.slice(0,2))
          });await painted()
        }
        const click=point??await page.evaluate(()=>{
          const feature=__themeMap.getLayers().getArray().find(l=>l.getClassName()==='explore-registered-localities').getSource().getFeatures()[0]
          const geometry=feature.getGeometry(),coordinate=geometry.getType()==='MultiPolygon'?geometry.getInteriorPoints().getCoordinates()[0]:geometry.getInteriorPoint().getCoordinates()
          return {id:String(feature.getId()),pixel:__themeMap.getPixelFromCoordinate(coordinate)}
        })
        const clickView=await state(),box=await page.locator('.explore-themes__canvas').boundingBox()
        await page.locator('.explore-themes__canvas').focus();await page.mouse.click(box.x+click.pixel[0],box.y+click.pixel[1])
        await page.getByRole('complementary',{name:'Objektinformasjon'}).waitFor();assert.equal(await page.evaluate(()=>__themeContext.selectedId),click.id)
        assert.deepEqual(await state(),clickView);await shot(`C-${width}-object`)
        await page.getByRole('button',{name:'Tilbake til naturtypefilter'}).click()
        assert.equal(await page.getByRole('combobox',{name:'Naturtype',exact:true}).inputValue(),'Frisk lågurtfuruskog')
        assert.equal(await page.getByRole('combobox',{name:'Verdikategori',exact:true}).inputValue(),'Stor verdi')
        if(width===900) {await page.getByRole('button',{name:'Tilbake til kartlag',exact:true}).first().click();await page.getByRole('checkbox',{name:'Verneområder',exact:true}).check();await settings('Verdsatte naturtyper')}
        await close();await shot(`C-${width}-closed`);checks.push({viewportWidth:width,viewportHeight:height,...dimensions,selected:click.id,viewPreserved:true})
      }
      return {checks}
    })
    await gate('C-wheel-anchor-and-keyboard',async()=>{
      await page.setViewportSize({width:1440,height:960});await page.getByRole('button',{name:'Vis hele kommunen'}).click();await settle();await painted()
      const map=page.locator('.explore-themes__canvas');await map.focus();const box=await map.boundingBox();const anchors=[]
      for(const [x,y,delta] of [[.7,.45,-120],[.35,.7,120]]) {
        const pixel=[box.width*x,box.height*y],coordinate=await page.evaluate(pixel=>__themeMap.getCoordinateFromPixel(pixel),pixel),before=await state(),scroll=await page.evaluate(()=>scrollY)
        await page.mouse.move(box.x+pixel[0],box.y+pixel[1]);await page.mouse.wheel(0,delta)
        await page.waitForFunction(r=>__themeMap.getView().getResolution()!==r,before.resolution);await settle()
        const position=await page.evaluate(c=>__themeMap.getPixelFromCoordinate(c),coordinate)
        assert.ok(Math.hypot(position[0]-pixel[0],position[1]-pixel[1])<1,'Zoom skal være forankret ved pekeren');assert.equal(await page.evaluate(()=>scrollY),scroll)
        anchors.push({pixel,afterPixel:position})
      }
      const before=await state();await map.press('ArrowRight');await settle();assert.notDeepEqual((await state()).center,before.center)
      await map.press('+');await page.waitForFunction(r=>__themeMap.getView().getResolution()<r,before.resolution);await settle()
      await settings('Grunnkart nivå 0');await page.keyboard.press('Tab');assert.ok(await page.getByRole('slider').evaluate(e=>document.activeElement===e))
      const focus=await page.evaluate(()=>{const s=getComputedStyle(document.activeElement);return {outline:s.outlineStyle,width:s.outlineWidth}});assert.equal(focus.outline,'solid');assert.equal(focus.width,'3px')
      await close();return {anchors,focus,keyboardPanZoom:true}
    })
    await gate('C-touch-navigation',async()=>{
      await page.setViewportSize({width:390,height:844});await settle();await page.getByRole('button',{name:'Vis hele kommunen'}).click();await settle();await painted()
      const box=await page.locator('.explore-themes__canvas').boundingBox(),before=await state(),cdp=await page.context().newCDPSession(page)
      const point={x:box.x+box.width*.5,y:box.y+box.height*.5,id:1}
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]})
      for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...point,x:point.x+6*i,y:point.y+3*i}]})
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle();assert.notDeepEqual((await state()).center,before.center)
      const pan=await state(),x=box.x+box.width*.5,y=box.y+box.height*.5
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-25,y,id:1},{x:x+25,y,id:2}]})
      for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-25-4*i,y,id:1},{x:x+25+4*i,y,id:2}]})
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle();assert.ok((await state()).resolution<pan.resolution)
      await cdp.detach();await shot('C-touch-navigation');return {before,pan,after:await state(),input:'Chromium touch events'}
    })
    await gate('C-200-percent-and-short-viewport',async()=>{
      const checks=[]
      for(const [width,height] of [[720,480],[390,480],[320,480]]) {
        await page.setViewportSize({width,height});await settle()
        if(width<=700)await page.getByRole('button',{name:'Naturtypefilter',exact:true}).click();else await settings('Verdsatte naturtyper')
        const dimensions=await size();assert.equal(dimensions.overflow,0);assert.ok(dimensions.height>=185)
        for(const name of ['Naturtype','Verdikategori']){const control=page.getByRole('combobox',{name,exact:true});await control.scrollIntoViewIfNeeded();assert.ok(await control.isVisible());const box=await control.boundingBox();assert.ok(box.width>100 && box.height>=44)}
        await shot(`C-reflow-${width}-${height}`);checks.push({viewportWidth:width,viewportHeight:height,...dimensions});await close()
      }
      return {checks,reflow200Percent:'720x480 CSS pixels for a 1440x960 display'}
    })
  }
  if(process.env.AXE_SCRIPT && ['C','C_ONLY','AXE_ONLY'].includes(stage)) await gate('C-accessibility-axe',async()=>{
      const script=await readFile(process.env.AXE_SCRIPT,'utf8');if(stage==='AXE_ONLY') { await page.getByRole('checkbox',{name:'Verdsatte naturtyper',exact:true}).check();await page.waitForFunction(()=>__themeContext.data?.localities.length>0,null,{timeout:180000}) };await page.setViewportSize({width:1440,height:960});await settings('Verdsatte naturtyper');await page.addScriptTag({content:script})
      const desktop=await page.evaluate(async()=>{const result=await axe.run('.app-shell--explore',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),passes:result.passes.length,incomplete:result.incomplete.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,html:n.html,reasons:[...n.any,...n.all,...n.none].map(r=>r.message)}))}))}})
      results.accessibilityDesktop=desktop;assert.deepEqual(desktop.violations,[])
      await close();await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Naturtypefilter',exact:true}).click()
      const mobile=await page.evaluate(async()=>{const result=await axe.run('.app-shell--explore',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),passes:result.passes.length,incomplete:result.incomplete.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,html:n.html,reasons:[...n.any,...n.all,...n.none].map(r=>r.message)}))}))}})
      results.accessibilityMobile=mobile;assert.deepEqual(mobile.violations,[]);await close();return {desktop,mobile,scope:'Automated checks plus separate keyboard/focus/reflow gates; not a full WCAG audit'}
    })
  assert.deepEqual(results.errors,[])
} catch(error) { results.failure=error.stack; console.error(error); if(page) await shot('failure').catch(()=>{}); process.exitCode=1 }
finally { await writeFile(`${output}/checks.json`,JSON.stringify(results,null,2)); await browser?.close(); await network?.dispose(); await server.close() }
