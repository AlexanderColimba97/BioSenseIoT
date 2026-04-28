// Frontend Pets Components Index
// Referencia centralizada de todos los componentes y hooks relacionados a mascotas

// ============================================
// 🪝 HOOKS (Estado y Lógica)
// ============================================

export { usePets } from '@/hooks/use-pets'
// Maneja CRUD de mascotas con SWR
// Proporciona: pets[], createPet(), removePet(), refresh(), isEmpty, isLoading, isError

export { usePetRisk, usePetsRiskAssessment, RISK_COLORS, RISK_ICONS, RISK_BADGE_COLORS } from '@/hooks/use-pet-risk'
// Calcula riesgo dinámico basado en perfil + diagnóstico
// Proporciona: riskAssessment con severidad y recomendación

export { usePetDiagnosticHistory, usePetsHistoricalData } from '@/hooks/use-pet-history'
// Obtiene historial de diagnósticos por mascota
// Útil para gráficos de tendencia

// ============================================
// 🎨 COMPONENTES DE UI
// ============================================

// Indicadores y Badges
export { PetRiskIndicator } from '@/components/iot/premium/pet-risk-indicator'
// Badge/Card que muestra severidad de riesgo
// Props: pet, recentDiagnostics, showLabel, compact

// Selectores
export { PetSelector, CompactPetSelector } from '@/components/iot/premium/selectors/pet-selector'
// Dropdown para seleccionar mascota
// Props: pets, selectedPetId, onSelectPet, onAddNew

// Tarjetas
export { PetCard } from '@/components/iot/premium/cards/pet-card'
// Tarjeta visual de mascota (memoized)
// Props: pet, riskLevel, onEdit, onDelete, onClick

export { PetsGrid } from '@/components/iot/premium/cards/pets-grid'
// Grid de mascotas con resumen de riesgos
// Props: pets, recentDiagnostics, onAddPet, onEditPet, onDeletePet

// Modales
export { PetDetailModal } from '@/components/iot/premium/modals/pet-detail-modal'
// Modal para crear/editar mascota con validaciones
// Props: isOpen, onClose, onSave, initialPet, isLoading, error

// Vistas
export { PetListView } from '@/components/iot/premium/views/pet-list-view'
// Tabla completa con búsqueda y filtros
// Props: recentDiagnostics, showAddButton, maxHeight

export { PetsManagementPage } from '@/components/iot/premium/pages/pets-management-page'
// Página completa para gestionar mascotas (grid + tabla)
// Props: ninguna (maneja estado interno)

// ============================================
// 🔧 SERVICIOS
// ============================================

export {
  getPetsList,
  savePet,
  deletePet,
  getPetById,
  getUserContextProfile,
  hasPetRespiratoryRisk,
  calculatePetRiskScore
} from '@/lib/pet-service'

export {
  savePetProfile,
  deletePetProfile,
  saveEnvironmentProfile,
  getUserContextProfile as getUserContext
} from '@/lib/profile-context-service'

// ============================================
// 📦 TIPOS
// ============================================

export type { PetProfile, UserContextProfile, EnvironmentProfile } from '@/lib/types'

export type { PetRiskAssessment } from '@/hooks/use-pet-risk'
export type { PetDiagnosticHistory } from '@/hooks/use-pet-history'

// ============================================
// 💡 PATRONES DE USO
// ============================================

/*

1. MOSTRAR LISTA DE MASCOTAS CON RIESGOS:
-------------------------------------------
import { usePets, usePetsRiskAssessment } from '@/lib/pets-index'
import { PetsGrid } from '@/lib/pets-index'

const MyPage = () => {
  const { pets } = usePets()
  const risks = usePetsRiskAssessment(pets)
  return <PetsGrid pets={pets} />
}


2. CREAR/EDITAR MASCOTA:
------------------------
import { usePets, PetDetailModal } from '@/lib/pets-index'
import { useState } from 'react'

const MyPage = () => {
  const { createPet } = usePets()
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <>
      <PetDetailModal
        isOpen={isOpen}
        onSave={createPet}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}


3. SELECTOR DE MASCOTA EN ALERTAS:
-----------------------------------
import { usePets, PetSelector, usePetRisk } from '@/lib/pets-index'
import { useState } from 'react'

const AlertsPage = () => {
  const { pets } = usePets()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selectedPet = pets?.find(p => p.id === selectedId)
  const risk = selectedPet ? usePetRisk(selectedPet) : null
  
  return (
    <>
      <PetSelector
        pets={pets}
        selectedPetId={selectedId}
        onSelectPet={setSelectedId}
      />
      {risk && <PetRiskIndicator pet={selectedPet!} />}
    </>
  )
}


4. INTEGRACIÓN CON DASHBOARD:
------------------------------
import { usePets, usePetsRiskAssessment } from '@/lib/pets-index'

const DashboardView = ({ diagnostics }) => {
  const { pets } = usePets()
  const risks = usePetsRiskAssessment(pets, diagnostics)
  const atRisk = risks.filter(r => r.isAtRisk)
  
  return (
    <>
      {atRisk.length > 0 && (
        <Alert>Mascotas en riesgo: {atRisk.map(r => r.petName).join(', ')}</Alert>
      )}
    </>
  )
}

*/

// ============================================
// ✅ CHECKLIST DE IMPORTACIÓN
// ============================================

/*
✅ Hooks:
  - usePets: CRUD y estado de mascotas
  - usePetRisk: Cálculo de riesgo único
  - usePetsRiskAssessment: Cálculo de múltiples
  - usePetDiagnosticHistory: Historial (preparado para futuro)

✅ Componentes:
  - PetDetailModal: crear/editar
  - PetListView: tabla con filtros
  - PetsGrid: vista en grid
  - PetSelector: dropdown
  - PetRiskIndicator: badge de riesgo
  - PetCard: tarjeta visual

✅ Servicios:
  - pet-service.ts: CRUD backend
  - profile-context-service.ts: contexto usuario

✅ Tipos:
  - PetProfile: interfaz mascota
  - PetRiskAssessment: resultado de riesgo
*/
