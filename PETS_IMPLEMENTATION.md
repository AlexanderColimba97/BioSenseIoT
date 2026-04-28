# 🐾 Lógica de Mascotas - Implementación Frontend

## Resumen de Implementación

Se ha implementado una suite completa de componentes y hooks para gestionar mascotas en el frontend. Esta incluye:

- ✅ **Hooks de gestión**: `usePets()`, `usePetRisk()`, `usePetHistory()`
- ✅ **Componentes de UI**: Modales, selectores, indicadores, grids, vistas
- ✅ **Integración Dashboard**: Mostrar mascotas en riesgo
- ✅ **Integración Alertas**: Filtrar por mascota y mostrar impacto
- ✅ **Cálculo de riesgo dinámico**: Basado en perfil + diagnóstico

---

## Archivos Creados

### 📁 Hooks
```
hooks/
├── use-pets.ts                    ✅ (Existente - sin cambios)
├── use-pet-risk.ts               🆕 Cálculo dinámico de riesgo
└── use-pet-history.ts            🆕 Historial de diagnósticos
```

### 📁 Componentes
```
components/iot/premium/
├── pet-risk-indicator.tsx        🆕 Badge/Card de riesgo
├── modals/
│   └── pet-detail-modal.tsx      🆕 CRUD de mascotas
├── selectors/
│   └── pet-selector.tsx          🆕 Dropdown para seleccionar
├── cards/
│   └── pets-grid.tsx             🆕 Grid con resumen de riesgos
├── views/
│   ├── pet-list-view.tsx         🆕 Tabla con filtros
│   ├── alerts-view.tsx           ✏️  Integración de mascotas
│   └── dashboard-view.tsx        ✏️  Indicador de mascotas en riesgo
└── pages/
    └── pets-management-page.tsx  🆕 Página completa de gestión
```

---

## 🚀 Características por Componente

### 1. **usePetRisk() Hook**
Calcula el riesgo de una mascota basado en:
- Riesgo respiratorio (NORMAL/MILD/SEVERE/CRITICAL)
- Nivel de sensibilidad (LOW/MEDIUM/HIGH)
- Edad (avanzada o muy temprana)
- Peso anormal
- Actividad física baja
- Vulnerabilidades específicas
- Diagnóstico reciente

**Retorna:**
```typescript
{
  petId, petName,
  baseRiskScore: 0-5,
  currentSeverity: 'SAFE' | 'WARNING' | 'DANGER' | 'CRITICAL',
  riskFactors: string[],
  affectedSensors: string[],
  recommendation: string,
  isAtRisk: boolean
}
```

### 2. **PetDetailModal**
Modal reutilizable para crear/editar mascotas:
- Validación de campos (nombre, especie requeridos)
- Selects para especies, sensibilidad, riesgo respiratorio, actividad
- Campo de vulnerabilidades con descripción libre
- Manejo de errores y éxito
- Loading state durante guardado

**Campos:**
- Nombre (required)
- Especie: DOG, CAT, BIRD, RABBIT, HAMSTER, OTHER
- Raza (optional)
- Edad (years, 0-100)
- Peso (kg, 0-200)
- Sensibilidad: LOW/MEDIUM/HIGH
- Riesgo Respiratorio: NORMAL/MILD/SEVERE/CRITICAL
- Actividad: INACTIVE/MODERATE/ACTIVE/VERY_ACTIVE
- Vulnerabilidades (texto libre)

### 3. **PetSelector**
Dropdown para seleccionar mascotas:
```tsx
<PetSelector
  pets={pets}
  selectedPetId={selectedPetId}
  onSelectPet={setSelectedPetId}
  showAllOption={true}
  allPetsLabel="Todas las mascotas"
/>
```

### 4. **PetListView**
Tabla completa con:
- Búsqueda por nombre/especie/raza
- Filtros por especie y riesgo
- Indicadores de riesgo en badges
- CRUD inline
- Resumen de riesgos
- Max height con scroll

```tsx
<PetListView
  recentDiagnostics={diagnostics}
  showAddButton={true}
  maxHeight="max-h-[600px]"
/>
```

### 5. **PetRiskIndicator**
Badge o card de riesgo (compact o expandido):

**Compact:**
```tsx
<PetRiskIndicator
  pet={pet}
  recentDiagnostics={diagnostics}
  compact={true}
  showLabel={true}
/>
```

**Expandido:**
```tsx
<PetRiskIndicator
  pet={pet}
  recentDiagnostics={diagnostics}
  compact={false}
  showLabel={true}
/>
```

Muestra:
- Badge con ícono y severidad
- Recomendación
- Factores de riesgo
- Sensores afectados
- Barra de progreso del score

### 6. **PetsGrid**
Grid visual de mascotas:
- Resumen de estadísticas (CRITICAL, DANGER, WARNING, SAFE)
- Ordenamiento por riesgo (críticas primero)
- Tooltips con factores de riesgo
- Badges flotantes
- Botón para agregar mascota

```tsx
<PetsGrid
  pets={pets}
  recentDiagnostics={diagnostics}
  onAddPet={() => {}}
  onEditPet={(pet) => {}}
  onDeletePet={(petId) => {}}
  isLoading={false}
/>
```

### 7. **PetsManagementPage**
Página completa de gestión:
- Toggle entre vista Grid/Tabla
- Controles de CRUD
- Header informativo
- Manejo de errores
- Toast notifications

```tsx
<PetsManagementPage />
```

---

## 📊 Integración en Dashboard

En `dashboard-view.tsx`:

```typescript
const { pets } = usePets()
const riskAssessments = usePetsRiskAssessment(pets, [latestDiagnostic])
const petsAtRisk = riskAssessments.filter(a => a.isAtRisk)
```

Mostrado:
- **Alerta naranja**: Si hay mascotas en riesgo
- **Mini-cards**: Hasta 2 mascotas con indicadores compactos
- **Contador**: "X mascotas más" si hay más de 2

---

## 🎯 Integración en Alertas

En `alerts-view.tsx`:

```typescript
const [selectedPetId, setSelectedPetId] = useState(null)
const selectedPet = pets?.find(p => p.id === selectedPetId)
const selectedPetRisk = usePetRisk(selectedPet, [latestDiagnostic])
```

Mostrado:
- **Selector de mascota**: Filtrar alertas por mascota
- **Card de riesgo**: Estado actual de la mascota seleccionada
- **Badges de impacto**: "Esta alerta puede afectar a [Mascota]"

---

## 🎨 Constantes de Colores

```typescript
RISK_COLORS = {
  SAFE: 'bg-green-100 text-green-800 border-green-300',
  WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  DANGER: 'bg-orange-100 text-orange-800 border-orange-300',
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
}

RISK_ICONS = {
  SAFE: '✓',
  WARNING: '⚠',
  DANGER: '⛔',
  CRITICAL: '🚨',
}

RISK_BADGE_COLORS = {
  SAFE: 'bg-green-500',
  WARNING: 'bg-yellow-500',
  DANGER: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
}
```

---

## 💾 Servicios Backend Utilizados

Se usan los servicios existentes de `lib/pet-service.ts`:

```typescript
// Obtener lista de mascotas
const pets = await getPetsList()

// Crear/actualizar mascota
const newPet = await savePet({
  name: 'Max',
  species: 'DOG',
  breed: 'Labrador',
  // ...
})

// Eliminar mascota
await deletePet(petId)

// Obtener contexto completo
const context = await getUserContextProfile()
```

**Endpoint:**
- `GET /api/v2/profile/context` - Obtiene pets + environment
- `POST /api/v2/profile/pets` - Crear/actualizar
- `DELETE /api/v2/profile/pets/{petId}` - Eliminar

---

## 🔄 Flujos de Datos

### Crear Mascota
```
PetDetailModal → usePets.createPet() 
→ savePet() → POST /api/v2/profile/pets 
→ mutate() para revalidar → toast de éxito
```

### Evaluar Riesgo
```
usePetRisk(pet, diagnostics)
→ Calcula: base score + diagnosis score
→ Retorna: assessment con severidad y recomendación
```

### Mostrar en Dashboard
```
usePets() → pets data
→ usePetsRiskAssessment() → risk data
→ filtrar petsAtRisk
→ mostrar alerta si hay riesgo
→ mostrar mini-cards de mascotas
```

---

## 📝 Uso Típico en una Página

```typescript
'use client'

import { usePets } from '@/hooks/use-pets'
import { usePetsRiskAssessment } from '@/hooks/use-pet-risk'
import { PetsGrid } from '@/components/iot/premium/cards/pets-grid'
import { PetDetailModal } from '@/components/iot/premium/modals/pet-detail-modal'

export default function MyPetsPage() {
  const { pets, createPet, removePet } = usePets()
  const riskAssessments = usePetsRiskAssessment(pets)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className='space-y-4'>
      <button onClick={() => setIsOpen(true)}>
        Agregar mascota
      </button>

      <PetsGrid
        pets={pets}
        onAddPet={() => setIsOpen(true)}
        onDeletePet={async (id) => await removePet(id)}
      />

      <PetDetailModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={async (data) => await createPet(data)}
      />
    </div>
  )
}
```

---

## ✅ Checklist de Validaciones

- ✅ Nombre de mascota requerido (1-50 caracteres)
- ✅ Especie requerida
- ✅ Edad validada (0-100 años)
- ✅ Peso validado (0-200 kg)
- ✅ Campos opcionales manejados correctamente
- ✅ Errores de servidor capturados y mostrados
- ✅ Loading states en modales y botones
- ✅ Revalidación automática después de crear/eliminar

---

## 🐛 Manejo de Errores

Todos los componentes incluyen:
- Try/catch en operaciones async
- Toast notifications para feedback
- Mensajes de error específicos
- Fallbacks graceful si no hay datos
- Estados de loading durante espera

---

## 📱 Responsividad

- ✅ PetDetailModal: Máximo ancho de contenedor
- ✅ PetListView: Tabla scrollable, columnas ocultas en mobile
- ✅ PetsGrid: Grid automático que se adapta
- ✅ PetSelector: Dropdown responsive
- ✅ Dashboard: Mascotas compactas en mobile

---

## 🔮 Futuras Mejoras

1. **Historial de riesgos**: Gráfico de tendencia por mascota
2. **Alertas personalizadas**: Por mascota
3. **Exportar datos**: CSV o PDF del perfil
4. **Fotos**: Subir foto de mascota
5. **Notas veterinarias**: Historial médico
6. **Integraciones**: Con apps veterinarias
7. **Recomendaciones personalizadas**: Según especie y edad

---

## 📞 Soporte

Para dudas sobre la implementación:
1. Revisar los comentarios en cada archivo
2. Verificar tipos en `lib/types.ts`
3. Consultar hooks de ejemplo en `hooks/`
4. Revisar integraciones en views
