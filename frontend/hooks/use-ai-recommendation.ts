'use client'

import { useEffect, useState } from 'react'
import { AiRecommendation, AiRecommendationParsed } from '@/lib/types'
import {
  getLatestRecommendation,
  parseActionsFromRecommendation
} from '@/lib/ai-recommendation-service'

interface UseAiRecommendationOptions {
  /**
   * Si true: activa polling automático cada 10 segundos
   * Si false: detiene el polling
   * Debe ser === "DANGER" desde use-diagnostics
   */
  isRedAlert: boolean
  /**
   * Intervalo de polling en ms (default: 10000ms)
   */
  pollingInterval?: number
}

interface UseAiRecommendationResult {
  recommendation: AiRecommendationParsed | null
  isLoading: boolean
  error: Error | null
  hasRecommendation: boolean
}

/**
 * Hook reactivo para recomendaciones IA
 * Hace polling SOLO cuando isRedAlert === true
 * Detiene automáticamente cuando isRedAlert === false
 */
export function useAiRecommendation({
  isRedAlert,
  pollingInterval = 10000
}: UseAiRecommendationOptions): UseAiRecommendationResult {
  const [recommendation, setRecommendation] = useState<AiRecommendationParsed | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Si no hay alerta roja, limpiar y detener
    if (!isRedAlert) {
      setRecommendation(null)
      setError(null)
      return
    }

    // Fetch inicial inmediato
    const fetchRecommendation = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getLatestRecommendation()
        if (data) {
          // Parsear actions e integrar en el objeto
          const actionsList = parseActionsFromRecommendation(data)
          setRecommendation({
            ...data,
            actionsList
          })
        } else {
          setRecommendation(null)
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        console.error('Error fetching AI recommendation:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Fetch inicial
    fetchRecommendation()

    // Configurar polling cada N segundos SOLO si hay alerta roja
    const pollInterval = setInterval(() => {
      fetchRecommendation()
    }, pollingInterval)

    // Cleanup: detener polling cuando se desmonta o cuando isRedAlert cambia a false
    return () => {
      clearInterval(pollInterval)
    }
  }, [isRedAlert, pollingInterval])

  return {
    recommendation,
    isLoading,
    error,
    hasRecommendation: recommendation !== null
  }
}
