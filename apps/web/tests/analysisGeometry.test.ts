import { expect,it } from 'vitest'
import { hasAnalysisGeometry } from '../src/features/explore-map/analysisGeometry'
it('only enables fitting existing finite polygon extents',()=>{
 expect(hasAnalysisGeometry([])).toBe(false)
 expect(hasAnalysisGeometry([[[[0,0],[0,0],[0,0],[0,0]]]])).toBe(false)
 expect(hasAnalysisGeometry([[[[0,0],[0,1],[NaN,1],[0,0]]]])).toBe(false)
 expect(hasAnalysisGeometry([[[[0,0],[0,1],[1,1],[0,0]]]])).toBe(true)
})
