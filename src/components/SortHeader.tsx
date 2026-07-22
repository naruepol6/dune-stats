import type { ReactNode } from 'react'

export type SortDir = 'asc' | 'desc'

export interface SortState<K extends string> {
  key: K
  dir: SortDir
}

/**
 * Click behaviour for a sortable column: clicking the active column flips its
 * direction; clicking a new column adopts that column's "best first" default.
 */
export function nextSort<K extends string>(
  current: SortState<K>,
  key: K,
  defaultDir: SortDir,
): SortState<K> {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
  return { key, dir: defaultDir }
}

function Caret({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return <span className="text-slate-300 dark:text-slate-600">↕</span>
  }
  return <span>{dir === 'asc' ? '▲' : '▼'}</span>
}

/** A clickable table header cell that sorts by `sortKey`. */
export function SortTh<K extends string>({
  sortKey,
  label,
  defaultDir,
  sort,
  onSort,
  align = 'left',
  className = '',
}: {
  sortKey: K
  label: ReactNode
  defaultDir: SortDir
  sort: SortState<K>
  onSort: (key: K, defaultDir: SortDir) => void
  align?: 'left' | 'right'
  className?: string
}) {
  const active = sort.key === sortKey
  return (
    <th
      className={className}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey, defaultDir)}
        className={`flex w-full items-center gap-1 font-medium uppercase tracking-wide hover:text-slate-700 dark:hover:text-slate-200 ${
          align === 'right' ? 'justify-end' : ''
        }`}
      >
        {label}
        <Caret active={active} dir={sort.dir} />
      </button>
    </th>
  )
}
