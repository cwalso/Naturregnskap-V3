import { useId, useRef, useState, type KeyboardEvent } from 'react'

import type { Municipality } from '../api/municipalities'

interface MunicipalityComboboxProps {
  municipalities: Municipality[]
  disabled?: boolean
  placeholder?: string
  onSelect(municipality: Municipality | null): void
}

const MAX_RESULTS = 10

export function MunicipalityCombobox({
  municipalities,
  disabled = false,
  placeholder = 'Søk etter kommune',
  onSelect,
}: MunicipalityComboboxProps) {
  const inputId = useId()
  const listboxId = useId()
  const optionsRef = useRef<Array<HTMLLIElement | null>>([])
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const normalizedQuery = query.trim().toLocaleLowerCase('nb')
  const matches = municipalities
    .filter((municipality) => (
      municipality.name.toLocaleLowerCase('nb').includes(normalizedQuery)
      || municipality.number.includes(normalizedQuery)
    ))
    .slice(0, MAX_RESULTS)

  function open() {
    if (!disabled) setIsOpen(true)
  }

  function choose(municipality: Municipality) {
    setQuery(municipality.name)
    setIsOpen(false)
    setActiveIndex(-1)
    onSelect(municipality)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) setIsOpen(true)
      if (matches.length === 0) return
      const direction = event.key === 'ArrowDown' ? 1 : -1
      const nextIndex = activeIndex < 0
        ? (direction === 1 ? 0 : matches.length - 1)
        : (activeIndex + direction + matches.length) % matches.length
      setActiveIndex(nextIndex)
      optionsRef.current[nextIndex]?.scrollIntoView?.({ block: 'nearest' })
      return
    }
    if (event.key === 'Enter' && isOpen) {
      if (activeIndex >= 0) {
        event.preventDefault()
        choose(matches[activeIndex])
        return
      }
      if (matches.length === 1) {
        event.preventDefault()
        choose(matches[0])
      }
    }
  }

  return (
    <div className="combobox">
      <label htmlFor={inputId}>Velg kommune</label>
      <div className="combobox__field">
        <input
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${matches[activeIndex].number}` : undefined}
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onFocus={open}
          onClick={open}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(-1)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
        />
        {query && !disabled && (
          <button
            className="combobox__clear"
            type="button"
            aria-label="Tøm kommunesøk"
            onClick={() => {
              setQuery('')
              setActiveIndex(-1)
              setIsOpen(true)
              onSelect(null)
            }}
          >×</button>
        )}
      </div>
      {isOpen && (
        <ul id={listboxId} className="combobox__options" role="listbox">
          {matches.length > 0 ? matches.map((municipality, index) => (
            <li
              ref={(element) => { optionsRef.current[index] = element }}
              id={`${listboxId}-${municipality.number}`}
              key={municipality.number}
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? 'combobox__option combobox__option--active' : 'combobox__option'}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(municipality)}
            >
              <span>{municipality.name}</span>
              <span className="combobox__number">{municipality.number}</span>
            </li>
          )) : <li className="combobox__empty">Ingen kommuner funnet</li>}
        </ul>
      )}
    </div>
  )
}
