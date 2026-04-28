'use client'

import { PetProfile } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, Edit2, Trash2, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { memo } from 'react'

interface PetCardProps {
  pet: PetProfile
  riskLevel?: 'SAFE' | 'WARNING' | 'DANGER' | 'CRITICAL'
  onEdit?: (pet: PetProfile) => void
  onDelete?: (petId: number) => void
  onClick?: () => void
}

const riskColors = {
  SAFE: 'bg-green-100 text-green-800 border-green-300',
  WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  DANGER: 'bg-orange-100 text-orange-800 border-orange-300',
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
}

const riskLabels = {
  SAFE: '✓ Seguro',
  WARNING: '⚠️ Advertencia',
  DANGER: '⚠️ Peligro',
  CRITICAL: '🔴 Crítico',
}

/**
 * Tarjeta visual para una mascota
 * Muestra información y nivel de riesgo
 * Memoizada para evitar re-renders innecesarios
 */
function PetCardComponent({
  pet,
  riskLevel = 'SAFE',
  onEdit,
  onDelete,
  onClick,
}: PetCardProps) {
  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-all hover:shadow-lg border',
        riskLevel === 'CRITICAL' && 'border-red-400 bg-red-50',
        riskLevel === 'DANGER' && 'border-orange-400 bg-orange-50',
        riskLevel === 'WARNING' && 'border-yellow-400 bg-yellow-50',
        riskLevel === 'SAFE' && 'border-gray-200'
      )}
      onClick={onClick}
    >
      {/* Header with Pet Info */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="p-2 bg-pink-100 rounded-full">
            <Heart className="w-5 h-5 text-pink-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{pet.name}</h3>
            <p className="text-xs text-muted-foreground">
              {pet.species}
              {pet.breed && ` • ${pet.breed}`}
            </p>
          </div>
        </div>
        {riskLevel !== 'SAFE' && (
          <AlertCircle
            className={cn(
              'w-5 h-5 flex-shrink-0',
              riskLevel === 'CRITICAL' && 'text-red-600',
              riskLevel === 'DANGER' && 'text-orange-600',
              riskLevel === 'WARNING' && 'text-yellow-600'
            )}
          />
        )}
      </div>

      {/* Risk Badge */}
      <div className="mb-3">
        <Badge className={riskColors[riskLevel]}>
          {riskLabels[riskLevel]}
        </Badge>
      </div>

      {/* Pet Info Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        {pet.ageYears !== undefined && (
          <div className="bg-muted/50 p-2 rounded">
            <p className="text-muted-foreground">Edad</p>
            <p className="font-medium">{pet.ageYears} años</p>
          </div>
        )}
        {pet.weightKg !== undefined && (
          <div className="bg-muted/50 p-2 rounded">
            <p className="text-muted-foreground">Peso</p>
            <p className="font-medium">{pet.weightKg} kg</p>
          </div>
        )}
      </div>

      {/* Respiratory Risk Display */}
      {pet.respiratoryRisk && pet.respiratoryRisk !== 'LOW' && (
        <div className="mb-3 text-xs bg-muted/70 p-2 rounded border-l-2 border-orange-300">
          <p className="text-muted-foreground font-medium">Riesgo respiratorio</p>
          <p className="font-semibold text-orange-700">{pet.respiratoryRisk}</p>
        </div>
      )}

      {/* Vulnerabilities */}
      {pet.vulnerabilities && (
        <div className="mb-3 text-xs">
          <p className="text-muted-foreground text-xs mb-1">Factores de riesgo</p>
          <p className="text-sm">{pet.vulnerabilities}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4 pt-3 border-t">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation()
            onEdit?.(pet)
          }}
        >
          <Edit2 className="w-4 h-4 mr-1" />
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={(e) => {
            e.stopPropagation()
            if (pet.id) {
              onDelete?.(pet.id)
            }
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}

export const PetCard = memo(PetCardComponent)
