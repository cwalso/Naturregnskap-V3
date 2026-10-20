import type { Geometry } from '../future-analysis/geometry'

/** Enable a presentation action only for an existing, finite polygon extent. */
export function hasAnalysisGeometry(geometry: Geometry): boolean {
  if (!geometry.length) return false
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity
  for (const polygon of geometry) {
    if (!polygon.length || polygon[0].length<4) return false
    for (const ring of polygon) for (const point of ring) {
      if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) return false
      minX=Math.min(minX,point[0]);maxX=Math.max(maxX,point[0])
      minY=Math.min(minY,point[1]);maxY=Math.max(maxY,point[1])
    }
  }
  return minX<maxX && minY<maxY
}
