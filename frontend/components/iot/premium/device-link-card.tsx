'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Power, CheckCircle2, Bluetooth, Info } from 'lucide-react'
import SyncDeviceModal from '@/components/SyncDeviceModal'

export function DeviceLinkCard() {
  const [showModal, setShowModal] = useState(false)
  const [isLinked, setIsLinked] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('device_status') === 'active'
    }
    return false
  })

  const handleSuccess = () => {
    setIsLinked(true)
    localStorage.setItem('device_status', 'active')
    localStorage.setItem('device_activated', 'true')
    setShowModal(false)
    setTimeout(() => window.location.reload(), 1500)
  }

  return (
    <>
      <Card className="border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Power className={isLinked ? "text-green-400" : "text-primary"} />
            Estado del Hardware
          </CardTitle>
          <CardDescription className="text-slate-400">
            Vincula tu sensor ESP32 mediante Bluetooth
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLinked ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-2 animate-in zoom-in-95">
              <div className="p-3 bg-green-500/20 rounded-full">
                <CheckCircle2 size={32} className="text-green-400 animate-pulse" />
              </div>
              <p className="font-bold text-green-400">ESP32 ACTIVO</p>
              <p className="text-xs text-slate-400">Enviando datos en tiempo real</p>
            </div>
          ) : (
            <Button
              className="w-full h-16 text-lg font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/20 rounded-2xl gap-3 transition-all active:scale-95"
              onClick={() => setShowModal(true)}
            >
              <Bluetooth size={24} />
              SINCRONIZAR VÍA BLUETOOTH
            </Button>
          )}

          <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-400">
            <Info size={12} className="flex-shrink-0 mt-0.5" />
            <p>
              {isLinked
                ? 'Asegúrate de que el ESP32 tenga el LED Verde encendido'
                : 'Enciende el ESP32 y pulsa el botón para iniciar la vinculación Bluetooth'}
            </p>
          </div>
        </CardContent>
      </Card>

      {showModal && (
        <SyncDeviceModal
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
