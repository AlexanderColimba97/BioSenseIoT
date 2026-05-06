import { AuthService, type StoredUserProfile } from './auth-service'
import { API_V2_URL } from './api-config'
import { DiagnosticResponse, PetProfile, Severity } from './types'

export type AlertLike = {
  id?: string | number
  title?: string
  message?: string
  gas?: string
  gasType?: string
  severity?: string
  location?: string
  time?: string
  value?: string | number
  ppm?: string | number
}

export interface AlertIntelligenceContext {
  alert: AlertLike | null | undefined
  currentUser: StoredUserProfile | null
  pets: PetProfile[]
  diagnostic?: DiagnosticResponse | null
}

export interface AlertIntelligenceReport {
  userName: string
  userEmail: string
  petSummary: string
  petType: string | null
  hasPets: boolean
  gasCode: string
  gasLabel: string
  severity: Severity | 'LOW'
  summary: string
  analysis: string
  recommendations: string[]
  source: 'local' | 'remote'
}

export interface AlertAiRequestPayload {
  user: StoredUserProfile | null
  pets: PetProfile[]
  alert: AlertLike | null | undefined
  diagnostic?: DiagnosticResponse | null
  localReport: AlertIntelligenceReport
}

export function normalizeGasCode(alert?: AlertLike | null): string {
  const raw = `${alert?.gas ?? alert?.gasType ?? alert?.title ?? alert?.message ?? ''}`.toLowerCase()

  if (raw.includes('co') || raw.includes('monóxido') || raw.includes('monoxido')) return 'co'
  if (raw.includes('mq7')) return 'co'
  if (raw.includes('mq4') || raw.includes('metano') || raw.includes('gas natural')) return 'ch4'
  if (raw.includes('mq135') || raw.includes('aire')) return 'air'
  return 'unknown'
}

export function normalizeSeverity(value?: string): Severity | 'LOW' {
  const raw = `${value ?? ''}`.toUpperCase()
  if (raw === 'CRITICAL' || raw === 'HIGH' || raw === 'MEDIUM' || raw === 'LOW') {
    return raw as Severity
  }
  if (raw === 'DANGER' || raw === 'WARNING') {
    return raw === 'DANGER' ? 'HIGH' : 'MEDIUM'
  }
  return 'LOW'
}

function gasLabelFor(code: string): string {
  switch (code) {
    case 'co':
      return 'Monóxido de carbono (CO)'
    case 'ch4':
      return 'Metano (CH4)'
    case 'air':
      return 'Calidad de aire (MQ135)'
    default:
      return 'Gas o calidad de aire'
  }
}

function petTypeLabel(pet?: PetProfile | null): string {
  if (!pet) return 'sin mascota registrada'
  return `${pet.name} (${pet.species?.toLowerCase() || 'mascota'})`
}

function buildPetRiskLine(pets: PetProfile[]): string {
  if (!pets.length) return 'No hay mascotas registradas en el perfil.'

  const types = pets.slice(0, 3).map((pet) => petTypeLabel(pet))
  const remaining = pets.length - types.length
  return remaining > 0 ? `${types.join(', ')} y ${remaining} más` : types.join(', ')
}

function extractRecommendationSteps(text?: string): string[] {
  if (!text) return []

  return text
    .split(/\n|\r/)
    .map((line) => line.replace(/^\s*\d+[.)-]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3)
}

function baseRecommendations(gasCode: string, pet?: PetProfile | null): string[] {
  const recommendations: string[] = []

  if (gasCode === 'co') {
    recommendations.push('Ventila inmediatamente el espacio y corta la fuente de combustión si es seguro hacerlo.')
  } else if (gasCode === 'ch4') {
    recommendations.push('Revisa fugas de gas natural y evita encender interruptores o llamas.')
  } else {
    recommendations.push('Reduce la exposición y mejora la ventilación del área afectada.')
  }

  if (pet?.species?.toLowerCase() === 'bird') {
    recommendations.push('Aleja al ave del área y trasládala a un ambiente con aire limpio y estable.')
  } else if (pet?.species?.toLowerCase() === 'cat' || pet?.species?.toLowerCase() === 'dog') {
    recommendations.push(`Mantén a ${pet.name} lejos del foco de riesgo y evita exposición prolongada.`)
  }

  recommendations.push('Monitorea síntomas respiratorios y consulta al veterinario si notas letargo o dificultad para respirar.')

  return recommendations.slice(0, 3)
}

export function buildLocalAlertIntelligence(context: AlertIntelligenceContext): AlertIntelligenceReport {
  const userName = context.currentUser?.fullName?.trim() || context.currentUser?.email || 'Usuario'
  const userEmail = context.currentUser?.email || ''
  const firstPet = context.pets[0] || null
  const gasCode = normalizeGasCode(context.alert)
  const gasLabel = gasLabelFor(gasCode)
  const severity = normalizeSeverity(context.alert?.severity ?? context.diagnostic?.severity)
  const petSummary = buildPetRiskLine(context.pets)
  const hasPets = context.pets.length > 0

  const diagnosticNotes = extractRecommendationSteps(context.diagnostic?.recommendation)
  const localRecommendations = baseRecommendations(gasCode, firstPet)
  const recommendations = Array.from(new Set([...diagnosticNotes, ...localRecommendations])).slice(0, 3)

  const summary = severity === 'CRITICAL' || severity === 'HIGH'
    ? `Alerta de ${gasLabel} con riesgo alto para ${hasPets ? petSummary : 'el entorno'}.`
    : `Se detectó ${gasLabel} y conviene seguir monitoreando el entorno.`

  const analysis = hasPets
    ? `El usuario ${userName} tiene ${petSummary}. ${firstPet ? `La mascota principal es ${petTypeLabel(firstPet)}.` : ''}`.trim()
    : `El usuario ${userName} no tiene mascotas registradas. El análisis se centra en el entorno y el tipo de gas detectado.`

  return {
    userName,
    userEmail,
    petSummary,
    petType: firstPet?.species?.toLowerCase() || null,
    hasPets,
    gasCode,
    gasLabel,
    severity,
    summary,
    analysis,
    recommendations,
    source: 'local'
  }
}

export function mergeAlertIntelligence(
  base: AlertIntelligenceReport,
  remote: Partial<AlertIntelligenceReport> | null | undefined
): AlertIntelligenceReport {
  if (!remote) return base

  return {
    ...base,
    ...remote,
    recommendations: remote.recommendations?.length ? remote.recommendations.slice(0, 3) : base.recommendations,
    source: 'remote'
  }
}

export async function fetchAlertAiAnalysis(payload: AlertAiRequestPayload): Promise<Partial<AlertIntelligenceReport> | null> {
  const endpoint = process.env.NEXT_PUBLIC_ALERT_AI_URL?.trim()
  if (!endpoint) return null

  const token = await AuthService.getValidToken()
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

export function buildDefaultAlertWsUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_ALERTS_WS_URL?.trim()
  if (configured) return configured

  try {
    const base = new URL(API_V2_URL)
    base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
    base.pathname = '/ws/alerts'
    base.search = ''
    return base.toString()
  } catch {
    return null
  }
}