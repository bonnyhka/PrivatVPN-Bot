'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Package, Clock, Truck, CheckCircle2, User, Phone, MapPin, Search, Loader2 } from 'lucide-react'
import type { AppView } from '@/lib/types'
import { useTelegramUser } from './providers/telegram-provider'
import { cn } from '@/lib/utils'

interface AdminOrdersViewProps {
  onNavigate: (view: AppView) => void
}

export function AdminOrdersView({ onNavigate }: AdminOrdersViewProps) {
  const { user: adminUser } = useTelegramUser()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const loadOrders = () => {
    setLoading(true)
    fetch('/api/admin/market/orders')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOrders(data)
        setLoading(false)
      })
  }

  useEffect(() => {
    if (adminUser?.telegramId) loadOrders()
  }, [adminUser?.telegramId])

  const updateStatus = async (id: string, status: string, trackingNumber?: string) => {
    try {
      const res = await fetch(`/api/admin/market/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          trackingNumber
        })
      })
      const data = await res.json()
      if (data.success) {
        loadOrders()
      } else {
        alert('Ошибка обновления статуса')
      }
    } catch (e) {
      alert('Ошибка API')
    }
  }

  const filteredOrders = orders.filter(o => 
    o.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.includes(searchTerm) ||
    o.status.includes(searchTerm)
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-500 bg-yellow-500/10'
      case 'paid': return 'text-blue-500 bg-blue-500/10'
      case 'shipped': return 'text-purple-500 bg-purple-500/10'
      case 'delivered': return 'text-green-500 bg-green-500/10'
      case 'cancelled': return 'text-red-500 bg-red-500/10'
      default: return 'text-white/40 bg-white/5'
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background p-4 pb-24">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => onNavigate('admin')} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5"><ArrowLeft /></button>
        <div>
          <h1 className="text-xl font-bold text-white uppercase tracking-tight">Заказы роутеров</h1>
          <p className="text-xs text-white/40 text-left leading-none mt-1">Управление продажами физических устройств</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input 
          type="text" placeholder="Поиск по имени или ID..." 
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-10 pr-4 text-xs text-white focus:border-primary/50 outline-none" 
        />
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.length === 0 && (
            <div className="py-12 text-center text-white/20">Заказов пока нет</div>
          )}
          {filteredOrders.map(o => (
            <div key={o.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                   <Package className="h-4 w-4 text-primary" />
                   <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{o.id.slice(-8)}</span>
                </div>
                <div className={cn("rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest", getStatusColor(o.status))}>
                   {o.status}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-white">
                   <User className="h-3 w-3 text-white/40" /> {o.fullName}
                </div>
                <div className="flex items-center gap-2 text-xs text-white/60">
                   <Phone className="h-3 w-3 text-white/40" /> {o.phone}
                </div>
                <div className="flex items-start gap-2 text-[10px] text-white/40">
                   <MapPin className="h-3 w-3 text-white/40 shrink-0" /> {o.city}, {o.address}
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-white/5 pt-4">
                <div className="flex-1">
                   <p className="text-[8px] uppercase font-bold text-white/20 mb-0.5">Товар</p>
                   <p className="text-[10px] font-bold text-white leading-tight">{o.product.name}</p>
                   <p className="text-[10px] font-black text-primary mt-1">{o.amount} ₽</p>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                   {['pending', 'paid', 'shipped', 'delivered', 'cancelled'].map(s => (
                      <button 
                        key={s} onClick={() => updateStatus(o.id, s)}
                        className={cn(
                          "px-2 py-1 rounded-md text-[8px] font-bold border transition-all",
                          o.status === s ? "bg-primary border-primary text-primary-foreground" : "border-white/10 text-white/40 hover:border-white/20"
                        )}
                      >
                        {s.toUpperCase()}
                      </button>
                   ))}
                </div>
              </div>

              {o.status === 'paid' && (
                <div className="mt-4 pt-4 border-t border-white/5">
                   <button 
                      onClick={() => {
                        const track = prompt('Введите номер отслеживания (CDEK/Pochta):')
                        if (track) updateStatus(o.id, 'shipped', track)
                      }}
                      className="w-full rounded-xl bg-blue-500 py-2.5 text-[10px] font-bold text-white flex items-center justify-center gap-2"
                   >
                      <Truck className="h-3 w-3" /> ОТПРАВИТЬ (ДОБАВИТЬ ТРЕК)
                   </button>
                </div>
              )}

              {o.trackingNumber && (
                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-blue-400">
                   <Truck className="h-3 w-3" /> ТРЕК: {o.trackingNumber}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
