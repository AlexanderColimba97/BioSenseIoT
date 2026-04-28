'use client'

import { useState } from 'react'
import { PetProfile, DiagnosticResponse } from '@/lib/types'
import { usePets } from '@/hooks/use-pets'
import { usePetRisk, usePetsRiskAssessment, RISK_BADGE_COLORS, RISK_ICONS } from '@/hooks/use-pet-risk'
import { PetDetailModal } from '@/components/iot/premium/modals/pet-detail-modal'
import { PetRiskIndicator } from '@/components/iot/premium/pet-risk-indicator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface PetListViewProps {
  recentDiagnostics?: DiagnosticResponse[]
  showAddButton?: boolean
  maxHeight?: string
}

/**
 * Vista completa para gestionar mascotas
 * Incluye tabla con filtros, búsqueda y CRUD
 */
export function PetListView({
  recentDiagnostics,
  showAddButton = true,
  maxHeight = 'max-h-[600px]',
}: PetListViewProps) {
  const { pets, isLoading, isError, isEmpty, createPet, removePet } = usePets()
  const riskAssessments = usePetsRiskAssessment(pets, recentDiagnostics)

  const [searchTerm, setSearchTerm] = useState('')
  const [speciesFilter, setSpeciesFilter] = useState<string>('')
  const [riskFilter, setRiskFilter] = useState<string>('')
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPet, setSelectedPet] = useState<PetProfile | null>(null)
  const [isModalLoading, setIsModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string>('')
  const [petToDelete, setPetToDelete] = useState<PetProfile | null>(null)

  // Filtrar mascotas según criterios
  const filteredPets = pets?.filter((pet) => {
    const matchesSearch =
      pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.species.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.breed?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesSpecies = !speciesFilter || pet.species === speciesFilter

    let matchesRisk = true
    if (riskFilter) {
      const assessment = riskAssessments.find((a) => a.petId === pet.id)
      if (assessment) {
        matchesRisk = assessment.currentSeverity === riskFilter
      }
    }

    return matchesSearch && matchesSpecies && matchesRisk
  })

  // Especies únicas en la lista
  const uniqueSpecies = Array.from(new Set(pets?.map((p) => p.species) || []))

  // Manejadores
  const handleCreatePet = () => {
    setSelectedPet(null)
    setModalError('')
    setIsDetailModalOpen(true)
  }

  const handleEditPet = (pet: PetProfile) => {
    setSelectedPet(pet)
    setModalError('')
    setIsDetailModalOpen(true)
  }

  const handleDeleteClick = (pet: PetProfile) => {
    setPetToDelete(pet)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!petToDelete?.id) return

    try {
      setIsModalLoading(true)
      await removePet(petToDelete.id)
      toast({
        title: '✓ Mascota eliminada',
        description: `${petToDelete.name} ha sido eliminada`,
        duration: 3000,
      })
    } catch (error) {
      console.error('Error deleting pet:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la mascota',
        variant: 'destructive',
      })
    } finally {
      setIsModalLoading(false)
      setIsDeleteDialogOpen(false)
      setPetToDelete(null)
    }
  }

  const handleSavePet = async (petData: Partial<PetProfile>) => {
    try {
      setIsModalLoading(true)
      setModalError('')
      await createPet(petData)
      setIsDetailModalOpen(false)
      toast({
        title: '✓ Mascota guardada',
        description: `${petData.name} ha sido guardada exitosamente`,
        duration: 3000,
      })
    } catch (error) {
      console.error('Error saving pet:', error)
      setModalError(
        error instanceof Error
          ? error.message
          : 'Error al guardar la mascota'
      )
    } finally {
      setIsModalLoading(false)
    }
  }

  // Estado vacío
  if (isEmpty && !isLoading) {
    return (
      <div className='flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-lg bg-gray-50'>
        <div className='text-4xl mb-4'>🐾</div>
        <h3 className='font-semibold text-lg mb-2'>Sin mascotas</h3>
        <p className='text-gray-600 text-sm mb-4'>
          Añade una mascota para recibir recomendaciones personalizadas
        </p>
        {showAddButton && (
          <Button onClick={handleCreatePet}>
            <Plus className='mr-2 h-4 w-4' />
            Añadir mascota
          </Button>
        )}
      </div>
    )
  }

  // Error
  if (isError) {
    return (
      <div className='p-6 text-center border rounded-lg bg-red-50 border-red-200'>
        <p className='text-red-800 font-semibold'>Error al cargar las mascotas</p>
        <p className='text-red-600 text-sm mt-1'>Intenta recargar la página</p>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {/* Controles */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
        <div className='flex-1'>
          <label className='text-sm font-medium mb-1 block'>Buscar</label>
          <div className='relative'>
            <Search className='absolute left-3 top-2.5 h-4 w-4 text-gray-400' />
            <Input
              placeholder='Nombre, especie, raza...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-10'
              disabled={isLoading}
            />
          </div>
        </div>

        <div className='w-full sm:w-40'>
          <label className='text-sm font-medium mb-1 block'>Especie</label>
          <Select value={speciesFilter} onValueChange={setSpeciesFilter} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder='Todas' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=''>Todas</SelectItem>
              {uniqueSpecies.map((species) => (
                <SelectItem key={species} value={species}>
                  {species}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='w-full sm:w-40'>
          <label className='text-sm font-medium mb-1 block'>Riesgo</label>
          <Select value={riskFilter} onValueChange={setRiskFilter} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder='Todos' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=''>Todos</SelectItem>
              <SelectItem value='SAFE'>Seguro</SelectItem>
              <SelectItem value='WARNING'>Advertencia</SelectItem>
              <SelectItem value='DANGER'>Peligro</SelectItem>
              <SelectItem value='CRITICAL'>Crítico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showAddButton && (
          <Button onClick={handleCreatePet} disabled={isLoading}>
            <Plus className='mr-2 h-4 w-4' />
            Nueva mascota
          </Button>
        )}
      </div>

      {/* Tabla de mascotas */}
      <div className={`border rounded-lg overflow-hidden ${maxHeight} overflow-y-auto`}>
        {isLoading && filteredPets?.length === 0 ? (
          <div className='p-8 text-center'>
            <p className='text-gray-500'>Cargando mascotas...</p>
          </div>
        ) : filteredPets && filteredPets.length > 0 ? (
          <Table>
            <TableHeader className='sticky top-0 bg-gray-50'>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Especie</TableHead>
                <TableHead className='hidden sm:table-cell'>Raza</TableHead>
                <TableHead className='hidden md:table-cell'>Edad</TableHead>
                <TableHead className='hidden md:table-cell'>Sensibilidad</TableHead>
                <TableHead>Riesgo</TableHead>
                <TableHead className='text-right'>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPets.map((pet) => {
                const assessment = riskAssessments.find((a) => a.petId === pet.id)
                return (
                  <TableRow key={pet.id} className='hover:bg-gray-50'>
                    <TableCell className='font-semibold'>{pet.name}</TableCell>
                    <TableCell>
                      <Badge variant='secondary'>{pet.species}</Badge>
                    </TableCell>
                    <TableCell className='hidden sm:table-cell text-sm text-gray-600'>
                      {pet.breed || '-'}
                    </TableCell>
                    <TableCell className='hidden md:table-cell text-sm'>
                      {pet.ageYears ? `${pet.ageYears} años` : '-'}
                    </TableCell>
                    <TableCell className='hidden md:table-cell text-sm'>
                      {pet.sensitivityLevel || '-'}
                    </TableCell>
                    <TableCell>
                      {assessment && (
                        <Badge
                          className={`${RISK_BADGE_COLORS[assessment.currentSeverity]} text-white`}
                        >
                          {RISK_ICONS[assessment.currentSeverity]}{' '}
                          {assessment.currentSeverity}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className='text-right space-x-2'>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleEditPet(pet)}
                        disabled={isLoading}
                      >
                        <Edit2 className='h-4 w-4' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleDeleteClick(pet)}
                        disabled={isLoading}
                        className='text-red-600 hover:text-red-700 hover:bg-red-50'
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <div className='p-8 text-center'>
            <p className='text-gray-500'>No hay mascotas que coincidan con los filtros</p>
          </div>
        )}
      </div>

      {/* Resumen */}
      {filteredPets && filteredPets.length > 0 && (
        <div className='text-xs text-gray-600 px-2'>
          Mostrando {filteredPets.length} de {pets?.length || 0} mascotas
        </div>
      )}

      {/* Detalles de riesgo expandibles */}
      {riskAssessments.length > 0 && (
        <div className='grid grid-cols-1 gap-3'>
          {riskAssessments
            .filter((a) => filteredPets?.some((p) => p.id === a.petId))
            .slice(0, 2)
            .map((assessment) => (
              <PetRiskIndicator
                key={assessment.petId}
                pet={pets?.find((p) => p.id === assessment.petId)!}
                recentDiagnostics={recentDiagnostics}
                compact={false}
              />
            ))}
        </div>
      )}

      {/* Modal de Detalle */}
      <PetDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onSave={handleSavePet}
        initialPet={selectedPet || undefined}
        isLoading={isModalLoading}
        error={modalError}
      />

      {/* Diálogo de Confirmación de Eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar mascota?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a {petToDelete?.name}? Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel disabled={isModalLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            disabled={isModalLoading}
            className='bg-red-600 hover:bg-red-700'
          >
            {isModalLoading ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
