'use client'

import { useState } from 'react'
import { usePets } from '@/hooks/use-pets'
import { useSensorData } from '@/hooks/use-sensor-data'
import { PetDetailModal } from '@/components/iot/premium/modals/pet-detail-modal'
import { PetListView } from '@/components/iot/premium/views/pet-list-view'
import { PetsGrid } from '@/components/iot/premium/cards/pets-grid'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus, LayoutGrid, LayoutList } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

/**
 * Página completa para gestionar mascotas
 * Combina vista en grid y tabla con CRUD completo
 */
export function PetsManagementPage() {
  const { pets, isLoading: petsLoading, isError, createPet, removePet } = usePets()
  const { data: latestDiagnostic } = useSensorData()
  
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedPet, setSelectedPet] = useState(null)
  const [isModalLoading, setIsModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')

  const handleAddPet = () => {
    setSelectedPet(null)
    setModalError('')
    setIsDetailModalOpen(true)
  }

  const handleEditPet = (pet) => {
    setSelectedPet(pet)
    setModalError('')
    setIsDetailModalOpen(true)
  }

  const handleDeletePet = (petId: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta mascota?')) {
      removePet(petId)
        .then(() => {
          toast({
            title: '✓ Mascota eliminada',
            duration: 3000,
          })
        })
        .catch((error) => {
          toast({
            title: 'Error',
            description: 'No se pudo eliminar la mascota',
            variant: 'destructive',
          })
        })
    }
  }

  const handleSavePet = async (petData) => {
    try {
      setIsModalLoading(true)
      setModalError('')
      await createPet(petData)
      setIsDetailModalOpen(false)
      toast({
        title: '✓ Mascota guardada',
        duration: 3000,
      })
    } catch (error) {
      console.error('Error saving pet:', error)
      setModalError(error instanceof Error ? error.message : 'Error al guardar la mascota')
    } finally {
      setIsModalLoading(false)
    }
  }

  return (
    <div className='space-y-6 pb-20'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold'>Mis Mascotas</h1>
        <p className='text-gray-600 mt-1'>Gestiona la información y el monitoreo de tus mascotas</p>
      </div>

      {/* Controles */}
      <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <span className='text-sm text-gray-600'>Vista:</span>
          <div className='flex gap-1 bg-gray-200 rounded-lg p-1'>
            <Button
              size='sm'
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className='gap-2'
            >
              <LayoutGrid className='h-4 w-4' />
              Grid
            </Button>
            <Button
              size='sm'
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              onClick={() => setViewMode('table')}
              className='gap-2'
            >
              <LayoutList className='h-4 w-4' />
              Tabla
            </Button>
          </div>
        </div>

        <Button onClick={handleAddPet} disabled={petsLoading}>
          <Plus className='mr-2 h-4 w-4' />
          Nueva mascota
        </Button>
      </div>

      {/* Error State */}
      {isError && (
        <div className='p-4 bg-red-50 border border-red-200 rounded-lg text-red-800'>
          Error al cargar las mascotas. Intenta recargar la página.
        </div>
      )}

      {/* Contenido Principal */}
      {viewMode === 'grid' ? (
        <PetsGrid
          pets={pets}
          recentDiagnostics={latestDiagnostic ? [latestDiagnostic] : undefined}
          onAddPet={handleAddPet}
          onEditPet={handleEditPet}
          onDeletePet={handleDeletePet}
          isLoading={petsLoading}
        />
      ) : (
        <PetListView
          recentDiagnostics={latestDiagnostic ? [latestDiagnostic] : undefined}
          showAddButton={true}
        />
      )}

      {/* Modal */}
      <PetDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onSave={handleSavePet}
        initialPet={selectedPet}
        isLoading={isModalLoading}
        error={modalError}
      />
    </div>
  )
}
