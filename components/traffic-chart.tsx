'use client'

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface TrafficChartProps {
  data: any[]
  title?: string
  color?: string
}

export function TrafficChart({ data, title, color = '#3b82f6' }: TrafficChartProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-[200px] mt-4"
    >
      {title && <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">{title}</h4>}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBytes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="timestamp" 
            hide={data.length > 20}
            tickFormatter={(str) => format(new Date(str), 'HH:mm', { locale: ru })}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
          />
          <YAxis 
            tickFormatter={formatBytes}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg bg-background/80 backdrop-blur-md border border-border p-2 shadow-xl">
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(payload[0].payload.timestamp), 'd MMM HH:mm', { locale: ru })}
                    </p>
                    <p className="text-xs font-bold text-foreground">
                      {formatBytes(payload[0].value as number)}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Area 
            type="monotone" 
            dataKey="bytes" 
            stroke={color} 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorBytes)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
