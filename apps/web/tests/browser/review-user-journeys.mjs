// Observational review of a production build. No app transforms, fixtures or method changes.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium, request } from 'playwright'
import { preview } from 'vite'
import { navigateSite } from './map-browser-helpers.mjs'

const root = process.env.UX_REVIEW_ROOT
if (!root) throw new Error('UX_REVIEW_ROOT must point to the web root of the verified published commit, already built')
const output = process.env.BROWSER_OUTPUT ?? '.browser-results/user-journeys'
await mkdir(output, { recursive: true })
const server = await preview({ root, preview: { host: '127.0.0.1', port: 5215, strictPort: true } })
const report = { mode: 'production preview; live public services through unchanged proxy', widths: [], observations: [], screenshots: [], network: [], javascriptErrors: [], accessibility: [], controlledFailures: [] }
let browser, network, page
let failPlan = false
const cache = new Map()
async function commune(name, number) {
  await page.getByRole('combobox', { name: 'Velg kommune', exact: true }).fill(name)
  await page.getByRole('option', { name: `${name} ${number}`, exact: true }).click()
}
async function capture(name, axe = false) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true })
  await writeFile(`${output}/${name}.txt`, await page.locator('body').innerText())
  const metrics = await page.evaluate(() => {
    const rect = selector => { const e = document.querySelector(selector); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, scrollHeight: e.scrollHeight, clientHeight: e.clientHeight } }
    return { width: innerWidth, height: innerHeight, pageOverflow: document.documentElement.scrollWidth-innerWidth,
      hash: location.hash, map: rect('.explore-themes__canvas'), panel: rect('.explore-themes__info'), detail: rect('.explore-themes__detail-scroll'),
      headings: [...document.querySelectorAll('h1,h2,h3')].map(e => ({ level: e.tagName, text: e.textContent })),
      smallTargets: [...document.querySelectorAll('button,input,select,summary')].filter(e => { const r=e.getBoundingClientRect(); return r.width>0 && r.height>0 && (r.width<24 || r.height<24) }).map(e => ({ text: e.getAttribute('aria-label') || e.textContent, width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })),
      innerScrollers: [...document.querySelectorAll('main *')].filter(e => e.scrollWidth-e.clientWidth>4 && getComputedStyle(e).overflowX!=='visible').map(e => ({ class: e.className, role: e.getAttribute('role'), clientWidth: e.clientWidth, scrollWidth: e.scrollWidth })) }
  })
  report.screenshots.push({ name, ...metrics })
  if (axe && process.env.UX_AXE_PATH) {
    if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({ content: await readFile(process.env.UX_AXE_PATH, 'utf8') })
    const audit = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } }))
    report.accessibility.push({ screen: name, tool: audit.testEngine, violations: audit.violations, incomplete: audit.incomplete.map(r=>({id:r.id,impact:r.impact,nodes:r.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})) })
  }
  await writeFile(`${output}/review.json`, JSON.stringify(report, null, 2))
}
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true })
  network = await request.newContext({ proxy: { server: process.env.HTTPS_PROXY } })
  page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  page.setDefaultTimeout(30000)
  page.on('pageerror', error => report.javascriptErrors.push(error.message))
  await page.route('https://**/*', async route => {
    const req=route.request(), url=new URL(req.url()), key=req.method()+req.url()+(req.postData()??'')
    if (failPlan && url.hostname==='nap.ft.dibk.no') return route.fulfill({status:503,body:'Controlled DiBK failure for UX review'})
    try {
      let response=cache.get(key)
      const reused=!!response
      if(!response) {
        const r=await network.fetch(req.url(),{method:req.method(),data:req.postData()??undefined,headers:req.headers(),timeout:60000})
        response={status:r.status(),headers:r.headers(),body:await r.body()}
        if(response.status===200 && cache.size<500)cache.set(key,response)
      }
      report.network.push({url:req.url(),status:response.status,reusedSameSession:reused})
      await route.fulfill(response)
    } catch(error) { report.network.push({url:req.url(),error:error.message}); await route.abort() }
  })
  await page.goto('http://127.0.0.1:5215')
  await commune('Trondheim','5001')
  await page.getByLabel('Oppsummering av arealer i planområder').waitFor({timeout:180000})
  await capture('A-overview-1440',true)
  console.log('A: overview loaded')
  await navigateSite(page,'Naturtema')
  await capture('A-themes-1440',true)
  await page.getByRole('button',{name:/Bynaturen \(grå arealer\)/}).click()
  await capture('A-urban-role-1440')
  await navigateSite(page,'Naturtema')
  await page.getByRole('button',{name:/^♠?\s*Skog/}).click()
  await page.getByRole('heading',{name:/Skog/}).first().waitFor()
  await page.waitForFunction(()=>!document.querySelector('.forest-page')?.innerText.includes('Laster skogfordeling'),{},{timeout:180000})
  await capture('A-forest-1440')
  await page.getByRole('link',{name:/kart/i}).first().click().catch(()=>{})
  report.observations.push({scenario:'A',action:'Overview → Nature themes → Forest; outgoing map affordances captured in text',observed:true})
  await navigateSite(page,'Kommuneoversikt')
  await page.getByRole('link',{name:/Mer om naturtapet/}).click()
  await page.getByRole('heading',{name:'Naturtapet i Trondheim',exact:true}).waitFor()
  await capture('B-loss-1440',true)
  const tableToggle = page.locator('summary').filter({hasText:'Se tallene i tabell'})
  if(await tableToggle.count()) {await tableToggle.first().click();await capture('B-loss-table-1440')}
  const firstPeriod=page.getByRole('combobox',{name:'Fra periode'})
  if(await firstPeriod.count()) {await firstPeriod.selectOption({index:1});report.observations.push({scenario:'B',periodChange:await firstPeriod.inputValue()})}
  await page.getByRole('link',{name:/Tilbake til Kommuneoversikt/}).click()
  await page.getByRole('link',{name:'Åpne arealfordelingen i kart',exact:true}).click()
  await page.getByRole('table',{name:'Økosystemtyper innenfor planområder'}).waitFor({timeout:180000})
  await capture('C-area-all-1440',true)
  console.log('C: area analysis loaded')
  const areaTable=()=>page.getByRole('table',{name:'Økosystemtyper innenfor planområder'})
  await page.getByRole('group',{name:'Velg arealer i kartet'}).getByRole('button',{name:'Natur',exact:true}).click()
  await page.getByRole('group',{name:'Velg arealer i kartet'}).getByRole('button',{name:'Jordbruk',exact:true}).click()
  await areaTable().getByRole('button',{name:'Skog',exact:true}).click()
  await capture('C-forest-before-fit-1440')
  await page.getByRole('button',{name:'Tilpass kart til utvalget',exact:true}).click()
  await capture('C-forest-fit-1440')
  await page.getByRole('button',{name:'Nullstill utvalg',exact:true}).click()
  assert.equal(await page.getByRole('group',{name:'Velg arealer i kartet'}).getByRole('button',{name:'Alle arealer',exact:true}).getAttribute('aria-pressed'),'true')
  await page.getByRole('group',{name:'Velg plananalyse'}).getByRole('button',{name:'Registrerte naturverdier',exact:true}).click()
  await page.getByText('Unikt overlappsareal',{exact:true}).waitFor({timeout:180000})
  await capture('D-values-all-1440',true)
  console.log('D: registered nature loaded')
  await page.getByRole('button',{name:/^Stor verdi.*daa/}).click()
  await capture('D-value-filter-1440')
  const natureType=page.getByRole('table',{name:'Naturtyper med overlapp'}).getByRole('button').first()
  const chosenType=await natureType.innerText();await natureType.click()
  const localTable=page.getByRole('table',{name:/av .*lokaliteter/})
  const chosenLocality=await localTable.getByRole('button').first().innerText();await localTable.getByRole('button').first().click()
  await capture('D-locality-1440')
  await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).fill('___finnes_ikke___')
  await capture('D-empty-search-1440')
  await page.getByRole('button',{name:'Vis hele analysen',exact:true}).click()
  report.observations.push({scenario:'D',chosenType,chosenLocality,searchAfterReset:await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).inputValue(),captionAfterReset:await page.getByRole('table',{name:/av .*lokaliteter/}).locator('caption').innerText()})
  await capture('D-reset-with-search-1440')
  await page.getByRole('searchbox',{name:'Søk etter lokalitet'}).fill('')
  for(const [width,height] of [[1440,960],[900,900],[390,844],[320,720]]){
    await page.setViewportSize({width,height})
    await navigateSite(page,'Kommuneoversikt');await page.evaluate(()=>scrollTo(0,0))
    if(width!==1440)await capture(`A-overview-${width}`,width===320)
    await navigateSite(page,'Naturtapet');await page.evaluate(()=>scrollTo(0,0))
    if(width!==1440)await capture(`B-loss-${width}`,width===320)
    await navigateSite(page,'Utforsk i kart')
    const opener=page.getByRole('button',{name:'Analyser planområder',exact:true}).filter({visible:true})
    if(!await page.getByRole('group',{name:'Velg plananalyse'}).isVisible())await opener.click()
    await page.getByRole('group',{name:'Velg plananalyse'}).getByRole('button',{name:'Arealfordeling',exact:true}).click()
    await areaTable().waitFor();await capture(`C-area-all-${width}`,width<=390)
    await areaTable().getByRole('button',{name:'Skog',exact:true}).focus();await page.keyboard.press('Enter')
    assert.equal(await areaTable().getByRole('button',{name:'Skog',exact:true}).getAttribute('aria-pressed'),'true')
    if(width<=390){await page.getByRole('button',{name:'Vis kart',exact:true}).click();await capture(`C-map-only-${width}`);await opener.click()}
    await page.getByRole('group',{name:'Velg plananalyse'}).getByRole('button',{name:'Registrerte naturverdier',exact:true}).click()
    await page.getByText('Unikt overlappsareal',{exact:true}).waitFor();await capture(`D-values-${width}`,width<=390)
    const close=page.getByRole('button',{name:'Lukk detaljpanel',exact:true})
    if(await close.isVisible())await close.click()
    else await page.getByRole('button',{name:'Tilbake til kartlag',exact:true}).filter({visible:true}).first().click()
    const mapNode=await page.locator('.ol-viewport').elementHandle()
    const layerList=page.getByRole('checkbox',{name:'Grå arealer',exact:true})
    if(!await layerList.isVisible())await page.getByRole('button',{name:/Kartlag/}).filter({visible:true}).first().click()
    const beforeLayers=await page.getByRole('checkbox').evaluateAll(es=>es.map(e=>({name:e.getAttribute('aria-label'),checked:e.checked})))
    await layerList.check();await capture(`F-grey-layers-${width}`)
    await layerList.uncheck()
    report.widths.push({width,height,mapViewportNodeRetained:await page.locator('.ol-viewport').evaluate((node,old)=>node===old,mapNode),beforeLayers,keyboardAreaChoice:true})
  }
  await page.setViewportSize({width:1440,height:960})
  await page.getByRole('button',{name:'Innstillinger for Grunnkart nivå 0',exact:true}).click()
  const opacity=page.getByRole('slider',{name:'Gjennomsiktighet – Grunnkart nivå 0',exact:true})
  await opacity.focus();await opacity.press('Home')
  for(let i=0;i<13;i++)await opacity.press('ArrowRight')
  report.observations.push({scenario:'F',opacityKeyboardValue:await opacity.inputValue()})
  await capture('F-opacity-1440')
  await page.getByRole('button',{name:'Lukk detaljpanel',exact:true}).click()
  await page.getByRole('region',{name:'Interaktivt kart i Trondheim',exact:true}).focus()
  await page.keyboard.press('ArrowRight');await capture('F-keyboard-map-1440')
  await page.getByRole('button',{name:'Tegnforklaring',exact:true}).filter({visible:true}).first().click()
  await capture('F-legend-1440')
  await page.getByRole('button',{name:'Lukk detaljpanel',exact:true}).click()
  await page.getByRole('button',{name:'Gå til kommuneoversikten',exact:true}).hover()
  await capture('F-brand-hover-1440',true)
  await page.mouse.move(1430,950)
  await commune('Oslo','0301')
  await capture('E-oslo-forced-overview-1440')
  report.observations.push({scenario:'E',viewAfterMunicipalitySwitch:await page.evaluate(()=>location.hash)})
  await navigateSite(page,'Utforsk i kart');await capture('E-oslo-map-1440')
  await page.getByRole('button',{name:'Analyser planområder',exact:true}).filter({visible:true}).click()
  await page.getByText(/Klargjort kommunevis Grunnkart mangler/).first().waitFor()
  await capture('E-oslo-analysis-unavailable-1440')
  await navigateSite(page,'Kommuneoversikt');await capture('E-oslo-overview-1440')
  await navigateSite(page,'Naturtapet');await capture('E-oslo-loss-1440')
  await page.reload();await capture('E-oslo-after-reload-1440')
  report.observations.push({scenario:'E',communeAfterReload:await page.getByRole('combobox',{name:'Velg kommune'}).inputValue()})
  await commune('Trondheim','5001')
  await navigateSite(page,'Utforsk i kart')
  await page.getByRole('button',{name:'Analyser planområder',exact:true}).filter({visible:true}).click()
  await areaTable().waitFor();await capture('E-trondheim-restored-1440')
  failPlan=true
  await page.reload();await commune('Trondheim','5001')
  await page.getByText('Planarealene kunne ikke beregnes. Dette betyr ikke null treff.',{exact:true}).waitFor()
  await page.getByRole('link',{name:'Åpne arealfordelingen i kart',exact:true}).click()
  await page.getByRole('group',{name:'Velg plananalyse'}).waitFor()
  await page.getByRole('alert').first().waitFor({timeout:180000})
  report.controlledFailures.push('DiBK HTTP503 on fresh reload; all other data real')
  await capture('F-controlled-plan-error-1440')
  report.completed=true
}catch(error){report.failure={message:error.message,stack:error.stack};console.error(error);if(page)await capture('review-interrupted').catch(()=>{});process.exitCode=1}
finally{
  await writeFile(`${output}/review.json`,JSON.stringify(report,null,2))
  console.log(JSON.stringify({completed:report.completed,screens:report.screenshots.length,widths:report.widths,errors:report.javascriptErrors,failure:report.failure?.message}))
  await browser?.close();await network?.dispose();await server.httpServer.close()
}
