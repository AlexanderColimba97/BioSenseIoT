'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useSensorData } from '@/hooks/use-sensor-data'
import { usePets } from '@/hooks/use-pets'
import { usePetsRiskAssessment } from '@/hooks/use-pet-risk'
import { useAiRecommendation } from '@/hooks/use-ai-recommendation'
import { DiagnosticResponse, Severity } from '@/lib/types'
import { AiRecommendationCard } from '@/components/iot/premium/cards/ai-recommendation-card'
import {
  RefreshCw,
  Cpu,
  PlusCircle,
  AlertTriangle,
  ShieldCheck,
  Wind,
  Flame,
  Waves,
  PawPrint,
  CircleDot,
  Clock3
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardViewProps {
  onNavigateToProfile?: () => void
  onNavigateToAlerts?: () => void
  onNavigateToRecommendations?: () => void
}

type DashboardLevel = 'GOOD' | 'MODERATE' | 'DANGER'

interface DashboardGlobalState {
  aqi: number
  level: DashboardLevel
  timestamp: string
}

interface DashboardSensorState {
  id: 'mq4' | 'mq7' | 'mq135'
  label: string
  unit: 'ppm'
  value: number
  max: number
}

interface DashboardDerivedState {
  global: DashboardGlobalState
  sensors: DashboardSensorState[]
  recommendation: string
  qualityLevel: 'NORMAL' | 'PRECAUCION' | 'PELIGRO'
  hasInconsistentData: boolean
}

const severityLevelMap: Record<Severity, DashboardLevel> = {
  LOW: 'GOOD',
  MEDIUM: 'MODERATE',
  HIGH: 'DANGER',
  CRITICAL: 'DANGER'
}

const severityQualityMap: Record<Severity, 'NORMAL' | 'PRECAUCION' | 'PELIGRO'> = {
  LOW: 'NORMAL',
  MEDIUM: 'PRECAUCION',
  HIGH: 'PELIGRO',
  CRITICAL: 'PELIGRO'
}

function formatTime(timestamp?: string): string {
  if (!timestamp) return 'Sincronizando...'
  try {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Hora no valida'
  }
}

function sanitizeSensorValue(value: unknown): { value: number; inconsistent: boolean } {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return { value: 0, inconsistent: true }
  }

  if (value < 0) {
    return { value: 0, inconsistent: true }
  }

  return { value, inconsistent: false }
}

function calculateAqi(mq4: number, mq7: number, mq135: number): number {
  const coScore = Math.min((mq7 / 100) * 120, 300)
  const ch4Score = Math.min((mq4 / 500) * 100, 300)
  const airScore = Math.min((mq135 / 300) * 100, 300)

  const weighted = coScore * 0.45 + ch4Score * 0.35 + airScore * 0.2
  return Math.max(0, Math.min(300, Math.round(weighted)))
}

function levelFromAqi(aqi: number): DashboardLevel {
  if (aqi <= 50) return 'GOOD'
  if (aqi <= 100) return 'MODERATE'
  return 'DANGER'
}

function deriveDashboardState(data: DiagnosticResponse | null): DashboardDerivedState | null {
  if (!data) return null

  const mq4Parsed = sanitizeSensorValue(data.mq4)
  const mq7Parsed = sanitizeSensorValue(data.mq7)
  const mq135Parsed = sanitizeSensorValue(data.mq135)
  const hasInconsistentData = mq4Parsed.inconsistent || mq7Parsed.inconsistent || mq135Parsed.inconsistent

  const aqi = calculateAqi(mq4Parsed.value, mq7Parsed.value, mq135Parsed.value)
  const level = severityLevelMap[data.severity] ?? levelFromAqi(aqi)
  const qualityLevel =
    severityQualityMap[data.severity] ??
    (level === 'GOOD' ? 'NORMAL' : level === 'MODERATE' ? 'PRECAUCION' : 'PELIGRO')

  return {
    global: {
      aqi,
      level,
      timestamp: data.timestamp
    },
    sensors: [
      { id: 'mq7', label: 'CO', unit: 'ppm', value: mq7Parsed.value, max: 100 },
      { id: 'mq4', label: 'CH4', unit: 'ppm', value: mq4Parsed.value, max: 500 },
      { id: 'mq135', label: 'Aire', unit: 'ppm', value: mq135Parsed.value, max: 300 }
    ],
    recommendation:
      data.recommendation?.trim() ||
      'Mantener ventilacion cruzada y revisar estado del dispositivo.',
    qualityLevel,
    hasInconsistentData
  }
}

function statusText(level: DashboardLevel): string {
  if (level === 'GOOD') return 'Aire Seguro'
  if (level === 'MODERATE') return 'Calidad en Observacion'
  return 'Riesgo Alto'
}

function statusPill(level: DashboardLevel): string {
  if (level === 'GOOD') return 'GOOD'
  if (level === 'MODERATE') return 'WARNING'
  return 'DANGER'
}

function sensorTone(percent: number): 'safe' | 'warn' | 'danger' {
  if (percent >= 80) return 'danger'
  if (percent >= 50) return 'warn'
  return 'safe'
}

function compactRecommendations(recommendation: string): string[] {
  const rows = recommendation
    .split(/\r?\n/)
    .map((row) => row.replace(/^\s*\d+[.)-]?\s*/, '').trim())
    .filter(Boolean)

  if (rows.length > 0) return rows.slice(0, 3)

  return [
    'Abrir ventanas para ventilacion cruzada.',
    'Evitar exposicion prolongada al area.',
    'Monitorear lecturas durante los proximos minutos.'
  ]
}

export function DashboardView({ onNavigateToProfile }: DashboardViewProps) {
  const { data, isLoading, isError, isActivated, refresh } = useSensorData()
  const { pets } = usePets()
  const riskAssessments = usePetsRiskAssessment(pets, data ? [data] : undefined)
  const state = useMemo(() => deriveDashboardState(data), [data])
  
  // Hook para recomendaciones IA - solo activo si hay alerta roja (DANGER)
  const isRedAlert = state?.global.level === 'DANGER'
  const aiRec = useAiRecommendation({ isRedAlert })

  if (isLoading) return <DashboardSkeleton />

  if (isError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <RefreshCw className="h-12 w-12 text-red-500" />
        <h3 className="font-bold text-lg text-slate-800">Error de conexion</h3>
        <p className="text-sm text-slate-500">No pudimos consultar /diagnostics/latest. Verifica backend y red.</p>
        <Button variant="outline" onClick={() => void refresh()}>
          Reintentar
        </Button>
      </div>
    )
  }

  if (!isActivated) {
    return (
      <div className="p-4 space-y-6 animate-in fade-in duration-700">
        <Card className="border-dashed border-2 bg-primary/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-6">
            <div className="p-6 bg-white rounded-full shadow-inner shadow-primary/10">
              <Cpu size={48} className="text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Bienvenido a BioSense</h3>
              <p className="text-sm text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                Tu sistema de monitoreo esta listo. Solo falta vincular tu hardware para empezar.
              </p>
            </div>
            <Button
              className="h-14 px-8 text-base font-bold shadow-xl shadow-primary/20 rounded-2xl gap-2 active:scale-95 transition-transform"
              onClick={onNavigateToProfile}
            >
              <PlusCircle size={20} />
              ACTIVAR MI BIOSENSE
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <RefreshCw className="h-12 w-12 text-primary animate-spin" />
        <h3 className="font-bold text-lg text-slate-800">Dispositivo vinculado sin lecturas</h3>
        <p className="text-sm text-slate-500">Esperando datos reales desde el ESP32 en /diagnostics/latest.</p>
        <Button variant="outline" onClick={() => void refresh()}>
          Forzar actualizacion
        </Button>
      </div>
    )
  }

  const petsAtRisk = riskAssessments.filter((assessment) => assessment.isAtRisk)
  const recommendations = compactRecommendations(state.recommendation)

  const levelTheme =
    state.global.level === 'GOOD'
      ? {
          card: 'from-emerald-500 to-teal-500',
          badge: 'bg-emerald-100/20 border-emerald-100/40 text-white'
        }
      : state.global.level === 'MODERATE'
        ? {
            card: 'from-amber-500 to-orange-500',
            badge: 'bg-amber-100/20 border-amber-100/40 text-white'
          }
        : {
            card: 'from-red-500 to-rose-600',
            badge: 'bg-red-100/20 border-red-100/40 text-white'
          }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-3 md:space-y-4 pb-24">
      {state.hasInconsistentData && (
        <Card className="border border-amber-200 bg-amber-50">
          <CardContent className="p-3 md:p-4 flex items-start gap-2 text-amber-900">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-xs md:text-sm leading-relaxed">Se detectaron datos inconsistentes y se normalizaron automaticamente.</p>
          </CardContent>
        </Card>
      )}

      <Card className={cn('overflow-hidden border-0 shadow-lg text-white bg-gradient-to-br rounded-2xl md:rounded-3xl', levelTheme.card)}>
        <CardContent className="p-5 md:p-6 lg:p-8 space-y-4 md:space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm uppercase tracking-widest text-white/80 font-semibold">Monitoreo Ambiental</p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-black leading-tight mt-1 tracking-tight">{statusText(state.global.level)}</h2>
            </div>
            <span className={cn('text-xs md:text-sm font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-full border', levelTheme.badge)}>
              {statusPill(state.global.level)}
            </span>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-white/80 text-xs md:text-sm font-medium">AQI</p>
              <p className="text-5xl md:text-6xl lg:text-7xl font-black leading-none tracking-tighter">{state.global.aqi}</p>
            </div>
            <div className="text-right text-xs md:text-sm text-white/90">
              <p className="font-semibold">Sistema activo</p>
              <p className="flex items-center gap-1 justify-end mt-1.5">
                <Clock3 className="h-3 w-3 md:h-4 md:w-4" />
                {formatTime(state.global.timestamp)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl">
        <CardContent className="p-4 md:p-5 grid grid-cols-3 gap-3 md:gap-4">
          {state.sensors.map((sensor) => {
            const tone = sensorTone((sensor.value / sensor.max) * 100)
            const icon = sensor.id === 'mq7' ? Wind : sensor.id === 'mq4' ? Flame : Waves
            const Icon = icon
            const colorClass =
              tone === 'danger'
                ? 'text-red-600'
                : tone === 'warn'
                  ? 'text-amber-600'
                  : 'text-emerald-600'

            return (
              <div key={sensor.id} className="rounded-xl border border-slate-100 bg-slate-50 px-2.5 md:px-3 py-3 md:py-4 text-center">
                <div className="mx-auto mb-2 flex h-8 md:h-9 w-8 md:w-9 items-center justify-center rounded-full bg-white border border-slate-200 shadow-xs">
                  <Icon className={cn('h-4 w-4 md:h-5 md:w-5', colorClass)} />
                </div>
                <p className="text-xs md:text-sm text-slate-500 uppercase tracking-wide font-semibold">{sensor.label}</p>
                <p className="text-xl md:text-2xl font-extrabold text-slate-900 leading-none mt-1.5">{sensor.value.toFixed(1)}</p>
                <p className="text-xs text-slate-500 mt-1.5">{sensor.unit}</p>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="border border-emerald-200 bg-emerald-50/70 shadow-sm rounded-2xl">
        <CardContent className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-3 md:gap-4">
            <div className="space-y-2 flex-1">
              <p className="flex items-center gap-2 text-emerald-700 text-xs md:text-sm font-bold uppercase tracking-widest">
                <CircleDot className="h-3 w-3 flex-shrink-0" />
                {state.global.level === 'GOOD' ? 'SAFE' : state.global.level === 'MODERATE' ? 'WARNING' : 'DANGER'}
              </p>
              <p className="text-sm md:text-base font-semibold text-slate-900 leading-snug">
                {petsAtRisk.length > 0
                  ? `Atencion: ${petsAtRisk.length} mascota(s) en riesgo.`
                  : 'Sin riesgo critico para mascotas registradas.'}
              </p>
            </div>
            <div className="rounded-full bg-white border border-emerald-200 p-2.5 md:p-3 flex-shrink-0">
              <PawPrint className="h-4 w-4 md:h-5 md:w-5 text-emerald-700" />
            </div>
          </div>

          <div className="mt-3 md:mt-4 space-y-2 md:space-y-2.5">
            {recommendations.map((item) => (
              <p key={item} className="text-xs md:text-sm text-slate-700 flex items-start gap-2">
                <ShieldCheck className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 flex-shrink-0 text-emerald-700" />
                <span className="leading-relaxed">{item}</span>
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tarjeta de Recomendación IA - Solo visible cuando severity === "DANGER" */}
      {isRedAlert && (
        <div className="space-y-2">
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
        </div>
      )}

      <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl">
        <CardContent className="p-4 md:p-5 space-y-3 md:space-y-4">
          {state.sensors.map((sensor) => {
            const percent = Math.min((sensor.value / sensor.max) * 100, 100)
            const tone = sensorTone(percent)

            const barClass =
              tone === 'danger'
                ? 'bg-red-500'
                : tone === 'warn'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'

            const deltaText = tone === 'danger' ? '+ Riesgo' : tone === 'warn' ? '+ Moderado' : '- Estable'
            const deltaClass =
              tone === 'danger'
                ? 'text-red-600'
                : tone === 'warn'
                  ? 'text-amber-600'
                  : 'text-emerald-600'

            return (
              <div key={sensor.id} className="space-y-1.5 md:space-y-2">
                <div className="flex items-center justify-between text-xs md:text-sm">
                  <p className="font-semibold text-slate-800 tracking-wide">{sensor.label}</p>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{sensor.value.toFixed(1)} {sensor.unit}</p>
                    <p className={cn('text-[11px] md:text-xs font-medium', deltaClass)}>{deltaText}</p>
                  </div>
                </div>
                <div className="h-2.5 md:h-3 rounded-full bg-slate-100 overflow-hidden shadow-xs">
                  <div className={cn('h-full transition-all duration-500 rounded-full', barClass)} style={{ width: `${percent}%` }} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="p-3 space-y-3">
      <Skeleton className="h-48 w-full rounded-3xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-36 rounded-2xl" />
    </div>
  )
}
