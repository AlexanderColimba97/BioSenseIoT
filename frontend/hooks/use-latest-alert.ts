'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { AuthService } from '@/lib/auth-service'
import { buildApiV2Url } from '@/lib/api-config'
import { buildDefaultAlertWsUrl, type AlertLike } from '@/lib/alert-intelligence'

const fetcher = async (url: string) => {
  const token = await AuthService.getValidToken()
  const response = await fetch(buildApiV2Url(url.replace(/^\/api\/v2/, '')), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (response.status === 204 || response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Error del servidor: ${response.status}`)
  }

  return response.json()
}

export function useLatestAlert(options?: { refreshInterval?: number }) {
  const swrKey = AuthService.isAuthenticated() ? '/api/v2/alerts/latest' : null
  const [socketAlert, setSocketAlert] = useState<AlertLike | null>(null)
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'open' | 'closed' | 'error'>('idle')
  const socketRef = useRef<WebSocket | null>(null)

  const wsUrl = useMemo(() => buildDefaultAlertWsUrl(), [])

  const isSocketEnabled = Boolean(wsUrl && typeof window !== 'undefined' && AuthService.isAuthenticated())

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, {
    refreshInterval: isSocketEnabled && connectionState === 'open' ? 0 : (options?.refreshInterval ?? 4000),
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    dedupingInterval: 1500,
    focusThrottleInterval: 5000
  })

  useEffect(() => {
    if (!isSocketEnabled || !wsUrl) {
      setConnectionState('idle')
      return
    }

    setConnectionState('connecting')
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onopen = () => setConnectionState('open')
    socket.onclose = () => setConnectionState('closed')
    socket.onerror = () => setConnectionState('error')
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string) as Record<string, unknown>
        const normalized = (payload.alert || payload.data || payload.payload || payload) as AlertLike
        if (normalized && typeof normalized === 'object') {
          setSocketAlert(normalized)
          void mutate(normalized, false)
        }
      } catch {
        // Ignorar mensajes no estructurados.
      }
    }

    return () => {
      socketRef.current = null
      socket.close()
    }
  }, [isSocketEnabled, wsUrl, mutate])

  const resolvedAlert = socketAlert ?? data ?? null

  return {
    alert: resolvedAlert,
    isLoading: !error && !resolvedAlert && (isLoading || connectionState === 'connecting'),
    isError: !!error,
    mutate
    ,
    connectionState
  }
}
