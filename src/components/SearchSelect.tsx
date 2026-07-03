import { useEffect, useMemo, useRef, useState } from 'react'

export interface SearchSelectOption {
  id: string
  label: string
}

interface SearchSelectProps {
  options: SearchSelectOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  invalid?: boolean
}

/**
 * Dependency-free typeahead select. Filters options case-insensitively as you
 * type, shows a dropdown of matches, and selects on click or Enter. When
 * closed it displays the selected option's label. Arrow keys move the
 * highlight; Escape and blur close the list.
 */
export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder,
  invalid,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value],
  )

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  // Keep the highlighted row in view as it moves.
  useEffect(() => {
    if (!open) return
    const list = listRef.current
    if (!list) return
    const el = list.children[highlight] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  // When the query changes, reset the highlight to the first match.
  useEffect(() => {
    setHighlight(0)
  }, [query])

  function openList() {
    setQuery('')
    setHighlight(0)
    setOpen(true)
  }

  function closeList() {
    setOpen(false)
    setQuery('')
  }

  function select(id: string) {
    onChange(id)
    closeList()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      closeList()
      return
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      openList()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, matches.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      if (open && matches[highlight]) {
        e.preventDefault()
        select(matches[highlight].id)
      }
    }
  }

  // Text shown in the input: the live query while open, otherwise the
  // selected label.
  const inputValue = open ? query : selected?.label ?? ''

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
        className={`w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${
          invalid ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-950' : ''
        }`}
        placeholder={placeholder}
        value={inputValue}
        onFocus={openList}
        onChange={(e) => {
          if (!open) setOpen(true)
          setQuery(e.target.value)
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          // Delay so a click on an option registers before the list closes.
          window.setTimeout(closeList, 120)
        }}
      />
      {open && (
        <ul
          ref={listRef}
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {matches.length === 0 ? (
            <li className="px-2 py-1.5 text-slate-400 dark:text-slate-500">No matches</li>
          ) : (
            matches.map((o, i) => (
              <li
                key={o.id}
                // onMouseDown fires before the input's blur, so the selection
                // is not lost to the blur-close.
                onMouseDown={(e) => {
                  e.preventDefault()
                  select(o.id)
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`cursor-pointer px-2 py-1.5 ${
                  i === highlight ? 'bg-cyan-50 dark:bg-slate-800' : ''
                } ${o.id === value ? 'font-medium text-cyan-700 dark:text-cyan-400' : ''}`}
              >
                {o.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
