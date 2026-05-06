"use client"

import { useEffect, useState } from "react"
import { 
  Lightbulb, 
  Sparkles,
  AlertTriangle,
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useAiRecommendation } from "@/hooks/use-ai-recommendation"
import { useDiagnostics } from "@/hooks/use-diagnostics"
import { getRecentRecommendations } from "@/lib/ai-recommendation-service"
import { AiRecommendationCard } from "./cards/ai-recommendation-card"
import { AiRecommendation } from "@/lib/types"

interface RecommendationsViewProps {
  onNavigateToAlerts?: () => void
}

/**
 * Vista de recomendaciones IA
 * Muestra la última recomendación y el historial
 */
export function RecommendationsView({ onNavigateToAlerts }: RecommendationsViewProps) {
  // Obtener diagnóstico actual para saber si hay alerta roja
  const { data: diagnostic } = useDiagnostics()
  const isRedAlert = diagnostic?.riskLevel === "DANGER"
  
  // Hook para recomendación IA actual
  const aiRec = useAiRecommendation({ isRedAlert })
  
  // Estado para historial de recomendaciones
  const [recent, setRecent] = useState<AiRecommendation[]>([])
  const [recentLoading, setRecentLoading] = useState(false)
  const [recentError, setRecentError] = useState<Error | null>(null)

  // Cargar historial al montar
  useEffect(() => {
    const loadRecent = async () => {
      setRecentLoading(true)
      setRecentError(null)
      try {
        const data = await getRecentRecommendations(10)
        // Filtrar para no mostrar la más reciente dos veces
        const filtered = data.filter(
          r => !aiRec.recommendation || r.id !== aiRec.recommendation.id
        )
        setRecent(filtered)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setRecentError(error)
        console.error('Error loading recent recommendations:', error)
      } finally {
        setRecentLoading(false)
      }
    }

    if (isRedAlert || !isRedAlert) {
      // Cargar historial siempre (no depende de isRedAlert)
      loadRecent()
    }
  }, [isRedAlert, aiRec.recommendation?.id])

  // Empty state
  if (!isRedAlert && !aiRec.hasRecommendation && recent.length === 0 && !aiRec.isLoading && !recentLoading) {
    return (
      <div className="pb-24">
        <div className="p-4 pb-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Recomendaciones IA</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Analisis inteligente de tu calidad del aire
          </p>
        </div>

        <div className="p-4 flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
          <Lightbulb className="h-12 w-12 text-amber-500" />
          <h3 className="font-bold text-lg text-slate-800">Sin recomendaciones</h3>
          <p className="text-sm text-slate-500 max-w-[240px]">
            No hay recomendaciones de IA disponibles. Aparecerán automaticamente cuando se detecte una alerta roja (DANGER).
          </p>
          <Button variant="outline" onClick={onNavigateToAlerts}>
            Ver alertas
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Recomendaciones IA</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Analisis inteligente de tu calidad del aire
        </p>
      </div>

      {/* Latest Recommendation Section */}
      <div className="p-4 space-y-4">
        {isRedAlert && (
          <>
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-red-600" />
                Recomendación Actual
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Basada en tu lectura de sensores en tiempo real
              </p>
            </div>

            {aiRec.isLoading && (
              <Skeleton className="h-64 w-full rounded-2xl" />
            )}

            {aiRec.hasRecommendation && aiRec.recommendation && (
              <AiRecommendationCard recommendation={aiRec.recommendation} />
            )}

            {aiRec.error && (
              <Card className="border border-red-300 bg-red-50">
                <CardContent className="p-3 md:p-4 flex items-start gap-2 text-red-900">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-xs md:text-sm leading-relaxed">
                    Error generando recomendación IA: {aiRec.error.message}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Recent History Section */}
      {recent.length > 0 && (
        <div className="p-4 space-y-4">
          <div>
            <h2 className="font-semibold text-lg">Historial Reciente</h2>
            <p className="text-sm text-slate-500 mt-1">
              Últimas {recent.length} recomendaciones
            </p>
          </div>

          <div className="space-y-3">
            {recent.map((rec) => (
              <Card key={rec.id} className="border-slate-200 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <h3 className="font-semibold text-sm text-slate-900 line-clamp-1">
                    {rec.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(rec.createdAt).toLocaleString('es-ES')}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 line-clamp-2">
                    {rec.text}
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-xs">
                    <span className={cn(
                      'px-2 py-1 rounded-full font-medium',
                      rec.status === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rec.status === 'TIMEOUT'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    )}>
                      {rec.status === 'SUCCESS' ? '✓' : rec.status === 'TIMEOUT' ? '⏱' : '✗'} {rec.status}
                    </span>
                    <span className="text-slate-500">
                      {Math.round(rec.confidence * 100)}% confianza
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Loading state for history */}
      {recentLoading && (
        <div className="p-4 space-y-4">
          <Skeleton className="h-6 w-40 rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {/* Error loading history */}
      {recentError && (
        <div className="p-4">
          <Card className="border border-amber-300 bg-amber-50">
            <CardContent className="p-3 md:p-4 flex items-start gap-2 text-amber-900">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs md:text-sm leading-relaxed">
                Error cargando historial: {recentError.message}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
