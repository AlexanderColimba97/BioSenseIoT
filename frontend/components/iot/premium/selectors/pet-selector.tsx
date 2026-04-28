'use client'

import { PetProfile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Plus } from 'lucide-react'

interface PetSelectorProps {
  pets: PetProfile[] | undefined
  selectedPetId?: number | null
  onSelectPet: (petId: number | null) => void
  onAddNew?: () => void
  isLoading?: boolean
  showAllOption?: boolean
  allPetsLabel?: string
}

/**
 * Selector dropdown para elegir una mascota
 * Útil en alertas, diagnósticos, etc.
 */
export function PetSelector({
  pets,
  selectedPetId,
  onSelectPet,
  onAddNew,
  isLoading = false,
  showAllOption = true,
  allPetsLabel = 'Todas las mascotas',
}: PetSelectorProps) {
  const selectedPet = pets?.find((p) => p.id === selectedPetId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          className='w-full'
          disabled={isLoading}
        >
          <span className='flex-1 text-left'>
            {selectedPet ? (
              <span>{selectedPet.name}</span>
            ) : (
              <span className='text-gray-500'>{allPetsLabel}</span>
            )}
          </span>
          <ChevronDown className='ml-2 h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56'>
        {showAllOption && (
          <>
            <DropdownMenuItem onClick={() => onSelectPet(null)}>
              <span>{allPetsLabel}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {pets && pets.length > 0 ? (
          <>
            <DropdownMenuLabel>Mascotas ({pets.length})</DropdownMenuLabel>
            {pets.map((pet) => (
              <DropdownMenuItem
                key={pet.id}
                onClick={() => onSelectPet(pet.id || 0)}
                className={selectedPetId === pet.id ? 'bg-blue-50' : ''}
              >
                <span>
                  {pet.name} <span className='text-gray-400 text-sm'>- {pet.species}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </>
        ) : (
          <DropdownMenuLabel className='text-gray-500'>
            Sin mascotas
          </DropdownMenuLabel>
        )}

        {onAddNew && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onAddNew} className='text-blue-600'>
              <Plus className='mr-2 h-4 w-4' />
              <span>Agregar mascota</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Versión compacta: selector inline (combobox-like)
 */
interface CompactPetSelectorProps {
  pets: PetProfile[] | undefined
  selectedPetId?: number | null
  onSelectPet: (petId: number | null) => void
  isLoading?: boolean
}

export function CompactPetSelector({
  pets,
  selectedPetId,
  onSelectPet,
  isLoading = false,
}: CompactPetSelectorProps) {
  if (!pets || pets.length === 0) {
    return <span className='text-gray-500 text-sm'>Sin mascotas</span>
  }

  return (
    <select
      value={selectedPetId || ''}
      onChange={(e) => onSelectPet(e.target.value ? parseInt(e.target.value) : null)}
      disabled={isLoading}
      className='text-sm px-2 py-1 border rounded bg-white'
    >
      <option value=''>Todas las mascotas</option>
      {pets.map((pet) => (
        <option key={pet.id} value={pet.id || ''}>
          {pet.name}
        </option>
      ))}
    </select>
  )
}
