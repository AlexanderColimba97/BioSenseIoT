'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Power, CheckCircle2, Loader2, Search } from 'lucide-react'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://biosenseiot-production-e061.up.railway.app').replace(/\/+$/, '')

async function linkDeviceAuto() {
  const token = localStorage.getItem('auth_token')
  if (!token) throw new Error('No autenticado')

  const response = await fetch(`${API_URL}/api/v2/devices/link-auto`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'No se encontró el dispositivo. Asegúrate de que el ESP32 esté encendido.');
  }
  return response.json();
}

async function activateDevice() {
  const token = localStorage.getItem('auth_token')
  if (!token) throw new Error('No autenticado')

  const response = await fetch(`${API_URL}/api/v2/devices/activate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al activar el dispositivo.');
  }
  return response.json();
}

export function DeviceLinkCard() {
  const [isLoading, setIsLoading] = useState(false)
  const [deviceStatus, setDeviceStatus] = useState<'inactive' | 'linked' | 'active'>('inactive')

  // Verificar estado del dispositivo al cargar
  useEffect(() => {
    const savedStatus = localStorage.getItem('device_status')
    if (savedStatus) {
      setDeviceStatus(savedStatus as 'inactive' | 'linked' | 'active')
    }
  }, [])

  const handleActivateDevice = async () => {
    setIsLoading(true)
    try {
      // Primero vincular si no está vinculado
      if (deviceStatus === 'inactive') {
        await linkDeviceAuto()
        setDeviceStatus('linked')
        localStorage.setItem('device_status', 'linked')
        toast.success('¡Dispositivo Vinculado!', { description: 'Ahora vamos a activarlo...' })
      }

      // Luego activar
      const result = await activateDevice()
      setDeviceStatus('active')
      localStorage.setItem('device_status', 'active')
      localStorage.setItem('device_activated', 'true') // Para que useSensorData sepa que debe refrescar
      
      toast.success('¡ESP32 Activado!', { description: 'Comenzará a enviar datos de sensores cada pocos segundos.' })
      
      // Recargar la página para que se active el consumo de datos
      setTimeout(() => window.location.reload(), 2000)
      
    } catch (error: any) {
      toast.error('Error', { description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
      {/* Efecto de pulso si está cargando */}
      {isLoading && (
        <div className="absolute inset-0 bg-primary/10 animate-pulse" />
      )}
      
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <Power className={isLinked ? "text-green-400" : "text-primary"} />
          Estado del Hardware
        </CardTitle>
        <CardDescription className="text-slate-400">
          Presiona para buscar y sincronizar tu sensor cercano
        </CardDescription>
      </CardHeader>

      <CardContent>
        {deviceStatus === 'inactive' ? (
          <Button 
            className="w-full h-16 text-lg font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/20 rounded-2xl gap-3 transition-all active:scale-95" 
            onClick={handleActivateDevice}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                VINCULANDO...
              </>
            ) : (
              <>
                <Search size={24} />
                SINCRONIZAR AHORA
              </>
            )}
          </Button>
        ) : deviceStatus === 'linked' ? (
          <Button 
            className="w-full h-16 text-lg font-black bg-yellow-500 hover:bg-yellow-600 text-white shadow-2xl shadow-yellow-500/20 rounded-2xl gap-3 transition-all active:scale-95" 
            onClick={handleActivateDevice}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                ACTIVANDO...
              </>
            ) : (
              <>
                <Power size={24} />
                ACTIVAR ESP32
              </>
            )}
          </Button>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 space-y-2 animate-in zoom-in-95">
            <div className="p-3 bg-green-500/20 rounded-full">
              <CheckCircle2 size={32} className="text-green-400 animate-pulse" />
            </div>
            <p className="font-bold text-green-400">ESP32 ACTIVO</p>
            <p className="text-xs text-slate-400">Enviando datos en tiempo real</p>
          </div>
        )}
        
        <p className="mt-4 text-[10px] text-slate-500 text-center uppercase tracking-widest font-medium">
          Asegúrate que el ESP32 tenga el LED Verde encendido
        </p>
      </CardContent>
    </Card>
  )
}
