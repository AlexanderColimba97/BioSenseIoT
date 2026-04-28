'use client'

import { memo, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '../status-indicator'
import { GaugeChart } from '../gauge-chart'
import { AlertSummary, AlertSeverity } from '../alert-summary'
import { DiagnosticResponse, Severity } from '@/lib/types'
import { Clock, RefreshCw, Cpu, PlusCircle, AlertTriangle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useSensorData } from '@/hooks/use-sensor-data'
import { usePets } from '@/hooks/use-pets'
import { usePetsRiskAssessment } from '@/hooks/use-pet-risk'
import { PetRiskIndicator } from '../pet-risk-indicator'

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
  diagnosis: string
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

const levelStyles: Record<DashboardLevel, { panel: string; chip: string }> = {
  GOOD: {
    panel: 'bg-emerald-50 text-emerald-900',
    chip: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  MODERATE: {
    panel: 'bg-amber-50 text-amber-900',
    chip: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  DANGER: {
    panel: 'bg-red-50 text-red-900',
    chip: 'bg-red-100 text-red-800 border-red-200'
  }
}

/**
 * Parsea recomendación del backend a AlertSummary
 * Extrae severidad, mensaje corto y acciones máximo 3
 */
function parseRecommendationToAlert(
  recommendation: string
): { severity: AlertSeverity; message: string; actions: string[] } {
  const text = (recommendation || '').toLowerCase().trim()

  // Detectar severidad por keywords
  if (text.includes('crítico') || text.includes('peligro') || text.includes('riesgo alto')) {
    return {
      severity: 'CRITICAL',
      message: 'Riesgo crítico para mascotas',
      actions: [
        'Evacuar el área inmediatamente',
        'Ventilar todos los espacios',
        'Revisar sistema de sensores'
      ]
    }
  }

  if (text.includes('alto') || text.includes('grave') || text.includes('evitar exposición')) {
    return {
      severity: 'DANGER',
      message: 'Riesgo elevado para mascotas sensibles',
      actions: ['Ventilar el área', 'Reducir tiempo de exposición', 'Monitorear a mascotas']
    }
  }

  if (
    text.includes('moderado') ||
    text.includes('precaución') ||
    text.includes('revisar') ||
    text.includes('mejorar ventilación')
  ) {
    return {
      severity: 'WARNING',
      message: 'Riesgo leve para mascotas sensibles',
      actions: ['Mejorar ventilación', 'Evitar exposición prolongada']
    }
  }

  // Por defecto: safe
  return {
    severity: 'SAFE',
    message: 'Condiciones óptimas para mascotas',
    actions: ['Continuar con actividades normales', 'Mantener ventilación adecuada']
  }
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
  const qualityLevel = severityQualityMap[data.severity] ?? (level === 'GOOD' ? 'NORMAL' : level === 'MODERATE' ? 'PRECAUCION' : 'PELIGRO')

  return {
    global: {
      aqi,
      level,
      timestamp: data.timestamp
    },
    sensors: [
      { id: 'mq7', label: 'CO', unit: 'ppm', value: mq7Parsed.value, max: 100 },
      { id: 'mq4', label: 'CH4', unit: 'ppm', value: mq4Parsed.value, max: 500 },
      { id: 'mq135', label: 'Air Quality', unit: 'ppm', value: mq135Parsed.value, max: 300 }
    ],
    recommendation: data.recommendation?.trim() || 'Mantener ventilacion cruzada y revisar estado del dispositivo.',
    diagnosis: data.diagnosticText?.trim() || 'Diagnostico sin descripcion disponible.',
    qualityLevel,
    hasInconsistentData
  }
}

const SensorProgress = memo(function SensorProgress({ sensor }: { sensor: DashboardSensorState }) {
  const ratio = Math.min((sensor.value / sensor.max) * 100, 100)
  const barClass = ratio >= 80 ? 'bg-red-500' : ratio >= 50 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/80">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between text-[10px] sm:text-xs gap-2">
          <span className="font-bold tracking-wide uppercase text-slate-600 truncate">{sensor.label}</span>
          <span className="text-slate-500">max {sensor.max} {sensor.unit}</span>
        </div>
        <div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums leading-none">
            {sensor.value.toFixed(1)}
          </p>
          <p className="text-xs text-slate-500 mt-1">{sensor.unit}</p>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div className={cn('h-full transition-all duration-500', barClass)} style={{ width: `${ratio}%` }} />
        </div>
      </CardContent>
    </Card>
  )
})

/**
 * DASHBOARD REORGANIZADO EN 4 BLOQUES:
 * A. Estado Global + AQI
 * B. AlertSummary (reemplazo del texto largo)
 * C. Métricas de Sensores
 * D. Gráficas + Estado de mascotas
 */
export function DashboardView({ onNavigateToProfile, onNavigateToAlerts }: DashboardViewProps) {
  const { data, isLoading, isError, isActivated, refresh } = useSensorData()
  const { pets, isLoading: petsLoading } = usePets()
  const riskAssessments = usePetsRiskAssessment(pets, data ? [data] : undefined)
  const state = useMemo(() => deriveDashboardState(data), [data])

  if (isLoading) return <DashboardSkeleton />

  if (isError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <RefreshCw className="h-12 w-12 text-red-500" />
        <h3 className="font-bold text-lg text-slate-800">Error de conexión</h3>
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
                Tu sistema de monitoreo está listo. Solo falta vincular tu hardware para empezar.
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
          Forzar actualización
        </Button>
      </div>
    )
  }

  const style = levelStyles[state.global.level]
  const hasLiveTimestamp = Boolean(state.global.timestamp)
  const petsAtRisk = riskAssessments.filter((a) => a.isAtRisk)
  const alert = parseRecommendationToAlert(state.recommendation)

  return (
    <div className="p-4 space-y-4 animate-in slide-in-from-bottom-2 duration-500">
      {/* ===== BLOQUE A: ESTADO GLOBAL ===== */}
      {state.hasInconsistentData && (
        <Card className="border border-amber-200 bg-amber-50">
          <CardContent className="p-3 flex items-start gap-2 text-amber-900">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <p className="text-xs">
              Se detectaron datos inconsistentes. Se aplico saneamiento para evitar valores invalidos.
            </p>
          </CardContent>
        </Card>
      )}

      {petsAtRisk.length > 0 && (
        <Card className="border border-orange-200 bg-orange-50">
          <CardContent className="p-3 flex items-start gap-2 text-orange-900">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-semibold">Mascotas en riesgo: {petsAtRisk.map((a) => a.petName).join(', ')}</p>
              <p className="mt-1 opacity-80">Las condiciones ambientales pueden afectar a tus mascotas</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card
        className={cn(
          'relative overflow-hidden border-none shadow-2xl transition-all duration-1000 rounded-3xl',
          style.panel
        )}
      >
        <div className="absolute -top-20 -right-16 h-48 w-48 rounded-full bg-white/30 blur-2xl" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest opacity-60">Estado global</span>
            <StatusBadge level={state.qualityLevel} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold opacity-80">AQI: {state.global.aqi}</p>
            <span className={cn('text-xs font-bold px-2 py-1 rounded-full border', style.chip)}>
              {state.global.level}
            </span>
          </div>
          <p className="text-xs font-semibold opacity-70">
            {hasLiveTimestamp ? 'Conectado en tiempo real' : 'Esperando primera lectura valida'}
          </p>
          <CardTitle className="text-2xl font-black tracking-tight leading-tight">{state.diagnosis}</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-3 gap-1 sm:gap-3 py-4 place-items-center">
            <GaugeChart value={state.sensors[1].value} sensor="mq4" label="CH4 (MQ4)" />
            <GaugeChart value={state.sensors[0].value} sensor="mq7" label="CO (MQ7)" />
            <GaugeChart value={state.sensors[2].value} sensor="mq135" label="Aire (MQ135)" />
          </div>
          <div className="text-center text-[10px] opacity-50 font-medium">
            <Clock className="inline h-3 w-3 mr-1" />
            Sincronizado: {formatTime(state.global.timestamp)}
          </div>
        </CardContent>
      </Card>

      {/* ===== BLOQUE B: ALERTA/RECOMENDACIÓN (NUEVO DISEÑO) ===== */}
      <AlertSummary
        severity={alert.severity}
        message={alert.message}
        actions={alert.actions}
      />

      {/* ===== BLOQUE C: MÉTRICAS DE SENSORES ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {state.sensors.map((sensor) => (
          <SensorProgress key={sensor.id} sensor={sensor} />
        ))}
      </div>

      {/* ===== BLOQUE D: ESTADO DE MASCOTAS ===== */}
      {!petsLoading && pets && pets.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600 px-1">
            Estado de mascotas
          </h3>
          <div className="space-y-2">
            {riskAssessments.slice(0, 2).map((assessment) => (
              <PetRiskIndicator
                key={assessment.petId}
                pet={pets.find((p) => p.id === assessment.petId)!}
                recentDiagnostics={data ? [data] : undefined}
                compact={true}
                showLabel={true}
              />
            ))}
            {riskAssessments.length > 2 && (
              <p className="text-xs text-slate-500 text-center py-2">
                +{riskAssessments.length - 2} mascotas más
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-64 w-full rounded-[40px]" />
      <Skeleton className="h-24 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    </div>
  )
}
