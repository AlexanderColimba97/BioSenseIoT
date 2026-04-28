"use client"

import { useState } from "react"
import { AlertCard, NotificationToggle } from "../alert-card"
import { Button } from "@/components/ui/button"
import { usePets } from "@/hooks/use-pets"
import { useSensorData } from "@/hooks/use-sensor-data"
import { usePetRisk, RISK_ICONS } from "@/hooks/use-pet-risk"
import { PetSelector } from "../selectors/pet-selector"
import { Badge } from "@/components/ui/badge"

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

      {/* Active Alerts */}
      <div className="px-4">
        <h2 className="font-semibold text-lg mb-3">Alertas Activas</h2>
        <div className="space-y-3">
          {activeAlerts.map((alert, index) => (
            <div key={alert.id}>
              <AlertCard
                {...alert}
                delay={index * 50}
              />
              {/* Mostrar mascotas afectadas si existe selección */}
              {selectedPet && selectedPetRisk?.isAtRisk && (
                <div className="mt-2 ml-4 p-2 bg-amber-50 border-l-2 border-amber-300 rounded text-xs">
                  <p className="text-amber-900">
                    <Badge className="mr-2 bg-amber-500">⚠</Badge>
                    Esta alerta puede afectar a <strong>{selectedPet.name}</strong>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Alert History */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Historial de Alertas</h2>
          <Button 
            variant="ghost" 
            className="text-primary text-sm font-medium h-auto p-0 hover:bg-transparent hover:text-primary/80"
          >
            Limpiar historial
          </Button>
        </div>
        
        <div className="bg-card rounded-2xl border border-border/50 p-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          {alertHistory.map((alert, index) => (
            <AlertCard
              key={alert.id}
              id={alert.id}
              title={alert.title}
              description={alert.description}
              location=""
              time={alert.time}
              severity="baja"
              resolved
              delay={200 + index * 50}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
