import { AuthService } from './auth-service'
import { API_V2_URL } from './api-config'
import { AiRecommendation } from './types'

/**
 * Obtiene la recomendación IA más reciente del backend
 * Disponible solo cuando severity === "DANGER"
 * GET /api/v2/ai/ollama/latest
 */
export async function getLatestRecommendation(): Promise<AiRecommendation | null> {
  try {
    const token = await AuthService.getValidToken()

    const response = await fetch(`${API_V2_URL}/ai/ollama/latest`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    // 204 No Content o 404 = sin recomendación
    if (response.status === 204 || response.status === 404) {
      return null
    }

    if (!response.ok) {
      console.error(`Error en recomendación IA: ${response.status}`)
      throw new Error(`Error obteniendo recomendación IA: ${response.status}`)
    }

    const data: AiRecommendation = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching AI recommendation:', error)
    throw error
  }
}

/**
 * Obtiene las últimas N recomendaciones IA del backend
 * Útil para historial
 * GET /api/v2/ai/ollama/recent?limit=N
 */
export async function getRecentRecommendations(limit: number = 10): Promise<AiRecommendation[]> {
  try {
    const token = await AuthService.getValidToken()
    const clampedLimit = Math.min(Math.max(limit, 1), 20) // Asegurar rango [1-20]

    const response = await fetch(`${API_V2_URL}/ai/ollama/recent?limit=${clampedLimit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    // 204 o 404 = sin historial
    if (response.status === 204 || response.status === 404) {
      return []
    }

    if (!response.ok) {
      console.error(`Error en historial IA: ${response.status}`)
      throw new Error(`Error obteniendo historial IA: ${response.status}`)
    }

    const data: AiRecommendation[] = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching recent AI recommendations:', error)
    throw error
  }
}

/**
 * Obtiene una recomendación IA específica por ID
 * GET /api/v2/ai/ollama/{id}
 */
export async function getRecommendationById(id: number): Promise<AiRecommendation | null> {
  try {
    const token = await AuthService.getValidToken()

    const response = await fetch(`${API_V2_URL}/ai/ollama/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    // 404 = no encontrada
    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      console.error(`Error obteniendo recomendación ${id}: ${response.status}`)
      throw new Error(`Error obteniendo recomendación: ${response.status}`)
    }

    const data: AiRecommendation = await response.json()
    return data
  } catch (error) {
    console.error(`Error fetching AI recommendation ${id}:`, error)
    throw error
  }
}

/**
 * Parsea el campo 'actions' (JSON string) a array de strings
 * Maneja errores de parsing con fallback graceful
 */
export function parseActionsFromRecommendation(
  recommendation: AiRecommendation
): string[] {
  if (!recommendation.actions) {
    return []
  }

  try {
    const parsed = JSON.parse(recommendation.actions)
    if (Array.isArray(parsed)) {
      return parsed.map(action => String(action).trim()).filter(a => a.length > 0)
    }
    return []
  } catch (error) {
    console.warn('Error parsing actions JSON, returning fallback:', error)
    // Fallback: devolver el texto como un único string si no es JSON válido
    return [recommendation.actions]
  }
}
