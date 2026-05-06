'use client'

import { motion } from 'framer-motion'
// import { Zap, Clock, Badge, AlertTriangle } from 'lucide-react'
import { Zap, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AiRecommendationParsed } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface AiRecommendationCardProps {
    recommendation: AiRecommendationParsed
    onClick?: () => void
}

/**
 * Tarjeta de recomendación IA generada por Ollama
 * Solo visible cuando severity === "DANGER"
 * Borde y fondo rojos para consistencia visual
 */
export function AiRecommendationCard({
    recommendation,
    onClick
}: AiRecommendationCardProps) {
    const confidencePercent = Math.round(recommendation.confidence * 100)
    const processingSeconds = (recommendation.processingTimeMs / 1000).toFixed(2)

    // Formato de timestamp legible
    const createdDate = new Date(recommendation.createdAt)
    const timeStr = createdDate.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })

    // Color del badge de estado
    const statusColors = {
        SUCCESS: 'bg-emerald-100 text-emerald-800',
        TIMEOUT: 'bg-yellow-100 text-yellow-800',
        ERROR: 'bg-red-100 text-red-800'
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
        >
            <Card className="border-l-4 border-l-red-500 bg-red-50 border-red-200 overflow-hidden">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1 p-2 rounded-md bg-white border border-red-200">
                                <Zap className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-base text-red-900">
                                    {recommendation.title}
                                </CardTitle>
                                <p className="text-xs text-red-700 mt-1">
                                    Recomendación generada por IA • {timeStr}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Texto principal */}
                    <p className="text-sm text-slate-700 leading-relaxed">
                        {recommendation.text}
                    </p>

                    <Separator className="bg-red-200" />

                    {/* Acciones numeradas */}
                    {recommendation.actionsList && recommendation.actionsList.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-red-900 mb-2">
                                ACCIONES RECOMENDADAS
                            </h4>
                            <ol className="space-y-2">
                                {recommendation.actionsList.map((action, idx) => (
                                    <li
                                        key={idx}
                                        className="flex gap-3 text-sm text-slate-700"
                                    >
                                        <span className="font-semibold text-red-600 flex-shrink-0">
                                            {idx + 1}.
                                        </span>
                                        <span>{action}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    <Separator className="bg-red-200" />

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        {/* Confianza */}
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                'px-2 py-1 rounded-full text-xs font-medium',
                                confidencePercent >= 80
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : confidencePercent >= 60
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-amber-100 text-amber-800'
                            )}>
                                {confidencePercent}% confianza
                            </span>
                        </div>

                        {/* Estado */}
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                'px-2 py-1 rounded-full text-xs font-medium',
                                statusColors[recommendation.status]
                            )}>
                                {recommendation.status === 'SUCCESS' ? '✓ Exitoso' :
                                    recommendation.status === 'TIMEOUT' ? '⏱ Timeout' :
                                        '✗ Error'}
                            </span>
                        </div>

                        {/* Tiempo procesamiento */}
                        <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="h-3 w-3" />
                            <span>{processingSeconds}s</span>
                        </div>

                        {/* ID */}
                        <div className="text-slate-500 text-right">
                            ID: {recommendation.id}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
