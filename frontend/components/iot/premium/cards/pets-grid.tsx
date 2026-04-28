'use client'

import { PetProfile, DiagnosticResponse } from '@/lib/types'
import { usePetRisk, usePetsRiskAssessment, RISK_BADGE_COLORS, RISK_ICONS } from '@/hooks/use-pet-risk'
import { PetCard } from './pet-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, PawPrint } from 'lucide-react'
import { memo } from 'react'

interface PetsGridProps {
  pets: PetProfile[] | undefined
  recentDiagnostics?: DiagnosticResponse[]
  onAddPet?: () => void
  onEditPet?: (pet: PetProfile) => void
  onDeletePet?: (petId: number) => void
  isLoading?: boolean
  maxColumns?: number
}

/**
 * Grid de mascotas con indicadores de riesgo
 * Muestra todas las mascotas del usuario en una vista resumida
 */
export const PetsGrid = memo(function PetsGridComponent({
  pets,
  recentDiagnostics,
  onAddPet,
  onEditPet,
  onDeletePet,
  isLoading = false,
  maxColumns = 2,
}: PetsGridProps) {
  const riskAssessments = usePetsRiskAssessment(pets, recentDiagnostics)

  if (isLoading) {
    return (
      <div className='grid gap-4' style={{ gridTemplateColumns: `repeat(auto-fill, minmax(250px, 1fr))` }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className='h-64 bg-gray-200 rounded-lg animate-pulse' />
        ))}
      </div>
    )
  }

  if (!pets || pets.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-12 text-center'>
        <div className='text-4xl mb-3'>🐾</div>
        <h3 className='font-semibold text-lg mb-1'>Sin mascotas registradas</h3>
        <p className='text-sm text-gray-600 mb-4'>Añade tus mascotas para recibir recomendaciones personalizadas</p>
        {onAddPet && (
          <Button onClick={onAddPet}>
            <Plus className='mr-2 h-4 w-4' />
            Añadir mascota
          </Button>
        )}
      </div>
    )
  }

  // Separar mascotas por riesgo para mostrar las críticas primero
  const petsInRisk = pets
    .map((pet) => ({
      pet,
      assessment: riskAssessments.find((a) => a.petId === pet.id),
    }))
    .sort((a, b) => {
      const riskOrder = { CRITICAL: 0, DANGER: 1, WARNING: 2, SAFE: 3 }
      const aRisk = riskOrder[a.assessment?.currentSeverity || 'SAFE']
      const bRisk = riskOrder[b.assessment?.currentSeverity || 'SAFE']
      return aRisk - bRisk
    })

  return (
    <div className='space-y-4'>
      {/* Resumen de riesgos */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm'>
        {['CRITICAL', 'DANGER', 'WARNING', 'SAFE'].map((severity) => {
          const count = riskAssessments.filter((a) => a.currentSeverity === severity).length
          return (
            <div
              key={severity}
              className={`p-3 rounded-lg text-center ${
                severity === 'CRITICAL'
                  ? 'bg-red-50'
                  : severity === 'DANGER'
                    ? 'bg-orange-50'
                    : severity === 'WARNING'
                      ? 'bg-yellow-50'
                      : 'bg-green-50'
              }`}
            >
              <div className='font-semibold text-lg'>{count}</div>
              <div className='text-xs text-gray-600'>{severity}</div>
            </div>
          )
        })}
      </div>

      {/* Grid de mascotas */}
      <div className='grid gap-4' style={{ gridTemplateColumns: `repeat(auto-fill, minmax(250px, 1fr))` }}>
        {petsInRisk.map(({ pet, assessment }) => (
          <div key={pet.id} className='relative'>
            <PetCard
              pet={pet}
              riskLevel={assessment?.currentSeverity || 'SAFE'}
              onEdit={onEditPet}
              onDelete={onDeletePet}
            />

            {/* Badge flotante de riesgo */}
            {assessment && assessment.currentSeverity !== 'SAFE' && (
              <div
                className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs font-bold ${RISK_BADGE_COLORS[assessment.currentSeverity]} shadow-lg`}
              >
                <span>{RISK_ICONS[assessment.currentSeverity]}</span>
                <span>{assessment.currentSeverity}</span>
              </div>
            )}

            {/* Tooltip con factores de riesgo */}
            {assessment && assessment.riskFactors.length > 0 && (
              <div className='absolute bottom-2 right-2 group'>
                <div className='invisible group-hover:visible bg-gray-900 text-white text-xs rounded-lg p-2 max-w-xs z-10 shadow-lg'>
                  <p className='font-semibold mb-1'>Factores de riesgo:</p>
                  <ul className='list-disc list-inside space-y-1'>
                    {assessment.riskFactors.slice(0, 3).map((factor, idx) => (
                      <li key={idx}>{factor}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Botón para añadir mascota */}
        {onAddPet && (
          <div className='flex items-center justify-center p-4 border-2 border-dashed rounded-lg hover:bg-gray-50 transition-colors cursor-pointer' onClick={onAddPet}>
            <div className='text-center'>
              <Plus className='h-8 w-8 text-gray-400 mx-auto mb-2' />
              <p className='text-sm font-medium text-gray-600'>Añadir mascota</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
