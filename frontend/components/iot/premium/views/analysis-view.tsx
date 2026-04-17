"use client"

import { useState } from "react"
import { Calendar, TrendingUp, TrendingDown, AlertTriangle, FileText, Table, Loader2 } from "lucide-react"
import { StatCard } from "../stat-card"
import { Button } from "@/components/ui/button"
import { 
  Line, 
  LineChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend
} from "recharts"
import { useHistoricalData } from "@/hooks/use-historical-data"

const FALLBACK_CHART = [
  { label: "L", CO: 35, CH4: 28, COVs: 18 },
  { label: "M", CO: 40, CH4: 32, COVs: 22 },
  { label: "X", CO: 38, CH4: 30, COVs: 21 },
  { label: "J", CO: 37, CH4: 28, COVs: 25 },
  { label: "V", CO: 48, CH4: 35, COVs: 24 },
  { label: "S", CO: 45, CH4: 32, COVs: 21 },
  { label: "D", CO: 42, CH4: 30, COVs: 20 },
]

const dateRanges = ["Hoy", "7 dias", "30 dias", "90 dias"]

export function AnalysisView() {
  const [selectedRange, setSelectedRange] = useState("7 dias")
  const { chartData, stats, isLoading, hasRealData } = useHistoricalData()

  const displayData = hasRealData ? chartData : FALLBACK_CHART

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="p-4 pb-0">
        <h1 className="text-2xl font-bold tracking-tight">Analisis Historico</h1>
        {!hasRealData && !isLoading && (
          <p className="text-xs text-muted-foreground mt-1">
            Conecta tu dispositivo para ver datos reales
          </p>
        )}
      </div>

      {/* Date Range Selector */}
      <div className="p-4">
        <div className="flex items-center justify-between bg-card rounded-2xl border border-border/50 p-4 animate-fade-in-up">
          <div>
            <p className="text-sm font-medium">Rango de Fechas</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ultimos {selectedRange}</p>
          </div>
          <Button variant="default" className="rounded-xl gap-2">
            <Calendar className="w-4 h-4" />
            Seleccionar
          </Button>
        </div>
      </div>

      {/* Quick Range Pills */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {dateRanges.map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedRange === range
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Trend Chart */}
      <div className="px-4">
        <div className="bg-card rounded-2xl border border-border/50 p-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Tendencias de Gases</h3>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            {!hasRealData && !isLoading && (
              <span className="text-[10px] text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
                Demo
              </span>
            )}
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="CO" 
                  stroke="var(--chart-1)" 
                  strokeWidth={2.5}
                  dot={{ fill: 'var(--chart-1)', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="CH4" 
                  stroke="var(--chart-2)" 
                  strokeWidth={2.5}
                  dot={{ fill: 'var(--chart-2)', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="COVs" 
                  stroke="var(--chart-3)" 
                  strokeWidth={2.5}
                  dot={{ fill: 'var(--chart-3)', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <StatCard
          icon={TrendingUp}
          label="Promedio CO"
          value={hasRealData ? String(stats.avgCO) : "38"}
          unit="ppm"
          status="info"
          trend="stable"
          trendValue="últimas lecturas"
          delay={150}
        />
        <StatCard
          icon={TrendingUp}
          label="Maximo CH4"
          value={hasRealData ? String(stats.maxCH4) : "52"}
          unit="ppm"
          status="warning"
          trend="up"
          trendValue="pico registrado"
          delay={200}
        />
        <StatCard
          icon={TrendingDown}
          label="Promedio COVs"
          value={hasRealData ? String(stats.avgCOVs) : "15"}
          unit="ppm"
          status="safe"
          trend="down"
          trendValue="promedio últimas lecturas"
          delay={250}
        />
        <StatCard
          icon={AlertTriangle}
          label="Alertas Total"
          value={hasRealData ? String(stats.alertCount) : "12"}
          status="danger"
          delay={300}
        />
      </div>

      {/* Export Section */}
      <div className="px-4 pb-4">
        <div className="bg-card rounded-2xl border border-border/50 p-4 animate-fade-in-up" style={{ animationDelay: '350ms' }}>
          <h3 className="font-semibold mb-4">Exportar Datos</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="rounded-xl h-12 gap-2">
              <FileText className="w-4 h-4" />
              Exportar PDF
            </Button>
            <Button variant="outline" className="rounded-xl h-12 gap-2">
              <Table className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
