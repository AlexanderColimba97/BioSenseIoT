"use client"

import { useState, useEffect } from "react"
import { 
  Pencil, 
  Moon, 
  Globe, 
  LogOut,
  ChevronDown,
  Bell,
  Smartphone,
  Shield,
  Plus,
  LayoutDashboard,
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { AuthService } from "@/lib/auth-service"
import { getUserDevices, unlinkDevice, type Device } from "@/lib/device-service"
import SyncDeviceModal from "@/components/SyncDeviceModal"
import { toast } from "sonner"

interface ProfileViewProps {
  onNavigateToDashboard?: () => void
}

export function ProfileView({ onNavigateToDashboard }: ProfileViewProps) {
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [language, setLanguage] = useState("Español")
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [devices, setDevices] = useState<Device[]>([])
  const [loadingDevices, setLoadingDevices] = useState(false)

  const loadDevices = async () => {
    setLoadingDevices(true)
    try {
      const data = await getUserDevices()
      setDevices(data)
    } catch (error) {
      console.error('Error loading devices:', error)
    } finally {
      setLoadingDevices(false)
    }
  }

  useEffect(() => {
    loadDevices()
  }, [])

  const handleLogout = () => {
    AuthService.logout();
    window.location.reload();
  };

  const handleSyncSuccess = () => {
    setShowSyncModal(false)
    toast.success('Dispositivo vinculado correctamente')
    localStorage.setItem('device_activated', 'true')
    localStorage.setItem('device_status', 'active')
    loadDevices()
  }

  const handleUnlink = async (deviceId: number) => {
    if (!confirm('¿Deseas desvincular este dispositivo?')) return
    try {
      await unlinkDevice(deviceId)
      toast.success('Dispositivo desvinculado')
      loadDevices()
    } catch (error) {
      toast.error('Error al desvincular el dispositivo')
    }
  }

  return (
    <div className="pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <div className="p-4 pb-0">
        <h1 className="text-2xl font-bold tracking-tight">Mi BioSense</h1>
      </div>

      {/* User Card */}
      <div className="p-4">
        <div className="bg-card rounded-3xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary/20">
              AC
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg">Alex Colimba</h2>
              <p className="text-sm text-muted-foreground truncate">alexis10129706@gmail.com</p>
            </div>
            <Button variant="secondary" size="icon" className="rounded-xl">
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* HARDWARE: Device list */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Mis Dispositivos</h2>
          </div>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => setShowSyncModal(true)}
          >
            <Plus className="w-4 h-4" />
            Sincronizar
          </Button>
        </div>

        {loadingDevices ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            Cargando dispositivos...
          </div>
        ) : devices.length === 0 ? (
          <div className="bg-card rounded-3xl border border-dashed border-border p-6 text-center space-y-3">
            <Smartphone className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              No tienes dispositivos vinculados. Pulsa "Sincronizar" para añadir tu ESP32.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className="bg-card rounded-2xl border border-border/50 p-4 flex items-center justify-between shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{device.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{device.macAddress}</p>
                </div>
                <div className="flex gap-2 ml-3">
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1"
                    onClick={onNavigateToDashboard}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleUnlink(device.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CONFIGURACIÓN: Agrupada por funcionalidad */}
      <div className="px-4 space-y-6">

        {/* Notificaciones y Preferencias */}
        <section>
          <h2 className="font-bold text-lg mb-3 px-1">Preferencias</h2>
          <div className="bg-card rounded-3xl border border-border/50 overflow-hidden shadow-sm">

            {/* Modo Oscuro */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <Moon className="w-4 h-4 text-slate-600" />
                </div>
                <span className="text-sm font-medium">Modo Oscuro</span>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>

            {/* Notificaciones */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Bell className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-sm font-medium">Alertas Críticas</span>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>

            {/* Idioma */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Globe className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-sm font-medium">Idioma</span>
              </div>
              <button className="flex items-center gap-1 text-sm font-bold text-primary">
                {language} <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Seguridad y Sistema */}
        <section>
          <div className="bg-card rounded-3xl border border-border/50 overflow-hidden shadow-sm">
            <button className="w-full flex items-center justify-between p-4 border-b border-border/30 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Shield className="w-4 h-4 text-purple-500" />
                </div>
                <span className="text-sm font-medium">Seguridad de la cuenta</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90" />
            </button>
            <div className="p-4 bg-slate-50/50">
              <p className="text-[10px] text-center text-slate-400 font-medium uppercase tracking-tighter">
                BioSense IoT Monitor • Versión 2.0.4 PRO
              </p>
            </div>
          </div>
        </section>

        {/* Botón de Salida */}
        <div className="pt-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full h-14 rounded-2xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold gap-2"
          >
            <LogOut className="w-5 h-5" />
            CERRAR SESIÓN
          </Button>
        </div>
      </div>

      {showSyncModal && (
        <SyncDeviceModal
          onClose={() => setShowSyncModal(false)}
          onSuccess={handleSyncSuccess}
        />
      )}
    </div>
  )
}
