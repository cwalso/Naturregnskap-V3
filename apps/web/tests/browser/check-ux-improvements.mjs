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
  for(const [theme,category,id,expected,stock]of [['Skog','skog','skog','2 032,22 daa','280 586'],['Myr','våtmark','vatmark','12,64 daa','38 495']]){
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
  assert.deepEqual(report.javascriptErrors,[])
  report.completed=true
}catch(error){report.failure=error.stack;process.exitCode=1;if(page)await capture('interrupted').catch(()=>{})}
finally{await writeFile(`${output}/checks.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser?.close();await network?.dispose();await server.close()}
// Reserved for the subsequent accessibility delivery; no dependency is added to runtime.
void readFile
