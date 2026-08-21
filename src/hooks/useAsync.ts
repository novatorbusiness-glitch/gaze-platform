import { useEffect, useState } from 'react'

export interface AsyncState<T> {
  status: 'loading' | 'ready' | 'error'
  data: T | null
  error: string | null
}

/**
 * Мини-хук для асинхронной загрузки данных (loading / ready / error).
 * Перезапускается при изменении deps; защита от гонок через cancelled-флаг.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', data: null, error: null })

    fn().then(
      (data) => {
        if (!cancelled) setState({ status: 'ready', data, error: null })
      },
      (err: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', data: null, error: err instanceof Error ? err.message : String(err) })
        }
      },
    )

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
