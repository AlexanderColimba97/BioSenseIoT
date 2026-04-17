'use client'

import useSWR from 'swr'
import { AuthService } from '@/lib/auth-service'
import { getUserDevices, getDeviceReadings, SensorReading } from '@/lib/device-service'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://biosenseiot-production-e061.up.railway.app').replace(/\/+$/, '')

export interface ChartPoint {
  label: string
  CO: number
  CH4: number
  COVs: number
}

export interface ReadingStats {
  avgCO: number
  maxCO: number
  avgCH4: number
  maxCH4: number
  avgCOVs: number
  alertCount: number
}

function groupReadingsByDay(readings: SensorReading[]): ChartPoint[] {
  const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  type DayEntry = { dayOfWeek: number; co: number[]; ch4: number[]; covs: number[] }
  const dayMap: Map<string, DayEntry> = new Map()

  for (const r of readings) {
    const d = new Date(r.timestamp)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!dayMap.has(key)) {
      dayMap.set(key, { dayOfWeek: d.getDay(), co: [], ch4: [], covs: [] })
    }
    const entry = dayMap.get(key)!
    entry.co.push(r.mq7)
    entry.ch4.push(r.mq4)
    entry.covs.push(r.mq135)
  }

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0

  return Array.from(dayMap.values())
    .slice(-7)
    .map((val) => ({
      label: dayNames[val.dayOfWeek] || '?',
      CO: avg(val.co),
      CH4: avg(val.ch4),
      COVs: avg(val.covs),
    }))
}

function computeStats(readings: SensorReading[]): ReadingStats {
  if (!readings.length) return { avgCO: 0, maxCO: 0, avgCH4: 0, maxCH4: 0, avgCOVs: 0, alertCount: 0 }
  const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
  const coArr = readings.map(r => r.mq7)
  const ch4Arr = readings.map(r => r.mq4)
  const covsArr = readings.map(r => r.mq135)
  const alertCount = readings.filter(r => r.airQualityState === 'DANGER' || r.airQualityState === 'WARNING').length
  return {
    avgCO: avg(coArr),
    maxCO: Math.round(Math.max(...coArr)),
    avgCH4: avg(ch4Arr),
    maxCH4: Math.round(Math.max(...ch4Arr)),
    avgCOVs: avg(covsArr),
    alertCount,
  }
}

async function fetchHistoricalData(): Promise<{ chart: ChartPoint[]; stats: ReadingStats; deviceId: number | null }> {
  const token = AuthService.getToken()
  if (!token) return { chart: [], stats: { avgCO: 0, maxCO: 0, avgCH4: 0, maxCH4: 0, avgCOVs: 0, alertCount: 0 }, deviceId: null }

  const devices = await getUserDevices()
  if (!devices.length) return { chart: [], stats: { avgCO: 0, maxCO: 0, avgCH4: 0, maxCH4: 0, avgCOVs: 0, alertCount: 0 }, deviceId: null }

  const deviceId = devices[0].id
  const readings = await getDeviceReadings(deviceId, 200)

  return {
    chart: groupReadingsByDay(readings),
    stats: computeStats(readings),
    deviceId,
  }
}

export function useHistoricalData() {
  const { data, error, isLoading } = useSWR(
    'historical-readings',
    fetchHistoricalData,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
    }
  )

  return {
    chartData: data?.chart ?? [],
    stats: data?.stats ?? { avgCO: 0, maxCO: 0, avgCH4: 0, maxCH4: 0, avgCOVs: 0, alertCount: 0 },
    deviceId: data?.deviceId ?? null,
    isLoading,
    isError: !!error,
    hasRealData: !!(data?.chart?.length),
  }
}
