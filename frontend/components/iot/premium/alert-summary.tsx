'use client'

import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, AlertTriangle, CheckCircle2, AlertOctagon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AlertSeverity = 'SAFE' | 'WARNING' | 'DANGER' | 'CRITICAL'

interface AlertSummaryProps {
  severity: AlertSeverity
  message: string
  actions?: string[]
  className?: string
}

const severityConfig: Record<AlertSeverity, { bg: string; border: string; icon: typeof AlertCircle; iconColor: string; badge: string }> = {
  SAFE: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-800'
  },
  WARNING: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-800'
  },
  DANGER: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: AlertCircle,
    iconColor: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-800'
  },
  CRITICAL: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: AlertOctagon,
    iconColor: 'text-red-600',
    badge: 'bg-red-100 text-red-800'
  }
}

export const AlertSummary = memo(function AlertSummary({
  severity,
  message,
  actions = [],
  className
}: AlertSummaryProps) {
  const config = severityConfig[severity]
  const Icon = config.icon

  return (
    <Card className={cn(`border rounded-2xl ${config.bg} ${config.border}`, className)}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg mt-0.5', config.bg)}>
            <Icon className={cn('h-5 w-5', config.iconColor)} />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn('text-xs font-bold px-2 py-1 rounded-full', config.badge)}>
                {severity}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-900 leading-snug">
              {message}
            </p>
          </div>
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="pl-10 space-y-1.5 pt-1">
            {actions.map((action, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                <span className="text-slate-400 font-bold mt-0.5">•</span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
