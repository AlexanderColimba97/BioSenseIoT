'use client'

import { EnrichedAlert } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Heart, TrendingUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { memo, useState } from 'react'

interface AlertCardEnhancedProps {
  alert: EnrichedAlert
  onDismiss?: () => void
  onViewDetails?: () => void
  expanded?: boolean
}

const severityConfig = {
  CRITICAL: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    badge: 'bg-red-600 text-white',
    icon: 'text-red-600',
    label: 'CRÍTICA',
    lightBg: 'bg-red-100/50',
  },
  HIGH: {
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    badge: 'bg-orange-600 text-white',
    icon: 'text-orange-600',
    label: 'ALTA',
    lightBg: 'bg-orange-100/50',
  },
  MEDIUM: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    badge: 'bg-yellow-600 text-white',
    icon: 'text-yellow-600',
    label: 'MEDIA',
    lightBg: 'bg-yellow-100/50',
  },
  LOW: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    badge: 'bg-blue-600 text-white',
    icon: 'text-blue-600',
    label: 'BAJA',
    lightBg: 'bg-blue-100/50',
  },
}

/**
 * Tarjeta de alerta mejorada
 * Muestra diagnósticos con contexto de mascotas y sensores
 */
function AlertCardEnhancedComponent({
  alert,
  onDismiss,
  onViewDetails,
  expanded = false,
}: AlertCardEnhancedProps) {
  const [isExpanded, setIsExpanded] = useState(expanded)
  const config = severityConfig[alert.severity]

  if (alert.resolved) {
    return (
      <Card className="p-3 border-green-200 bg-green-50">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-800 font-medium">Alerta resuelta</span>
        </div>
      </Card>
    )
  }

  const timestamp = new Date(alert.timestamp).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <Card
      className={cn(
        'p-4 border-2 transition-all cursor-pointer hover:shadow-md',
        config.bg,
        config.border
      )}
    >
      {/* Header Section */}
      <div
        className="flex items-start justify-between gap-3 mb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3 flex-1">
          <AlertCircle className={cn('w-6 h-6 flex-shrink-0 mt-0.5', config.icon)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-sm leading-snug flex-1">{alert.message}</h3>
              <Badge className={config.badge}>{config.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{timestamp}</p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 flex-shrink-0 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <>
          {/* Affected Pets */}
          {alert.affectedPets.length > 0 && (
            <div className={cn('mb-3 p-3 rounded', config.lightBg)}>
              <p className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-1">
                <Heart className="w-4 h-4" />
                Mascotas afectadas
              </p>
              <div className="flex flex-wrap gap-1">
                {alert.affectedPets.map((pet) => (
                  <Badge key={pet.id} variant="secondary" className="gap-1">
                    {pet.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Sensor Values */}
          <div className={cn('mb-3 p-3 rounded', config.lightBg)}>
            <p className="font-medium text-sm text-muted-foreground mb-2">
              Niveles de sensores
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white/50 p-2 rounded">
                <p className="text-muted-foreground">Metano</p>
                <p className="font-bold">{alert.sensorValues.mq4.toFixed(1)} ppm</p>
              </div>
              <div className="bg-white/50 p-2 rounded">
                <p className="text-muted-foreground">CO</p>
                <p className="font-bold">{alert.sensorValues.mq7.toFixed(1)} ppm</p>
              </div>
              <div className="bg-white/50 p-2 rounded">
                <p className="text-muted-foreground">Calidad Aire</p>
                <p className="font-bold">{alert.sensorValues.mq135.toFixed(1)}</p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {alert.recommendations.length > 0 && (
            <div className={cn('mb-3 p-3 rounded', config.lightBg)}>
              <p className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Recomendaciones
              </p>
              <ul className="space-y-1 text-sm">
                {alert.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-muted-foreground flex gap-2">
                    <span className="flex-shrink-0">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onViewDetails}
            >
              Ver detalles
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
            >
              Descartar
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}

export const AlertCardEnhanced = memo(AlertCardEnhancedComponent)
