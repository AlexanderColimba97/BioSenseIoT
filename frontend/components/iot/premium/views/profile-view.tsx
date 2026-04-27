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
  Trash2,
  PawPrint,
  Home
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { AuthService } from "@/lib/auth-service"
import { getUserDevices, unlinkDevice, type Device } from "@/lib/device-service"
import { deletePetProfile, getUserContextProfile, saveEnvironmentProfile, savePetProfile } from "@/lib/profile-context-service"
import type { EnvironmentProfile, PetProfile } from "@/lib/types"
import SyncDeviceModal from "@/components/SyncDeviceModal"
import { toast } from "sonner"

interface ProfileViewProps {
  onNavigateToDashboard?: () => void
}

export function ProfileView({ onNavigateToDashboard }: ProfileViewProps) {
  const currentUser = AuthService.getCurrentUser()
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [language, setLanguage] = useState("Español")
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [devices, setDevices] = useState<Device[]>([])
  const [loadingDevices, setLoadingDevices] = useState(false)
  const [pets, setPets] = useState<PetProfile[]>([])
  const [environment, setEnvironment] = useState<EnvironmentProfile>({
    profileName: "Principal",
    spaceType: "APARTMENT",
    areaType: "INDOOR",
    ventilationLevel: "MEDIUM",
    urbanContext: "URBAN",
    notes: "",
  })
  const [savingPet, setSavingPet] = useState(false)
  const [savingEnvironment, setSavingEnvironment] = useState(false)
  const [petForm, setPetForm] = useState<PetProfile>({
    name: "",
    species: "DOG",
    breed: "",
    ageYears: undefined,
    weightKg: undefined,
    sensitivityLevel: "MEDIUM",
    respiratoryRisk: "NORMAL",
    activityLevel: "MEDIUM",
    vulnerabilities: "",
  })

  const loadDevices = async () => {
    setLoadingDevices(true)
    try {
      const data = await getUserDevices()
      setDevices(data)
      localStorage.setItem('device_activated', data.length > 0 ? 'true' : 'false')
      localStorage.setItem('device_status', data.length > 0 ? 'active' : 'inactive')
    } catch (error) {
      console.error('Error loading devices:', error)
    } finally {
      setLoadingDevices(false)
    }
  }

  useEffect(() => {
    loadDevices()
    loadProfileContext()
  }, [])

  const loadProfileContext = async () => {
    try {
      const context = await getUserContextProfile()
      setPets(context.pets || [])
      if (context.environment) {
        setEnvironment(context.environment)
      }
    } catch (error) {
      console.error('Error loading profile context:', error)
    }
  }

  const handleLogout = async () => {
    await AuthService.logout();
    window.location.reload();
  };

  const handleSyncSuccess = () => {
    setShowSyncModal(false)
    toast.success('Dispositivo vinculado correctamente')
    localStorage.setItem('device_activated', 'true')
    localStorage.setItem('device_status', 'active')
    window.dispatchEvent(new Event('biosense-device-sync-success'))
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

  const handleSavePet = async () => {
    if (!petForm.name || !petForm.breed) {
      toast.error('Nombre y raza son requeridos')
      return
    }

    try {
      setSavingPet(true)
      await savePetProfile(petForm)
      toast.success('Mascota guardada')
      setPetForm({
        name: "",
        species: "DOG",
        breed: "",
        ageYears: undefined,
        weightKg: undefined,
        sensitivityLevel: "MEDIUM",
        respiratoryRisk: "NORMAL",
        activityLevel: "MEDIUM",
        vulnerabilities: "",
      })
      loadProfileContext()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar la mascota'
      toast.error(message)
    } finally {
      setSavingPet(false)
    }
  }

  const handleDeletePet = async (petId?: number) => {
    if (!petId) return
    if (!confirm('¿Eliminar esta mascota del perfil?')) return

    try {
      await deletePetProfile(petId)
      toast.success('Mascota eliminada')
      loadProfileContext()
    } catch {
      toast.error('No se pudo eliminar la mascota')
    }
  }

  const handleSaveEnvironment = async () => {
    try {
      setSavingEnvironment(true)
      await saveEnvironmentProfile(environment)
      toast.success('Entorno guardado')
      loadProfileContext()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el entorno'
      toast.error(message)
    } finally {
      setSavingEnvironment(false)
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
              {(currentUser?.fullName || currentUser?.email || 'B').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg">{currentUser?.fullName || 'Usuario'}</h2>
              <p className="text-sm text-muted-foreground truncate">{currentUser?.email || 'Sin correo'}</p>
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

      {/* CONTEXTO INTELIGENTE: Mascotas + Entorno */}
      <div className="px-4 space-y-6 mb-6">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <PawPrint className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Mascotas y Sensibilidad</h2>
          </div>

          <div className="bg-card rounded-3xl border border-border/50 p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                placeholder="Nombre mascota"
                value={petForm.name}
                onChange={(e) => setPetForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                placeholder="Raza"
                value={petForm.breed}
                onChange={(e) => setPetForm((prev) => ({ ...prev, breed: e.target.value }))}
              />
              <select
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                value={petForm.species}
                onChange={(e) => setPetForm((prev) => ({ ...prev, species: e.target.value }))}
              >
                <option value="DOG">Perro</option>
                <option value="CAT">Gato</option>
                <option value="BIRD">Ave</option>
                <option value="RABBIT">Conejo</option>
                <option value="OTHER">Otro</option>
              </select>
              <select
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                value={petForm.sensitivityLevel}
                onChange={(e) => setPetForm((prev) => ({ ...prev, sensitivityLevel: e.target.value }))}
              >
                <option value="LOW">Sensibilidad baja</option>
                <option value="MEDIUM">Sensibilidad media</option>
                <option value="HIGH">Sensibilidad alta</option>
              </select>
              <input
                type="number"
                min={0}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                placeholder="Edad (años)"
                value={petForm.ageYears ?? ""}
                onChange={(e) => setPetForm((prev) => ({ ...prev, ageYears: e.target.value ? Number(e.target.value) : undefined }))}
              />
              <input
                type="number"
                min={0}
                step="0.1"
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                placeholder="Peso (kg)"
                value={petForm.weightKg ?? ""}
                onChange={(e) => setPetForm((prev) => ({ ...prev, weightKg: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>

            <textarea
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder="Vulnerabilidades (asma, braquicefalia, etc.)"
              value={petForm.vulnerabilities}
              onChange={(e) => setPetForm((prev) => ({ ...prev, vulnerabilities: e.target.value }))}
            />

            <Button className="w-full" disabled={savingPet} onClick={handleSavePet}>
              {savingPet ? 'Guardando...' : 'Guardar Mascota'}
            </Button>

            {pets.length > 0 && (
              <div className="space-y-2 pt-2">
                {pets.map((pet) => (
                  <div key={`${pet.id}-${pet.name}`} className="rounded-xl border border-border/50 p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{pet.name} • {pet.species} - {pet.breed}</p>
                      <p className="text-xs text-muted-foreground">Sensibilidad: {pet.sensitivityLevel || 'MEDIUM'} | Resp: {pet.respiratoryRisk || 'NORMAL'}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeletePet(pet.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <Home className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Perfil del Entorno</h2>
          </div>

          <div className="bg-card rounded-3xl border border-border/50 p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                placeholder="Nombre del entorno"
                value={environment.profileName}
                onChange={(e) => setEnvironment((prev) => ({ ...prev, profileName: e.target.value }))}
              />
              <select
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                value={environment.spaceType}
                onChange={(e) => setEnvironment((prev) => ({ ...prev, spaceType: e.target.value }))}
              >
                <option value="HOUSE">Casa</option>
                <option value="APARTMENT">Apartamento</option>
                <option value="OFFICE">Oficina</option>
                <option value="CLINIC">Clínica</option>
                <option value="OTHER">Otro</option>
              </select>
              <select
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                value={environment.areaType}
                onChange={(e) => setEnvironment((prev) => ({ ...prev, areaType: e.target.value }))}
              >
                <option value="INDOOR">Interior</option>
                <option value="OUTDOOR">Exterior</option>
                <option value="MIXED">Mixto</option>
              </select>
              <select
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                value={environment.ventilationLevel}
                onChange={(e) => setEnvironment((prev) => ({ ...prev, ventilationLevel: e.target.value }))}
              >
                <option value="LOW">Ventilación baja</option>
                <option value="MEDIUM">Ventilación media</option>
                <option value="HIGH">Ventilación alta</option>
              </select>
            </div>
            <textarea
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder="Notas del entorno (fugas previas, humo, cocina a gas, etc.)"
              value={environment.notes || ''}
              onChange={(e) => setEnvironment((prev) => ({ ...prev, notes: e.target.value }))}
            />

            <Button className="w-full" onClick={handleSaveEnvironment} disabled={savingEnvironment}>
              {savingEnvironment ? 'Guardando...' : 'Guardar Entorno'}
            </Button>
          </div>
        </section>
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
