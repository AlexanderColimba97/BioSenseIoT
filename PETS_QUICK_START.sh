#!/bin/bash
# 🚀 QUICK START - GUÍA RÁPIDA DE MASCOTAS

# ============================================================================
# IMPORTACIONES RECOMENDADAS (Copy-Paste)
# ============================================================================

# En tu componente:

import { usePets } from '@/hooks/use-pets'
import { usePetRisk, usePetsRiskAssessment } from '@/hooks/use-pet-risk'
import { PetsManagementPage } from '@/components/iot/premium/pages/pets-management-page'
import { PetsGrid } from '@/components/iot/premium/cards/pets-grid'
import { PetListView } from '@/components/iot/premium/views/pet-list-view'
import { PetDetailModal } from '@/components/iot/premium/modals/pet-detail-modal'
import { PetSelector } from '@/components/iot/premium/selectors/pet-selector'
import { PetRiskIndicator } from '@/components/iot/premium/pet-risk-indicator'

# ============================================================================
# USO BÁSICO 1: Página Completa (Más Fácil)
# ============================================================================

# En app/pets/page.tsx:
import { PetsManagementPage } from '@/lib/pets-index'

export default function PetsPage() {
  return <PetsManagementPage />
}

# Automáticamente incluye:
# - Grid + Tabla toggle
# - CRUD (crear, editar, eliminar)
# - Búsqueda y filtros
# - Indicadores de riesgo
# - Manejo de errores

# ============================================================================
# USO BÁSICO 2: Usar Hook en Componente
# ============================================================================

'use client'
import { usePets } from '@/hooks/use-pets'

export function MiComponente() {
  const { pets, createPet, removePet, isLoading, isEmpty } = usePets()
  
  return (
    <div>
      {isEmpty && <p>Sin mascotas</p>}
      {pets?.map(pet => (
        <div key={pet.id}>
          {pet.name} - {pet.species}
        </div>
      ))}
    </div>
  )
}

# ============================================================================
# USO AVANZADO 1: Calcular Riesgo
# ============================================================================

'use client'
import { usePetRisk } from '@/hooks/use-pet-risk'
import { PetProfile } from '@/lib/types'

export function MiComponente(pet: PetProfile) {
  const risk = usePetRisk(pet)
  
  return (
    <div>
      <p>Severidad: {risk.currentSeverity}</p>
      <p>Score: {risk.baseRiskScore}/5</p>
      <p>Recomendación: {risk.recommendation}</p>
      <ul>
        {risk.riskFactors.map(f => <li>{f}</li>)}
      </ul>
    </div>
  )
}

# ============================================================================
# USO AVANZADO 2: Dashboard con Mascotas
# ============================================================================

'use client'
import { usePets, usePetsRiskAssessment } from '@/hooks/use-pets'
import { useSensorData } from '@/hooks/use-sensor-data'

export function MiDashboard() {
  const { pets } = usePets()
  const { data: diagnostic } = useSensorData()
  const risks = usePetsRiskAssessment(pets, diagnostic ? [diagnostic] : [])
  const atRisk = risks.filter(r => r.isAtRisk)
  
  return (
    <div>
      {atRisk.length > 0 && (
        <div className="bg-orange-50 p-4">
          ⚠️ {atRisk.map(r => r.petName).join(', ')} en riesgo
        </div>
      )}
    </div>
  )
}

# ============================================================================
# USO AVANZADO 3: Grid de Mascotas
# ============================================================================

'use client'
import { usePets } from '@/hooks/use-pets'
import { PetsGrid } from '@/components/iot/premium/cards/pets-grid'
import { useState } from 'react'

export function MiPetsList() {
  const { pets, createPet, removePet } = usePets()
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  return (
    <div>
      <PetsGrid
        pets={pets}
        onAddPet={() => setIsModalOpen(true)}
        onDeletePet={removePet}
      />
    </div>
  )
}

# ============================================================================
# USO AVANZADO 4: Selector de Mascota
# ============================================================================

'use client'
import { usePets } from '@/hooks/use-pets'
import { PetSelector } from '@/components/iot/premium/selectors/pet-selector'
import { useState } from 'react'

export function MisAlertas() {
  const { pets } = usePets()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  
  return (
    <div>
      <PetSelector
        pets={pets}
        selectedPetId={selectedId}
        onSelectPet={setSelectedId}
        showAllOption={true}
      />
      {selectedId && <p>Mostrando alertas para mascota ID: {selectedId}</p>}
    </div>
  )
}

# ============================================================================
# CONSTANTES ÚTILES
# ============================================================================

# Severidades:
# - SAFE: ✓ (verde)
# - WARNING: ⚠ (amarillo)
# - DANGER: ⛔ (naranja)
# - CRITICAL: 🚨 (rojo)

# Especies:
# - DOG (Perro)
# - CAT (Gato)
# - BIRD (Ave)
# - RABBIT (Conejo)
# - HAMSTER (Hámster)
# - OTHER (Otro)

# Niveles de Sensibilidad:
# - LOW (Baja)
# - MEDIUM (Media)
# - HIGH (Alta)

# Riesgo Respiratorio:
# - NORMAL (Normal)
# - MILD (Leve)
# - SEVERE (Severo)
# - CRITICAL (Crítico)

# ============================================================================
# MANEJO DE ERRORES
# ============================================================================

# Siempre envuelve llamadas en try-catch:

try {
  await createPet(petData)
} catch (error) {
  console.error('Error:', error)
  // Mostrar toast o mensaje de error
}

# ============================================================================
# VALIDACIONES FRONTEND
# ============================================================================

# Campos requeridos:
# - name (1-50 caracteres)
# - species (DOG, CAT, BIRD, etc.)

# Campos opcionales pero validados:
# - ageYears (0-100)
# - weightKg (0-200)

# Campos de selección:
# - sensitivityLevel: LOW | MEDIUM | HIGH
# - respiratoryRisk: NORMAL | MILD | SEVERE | CRITICAL
# - activityLevel: INACTIVE | MODERATE | ACTIVE | VERY_ACTIVE

# ============================================================================
# DEBUGGING
# ============================================================================

# Ver estado de mascotas:
const { pets, isLoading, isError, error } = usePets()
console.log('Mascotas:', pets)
console.log('Cargando:', isLoading)
console.log('Error:', error)

# Ver cálculo de riesgo:
const risk = usePetRisk(pet)
console.log('Risk Assessment:', risk)
console.log('Factors:', risk.riskFactors)
console.log('Recommendation:', risk.recommendation)

# ============================================================================
# TESTING
# ============================================================================

# Crear mascota de prueba:
await createPet({
  name: 'Max',
  species: 'DOG',
  breed: 'Labrador',
  ageYears: 3,
  weightKg: 30,
  sensitivityLevel: 'MEDIUM',
  respiratoryRisk: 'NORMAL',
  activityLevel: 'ACTIVE',
  vulnerabilities: 'Ninguna'
})

# Eliminar mascota:
await removePet(petId)

# Obtener lista:
const pets = await getPetsList()

# ============================================================================
# DOCUMENTACIÓN COMPLETA
# ============================================================================

# Ver:
# - PETS_IMPLEMENTATION.md → Guía completa
# - PETS_EXAMPLES.tsx → 10 ejemplos prácticos
# - pets-index.ts → Importaciones centralizadas

# ============================================================================
