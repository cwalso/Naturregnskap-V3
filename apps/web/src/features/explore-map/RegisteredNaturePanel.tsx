import { municipalValueLegend, type MunicipalNatureFilter, type MunicipalValuedNature, type RegisteredNatureLocality } from '../../api/municipalValuedNature'

interface FilterProps {
  id: string
  data: MunicipalValuedNature
  filter: MunicipalNatureFilter
  search: string
  types: readonly string[]
  localities: readonly RegisteredNatureLocality[]
  selectedId: string | null
  limit: number
  onFilter: (filter: MunicipalNatureFilter) => void
  onSearch: (search: string) => void
  onReset: () => void
  onSelect: (id: string) => void
  onMore: () => void
}

export function RegisteredNaturePanel({ id, data, filter, search, types, localities, selectedId, limit, onFilter, onSearch, onReset, onSelect, onMore }: FilterProps) {
  return <section className="explore-themes__nature-filter" aria-label="Filter og lokaliteter for Verdsatte naturtyper">
    <div className="explore-themes__filter-heading"><h3>Filtrer naturtyper</h3><button type="button" aria-label="Vis alle registrerte lokaliteter" onClick={onReset}>Nullstill</button></div>
    <p className="explore-themes__muted">Endrer bare Verdsatte naturtyper.</p>
    {data.localities.length === 0 ? <p>Ingen registrerte lokaliteter i denne kilden. Det dokumenterer ikke fravær av naturverdi.</p> : <>
      <label htmlFor={`${id}-type`}>Naturtype</label>
      <select id={`${id}-type`} value={filter.natureType ?? ''} onChange={event => onFilter({ ...filter, natureType: event.target.value || null })}>
        <option value="">Alle registrerte naturtyper</option>{types.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
      <label htmlFor={`${id}-value`}>Verdikategori</label>
      <select id={`${id}-value`} value={filter.value ?? ''} onChange={event => onFilter({ ...filter, value: event.target.value || null })}>
        <option value="">Alle fire verdikategorier</option>{municipalValueLegend.map(item => <option key={item.label}>{item.label}</option>)}
      </select>
      <details className="explore-themes__type-search"><summary>Søk i naturtypenavn</summary>
        <label htmlFor={`${id}-search`}>Søk i naturtyper</label>
        <input id={`${id}-search`} type="search" value={search} placeholder="Skriv del av naturtypenavnet" onChange={event => onSearch(event.target.value)} />
        {types.length === 0 && <p>Ingen naturtypenavn samsvarer med søket.</p>}
      </details>
      <p className="explore-themes__filter-status" role="status">Kart og liste viser {localities.length} registrerte lokaliteter{filter.natureType ? ` · ${filter.natureType}` : ''}{filter.value ? ` · ${filter.value}` : ''}.</p>
      <p className="explore-themes__muted">{data.localities.length} registrerte lokaliteter · {data.natureTypes.length} naturtyper i kommunen. Også lokaliteter som krysser kommunegrensen er med.</p>
      <details key={`${filter.natureType}:${filter.value}`} open={localities.length <= 60 || undefined}><summary>Lokaliteter ({localities.length})</summary>
        <ul className="explore-themes__localities" aria-label="Registrerte lokaliteter">{localities.slice(0, limit).map(item => <li key={item.id}>
          <button type="button" aria-pressed={selectedId === item.id} onClick={() => onSelect(item.id)}><strong>{item.name === 'Ikke oppgitt' ? `Lokalitet ${item.id}` : item.name}</strong><small>{item.natureType}</small><span className="explore-themes__value"><i style={{ background: item.color }} aria-hidden="true" />{item.value}</span></button>
        </li>)}</ul>
        {localities.length > limit && <button type="button" onClick={onMore}>Vis flere lokaliteter</button>}
      </details>
    </>}
  </section>
}

export function RegisteredNatureDetails({ locality, municipality, onBack, onClear }: { locality: RegisteredNatureLocality; municipality: { name: string; number: string }; onBack: () => void; onClear: () => void }) {
  return <section aria-label="Valgt lokalitet">
    <button type="button" onClick={onBack}>Tilbake til naturtypefilter</button>
    <div className="explore-themes__object-card"><h3>{locality.name === 'Ikke oppgitt' ? `Lokalitet ${locality.id}` : locality.name}</h3><p>{locality.natureType}</p><span className="explore-themes__value"><i style={{ background: locality.color }} aria-hidden="true" />{locality.value}</span></div>
    <dl className="explore-themes__attributes"><dt>Kommunekontekst</dt><dd>{municipality.name} · {municipality.number}</dd><dt>Objekt-ID</dt><dd>{locality.id}</dd><dt>Kilde-ID</dt><dd>{locality.sourceId}</dd><dt>Kilde</dt><dd>Miljødirektoratet · Naturtyper med KU-verdi</dd></dl>
    <p className="explore-themes__reference">Registrerte lokaliteter i et datasett som ikke er heldekkende. Manglende registrering betyr ikke fravær av naturverdi.</p>
    <button type="button" onClick={onClear}>Fjern valg</button>
  </section>
}
