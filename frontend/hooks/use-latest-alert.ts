'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Network response was not ok')
  return res.json()
})

export function useLatestAlert(options?: { refreshInterval?: number }) {
  const { data, error, mutate } = useSWR('/api/v2/alerts/latest', fetcher, {
    refreshInterval: options?.refreshInterval ?? 5000,
    revalidateOnFocus: true,
    dedupingInterval: 3000
  })

  return {
    alert: data ?? null,
    isLoading: !error && !data,
    isError: !!error,
    mutate
  }
}
