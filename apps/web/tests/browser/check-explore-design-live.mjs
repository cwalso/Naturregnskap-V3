import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
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
async function close() { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.explore-themes__info')) }
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
      measurements.push({width,height,...dimensions,mapCreations:originalMap})
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
  if(stage!=='A') {
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
  assert.deepEqual(results.errors,[])
} catch(error) { results.failure=error.stack; console.error(error); if(page) await shot('failure').catch(()=>{}); process.exitCode=1 }
finally { await writeFile(`${output}/checks.json`,JSON.stringify(results,null,2)); await browser?.close(); await network?.dispose(); await server.close() }
