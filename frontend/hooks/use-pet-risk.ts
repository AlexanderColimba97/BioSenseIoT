'use client'

import { useMemo } from 'react'
import { PetProfile, DiagnosticResponse } from '@/lib/types'

export interface PetRiskAssessment {
  petId?: number | string
  petName: string
  baseRiskScore: number // 0-5
  currentSeverity: 'SAFE' | 'WARNING' | 'DANGER' | 'CRITICAL'
  riskFactors: string[]
  affectedSensors: string[]
  recommendation: string
  isAtRisk: boolean
}

/**
 * Hook para calcular el riesgo dinámico de una mascota
 * Basado en sus características y diagnósticos recientes
 */
export function usePetRisk(pet: PetProfile, recentDiagnostics?: DiagnosticResponse[]): PetRiskAssessment {
  return useMemo(() => {
    const assessment: PetRiskAssessment = {
      petId: pet.id,
      petName: pet.name,
      baseRiskScore: 0,
      currentSeverity: 'SAFE',
      riskFactors: [],
      affectedSensors: [],
      recommendation: 'Sin riesgo detectado',
      isAtRisk: false,
    }

    // ===== FACTORES DE RIESGO BASE (del perfil) =====
    let baseScore = 0

    // 1. Riesgo respiratorio
    if (pet.respiratoryRisk === 'SEVERE') {
      baseScore += 2
      assessment.riskFactors.push('Riesgo respiratorio severo')
    } else if (pet.respiratoryRisk === 'CRITICAL') {
      baseScore += 3
      assessment.riskFactors.push('Riesgo respiratorio crítico')
    } else if (pet.respiratoryRisk === 'MILD') {
      baseScore += 1
      assessment.riskFactors.push('Riesgo respiratorio leve')
    }

    // 2. Nivel de sensibilidad
    if (pet.sensitivityLevel === 'HIGH') {
      baseScore += 2
      assessment.riskFactors.push('Alta sensibilidad a cambios ambientales')
    } else if (pet.sensitivityLevel === 'MEDIUM') {
      baseScore += 1
      assessment.riskFactors.push('Sensibilidad media')
    }

    // 3. Edad avanzada (> 10 años)
    if (pet.ageYears && pet.ageYears > 10) {
      baseScore += 1
      assessment.riskFactors.push(`Edad avanzada (${pet.ageYears} años)`)
    } else if (pet.ageYears && pet.ageYears < 1) {
      baseScore += 1
      assessment.riskFactors.push('Edad muy temprana (cachorr@)')
    }

    // 4. Peso anormal (muy bajo para la especie)
    if (pet.weightKg && pet.weightKg < 3 && pet.species === 'DOG') {
      baseScore += 1
      assessment.riskFactors.push('Peso muy bajo para perro')
    }

    // 5. Actividad baja
    if (pet.activityLevel === 'INACTIVE' || pet.activityLevel === 'SEDENTARY') {
      baseScore += 1
      assessment.riskFactors.push('Actividad física muy baja')
    }

    // 6. Vulnerabilidades específicas
    if (pet.vulnerabilities) {
      const vulns = pet.vulnerabilities.toLowerCase()
      if (vulns.includes('respiratorio') || vulns.includes('asma')) {
        baseScore += 2
        assessment.riskFactors.push('Historial de problemas respiratorios')
      }
      if (vulns.includes('alérgic')) {
        baseScore += 1
        assessment.riskFactors.push('Tendencia a alergias')
      }
      if (vulns.includes('inmunidad') || vulns.includes('inmunosuprim')) {
        baseScore += 2
        assessment.riskFactors.push('Sistema inmunológico comprometido')
      }
    }

    // ===== RIESGO DINÁMICO (del diagnóstico reciente) =====
    let diagnosisScore = 0

    if (recentDiagnostics && recentDiagnostics.length > 0) {
      const latestDiagnostic = recentDiagnostics[0]

      // Analizar si la mascota está mencionada en el diagnóstico
      const affectedByDiagnosis =
        latestDiagnostic.affectedPet?.toLowerCase().includes(pet.name.toLowerCase()) ||
        latestDiagnostic.affectedPet?.toLowerCase().includes(pet.species.toLowerCase())

      if (affectedByDiagnosis) {
        diagnosisScore += 2
        assessment.riskFactors.push('Mencionada en diagnóstico reciente')
      }

      // Analizar severidad del diagnóstico
      if (latestDiagnostic.severity === 'HIGH') {
        diagnosisScore += 2
        assessment.affectedSensors.push('Múltiples sensores en nivel alto')
      } else if (latestDiagnostic.severity === 'CRITICAL') {
        diagnosisScore += 3
        assessment.affectedSensors.push('Condición crítica detectada')
      } else if (latestDiagnostic.severity === 'MEDIUM') {
        diagnosisScore += 1
        assessment.affectedSensors.push('Lectura moderada')
      }

      // Correlacionar sensores afectados con especie
      if (pet.respiratoryRisk !== 'NORMAL') {
        // Mascotas con riesgo respiratorio son más sensibles a MQ7 y MQ135
        if (latestDiagnostic.mq7 > 100) {
          diagnosisScore += 2
          assessment.affectedSensors.push('CO alto (MQ7) - peligroso para mascotas')
        }
        if (latestDiagnostic.mq135 > 200) {
          diagnosisScore += 1
          assessment.affectedSensors.push('Calidad aire baja (MQ135)')
        }
      }

      // Si MQ4 está muy alto, puede afectar a cualquier mascota
      if (latestDiagnostic.mq4 > 500) {
        diagnosisScore += 1
        assessment.affectedSensors.push('Metano elevado (MQ4)')
      }
    }

    // ===== CÁLCULO FINAL =====
    const totalScore = Math.min(baseScore + diagnosisScore, 5)
    assessment.baseRiskScore = totalScore

    // Mapear score a severidad
    if (totalScore === 0) {
      assessment.currentSeverity = 'SAFE'
      assessment.recommendation = 'Mascota en condiciones seguras'
    } else if (totalScore <= 1) {
      assessment.currentSeverity = 'SAFE'
      assessment.recommendation = 'Mantener vigilancia regular'
    } else if (totalScore <= 2) {
      assessment.currentSeverity = 'WARNING'
      assessment.recommendation = 'Monitorear cambios ambientales'
      assessment.isAtRisk = true
    } else if (totalScore <= 3) {
      assessment.currentSeverity = 'DANGER'
      assessment.recommendation = 'Reducir exposición a contaminantes'
      assessment.isAtRisk = true
    } else {
      assessment.currentSeverity = 'CRITICAL'
      assessment.recommendation = 'Buscar atención veterinaria inmediata'
      assessment.isAtRisk = true
    }

    return assessment
  }, [pet, recentDiagnostics])
}

/**
 * Hook para evaluar riesgo de múltiples mascotas
 */
export function usePetsRiskAssessment(
  pets: PetProfile[] | undefined,
  recentDiagnostics?: DiagnosticResponse[]
): PetRiskAssessment[] {
  return useMemo(() => {
    if (!pets || pets.length === 0) return []
    return pets.map((pet) => usePetRisk(pet, recentDiagnostics))
  }, [pets, recentDiagnostics])
}

/**
 * Helpers para determinar color y iconos basados en riesgo
 */
export const RISK_COLORS = {
  SAFE: 'bg-green-100 text-green-800 border-green-300',
  WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  DANGER: 'bg-orange-100 text-orange-800 border-orange-300',
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
}

export const RISK_ICONS = {
  SAFE: '✓',
  WARNING: '⚠',
  DANGER: '⛔',
  CRITICAL: '🚨',
}

export const RISK_BADGE_COLORS = {
  SAFE: 'bg-green-500',
  WARNING: 'bg-yellow-500',
  DANGER: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
}
