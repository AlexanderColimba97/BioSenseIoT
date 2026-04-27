import { AuthService } from './auth-service';
import { API_V2_URL } from './api-config';
import { EnvironmentProfile, PetProfile, UserContextProfile } from './types';

async function fetchWithAuthRetry(url: string, options: RequestInit): Promise<Response> {
  let token = await AuthService.getValidToken();

  let response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status !== 401) {
    return response;
  }

  token = await AuthService.refreshSession();
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

export async function getUserContextProfile(): Promise<UserContextProfile> {
  const response = await fetchWithAuthRetry(`${API_V2_URL}/profile/context`, { method: 'GET' });
  if (!response.ok) {
    throw new Error('No se pudo cargar el perfil contextual');
  }
  return response.json();
}

export async function savePetProfile(pet: PetProfile): Promise<PetProfile> {
  const response = await fetchWithAuthRetry(`${API_V2_URL}/profile/pets`, {
    method: 'POST',
    body: JSON.stringify(pet),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'No se pudo guardar la mascota');
  }

  return response.json();
}

export async function deletePetProfile(petId: number): Promise<void> {
  const response = await fetchWithAuthRetry(`${API_V2_URL}/profile/pets/${petId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('No se pudo eliminar la mascota');
  }
}

export async function saveEnvironmentProfile(environment: EnvironmentProfile): Promise<EnvironmentProfile> {
  const response = await fetchWithAuthRetry(`${API_V2_URL}/profile/environment`, {
    method: 'PUT',
    body: JSON.stringify(environment),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'No se pudo guardar el entorno');
  }

  return response.json();
}
