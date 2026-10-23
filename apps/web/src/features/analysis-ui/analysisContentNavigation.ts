/** Move within the existing result scroller; never scroll or resize the map/page. */
export function focusAnalysisSection(root: HTMLElement, key: string) {
  const target=root.querySelector<HTMLElement>(`[data-analysis-section="${key}"]`)
  if (!target) return false
  if (target instanceof HTMLDetailsElement) target.open=true
  const focus=target instanceof HTMLDetailsElement?target.querySelector<HTMLElement>('summary')!:target
  focus.focus({preventScroll:true})
  const scroller=root.querySelector<HTMLElement>('.analysis-section-scroll')??root.closest<HTMLElement>('.explore-themes__detail-scroll')
  if (scroller) scroller.scrollTop=key==='summary'?0:scroller.scrollTop+target.getBoundingClientRect().top-scroller.getBoundingClientRect().top-3
  else target.scrollIntoView?.({block:'nearest'})
  return true
}
