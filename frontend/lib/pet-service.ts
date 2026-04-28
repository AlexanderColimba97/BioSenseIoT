import { AuthService } from './auth-service'
import { API_V2_URL } from './api-config'
import { PetProfile, UserContextProfile } from './types'

/**
 * Herramienta auxiliar para llamadas con autenticación y reintentos
 */
async function fetchWithAuthRetry(
  url: string,
  options: RequestInit
): Promise<Response> {
  let token = await AuthService.getValidToken()

  let response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  // Si el token expiró, refrescar e intentar de nuevo
  if (response.status === 401) {
    token = await AuthService.refreshSession()
    response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
  }

  return response
}

/**
 * GET /api/v2/profile/context
 * Obtiene el contexto completo del usuario (mascotas + ambiente + perfil)
 */
export async function getUserContextProfile(): Promise<UserContextProfile> {
  try {
    const response = await fetchWithAuthRetry(`${API_V2_URL}/profile/context`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`Error obteniendo contexto: ${response.status}`)
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching user context:', error)
    throw error
  }
}

/**
 * GET (from context)
 * Obtiene solo la lista de mascotas del usuario
 */
export async function getPetsList(): Promise<PetProfile[]> {
  try {
    const context = await getUserContextProfile()
    return context.pets || []
  } catch (error) {
    console.error('Error fetching pets list:', error)
    throw error
  }
}

/**
 * POST /api/v2/profile/pets
 * Crea una nueva mascota o actualiza una existente
 */
export async function savePet(pet: Partial<PetProfile>): Promise<PetProfile> {
  try {
    // Validación básica
    if (!pet.name || !pet.species) {
      throw new Error('Nombre y especie son requeridos')
    }

    const payload = {
      name: pet.name,
      species: pet.species,
      breed: pet.breed || '',
      ageYears: pet.ageYears || undefined,
      weightKg: pet.weightKg || undefined,
      sensitivityLevel: pet.sensitivityLevel || 'NORMAL',
      respiratoryRisk: pet.respiratoryRisk || 'LOW',
      activityLevel: pet.activityLevel || 'ACTIVE',
      vulnerabilities: pet.vulnerabilities || '',
    }

    const response = await fetchWithAuthRetry(`${API_V2_URL}/profile/pets`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `Error guardando mascota: ${response.status}`)
    }

    return response.json()
  } catch (error) {
    console.error('Error saving pet:', error)
    throw error
  }
}

/**
 * DELETE /api/v2/profile/pets/{petId}
 * Elimina una mascota por su ID
 */
export async function deletePet(petId: number): Promise<void> {
  try {
    if (!petId || petId <= 0) {
      throw new Error('ID de mascota inválido')
    }

    const response = await fetchWithAuthRetry(`${API_V2_URL}/profile/pets/${petId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`Error eliminando mascota: ${response.status}`)
    }

    // DELETE puede retornar 204 No Content
    if (response.status !== 204) {
      await response.json()
    }
  } catch (error) {
    console.error('Error deleting pet:', error)
    throw error
  }
}

/**
 * Obtiene una mascota específica por ID
 * (Implementación: filtrar de la lista)
 */
export async function getPetById(petId: number): Promise<PetProfile | null> {
  try {
    const pets = await getPetsList()
    return pets.find((pet) => pet.id === petId) || null
  } catch (error) {
    console.error('Error fetching pet by ID:', error)
    throw error
  }
}

/**
 * Valida si una mascota tiene factores de riesgo respiratorio
 */
export function hasPetRespiratoryRisk(pet: PetProfile): boolean {
  return (
    pet.respiratoryRisk === 'HIGH' ||
    pet.respiratoryRisk === 'CRITICAL' ||
    pet.vulnerabilities?.includes('respiratorio') ||
    false
  )
}

/**
 * Calcula un nivel de riesgo general para una mascota
 * basado en sus características
 */
export function calculatePetRiskScore(pet: PetProfile): number {
  let score = 0

  if (hasPetRespiratoryRisk(pet)) score += 3
  if (pet.sensitivityLevel === 'HIGH') score += 2
  if (pet.activityLevel === 'INACTIVE') score += 1

  return Math.min(score, 5)
}
