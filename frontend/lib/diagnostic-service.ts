import { AuthService } from './auth-service'
import { API_V2_URL } from './api-config'
import { DiagnosticResponse, EnrichedAlert, PetProfile } from './types'

/**
 * Obtiene el diagnóstico más reciente del backend
 * GET /api/v2/diagnostics/latest
 */
export async function getLatestDiagnostic(): Promise<DiagnosticResponse | null> {
  try {
    const token = await AuthService.getValidToken()

    const response = await fetch(`${API_V2_URL}/diagnostics/latest`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    // 204 No Content o 404 = sin diagnóstico
    if (response.status === 204 || response.status === 404) {
      return null
    }

    if (!response.ok) {
      console.error(`Error en diagnóstico: ${response.status}`)
      throw new Error(`Error obteniendo diagnóstico: ${response.status}`)
    }

    const data: DiagnosticResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching diagnostic:', error)
    throw error
  }
}

/**
 * Transforma un DiagnosticResponse a EnrichedAlert
 * Integra datos de mascotas afectadas
 */
export function mapDiagnosticToAlert(
  diagnostic: DiagnosticResponse,
  affectedPets: PetProfile[] = []
): EnrichedAlert {
  // Mapeo de severidad a prioridad (1-5)
  const severityToPriority: Record<string, number> = {
    'CRITICAL': 5,
    'HIGH': 4,
    'MEDIUM': 3,
    'LOW': 2,
  }

  // Filtrar mascotas relevantes (las mencionadas en el diagnóstico)
  const relevantPets = affectedPets.filter(
    (pet) => diagnostic.affectedPet?.includes(pet.name)
  )

  return {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    severity: diagnostic.severity || 'LOW',
    message: diagnostic.diagnosticText || diagnostic.recommendation,
    affectedPets: relevantPets.length > 0 ? relevantPets : affectedPets,
    sensorValues: {
      mq4: diagnostic.mq4,
      mq7: diagnostic.mq7,
      mq135: diagnostic.mq135,
    },
    recommendations: [diagnostic.recommendation],
    timestamp: diagnostic.timestamp,
    resolved: false,
    priority: severityToPriority[diagnostic.severity] || 1,
  }
}

/**
 * Calcula qué sensores están fuera de rango
 * Usable para UI
 */
export function getAffectedSensors(diagnostic: DiagnosticResponse): ('MQ4' | 'MQ7' | 'MQ135')[] {
  const affected: ('MQ4' | 'MQ7' | 'MQ135')[] = []

  // Umbrales definidos
  const thresholds = {
    mq4: { danger: 500, warning: 200 },
    mq7: { danger: 100, warning: 50 },
    mq135: { danger: 300, warning: 150 },
  }

  if (diagnostic.mq4 > thresholds.mq4.warning) affected.push('MQ4')
  if (diagnostic.mq7 > thresholds.mq7.warning) affected.push('MQ7')
  if (diagnostic.mq135 > thresholds.mq135.warning) affected.push('MQ135')

  return affected
}

/**
 * Determina si el diagnóstico requiere atención inmediata
 */
export function isCriticalDiagnostic(diagnostic: DiagnosticResponse | null): boolean {
  if (!diagnostic) return false
  return diagnostic.severity === 'CRITICAL' || diagnostic.severity === 'HIGH'
}

/**
 * Genera recomendaciones adicionales basadas en sensores afectados
 */
export function generateSensorRecommendations(diagnostic: DiagnosticResponse): string[] {
  const recommendations: string[] = []

  if (diagnostic.mq4 > 200) {
    recommendations.push('Verificar posibles fugas de gas o combustibles. Asegurar ventilación adecuada.')
  }

  if (diagnostic.mq7 > 50) {
    recommendations.push('Niveles elevados de monóxido de carbono detectados. Aumentar ventilación inmediatamente.')
  }

  if (diagnostic.mq135 > 150) {
    recommendations.push('La calidad del aire es deficiente. Se recomienda usar purificadores o aumentar ventilación.')
  }

  return recommendations
}
