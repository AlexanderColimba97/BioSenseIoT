'use client'

import { usePets } from '@/hooks/use-pets'
import { useDiagnostics } from '@/hooks/use-diagnostics'
import { useAlertFilter } from '@/hooks/use-alert-filter'
import { PetCard } from './cards/pet-card'
import { AlertCardEnhanced } from './cards/alert-card-enhanced'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, Plus, Heart } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'

interface IntegratedPetAndAlertsViewProps {
  onNavigateToProfile?: () => void
  onCreatePet?: () => void
}

/**
 * Vista integrada de mascotas + alertas
 * Ejemplo de cómo integrar todos los hooks y componentes
 */
export function IntegratedPetAndAlertsView({
  onNavigateToProfile,
  onCreatePet,
}: IntegratedPetAndAlertsViewProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])

  // Mascotas (sin polling automático)
  const {
    pets,
    isLoading: petsLoading,
    isEmpty: noPets,
    createPet,
    removePet,
  } = usePets()

  // Diagnósticos (polling cada 10s)
  const { diagnostic, isCritical, isLoading: diagLoading } = useDiagnostics(10000)

  // Alertas filtradas y categorizadas
  const { criticalAlerts, warningAlerts, hasWarning } = useAlertFilter()

  /**
   * Mapear riesgo a mascotas basado en diagnóstico actual
   */
  const petRiskMap = new Map<
    number,
    'SAFE' | 'WARNING' | 'DANGER' | 'CRITICAL'
  >()

  if (diagnostic && pets) {
    const severity = diagnostic.severity
    const riskMapping: Record<
      string,
      'SAFE' | 'WARNING' | 'DANGER' | 'CRITICAL'
    > = {
      LOW: 'SAFE',
      MEDIUM: 'WARNING',
      HIGH: 'DANGER',
      CRITICAL: 'CRITICAL',
    }

    pets.forEach((pet) => {
      petRiskMap.set(pet.id || 0, riskMapping[severity] || 'SAFE')
    })
  }

  /**
   * Filtrar alertas no descartadas
   */
  const activeAlerts = [
    ...criticalAlerts.filter((a) => !dismissedAlerts.includes(a.id)),
    ...warningAlerts.filter((a) => !dismissedAlerts.includes(a.id)),
  ]

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      {/* ALERTS SECTION */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">Alertas Activas</h2>
            {activeAlerts.length > 0 && (
              <Badge
                variant={isCritical ? 'destructive' : 'secondary'}
                className="ml-2"
              >
                {activeAlerts.length}
              </Badge>
            )}
          </div>
          {isCritical && (
            <div className="flex items-center gap-1 text-sm text-red-600 font-medium">
              <AlertCircle className="w-4 h-4" />
              ¡Crítico!
            </div>
          )}
        </div>

        <div className="space-y-3">
          {/* Critical Alerts */}
          {criticalAlerts
            .filter((a) => !dismissedAlerts.includes(a.id))
            .map((alert) => (
              <AlertCardEnhanced
                key={alert.id}
                alert={alert}
                expanded={true}
                onDismiss={() => setDismissedAlerts([...dismissedAlerts, alert.id])}
                onViewDetails={() => {
                  console.log('View details:', alert)
                }}
              />
            ))}

          {/* Warning Alerts */}
          {warningAlerts
            .filter((a) => !dismissedAlerts.includes(a.id))
            .map((alert) => (
              <AlertCardEnhanced
                key={alert.id}
                alert={alert}
                onDismiss={() => setDismissedAlerts([...dismissedAlerts, alert.id])}
                onViewDetails={() => {
                  console.log('View details:', alert)
                }}
              />
            ))}

          {/* Empty State */}
          {activeAlerts.length === 0 && !diagLoading && (
            <Card className="p-6 bg-green-50 border-green-200">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="text-green-600 text-4xl">✓</div>
                <p className="text-sm text-green-800 font-medium">
                  Todo está normal - Sin alertas activas
                </p>
              </div>
            </Card>
          )}

          {/* Loading */}
          {diagLoading && activeAlerts.length === 0 && (
            <Skeleton className="h-24 rounded-lg" />
          )}
        </div>
      </section>

      {/* PETS SECTION */}
      <section className="pt-4 border-t">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-bold">Mis Mascotas</h2>
            {pets && (
              <Badge variant="secondary">{pets.length}</Badge>
            )}
          </div>
          <Button
            size="sm"
            onClick={onCreatePet}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </Button>
        </div>

        {/* Loading State */}
        {petsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!petsLoading && noPets && (
          <Card className="p-6 bg-muted/30 border-dashed">
            <div className="flex flex-col items-center justify-center gap-3">
              <Heart className="w-8 h-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No tienes mascotas registradas aún
              </p>
              <Button onClick={onCreatePet} variant="outline" size="sm">
                Registrar tu primera mascota
              </Button>
            </div>
          </Card>
        )}

        {/* Pets Grid */}
        {!petsLoading && !noPets && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pets?.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                riskLevel={petRiskMap.get(pet.id || 0) || 'SAFE'}
                onEdit={() => {
                  console.log('Edit pet:', pet)
                  // Aquí abriría modal de edición
                }}
                onDelete={async (petId) => {
                  if (window.confirm('¿Eliminar esta mascota?')) {
                    try {
                      await removePet(petId)
                    } catch (err) {
                      console.error('Error deleting pet:', err)
                      alert('Error al eliminar mascota')
                    }
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* INFO CARD */}
      <section className="pt-4 border-t">
        <Card className="p-4 bg-muted/50">
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> Las alertas se actualizan automáticamente cada 10 segundos
            basadas en las lecturas de sensores. El nivel de riesgo para cada mascota se calcula
            a partir del diagnóstico actual.
          </p>
        </Card>
      </section>
    </div>
  )
}
