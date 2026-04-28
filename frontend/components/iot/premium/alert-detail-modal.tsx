'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, MapPin, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePets } from '@/hooks/use-pets'

interface AlertDetailModalProps {
  isOpen: boolean
  onClose: () => void
  alert: any
}

export function AlertDetailModal({ isOpen, onClose, alert }: AlertDetailModalProps) {
  const { pets } = usePets()
  const [petAnalysis, setPetAnalysis] = useState<string | null>(null)
  const [petLinked, setPetLinked] = useState<any | null>(null)

  useEffect(() => {
    if (!isOpen || !alert) return

    // check if user has pets - pick first for demo
    if (pets && pets.length > 0) {
      setPetLinked(pets[0])
      // call backend analysis endpoint
      fetch(`/api/v2/analytics/pet-risk?gas=${encodeURIComponent(alert.gas || 'co')}&petType=${encodeURIComponent(pets[0].type || 'dog')}`)
        .then((r) => r.json())
        .then((json) => setPetAnalysis(json?.analysis || null))
        .catch(() => setPetAnalysis(null))
    } else {
      setPetLinked(null)
      setPetAnalysis(null)
    }
  }, [isOpen, alert, pets])

  if (!isOpen || !alert) return null

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute bottom-0 left-0 right-0 top-0 bg-white overflow-auto p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">{alert.title}</h2>
            <p className="text-sm text-slate-500 flex items-center gap-2"><MapPin className="h-4 w-4" /> {alert.location} • <Clock className="h-4 w-4" /> {alert.time}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section 1: Analysis about the gas */}
        <section className="mb-6">
          <h3 className="font-semibold mb-2">Análisis de contaminación</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            {alert.gas === 'co' ? (
              <>
                El monóxido de carbono (CO) suele originarse por combustión incompleta (estufas de gas, hornos,
                escapes de vehículos). Es un gas inodoro que puede causar mareos, dolores de cabeza y en altas
                concentraciones, pérdida de conciencia.
              </>
            ) : (
              <>
                Se ha detectado una sustancia que requiere atención. Evita la exposición prolongada hasta verificar.
              </>
            )}
          </p>
        </section>

        {/* Section 2: Pet integration */}
        <section className="mb-6">
          <h3 className="font-semibold mb-2">Impacto en mascotas</h3>

          {petLinked ? (
            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-white border flex items-center justify-center">🐦</div>
                <div>
                  <p className="font-semibold">Riesgo para tu {petLinked.type} ({petLinked.name})</p>
                  <p className="text-xs text-slate-500">Análisis específico</p>
                </div>
              </div>

              <div className="text-sm text-slate-700 leading-relaxed">
                {petAnalysis ? (
                  <p>{petAnalysis}</p>
                ) : (
                  <p>
                    Las aves son extremadamente sensibles a gases y vapores; sus sistemas respiratorios son
                    muy eficientes y pequeños cambios en la calidad del aire pueden ser letales. Considera
                    mover a tu ave a una zona ventilada y consultar con un veterinario si muestra signos.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 border rounded-lg bg-slate-50 text-sm">
              <p className="font-semibold mb-2">¿Tienes mascotas?</p>
              <p className="text-slate-600">Completa el perfil de tu animal en Configuración para obtener análisis específicos.</p>
            </div>
          )}
        </section>

        {/* Section 3: Alert history (light) */}
        <section>
          <h3 className="font-semibold mb-3">Historial reciente</h3>
          <div className="space-y-2">
            {/* lightweight list: backend should supply a small history */}
            {alert.history && alert.history.length > 0 ? (
              alert.history.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between p-3 border rounded-md bg-white">
                  <div>
                    <p className="font-semibold text-sm">{h.title}</p>
                    <p className="text-xs text-slate-500">{h.location} • {h.value} • {h.time}</p>
                  </div>
                  <div className="text-xs text-slate-500">{h.resolved ? 'Resuelto' : ''}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No hay historial disponible.</p>
            )}
          </div>
        </section>

      </motion.div>
    </div>
  )
}
