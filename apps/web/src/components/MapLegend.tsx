export interface MapLegendItem {
  readonly id: string
  readonly title: string
  readonly visible: boolean
  readonly imageUrl: string
}

interface MapLegendProps {
  readonly items: readonly MapLegendItem[]
}

export function MapLegend({ items }: MapLegendProps) {
  const visibleItems = items.filter((item) => item.visible)

  return (
    <aside className="map-legend" aria-labelledby="map-legend-title">
      <h2 id="map-legend-title">Tegnforklaring</h2>
      {visibleItems.length === 0
        ? <p>Ingen aktive faglag</p>
        : visibleItems.map((item) => (
          <section className="map-legend__item" key={item.id}>
            <h3>{item.title}</h3>
            <img src={item.imageUrl} alt={`Tegnforklaring for ${item.title}`} />
          </section>
        ))}
    </aside>
  )
}
