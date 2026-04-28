'use client'

/**
 * EJEMPLOS DEL NUEVO DASHBOARD
 * 
 * Muestra cómo se verá el dashboard con diferentes severidades
 * y cómo la función parseRecommendationToAlert() transforma
 * recomendaciones del backend en AlertSummary
 */

import { AlertSummary, AlertSeverity } from '@/components/iot/premium/alert-summary'

// ============================================================================
// EJEMPLO 1: DASHBOARD CON AIRE SEGURO (SAFE)
// ============================================================================

export function DashboardExample_Safe() {
  return (
    <div className="p-4 space-y-4">
      {/* BLOQUE A: Estado Global */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6">
        <h2 className="text-2xl font-black">Aire limpio</h2>
        <p className="text-sm text-emerald-700 mt-2">AQI: 35</p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center">
            <p className="text-xl font-bold">32 ppm</p>
            <p className="text-xs text-slate-600">CO (MQ7)</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">120 ppm</p>
            <p className="text-xs text-slate-600">CH4 (MQ4)</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">45 ppm</p>
            <p className="text-xs text-slate-600">Air (MQ135)</p>
          </div>
        </div>
      </div>

      {/* BLOQUE B: Alerta/Recomendación (NUEVO) */}
      <AlertSummary
        severity="SAFE"
        message="Condiciones óptimas para mascotas"
        actions={[
          'Continuar con actividades normales',
          'Mantener ventilación adecuada'
        ]}
      />

      {/* BLOQUE C: Métricas de sensores */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-slate-200 rounded-2xl p-3">
          <p className="font-bold">CO</p>
          <p className="text-2xl font-black">32</p>
          <div className="h-2 bg-emerald-500 rounded mt-2" />
        </div>
        <div className="border border-slate-200 rounded-2xl p-3">
          <p className="font-bold">CH4</p>
          <p className="text-2xl font-black">120</p>
          <div className="h-2 w-1/2 bg-amber-500 rounded mt-2" />
        </div>
        <div className="border border-slate-200 rounded-2xl p-3">
          <p className="font-bold">Air</p>
          <p className="text-2xl font-black">45</p>
          <div className="h-2 w-1/3 bg-emerald-500 rounded mt-2" />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// EJEMPLO 2: DASHBOARD CON RIESGO LEVE (WARNING)
// ============================================================================

export function DashboardExample_Warning() {
  return (
    <div className="p-4 space-y-4">
      {/* BLOQUE A: Estado Global */}
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6">
        <h2 className="text-2xl font-black">Aire moderado</h2>
        <p className="text-sm text-amber-700 mt-2">AQI: 68</p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center">
            <p className="text-xl font-bold">65 ppm</p>
            <p className="text-xs text-slate-600">CO (MQ7)</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">240 ppm</p>
            <p className="text-xs text-slate-600">CH4 (MQ4)</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">110 ppm</p>
            <p className="text-xs text-slate-600">Air (MQ135)</p>
          </div>
        </div>
      </div>

      {/* BLOQUE B: Alerta/Recomendación */}
      <AlertSummary
        severity="WARNING"
        message="Riesgo leve para mascotas sensibles"
        actions={[
          'Mejorar ventilación',
          'Evitar exposición prolongada'
        ]}
      />

      {/* BLOQUE C: Métricas de sensores */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-slate-200 rounded-2xl p-3">
          <p className="font-bold">CO</p>
          <p className="text-2xl font-black">65</p>
          <div className="h-2 w-1/2 bg-amber-500 rounded mt-2" />
        </div>
        <div className="border border-slate-200 rounded-2xl p-3">
          <p className="font-bold">CH4</p>
          <p className="text-2xl font-black">240</p>
          <div className="h-2 w-3/4 bg-amber-500 rounded mt-2" />
        </div>
        <div className="border border-slate-200 rounded-2xl p-3">
          <p className="font-bold">Air</p>
          <p className="text-2xl font-black">110</p>
          <div className="h-2 w-2/3 bg-amber-500 rounded mt-2" />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// EJEMPLO 3: DASHBOARD CON RIESGO ELEVADO (DANGER)
// ============================================================================

export function DashboardExample_Danger() {
  return (
    <div className="p-4 space-y-4">
      {/* BLOQUE A: Estado Global */}
      <div className="bg-orange-50 border border-orange-200 rounded-3xl p-6">
        <h2 className="text-2xl font-black">Aire peligroso</h2>
        <p className="text-sm text-orange-700 mt-2">AQI: 145</p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center">
            <p className="text-xl font-bold">95 ppm</p>
            <p className="text-xs text-slate-600">CO (MQ7)</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">380 ppm</p>
            <p className="text-xs text-slate-600">CH4 (MQ4)</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">210 ppm</p>
            <p className="text-xs text-slate-600">Air (MQ135)</p>
          </div>
        </div>
      </div>

      {/* BLOQUE B: Alerta/Recomendación */}
      <AlertSummary
        severity="DANGER"
        message="Riesgo elevado para mascotas sensibles"
        actions={[
          'Ventilar el área',
          'Reducir tiempo de exposición',
          'Monitorear a mascotas'
        ]}
      />

      {/* BLOQUE C: Métricas de sensores */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-slate-200 rounded-2xl p-3">
          <p className="font-bold">CO</p>
          <p className="text-2xl font-black">95</p>
          <div className="h-2 w-3/4 bg-orange-500 rounded mt-2" />
        </div>
        <div className="border border-slate-200 rounded-2xl p-3">
          <p className="font-bold">CH4</p>
          <p className="text-2xl font-black">380</p>
          <div className="h-2 w-full bg-orange-500 rounded mt-2" />
        </div>
        <div className="border border-slate-200 rounded-2xl p-3">
          <p className="font-bold">Air</p>
          <p className="text-2xl font-black">210</p>
          <div className="h-2 w-full bg-orange-500 rounded mt-2" />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// EJEMPLO 4: DASHBOARD CON RIESGO CRÍTICO (CRITICAL)
// ============================================================================

export function DashboardExample_Critical() {
  return (
    <div className="p-4 space-y-4">
      {/* BLOQUE A: Estado Global */}
      <div className="bg-red-50 border border-red-200 rounded-3xl p-6">
        <h2 className="text-2xl font-black">Aire crítico</h2>
        <p className="text-sm text-red-700 mt-2">AQI: 280</p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center">
            <p className="text-xl font-bold">120 ppm</p>
            <p className="text-xs text-slate-600">CO (MQ7)</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">450 ppm</p>
            <p className="text-xs text-slate-600">CH4 (MQ4)</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">280 ppm</p>
            <p className="text-xs text-slate-600">Air (MQ135)</p>
          </div>
        </div>
      </div>

      {/* BLOQUE B: Alerta/Recomendación */}
      <AlertSummary
        severity="CRITICAL"
        message="Riesgo crítico para mascotas"
        actions={[
          'Evacuar el área inmediatamente',
          'Ventilar todos los espacios',
          'Revisar sistema de sensores'
        ]}
      />

      {/* BLOQUE C: Métricas de sensores */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-slate-200 rounded-2xl p-3">
          <p className="font-bold">CO</p>
          <p className="text-2xl font-black">120</p>
          <div className="h-2 w-full bg-red-500 rounded mt-2" />
        </div>
        <div className="border border-slate-200 rounded-2xl p-3">
          <p className="font-bold">CH4</p>
          <p className="text-2xl font-black">450</p>
          <div className="h-2 w-full bg-red-500 rounded mt-2" />
        </div>
        <div className="border border-slate-200 rounded-2xl p-3">
          <p className="font-bold">Air</p>
          <p className="text-2xl font-black">280</p>
          <div className="h-2 w-full bg-red-500 rounded mt-2" />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// EJEMPLO 5: FUNCIÓN PARSEANDO RECOMENDACIONES DEL BACKEND
// ============================================================================

/**
 * Esta función transforma recomendaciones largas del backend
 * en AlertSummary estructurada
 */

function parseRecommendationToAlert(recommendation: string) {
  const text = (recommendation || '').toLowerCase().trim()

  if (text.includes('crítico') || text.includes('peligro')) {
    return {
      severity: 'CRITICAL' as AlertSeverity,
      message: 'Riesgo crítico para mascotas',
      actions: [
        'Evacuar el área inmediatamente',
        'Ventilar todos los espacios',
        'Revisar sistema de sensores'
      ]
    }
  }

  if (text.includes('alto') || text.includes('grave')) {
    return {
      severity: 'DANGER' as AlertSeverity,
      message: 'Riesgo elevado para mascotas sensibles',
      actions: ['Ventilar el área', 'Reducir tiempo de exposición', 'Monitorear a mascotas']
    }
  }

  if (text.includes('moderado') || text.includes('precaución')) {
    return {
      severity: 'WARNING' as AlertSeverity,
      message: 'Riesgo leve para mascotas sensibles',
      actions: ['Mejorar ventilación', 'Evitar exposición prolongada']
    }
  }

  return {
    severity: 'SAFE' as AlertSeverity,
    message: 'Condiciones óptimas para mascotas',
    actions: ['Continuar con actividades normales', 'Mantener ventilación adecuada']
  }
}

// USOS:

// Caso 1: Recomendación larga del backend
const rec1 = `
  Dado que se detecta CO 45ppm, CH4 120ppm y Air Quality 85ppm,
  con AQI 67, indicando aire moderadamente contaminado, se recomienda
  mejorar ventilación cruzada y reducir tiempo de exposición para mascotas.
`
const alert1 = parseRecommendationToAlert(rec1)
// → { severity: 'WARNING', message: '...', actions: [...] }

// Caso 2: Recomendación crítica
const rec2 = `
  SE HA DETECTADO SITUACIÓN CRÍTICA. CO 120ppm, CH4 450ppm.
  Riesgo crítico para mascotas. Evacuación inmediata requerida.
`
const alert2 = parseRecommendationToAlert(rec2)
// → { severity: 'CRITICAL', message: '...', actions: [...] }

// Caso 3: En el dashboard
export function DashboardIntegrationExample() {
  const recommendationFromBackend =
    'Detectado nivel alto de CO. Recomendamos aumentar ventilación y reducir exposición de mascotas.'

  const alert = parseRecommendationToAlert(recommendationFromBackend)

  return (
    <div className="p-4">
      {/* Bloque A: Estado Global */}
      <div className="bg-slate-100 p-4 rounded-lg mb-4">Estado: AQI 92</div>

      {/* Bloque B: AlertSummary */}
      <AlertSummary
        severity={alert.severity}
        message={alert.message}
        actions={alert.actions}
      />

      {/* Resto del dashboard */}
    </div>
  )
}

// ============================================================================
// EJEMPLO 6: COMPARATIVA ANTES vs DESPUÉS
// ============================================================================

export function ComparativaAntesVsDespues() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {/* ANTES */}
      <div>
        <h3 className="font-bold mb-2 text-red-600">❌ ANTES (Problemático)</h3>
        <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
          <h4 className="font-bold text-sm mb-2">Recomendación IA</h4>
          <p className="text-xs leading-relaxed text-justify">
            Dado que se detectan niveles moderados de monóxido de carbono (45 ppm), metano (120 ppm)
            y calidad del aire degradada (85 ppm), generando un índice de calidad del aire (AQI) de
            67, se recomienda implementar mejoras inmediatas de ventilación cruzada, reducir tiempos
            de exposición especialmente para mascotas con sensibilidades respiratorias conocidas, y
            mantener un monitoreo continuo de los parámetros ambientales...
          </p>
          <button className="mt-3 text-xs px-2 py-1 bg-white border rounded">
            Ver recomendaciones
          </button>
        </div>
        <ul className="mt-4 text-xs space-y-1 text-red-700">
          <li>❌ 6+ líneas de texto</li>
          <li>❌ Mezcla datos técnicos (ppm, AQI)</li>
          <li>❌ No es escaneable</li>
          <li>❌ No genera urgencia</li>
          <li>❌ Párrafo completo antes de acciones</li>
        </ul>
      </div>

      {/* DESPUÉS */}
      <div>
        <h3 className="font-bold mb-2 text-emerald-600">✅ DESPUÉS (Moderno)</h3>
        <div className="border-2 border-amber-200 rounded-lg p-4 bg-amber-50">
          <div className="flex items-start gap-2 mb-2">
            <span className="font-bold text-xs px-2 py-1 bg-amber-100 rounded">WARNING</span>
          </div>
          <p className="text-sm font-medium mb-3">Riesgo leve para mascotas sensibles</p>
          <ul className="text-xs space-y-1 text-amber-900">
            <li>• Mejorar ventilación</li>
            <li>• Evitar exposición prolongada</li>
          </ul>
        </div>
        <ul className="mt-4 text-xs space-y-1 text-emerald-700">
          <li>✅ 1 frase + máx 3 acciones</li>
          <li>✅ Cero datos técnicos</li>
          <li>✅ Completamente escaneable</li>
          <li>✅ Clara urgencia (WARNING badge)</li>
          <li>✅ Acciones inmediatas</li>
        </ul>
      </div>
    </div>
  )
}
