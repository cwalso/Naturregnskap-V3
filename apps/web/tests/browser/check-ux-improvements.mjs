import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { createServer } from 'vite'
import { navigateSite } from './map-browser-helpers.mjs'

const output = process.env.BROWSER_OUTPUT ?? '.browser-results/ux-improvements'
const stage = process.env.UX_STAGE ?? 'B1'
await mkdir(output, { recursive: true })
const server = await createServer({ server: { host:'127.0.0.1', port:5220, strictPort:true }, plugins:[{name:'read-map-for-ux-check',enforce:'pre',transform(code,id){
  if(id.endsWith('/src/map/exploreThemeMap.ts'))return code.replace('  let destroyed = false','  globalThis.__uxMap=map; globalThis.__uxMapCreations=(globalThis.__uxMapCreations??0)+1; let destroyed = false')
}}] })
const report = { stage, screens:[], checks:[], javascriptErrors:[], accessibility:[] }
let browser, network, page
const cache = new Map()
async function capture(name) {
  await page.screenshot({path:`${output}/${name}.png`,fullPage:true})
  report.screens.push({name,...await page.evaluate(()=>({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth-innerWidth}))})
  await writeFile(`${output}/${name}.txt`,(await page.locator('body').innerText()).split('\n').map(s=>s.trimEnd()).join('\n'))
}
async function commune(name,number){await page.getByRole('combobox',{name:'Velg kommune',exact:true}).fill(name);await page.getByRole('option',{name:`${name} ${number}`,exact:true}).click()}
try {
  await server.listen()
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true})
  network=await request.newContext({proxy:{server:process.env.HTTPS_PROXY}})
  page=await browser.newPage({viewport:{width:1440,height:960}})
  page.setDefaultTimeout(60000)
  page.on('pageerror',error=>report.javascriptErrors.push(error.message))
  await page.route('https://**/*',async route=>{
    const req=route.request(),key=req.method()+req.url()+(req.postData()??'')
    try{
      let response=cache.get(key)
      if(!response){const r=await network.fetch(req.url(),{method:req.method(),data:req.postData()??undefined,headers:req.headers(),timeout:60000});response={status:r.status(),headers:r.headers(),body:await r.body()};if(r.status()===200&&cache.size<600)cache.set(key,response)}
      await route.fulfill(response)
    }catch{await route.abort()}
  })
  await page.goto('http://127.0.0.1:5220')
  await commune('Trondheim','5001')
  await page.getByLabel('Oppsummering av arealer i planområder').waitFor({timeout:180000})
  if(stage==='B1'||stage==='all')for(const [theme,category,id,expected,stock]of [['Skog','skog','skog','2 032,22 daa','280 586'],['Myr','våtmark','vatmark','12,64 daa','38 495']]){
    await navigateSite(page,'Naturtema')
    await page.getByRole('button',{name:new RegExp(theme)}).click()
    const indicator=page.locator('.plan-area-indicator')
    await indicator.locator('.thematic-plan-cards__value').waitFor({timeout:180000})
    assert.equal((await indicator.locator('.thematic-plan-cards__value').innerText()).replaceAll('\u00a0',' '),expected)
    const identity=await indicator.getAttribute('data-analysis-id')
    await page.waitForFunction(stock=>document.body.innerText.replaceAll('\u00a0',' ').includes(stock),stock,{timeout:180000})
    await capture(`B1-${id}-theme-1440`)
    await indicator.getByRole('button',{name:`Vis ${category} i plananalysen`}).click()
    const table=page.getByRole('table',{name:'Økosystemtyper innenfor planområder'})
    await table.waitFor({timeout:180000})
    assert.equal(await table.getByRole('button',{name:theme==='Skog'?'Skog':'Våtmark',exact:true}).getAttribute('aria-pressed'),'true')
    assert.ok((await page.locator('.plan-area-panel').textContent()).includes(identity))
    await capture(`B1-${id}-map-1440`)
    report.checks.push({theme:category,area:expected,analysisId:identity,stockPreserved:stock})
  }
  if(stage==='B2'||stage==='all'){
    for(const target of ['Kommuneoversikt','Naturtapet','Naturtema','Skog','Utforsk i kart']){
      await navigateSite(page,target==='Skog'?'Naturtema':target)
      if(target==='Skog')await page.getByRole('button',{name:/^♠?\s*Skog/}).click()
      const hash=await page.evaluate(()=>location.hash)
      await commune('Oslo','0301')
      assert.equal(await page.evaluate(()=>location.hash),hash)
      assert.equal(await page.locator('.plan-area-indicator .thematic-plan-cards__value').count(),0)
      assert.equal(await page.locator('.future-nature-analysis__summary').count(),0)
      await capture(`B2-oslo-${target.replaceAll(' ','-')}`)
      await commune('Trondheim','5001')
      assert.equal(await page.evaluate(()=>location.hash),hash)
      report.checks.push({page:target,sameRoute:true})
    }
    for(const mode of ['Arealfordeling','Registrerte naturverdier']){
      const opener=page.getByRole('button',{name:'Analyser planområder',exact:true}).filter({visible:true})
      if(!await page.getByRole('group',{name:'Velg plananalyse'}).isVisible())await opener.click()
      await page.getByRole('group',{name:'Velg plananalyse'}).getByRole('button',{name:mode,exact:true}).click()
      if(mode==='Arealfordeling')await page.getByRole('table',{name:'Økosystemtyper innenfor planområder'}).waitFor({timeout:180000})
      else await page.getByText('Unikt overlappsareal',{exact:true}).waitFor({timeout:180000})
      const creations=await page.evaluate(()=>__uxMapCreations)
      const before=await page.evaluate(()=>__uxMap.getView().getCenter())
      await commune('Oslo','0301')
      assert.equal(await page.getByRole('group',{name:'Velg plananalyse'}).getByRole('button',{name:mode,exact:true}).getAttribute('aria-pressed'),'true')
      await page.getByText(/Klargjort kommunevis Grunnkart mangler|klargjort.*raster|Beregningen krever/i).first().waitFor({timeout:180000})
      await page.waitForFunction(()=>!__uxMap.getView().getAnimating())
      assert.notDeepEqual(await page.evaluate(()=>__uxMap.getView().getCenter()),before)
      assert.equal(await page.locator('.plan-area-totals,.future-nature-analysis__summary').count(),0)
      await capture(`B2-oslo-${mode.replaceAll(' ','-')}`)
      await commune('Trondheim','5001')
      if(mode==='Arealfordeling')await page.getByRole('table',{name:'Økosystemtyper innenfor planområder'}).waitFor({timeout:180000})
      else await page.getByText('Unikt overlappsareal',{exact:true}).waitFor({timeout:180000})
      assert.equal(await page.evaluate(()=>__uxMapCreations),creations)
      report.checks.push({mode,sameMapInstance:true,oldResultsWithdrawn:true,fitNewMunicipality:true})
    }
    await page.reload()
    await page.waitForFunction(()=>document.querySelector('[role=combobox]')?.value==='Trondheim')
    assert.equal(await page.evaluate(()=>location.hash),'#utforsk-i-kart')
    await capture('B2-after-reload')
    await navigateSite(page,'Naturtapet');await navigateSite(page,'Naturtema');await page.goBack()
    await page.getByRole('heading',{name:'Naturtapet i Trondheim',exact:true}).waitFor()
    report.checks.push({communeAfterReload:'Trondheim',browserBack:true})
  }
  if(stage==='B3'||stage==='all'){
    const axePath=process.env.UX_AXE_PATH
    assert.ok(axePath,'UX_AXE_PATH is required for B3')
    async function audit(name){
      if(!await page.evaluate(()=>!!window.axe))await page.addScriptTag({content:await readFile(axePath,'utf8')})
      const result=await page.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}))
      report.accessibility.push({screen:name,engine:result.testEngine,violations:result.violations,incomplete:result.incomplete.map(r=>r.id)})
      assert.deepEqual(result.violations.map(v=>v.id),[])
    }
    async function contrast(locator,label){
      const colors=await locator.evaluate(el=>{
        let node=el,bg='rgb(255, 255, 255)'
        while(node){const c=getComputedStyle(node).backgroundColor;if(c!=='rgba(0, 0, 0, 0)'&&c!=='transparent'){bg=c;break}node=node.parentElement}
        const style=getComputedStyle(el),focusTarget=el.closest('button,a,input')??el,focusStyle=getComputedStyle(focusTarget)
        return {fg:style.color,bg,outline:focusStyle.outlineStyle,outlineWidth:focusStyle.outlineWidth,focusVisible:focusTarget.matches(':focus-visible')}
      })
      function lum(color){const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]}
      const a=lum(colors.fg),b=lum(colors.bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05)
      assert.ok(ratio>=4.5,`${label}: ${ratio}`)
      report.checks.push({label,contrast:ratio,...colors})
    }
    for(const[width,height]of [[1440,960],[900,900],[390,844],[320,720]]){
      await page.setViewportSize({width,height});await navigateSite(page,'Naturtema')
      const brand=page.locator('.site-header__brand-label')
      await page.mouse.move(width-1,height-1);await contrast(brand,`brand-normal-${width}`)
      await brand.hover();await contrast(brand,`brand-hover-${width}`)
      await page.keyboard.press('Tab');await page.getByRole('button',{name:'Gå til kommuneoversikten'}).focus()
      assert.equal(await page.getByRole('button',{name:'Gå til kommuneoversikten'}).evaluate(el=>el.matches(':focus-visible')),true)
      await contrast(brand,`brand-focused-${width}`)
      await capture(`B3-themes-${width}`);await audit(`themes-${width}`)
      await navigateSite(page,'Utforsk i kart')
      const opener=page.getByRole('button',{name:'Analyser planområder',exact:true}).filter({visible:true})
      if(!await page.getByRole('group',{name:'Velg plananalyse'}).isVisible())await opener.click()
      const group=page.getByRole('group',{name:'Velg plananalyse'})
      for(const mode of ['Arealfordeling','Registrerte naturverdier']){
        const button=group.getByRole('button',{name:mode,exact:true})
        await button.click()
        if(mode==='Arealfordeling')await page.getByRole('table',{name:'Økosystemtyper innenfor planområder'}).waitFor({timeout:180000})
        else await page.getByText('Unikt overlappsareal',{exact:true}).waitFor({timeout:180000})
        await page.mouse.move(width-1,height-1);await contrast(button,`selected-normal-${mode}-${width}`)
        await button.hover();await contrast(button,`selected-hover-${mode}-${width}`)
        await page.keyboard.press('Tab');await button.focus()
        assert.equal(await button.evaluate(el=>el.matches(':focus-visible')),true)
        await contrast(button,`selected-focus-${mode}-${width}`)
        await capture(`B3-${mode.replaceAll(' ','-')}-${width}`);await audit(`${mode}-${width}`)
        await page.keyboard.press('Tab')
      }
      const area=group.getByRole('button',{name:'Arealfordeling',exact:true})
      await area.focus();await page.keyboard.press('Enter')
      assert.equal(await area.getAttribute('aria-pressed'),'true')
      report.checks.push({width,keyboardAnalysisSwitch:true})
    }
  }
  assert.deepEqual(report.javascriptErrors,[])
  report.completed=true
}catch(error){report.failure=error.stack;process.exitCode=1;if(page)await capture('interrupted').catch(()=>{})}
finally{await writeFile(`${output}/checks.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser?.close();await network?.dispose();await server.close()}
