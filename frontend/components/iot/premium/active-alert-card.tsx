'use client'

import { motion } from 'framer-motion'
import { FireIcon, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActiveAlertCardProps {
  id: string
  title: string
  gasType?: string
  ppm?: string
  location?: string
  time?: string
  severity?: 'CRITICAL' | 'DANGER' | 'WARNING' | 'SAFE' | string
  onClick?: () => void
}

export function ActiveAlertCard({ id, title, gasType, ppm, location, time, severity, onClick }: ActiveAlertCardProps) {
  const bg = severity === 'CRITICAL' ? 'bg-red-50 border-red-200' : severity === 'DANGER' ? 'bg-orange-50 border-orange-200' : severity === 'WARNING' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25 }}
      className={cn('border rounded-2xl p-4 cursor-pointer flex items-center justify-between', bg)}
      onClick={onClick}
      role="button"
      aria-label={`Abrir alerta ${title}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-white/80 border">
          <FireIcon className="h-6 w-6 text-red-600" />
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <h3 className="font-semibold text-sm">{title}</h3>
            {gasType && <span className="text-xs text-slate-500">{gasType}</span>}
          </div>
          <p className="text-xs text-slate-600">{location} • {ppm} • {time}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ArrowRight className="h-5 w-5 text-slate-500" />
      </div>
    </motion.div>
  )
}
