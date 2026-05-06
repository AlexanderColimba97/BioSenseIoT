"use client"

import { useState, useMemo } from "react"
import { AlertCard, NotificationToggle } from "../alert-card"
import { Button } from "@/components/ui/button"
import { usePets } from "@/hooks/use-pets"
import { useSensorData } from "@/hooks/use-sensor-data"
import { usePetRisk, RISK_ICONS } from "@/hooks/use-pet-risk"
import { PetSelector } from "../selectors/pet-selector"
import { Badge } from "@/components/ui/badge"
import { useLatestAlert } from "@/hooks/use-latest-alert"
import { ActiveAlertCard } from "../active-alert-card"
import { AlertDetailModal } from "../alert-detail-modal"
import { useAlertIntelligence } from "@/hooks/use-alert-intelligence"
import useSWR from 'swr'
import { AuthService } from "@/lib/auth-service"
import { buildApiV2Url } from "@/lib/api-config"
import { getUserDevices } from "@/lib/device-service"

const activeAlerts = [
  {
    id: "1",
    title: "Nivel de CO peligroso",
    description: "Ventile inmediatamente",
    location: "Cocina",
    value: "85 ppm",
    time: "Hace 2 minutos",
    severity: "critica" as const
  },
  {
    id: "2",
    title: "Nivel de CO elevado",
    description: "Revise la ventilacion",
    location: "Sala",
    value: "45 ppm",
    time: "Hace 5 minutos",
    severity: "moderada" as const
  },
  {
    id: "3",
    title: "Humedad alta",
    description: "Considere usar deshumidificador",
    location: "Bano",
    value: "78%",
    time: "Hace 15 minutos",
    severity: "baja" as const
  }
]

const alertHistory = [
  {
    id: "h1",
    title: "Nivel de CH4 elevado",
    description: "Cocina - 65 ppm",
    time: "Hace 2 horas"
  },
  {
    id: "h2",
    title: "Temperatura alta",
    description: "Sala - 28C",
    time: "Hace 5 horas"
  },
  {
    id: "h3",
    title: "Sensor desconectado",
    description: "MQ-135 - Dormitorio",
    time: "Ayer"
  },
  {
    id: "h4",
    title: "COVs detectados",
    description: "Garaje - 42 ppm",
    time: "Hace 2 dias"
  }
]

export function AlertsView() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null)
  
  const { pets, isLoading: petsLoading } = usePets()
  const { data: latestDiagnostic } = useSensorData()
  const selectedPet = pets?.find((p) => p.id === selectedPetId)
  const selectedPetRisk = selectedPet ? usePetRisk(selectedPet, latestDiagnostic ? [latestDiagnostic] : undefined) : null

  // latest alert from backend (polling every 4s)
  const { alert: latestAlert, isLoading: latestLoading, isError, mutate: mutateLatest } = useLatestAlert({ refreshInterval: 4000 })

  const historyKey = AuthService.isAuthenticated() ? '/api/v2/alerts?limit=10' : null

  const historyFetcher = async (url: string) => {
    const token = await AuthService.getValidToken()
    const response = await fetch(buildApiV2Url(url.replace(/^\/api\/v2/, '')), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (response.status === 204 || response.status === 404) {
      return []
    }

    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`)
    }

    return response.json()
  }

  // lightweight history fetch (separate endpoint) - polled
  const { data: history, isLoading: historyLoading, error: historyError } = useSWR(historyKey, historyFetcher, {
    refreshInterval: 8000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    dedupingInterval: 3000
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null)

  const { data: userDevices } = useSWR(
    AuthService.isAuthenticated() ? '/api/v2/devices/my-devices' : null,
    getUserDevices,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000
    }
  )

  const selectedDeviceId = userDevices?.[0]?.id ?? null

  const activeAlert = useMemo(() => {
    if (!latestAlert) return null
    const sev = (latestAlert.severity || '').toString().toLowerCase()
    if (sev === 'critica' || sev === 'critical' || sev === 'moderada' || sev === 'moderate' || sev === 'danger' || sev === 'high') {
      return latestAlert
    }
    return null
  }, [latestAlert])

  const alertIntelligence = useAlertIntelligence({
    alert: activeAlert || latestAlert,
    diagnostic: latestDiagnostic
  })

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="p-4 pb-0">
        <h1 className="text-2xl font-bold tracking-tight">Alertas y Notificaciones</h1>
      </div>

      {/* Notification Toggle */}
      <div className="p-4">
        <NotificationToggle 
          enabled={notificationsEnabled} 
          onToggle={setNotificationsEnabled} 
        />
      </div>

      {/* Pet Selector para filtrar alertas */}
      {pets && pets.length > 0 && (
        <div className="px-4 pb-4">
          <label className="text-sm font-medium mb-2 block">Filtrar por mascota</label>
          <PetSelector
            pets={pets}
            selectedPetId={selectedPetId}
            onSelectPet={setSelectedPetId}
            isLoading={petsLoading}
            showAllOption={true}
            allPetsLabel="Todas las alertas"
          />
          
          {selectedPetRisk && (
            <div className={`mt-3 p-3 rounded-lg border-2 ${selectedPetRisk.currentSeverity === 'CRITICAL' ? 'bg-red-50 border-red-300' : selectedPetRisk.currentSeverity === 'DANGER' ? 'bg-orange-50 border-orange-300' : selectedPetRisk.currentSeverity === 'WARNING' ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{RISK_ICONS[selectedPetRisk.currentSeverity]}</span>
                <span className="font-semibold">{selectedPet?.name} - {selectedPetRisk.currentSeverity}</span>
              </div>
              <p className="text-sm">{selectedPetRisk.recommendation}</p>
            </div>
          )}
        </div>
      )}

      {/* Active Alerts - show single most relevant active alert */}
      <div className="px-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Alertas Activas</h2>
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">En vivo</span>
        </div>
        <div className="space-y-3">
          {alertIntelligence.report && (activeAlert || alertIntelligence.report.severity === 'HIGH' || alertIntelligence.report.severity === 'CRITICAL') && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-amber-700">Notificación IA</p>
                  <h3 className="font-semibold text-slate-900">{alertIntelligence.report.summary}</h3>
                  <p className="text-sm text-slate-700">{alertIntelligence.report.analysis}</p>
                </div>
                <Badge className="bg-amber-500 text-white">{alertIntelligence.report.gasLabel}</Badge>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-slate-700 sm:grid-cols-3">
                <div className="rounded-xl bg-white/80 p-3 border border-amber-100">
                  <p className="font-semibold text-slate-900">Usuario</p>
                  <p>{alertIntelligence.report.userName}</p>
                  <p className="text-slate-500">{alertIntelligence.report.userEmail}</p>
                </div>
                <div className="rounded-xl bg-white/80 p-3 border border-amber-100">
                  <p className="font-semibold text-slate-900">Mascotas</p>
                  <p>{alertIntelligence.report.petSummary}</p>
                  <p className="text-slate-500">{alertIntelligence.report.hasPets ? 'Registradas en el perfil' : 'Sin mascotas registradas'}</p>
                </div>
                <div className="rounded-xl bg-white/80 p-3 border border-amber-100">
                  <p className="font-semibold text-slate-900">Gas elevado</p>
                  <p>{alertIntelligence.report.gasLabel}</p>
                  <p className="text-slate-500">Requiere ventilación y seguimiento</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Recomendaciones IA</p>
                <ul className="space-y-2 text-sm text-slate-700">
                  {alertIntelligence.report.recommendations.map((recommendation) => (
                    <li key={recommendation} className="rounded-xl bg-white/80 border border-amber-100 px-3 py-2">
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {latestLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
              Sincronizando alertas activas...
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              No pudimos actualizar las alertas activas.
            </div>
          ) : activeAlert ? (
            <ActiveAlertCard
              id={activeAlert.id}
              title={activeAlert.title || activeAlert.message || 'Alerta'}
              gasType={activeAlert.gas}
              ppm={activeAlert.value || activeAlert.ppm}
              location={activeAlert.location}
              time={activeAlert.time}
              severity={(activeAlert.severity || '').toString().toUpperCase()}
              onClick={() => {
                setSelectedAlert(activeAlert)
                setIsModalOpen(true)
              }}
            />
          ) : (
            <div className="p-4">
              <div className="border rounded-2xl p-4 bg-emerald-50 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Estado: Seguro</h3>
                  <p className="text-xs text-slate-600">No hay alertas críticas o moderadas en este momento.</p>
                </div>
                <div className="text-emerald-600 font-bold">✓</div>
              </div>
            </div>
          )}

          {/* If selected pet at risk, show inline message */}
          {selectedPet && selectedPetRisk?.isAtRisk && (
            <div className="mt-2 ml-0 p-2 bg-amber-50 border-l-2 border-amber-300 rounded text-xs">
              <p className="text-amber-900">
                <Badge className="mr-2 bg-amber-500">⚠</Badge>
                Esta alerta puede afectar a <strong>{selectedPet.name}</strong>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Alert History (dynamic) */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Historial de Alertas</h2>
          <Button 
            variant="ghost" 
            className="text-primary text-sm font-medium h-auto p-0 hover:bg-transparent hover:text-primary/80"
            onClick={async () => {
              await fetch('/api/v2/alerts/clear', { method: 'POST' }).catch(() => {})
            }}
          >
            Limpiar historial
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          {historyLoading ? (
            <p className="text-sm text-slate-500">Cargando historial...</p>
          ) : historyError ? (
            <p className="text-sm text-red-600">No se pudo cargar el historial.</p>
          ) : (history && history.length > 0) ? (
            history.map((h: any, index: number) => (
              <AlertCard
                key={h.id}
                id={h.id}
                title={h.title}
                description={`${h.location} - ${h.value || h.ppm || ''}`}
                location={h.location}
                time={h.time}
                severity={h.severity || 'baja'}
                resolved={h.resolved}
                delay={200 + index * 50}
                onClick={() => {
                  setSelectedAlert(h)
                  setIsModalOpen(true)
                }}
              />
            ))
          ) : (
            <p className="text-sm text-slate-500">No hay historial de alertas.</p>
          )}
        </div>
      </div>

      <AlertDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        alert={selectedAlert || activeAlert || latestAlert}
        diagnostic={latestDiagnostic}
        deviceId={selectedDeviceId}
      />
    </div>
  )
}
