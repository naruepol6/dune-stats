import { useCallback, useEffect, useState } from 'react'

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

export function Loading() {
  return <p className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <p className="m-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {message}
    </p>
  )
}

/** Horizontal proportion bar (0..1), used for winrates. "Functional minimal." */
export function Bar({ value }: { value: number }) {
  const w = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className="h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
      <div className="h-full rounded bg-amber-500" style={{ width: `${w}%` }} />
    </div>
  )
}
