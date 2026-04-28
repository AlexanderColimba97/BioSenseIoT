'use client'

import useSWR from 'swr'
import { PetProfile } from '@/lib/types'
import { getPetsList, savePet, deletePet } from '@/lib/pet-service'
import { AuthService } from '@/lib/auth-service'

/**
 * Hook personalizado para gestionar mascotas
 * Utiliza SWR para caching y revalidación automática
 */
interface UsePetsResult {
  pets: PetProfile[] | undefined
  isLoading: boolean
  isError: boolean
  error: Error | undefined
  createPet: (pet: Partial<PetProfile>) => Promise<PetProfile>
  removePet: (petId: number) => Promise<void>
  refresh: () => Promise<void>
  isEmpty: boolean
}

export function usePets(): UsePetsResult {
  // Clave única para SWR
  // Solo fetch si está autenticado
  const swrKey = AuthService.isAuthenticated() ? ['/pets', 'list'] : null

  const fetcher = async () => {
    return await getPetsList()
  }

  const { data, error, isLoading, mutate } = useSWR<PetProfile[], Error>(
    swrKey,
    fetcher,
    {
      // No revalidar cuando se enfoca la ventana (IoT app, puede estar en background)
      revalidateOnFocus: false,
      // Revalidar si se recupera la conexión
      revalidateOnReconnect: true,
      // Deduplicar solicitudes dentro de 10 segundos
      dedupingInterval: 10000,
      // No hacer throttle en el focus (importante para IoT)
      focusThrottleInterval: 30000,
      // Mantener datos en caché si hay error (UX mejor)
      keepPreviousData: true,
    }
  )

  /**
   * Crear una nueva mascota
   * Automáticamente revalida la lista después
   */
  const createPet = async (pet: Partial<PetProfile>): Promise<PetProfile> => {
    try {
      const newPet = await savePet(pet)
      // Revalidar lista de mascotas
      await mutate()
      return newPet
    } catch (err) {
      console.error('Error creating pet:', err)
      throw err
    }
  }

  /**
   * Eliminar una mascota por ID
   * Automáticamente revalida la lista después
   */
  const removePet = async (petId: number): Promise<void> => {
    try {
      await deletePet(petId)
      // Revalidar lista
      await mutate()
    } catch (err) {
      console.error('Error removing pet:', err)
      throw err
    }
  }

  /**
   * Refrescar manualmente la lista de mascotas
   */
  const refresh = async () => {
    await mutate()
  }

  return {
    pets: data,
    isLoading,
    isError: !!error,
    error,
    createPet,
    removePet,
    refresh,
    isEmpty: data?.length === 0,
  }
}
