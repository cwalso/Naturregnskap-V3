import assert from 'node:assert/strict'

export const exposeTestMap = {
  name: 'expose-test-map',
  transform(code, id) {
    if (!id.endsWith('/src/map/exploreAnalysisMap.ts')) return
    return code.replace('  let destroyed = false', '  globalThis.__exploreMap = map\n  let destroyed = false')
      .replace('    update(next) {', '    update(next) {\n      globalThis.__exploreContext = next')
  },
}
export const viewState = (page) => page.evaluate(() => ({ center: globalThis.__exploreMap.getView().getCenter(), resolution: globalThis.__exploreMap.getView().getResolution() }))

export async function waitForMapPaint(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    const map = globalThis.__exploreMap
    const timeout = setTimeout(() => { map.un('rendercomplete', done); reject(new Error('Kartet ble ikke ferdig rendret')) }, 30000)
    function done() { clearTimeout(timeout); resolve() }
    map.once('rendercomplete', done)
    map.render()
  }))
}

export async function manualNavigation(page, locator) {
  const before = await viewState(page)
  await locator.scrollIntoViewIfNeeded()
  await locator.focus()
  const box = await locator.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, -180)
  await page.waitForFunction((r) => globalThis.__exploreMap.getView().getResolution() < r && !globalThis.__exploreMap.getView().getAnimating(), before.resolution)
  const zoomed = await viewState(page)
  await page.mouse.wheel(0, 180)
  await page.waitForFunction((r) => globalThis.__exploreMap.getView().getResolution() > r && !globalThis.__exploreMap.getView().getAnimating(), zoomed.resolution)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 15, box.y + box.height / 2 + 10, { steps: 10 })
  await page.mouse.up()
  await page.waitForFunction(() => !globalThis.__exploreMap.getView().getAnimating() && !globalThis.__exploreMap.getView().getInteracting())
  const manual = await viewState(page)
  assert.notDeepEqual(manual.center, before.center)
  await waitForMapPaint(page)
  assert.deepEqual(await viewState(page), manual, 'Map must not reset after manual navigation')
  return { before, zoomed, manual }
}
