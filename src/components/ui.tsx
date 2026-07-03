import {
  useCallback,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'

/** Tiny data-loading helper: runs an async fn, exposes data/loading/error + reload. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    run()
      .then((d) => setData(d))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [run])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, error, reload }
}

/** Surface panel: rounded, hairline border, subtle shadow. */
export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </div>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50',
  secondary:
    'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
  danger:
    'border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}

/** Small pill label (e.g. an expansion name). */
export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300 ${className}`}
    >
      {children}
    </span>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className}`} />
}

export function Loading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  )
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      {message}
    </p>
  )
}

/** Horizontal proportion bar (0..1), used for winrates. */
export function Bar({ value }: { value: number }) {
  const w = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div className="h-full rounded-full bg-cyan-500" style={{ width: `${w}%` }} />
    </div>
  )
}

/** A row of headline stat tiles. */
export function StatCards({ items }: { items: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <Card key={label} className="p-3 text-center">
          <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {value}
          </div>
          <div className="mt-0.5 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </div>
        </Card>
      ))}
    </div>
  )
}
