'use client'

import { PetProfile, DiagnosticResponse } from '@/lib/types'
import { usePetRisk, RISK_COLORS, RISK_ICONS, RISK_BADGE_COLORS } from '@/hooks/use-pet-risk'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface PetRiskIndicatorProps {
  pet: PetProfile
  recentDiagnostics?: DiagnosticResponse[]
  showLabel?: boolean
  compact?: boolean
}

/**
 * Indicador visual del riesgo de una mascota
 * Muestra badge con color y ícono según severidad
 */
export function PetRiskIndicator({
  pet,
  recentDiagnostics,
  showLabel = true,
  compact = false,
}: PetRiskIndicatorProps) {
  const riskAssessment = usePetRisk(pet, recentDiagnostics)

  if (compact) {
    // Versión compacta: solo badge
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-bold text-white text-sm ${RISK_BADGE_COLORS[riskAssessment.currentSeverity]}`}
            >
              {RISK_ICONS[riskAssessment.currentSeverity]}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className='text-xs'>
              <p className='font-semibold'>{riskAssessment.petName}</p>
              <p>{riskAssessment.currentSeverity}</p>
              <p>{riskAssessment.recommendation}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Versión completa con detalles
  return (
    <div className={`p-3 rounded-lg border-2 ${RISK_COLORS[riskAssessment.currentSeverity]}`}>
      <div className='flex items-center justify-between mb-2'>
        {showLabel && <h4 className='font-semibold'>{riskAssessment.petName}</h4>}
        <Badge
          variant='outline'
          className={`${RISK_BADGE_COLORS[riskAssessment.currentSeverity]} text-white border-none`}
        >
          {RISK_ICONS[riskAssessment.currentSeverity]} {riskAssessment.currentSeverity}
        </Badge>
      </div>

      <div className='space-y-2 text-sm'>
        <p className='font-medium'>{riskAssessment.recommendation}</p>

        {riskAssessment.riskFactors.length > 0 && (
          <div className='bg-white bg-opacity-50 rounded p-2'>
            <p className='font-semibold text-xs mb-1'>Factores de riesgo:</p>
            <ul className='list-disc list-inside text-xs space-y-1'>
              {riskAssessment.riskFactors.map((factor, idx) => (
                <li key={idx}>{factor}</li>
              ))}
            </ul>
          </div>
        )}

        {riskAssessment.affectedSensors.length > 0 && (
          <div className='bg-white bg-opacity-50 rounded p-2'>
            <p className='font-semibold text-xs mb-1'>Sensores afectados:</p>
            <ul className='list-disc list-inside text-xs space-y-1'>
              {riskAssessment.affectedSensors.map((sensor, idx) => (
                <li key={idx}>{sensor}</li>
              ))}
            </ul>
          </div>
        )}

        <div className='flex items-center gap-2 text-xs'>
          <div className='w-full bg-gray-200 rounded-full h-2'>
            <div
              className={`h-2 rounded-full ${RISK_BADGE_COLORS[riskAssessment.currentSeverity]}`}
              style={{ width: `${(riskAssessment.baseRiskScore / 5) * 100}%` }}
            />
          </div>
          <span className='font-semibold'>{riskAssessment.baseRiskScore.toFixed(1)}/5</span>
        </div>
      </div>
    </div>
  )
}
