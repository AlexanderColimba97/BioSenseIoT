// ============================================================================
// 📚 GUÍA DE EJEMPLOS DE USO - LÓGICA DE MASCOTAS
// ============================================================================
// Este archivo contiene ejemplos prácticos de cómo usar los componentes
// y hooks de mascotas en diferentes escenarios

import { useState } from 'react'
import { usePets } from '@/hooks/use-pets'
import { usePetRisk, usePetsRiskAssessment } from '@/hooks/use-pet-risk'
import { PetsManagementPage } from '@/components/iot/premium/pages/pets-management-page'
import { PetsGrid } from '@/components/iot/premium/cards/pets-grid'
import { PetListView } from '@/components/iot/premium/views/pet-list-view'
import { PetDetailModal } from '@/components/iot/premium/modals/pet-detail-modal'
import { PetSelector } from '@/components/iot/premium/selectors/pet-selector'
import { PetRiskIndicator } from '@/components/iot/premium/pet-risk-indicator'

// ============================================================================
// EJEMPLO 1: Página Completa de Gestión de Mascotas
// ============================================================================

/**
 * Uso más simple: importar y renderizar la página completa
 * La página incluye:
 * - Toggle Grid/Tabla
 * - CRUD completo
 * - Gestión de estado
 * - Manejo de errores
 */
export function Example1_SimpleManagementPage() {
  return (
    <div className='container mx-auto py-6'>
      <PetsManagementPage />
    </div>
  )
}

// ============================================================================
// EJEMPLO 2: Dashboard con Estado de Mascotas
// ============================================================================

export function Example2_DashboardWithPets() {
  const { pets, isLoading } = usePets()
  const { data: latestDiagnostic } = {} // Tu hook de diagnóstico

  // Calcular riesgos de todas las mascotas
  const riskAssessments = usePetsRiskAssessment(
    pets,
    latestDiagnostic ? [latestDiagnostic] : undefined
  )

  // Filtrar solo las que están en riesgo
  const petsAtRisk = riskAssessments.filter((a) => a.isAtRisk)

  return (
    <div className='space-y-4'>
      {/* Alerta si hay mascotas en riesgo */}
      {petsAtRisk.length > 0 && (
        <div className='p-4 bg-orange-50 border border-orange-200 rounded-lg'>
          <p className='font-semibold text-orange-900'>
            ⚠️ {petsAtRisk.length} mascota(s) en riesgo
          </p>
          <p className='text-sm text-orange-800'>
            {petsAtRisk.map((a) => a.petName).join(', ')}
          </p>
        </div>
      )}

      {/* Grid compacto de mascotas */}
      {pets && pets.length > 0 && (
        <div>
          <h3 className='font-semibold mb-3'>Estado de Mascotas</h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {riskAssessments.slice(0, 2).map((assessment) => (
              <PetRiskIndicator
                key={assessment.petId}
                pet={pets.find((p) => p.id === assessment.petId)!}
                compact={true}
                recentDiagnostics={latestDiagnostic ? [latestDiagnostic] : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// EJEMPLO 3: Selector de Mascota en Página de Alertas
// ============================================================================

export function Example3_AlertsWithPetFilter() {
  const { pets } = usePets()
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null)

  // Obtener la mascota seleccionada
  const selectedPet = pets?.find((p) => p.id === selectedPetId)

  // Calcular riesgo específico si hay mascota seleccionada
  const selectedPetRisk = selectedPet ? usePetRisk(selectedPet) : null

  return (
    <div className='space-y-4'>
      <h2 className='text-xl font-semibold'>Filtrar Alertas por Mascota</h2>

      {/* Selector de mascota */}
      <div className='max-w-md'>
        <label className='text-sm font-medium mb-2 block'>Mostrar alertas de:</label>
        <PetSelector
          pets={pets}
          selectedPetId={selectedPetId}
          onSelectPet={setSelectedPetId}
          showAllOption={true}
          allPetsLabel='Todas las mascotas'
        />
      </div>

      {/* Mostrar riesgo de mascota seleccionada */}
      {selectedPetRisk && (
        <div className='border-t pt-4'>
          <h3 className='font-semibold mb-3'>Estado de {selectedPet?.name}</h3>
          <PetRiskIndicator
            pet={selectedPet!}
            compact={false}
          />
        </div>
      )}

      {/* Lista de alertas filtradas */}
      <div className='mt-6'>
        <h3 className='font-semibold mb-3'>Alertas Activas</h3>
        {/* Mostrar solo alertas que afecten a la mascota seleccionada */}
        {selectedPet ? (
          <p className='text-sm text-gray-600'>
            Mostrando alertas que afectan a {selectedPet.name}
          </p>
        ) : (
          <p className='text-sm text-gray-600'>Mostrando todas las alertas</p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// EJEMPLO 4: Modal de Crear/Editar Mascota Standalone
// ============================================================================

export function Example4_CreateEditPetModal() {
  const { createPet } = usePets()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPet, setSelectedPet] = useState(null)

  const handleSave = async (petData) => {
    await createPet(petData)
    setIsOpen(false)
  }

  return (
    <div>
      <button
        onClick={() => {
          setSelectedPet(null)
          setIsOpen(true)
        }}
        className='px-4 py-2 bg-blue-500 text-white rounded'
      >
        Crear Mascota
      </button>

      <PetDetailModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={handleSave}
        initialPet={selectedPet}
      />
    </div>
  )
}

// ============================================================================
// EJEMPLO 5: Vista en Grid de Mascotas
// ============================================================================

export function Example5_PetsGridView() {
  const { pets, createPet, removePet } = usePets()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedPet, setSelectedPet] = useState(null)

  return (
    <div className='space-y-6'>
      <PetsGrid
        pets={pets}
        onAddPet={() => {
          setSelectedPet(null)
          setIsEditModalOpen(true)
        }}
        onEditPet={(pet) => {
          setSelectedPet(pet)
          setIsEditModalOpen(true)
        }}
        onDeletePet={(petId) => {
          if (confirm('¿Eliminar mascota?')) {
            removePet(petId)
          }
        }}
      />

      <PetDetailModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={createPet}
        initialPet={selectedPet}
      />
    </div>
  )
}

// ============================================================================
// EJEMPLO 6: Vista en Tabla de Mascotas
// ============================================================================

export function Example6_PetsTableView() {
  return (
    <div className='space-y-4'>
      <h1 className='text-2xl font-bold'>Mis Mascotas</h1>

      {/* PetListView incluye todo: tabla, búsqueda, filtros, CRUD */}
      <PetListView
        showAddButton={true}
        maxHeight='max-h-[600px]'
      />
    </div>
  )
}

// ============================================================================
// EJEMPLO 7: Evaluación Individual de Riesgo
// ============================================================================

export function Example7_IndividualPetRiskEvaluation({ petId }: { petId: number }) {
  const { pets } = usePets()
  const pet = pets?.find((p) => p.id === petId)

  // Calcular riesgo para esta mascota específica
  // Sin diagnóstico reciente (solo basado en perfil)
  const riskAssessment = pet ? usePetRisk(pet) : null

  if (!pet || !riskAssessment) {
    return <p>Mascota no encontrada</p>
  }

  return (
    <div className='space-y-4'>
      <div className='text-2xl font-bold'>{pet.name}</div>

      {/* Mostrar indicador de riesgo expandido */}
      <PetRiskIndicator
        pet={pet}
        compact={false}
        showLabel={true}
      />

      {/* Mostrar detalles */}
      <div className='space-y-2'>
        <div>
          <p className='text-sm font-semibold text-gray-600'>Score de Riesgo Base</p>
          <p className='text-2xl font-bold'>{riskAssessment.baseRiskScore}/5</p>
        </div>

        {riskAssessment.riskFactors.length > 0 && (
          <div>
            <p className='text-sm font-semibold text-gray-600 mb-2'>Factores Identificados</p>
            <ul className='list-disc list-inside space-y-1 text-sm'>
              {riskAssessment.riskFactors.map((factor, idx) => (
                <li key={idx}>{factor}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className='text-sm font-semibold text-gray-600 mb-2'>Recomendación</p>
          <p className='text-sm text-gray-700'>{riskAssessment.recommendation}</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// EJEMPLO 8: Comparación de Riesgos entre Mascotas
// ============================================================================

export function Example8_ComparePetRisks() {
  const { pets } = usePets()
  const riskAssessments = usePetsRiskAssessment(pets)

  // Ordenar por severidad
  const sorted = riskAssessments.sort((a, b) => {
    const order = { CRITICAL: 0, DANGER: 1, WARNING: 2, SAFE: 3 }
    return order[a.currentSeverity] - order[b.currentSeverity]
  })

  return (
    <div className='space-y-4'>
      <h2 className='text-2xl font-bold'>Comparativa de Riesgos</h2>

      <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
        {['CRITICAL', 'DANGER', 'WARNING', 'SAFE'].map((severity) => {
          const count = riskAssessments.filter(
            (a) => a.currentSeverity === severity
          ).length
          return (
            <div key={severity} className='text-center p-4 bg-gray-50 rounded-lg'>
              <div className='text-2xl font-bold'>{count}</div>
              <div className='text-sm text-gray-600'>{severity}</div>
            </div>
          )
        })}
      </div>

      <div className='space-y-3 mt-6'>
        {sorted.map((assessment) => (
          <div
            key={assessment.petId}
            className='p-4 border rounded-lg flex items-center justify-between'
          >
            <div>
              <p className='font-semibold'>{assessment.petName}</p>
              <p className='text-sm text-gray-600'>{assessment.recommendation}</p>
            </div>
            <div className='text-right'>
              <p className='text-lg font-bold'>{assessment.baseRiskScore}/5</p>
              <p className='text-sm text-gray-600'>{assessment.currentSeverity}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// EJEMPLO 9: Hook usePetRisk en Componente Custom
// ============================================================================

export function Example9_CustomPetRiskComponent({ pet }) {
  const risk = usePetRisk(pet)

  return (
    <div
      className={`p-4 rounded-lg ${
        risk.currentSeverity === 'CRITICAL'
          ? 'bg-red-50'
          : risk.currentSeverity === 'DANGER'
            ? 'bg-orange-50'
            : 'bg-green-50'
      }`}
    >
      <h3 className='font-semibold'>{pet.name}</h3>

      {/* Badge de severidad */}
      <div className='inline-block mt-2 px-2 py-1 rounded text-white text-sm font-bold bg-red-500'>
        {risk.currentSeverity}
      </div>

      {/* Recomendación */}
      <p className='mt-3 text-sm'>{risk.recommendation}</p>

      {/* Factores */}
      {risk.riskFactors.length > 0 && (
        <ul className='mt-3 text-xs space-y-1 list-disc list-inside'>
          {risk.riskFactors.map((factor, idx) => (
            <li key={idx}>{factor}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ============================================================================
// EJEMPLO 10: Integración Completa en una App
// ============================================================================

export function Example10_CompleteApp() {
  const { pets, isLoading, createPet, removePet } = usePets()
  const [currentTab, setCurrentTab] = useState('grid')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPet, setSelectedPet] = useState(null)

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='container mx-auto'>
        {/* Header */}
        <div className='flex justify-between items-center mb-8'>
          <h1 className='text-3xl font-bold'>Mascotas</h1>
          <button
            onClick={() => {
              setSelectedPet(null)
              setIsModalOpen(true)
            }}
            className='px-4 py-2 bg-blue-500 text-white rounded-lg'
          >
            + Añadir Mascota
          </button>
        </div>

        {/* Tabs */}
        <div className='flex gap-2 mb-6'>
          <button
            onClick={() => setCurrentTab('grid')}
            className={`px-4 py-2 rounded-lg ${
              currentTab === 'grid'
                ? 'bg-blue-500 text-white'
                : 'bg-white border'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setCurrentTab('table')}
            className={`px-4 py-2 rounded-lg ${
              currentTab === 'table'
                ? 'bg-blue-500 text-white'
                : 'bg-white border'
            }`}
          >
            Tabla
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <p>Cargando...</p>
        ) : currentTab === 'grid' ? (
          <PetsGrid
            pets={pets}
            onAddPet={() => {
              setSelectedPet(null)
              setIsModalOpen(true)
            }}
            onEditPet={(pet) => {
              setSelectedPet(pet)
              setIsModalOpen(true)
            }}
            onDeletePet={removePet}
          />
        ) : (
          <PetListView
            showAddButton={true}
          />
        )}
      </div>

      {/* Modal */}
      <PetDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async (data) => {
          await createPet(data)
          setIsModalOpen(false)
        }}
        initialPet={selectedPet}
      />
    </div>
  )
}
