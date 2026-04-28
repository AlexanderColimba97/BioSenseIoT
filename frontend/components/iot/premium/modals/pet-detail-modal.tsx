'use client'

import { useState, useEffect } from 'react'
import { PetProfile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PetDetailModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (pet: Partial<PetProfile>) => Promise<void>
  initialPet?: PetProfile
  isLoading?: boolean
  error?: string
}

const SPECIES_OPTIONS = [
  { value: 'DOG', label: 'Perro' },
  { value: 'CAT', label: 'Gato' },
  { value: 'BIRD', label: 'Ave' },
  { value: 'RABBIT', label: 'Conejo' },
  { value: 'HAMSTER', label: 'Hámster' },
  { value: 'OTHER', label: 'Otro' },
]

const SENSITIVITY_LEVELS = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
]

const RESPIRATORY_RISK_LEVELS = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'MILD', label: 'Leve' },
  { value: 'SEVERE', label: 'Severo' },
  { value: 'CRITICAL', label: 'Crítico' },
]

const ACTIVITY_LEVELS = [
  { value: 'INACTIVE', label: 'Sedentario' },
  { value: 'MODERATE', label: 'Moderado' },
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'VERY_ACTIVE', label: 'Muy activo' },
]

/**
 * Modal para crear/editar mascotas con validaciones
 */
export function PetDetailModal({
  isOpen,
  onClose,
  onSave,
  initialPet,
  isLoading = false,
  error,
}: PetDetailModalProps) {
  const [formData, setFormData] = useState<Partial<PetProfile>>({
    name: '',
    species: 'DOG',
    breed: '',
    ageYears: undefined,
    weightKg: undefined,
    sensitivityLevel: 'MEDIUM',
    respiratoryRisk: 'NORMAL',
    activityLevel: 'ACTIVE',
    vulnerabilities: '',
  })

  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (initialPet) {
      setFormData(initialPet)
    } else {
      setFormData({
        name: '',
        species: 'DOG',
        breed: '',
        ageYears: undefined,
        weightKg: undefined,
        sensitivityLevel: 'MEDIUM',
        respiratoryRisk: 'NORMAL',
        activityLevel: 'ACTIVE',
        vulnerabilities: '',
      })
    }
    setSaveSuccess(false)
  }, [initialPet, isOpen])

  const validateForm = (): boolean => {
    const errors: string[] = []

    if (!formData.name || formData.name.trim() === '') {
      errors.push('El nombre de la mascota es requerido')
    } else if (formData.name.length > 50) {
      errors.push('El nombre debe tener máximo 50 caracteres')
    }

    if (!formData.species) {
      errors.push('La especie es requerida')
    }

    if (formData.ageYears !== undefined) {
      if (formData.ageYears < 0 || formData.ageYears > 100) {
        errors.push('La edad debe estar entre 0 y 100 años')
      }
    }

    if (formData.weightKg !== undefined) {
      if (formData.weightKg <= 0 || formData.weightKg > 200) {
        errors.push('El peso debe estar entre 0 y 200 kg')
      }
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    try {
      setSaveSuccess(false)
      await onSave(formData)
      setSaveSuccess(true)
      setTimeout(() => {
        onClose()
      }, 800)
    } catch (err) {
      console.error('Error saving pet:', err)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-md max-h-screen overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{initialPet ? 'Editar Mascota' : 'Nueva Mascota'}</DialogTitle>
          <DialogDescription>
            {initialPet
              ? 'Actualiza la información de tu mascota'
              : 'Añade una nueva mascota a tu perfil'}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Nombre */}
          <div className='space-y-2'>
            <Label htmlFor='pet-name'>Nombre *</Label>
            <Input
              id='pet-name'
              placeholder='Ej: Max, Luna'
              value={formData.name || ''}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={isLoading}
            />
          </div>

          {/* Especie */}
          <div className='space-y-2'>
            <Label htmlFor='pet-species'>Especie *</Label>
            <Select
              value={formData.species || 'DOG'}
              onValueChange={(value) =>
                setFormData({ ...formData, species: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger id='pet-species'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPECIES_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Raza */}
          <div className='space-y-2'>
            <Label htmlFor='pet-breed'>Raza</Label>
            <Input
              id='pet-breed'
              placeholder='Ej: Labrador Retriever'
              value={formData.breed || ''}
              onChange={(e) =>
                setFormData({ ...formData, breed: e.target.value })
              }
              disabled={isLoading}
            />
          </div>

          {/* Edad */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='pet-age'>Edad (años)</Label>
              <Input
                id='pet-age'
                type='number'
                placeholder='Ej: 3'
                value={formData.ageYears || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ageYears: e.target.value === '' ? undefined : parseFloat(e.target.value),
                  })
                }
                disabled={isLoading}
                min='0'
                max='100'
              />
            </div>

            {/* Peso */}
            <div className='space-y-2'>
              <Label htmlFor='pet-weight'>Peso (kg)</Label>
              <Input
                id='pet-weight'
                type='number'
                placeholder='Ej: 25'
                value={formData.weightKg || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    weightKg: e.target.value === '' ? undefined : parseFloat(e.target.value),
                  })
                }
                disabled={isLoading}
                min='0'
                max='200'
                step='0.1'
              />
            </div>
          </div>

          {/* Sensibilidad */}
          <div className='space-y-2'>
            <Label htmlFor='pet-sensitivity'>Nivel de Sensibilidad</Label>
            <Select
              value={formData.sensitivityLevel || 'MEDIUM'}
              onValueChange={(value) =>
                setFormData({ ...formData, sensitivityLevel: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger id='pet-sensitivity'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SENSITIVITY_LEVELS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Riesgo Respiratorio */}
          <div className='space-y-2'>
            <Label htmlFor='pet-respiratory'>Riesgo Respiratorio</Label>
            <Select
              value={formData.respiratoryRisk || 'NORMAL'}
              onValueChange={(value) =>
                setFormData({ ...formData, respiratoryRisk: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger id='pet-respiratory'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESPIRATORY_RISK_LEVELS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nivel de Actividad */}
          <div className='space-y-2'>
            <Label htmlFor='pet-activity'>Nivel de Actividad</Label>
            <Select
              value={formData.activityLevel || 'ACTIVE'}
              onValueChange={(value) =>
                setFormData({ ...formData, activityLevel: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger id='pet-activity'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_LEVELS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vulnerabilidades */}
          <div className='space-y-2'>
            <Label htmlFor='pet-vulnerabilities'>Vulnerabilidades / Condiciones</Label>
            <Textarea
              id='pet-vulnerabilities'
              placeholder='Ej: alérgico a polvo, problemas respiratorios, reacciones a cambios de temperatura'
              value={formData.vulnerabilities || ''}
              onChange={(e) =>
                setFormData({ ...formData, vulnerabilities: e.target.value })
              }
              disabled={isLoading}
              rows={3}
              className='resize-none'
            />
            <p className='text-xs text-gray-500'>
              Describe cualquier condición especial o alergia
            </p>
          </div>

          {/* Error Messages */}
          {validationErrors.length > 0 && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>
                <ul className='list-disc list-inside mt-2 space-y-1'>
                  {validationErrors.map((err, idx) => (
                    <li key={idx} className='text-sm'>
                      {err}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* General Error */}
          {error && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {saveSuccess && (
            <Alert className='border-green-200 bg-green-50'>
              <CheckCircle className='h-4 w-4 text-green-600' />
              <AlertDescription className='text-green-800'>
                ¡Mascota guardada exitosamente!
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
