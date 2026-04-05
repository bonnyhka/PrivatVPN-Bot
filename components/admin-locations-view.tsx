'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Plus, Globe, CheckCircle2, XCircle, Terminal, Trash2, Edit, RefreshCw } from 'lucide-react'
import type { AppView } from '@/lib/types'
import { AnimatedContainer, AnimatedItem } from '@/components/ui/animated-view'
import { COUNTRY_PRESET_CUSTOM, COUNTRY_PRESETS } from '@/lib/country-presets'

interface AdminLocationsViewProps {
  onNavigate: (view: AppView) => void
}

export function AdminLocationsView({ onNavigate }: AdminLocationsViewProps) {
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLoc, setEditingLoc] = useState<any>(null)
  
  // Form State
  const [formData, setFormData] = useState({
    country: '',
    flag: '',
    host: '',
    sshPass: '',
    isActive: true,
  })
  /** '' | preset `country` | `COUNTRY_PRESET_CUSTOM` */
  const [countryListValue, setCountryListValue] = useState<string>('')

  // Deploy Logs State
  const [deployLogs, setDeployLogs] = useState('')
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [deployLogs])

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const res = await fetch(`/api/admin/locations?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      const data = await res.json()
      if (Array.isArray(data)) setLocations(data)
    } finally {
      setLoading(false)
    }
  }

  const openForm = (loc?: any) => {
    if (loc) {
      setEditingLoc(loc)
      const c = String(loc.country || '').trim()
      const match = COUNTRY_PRESETS.find((p) => p.country.toLowerCase() === c.toLowerCase())
      setCountryListValue(match ? match.country : COUNTRY_PRESET_CUSTOM)
      setFormData({
        country: loc.country || '',
        flag: loc.flag && /^[A-Za-z]{2}$/.test(String(loc.flag).trim()) ? String(loc.flag).trim().toUpperCase() : '',
        host: loc.host || '',
        sshPass: loc.sshPass || '',
        isActive: loc.isActive ?? true,
      })
    } else {
      setEditingLoc(null)
      setCountryListValue('')
      setFormData({ country: '', flag: '', host: '', sshPass: '', isActive: true })
    }
    setIsModalOpen(true)
  }

  const onCountrySelectChange = (value: string) => {
    setCountryListValue(value)
    if (value === '') {
      setFormData((f) => ({ ...f, country: '', flag: '' }))
      return
    }
    if (value === COUNTRY_PRESET_CUSTOM) {
      return
    }
    const p = COUNTRY_PRESETS.find((x) => x.country === value)
    if (p) {
      setFormData((f) => ({ ...f, country: p.country, flag: p.iso }))
    }
  }

  const saveLocation = async () => {
    if (!formData.country?.trim() || !formData.host?.trim()) return

    setLoading(true)
    try {
      let res;
      const payload = {
        country: formData.country.trim(),
        flag: formData.flag.trim(),
        host: formData.host.trim(),
        sshPass: formData.sshPass,
        isActive: formData.isActive,
      }
      if (editingLoc) {
        res = await fetch(`/api/admin/locations/${editingLoc.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        res = await fetch('/api/admin/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }
      
      if (!res.ok) {
        const errorData = await res.json()
        alert('Ошибка сохранения: ' + (errorData.error || 'Неизвестная ошибка'))
        return
      }
      setIsModalOpen(false)
      await fetchLocations()
    } finally {
      setLoading(false)
    }
  }

  const deleteLocation = async (id: string) => {
    if (!confirm('Точно удалить локацию? Конфиги на сервере останутся, но бот перестанет ей управлять!')) return
    setLoading(true)
    try {
      await fetch(`/api/admin/locations/${id}`, { method: 'DELETE' })
      await fetchLocations()
    } finally {
      setLoading(false)
    }
  }

  const deployLocation = async (id: string) => {
    if (!confirm('Запустить установку/обновление Sing-box на этом сервере?')) return
    
    // Optimistic UI loading
    setLocations(locs => locs.map(l => l.id === id ? { ...l, isDeploying: true } : l))
    setDeployLogs('Starting deployment...\n')
    setIsLogModalOpen(true)
    
    try {
      const res = await fetch(`/api/admin/locations/${id}/deploy`, { method: 'POST' })
      if (!res.body) throw new Error('No response body')
      
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const textChunk = decoder.decode(value, { stream: true })
        setDeployLogs(prev => prev + textChunk)
      }
    } catch (e: any) {
      setDeployLogs(prev => prev + `\nError: ${e.message}`)
    } finally {
      await fetchLocations()
      setLocations(locs => locs.map(l => l.id === id ? { ...l, isDeploying: false } : l))
    }
  }

  const displayLabel = (loc: any) => {
    const c = (loc.country || '').trim()
    if (c) return c
    return (loc.name || '').trim() || 'Сервер'
  }

  const flagCodeForLoc = (loc: any) => {
    const f = (loc.flag || '').trim()
    if (f.length === 2 && /^[A-Za-z]{2}$/.test(f)) return f.toLowerCase()
    return null
  }

  return (
    <AnimatedContainer className="min-h-screen px-4 pb-24 pt-6 bg-background">
      {/* Header */}
      <AnimatedItem className="flex items-center gap-3 mb-6">
        <button
          onClick={() => onNavigate('admin')}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary transition-colors hover:bg-secondary/80"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Управление Серверами</h1>
          <p className="text-xs text-muted-foreground">Добавление и настройка узлов</p>
        </div>
      </AnimatedItem>

      <AnimatedItem>
        <button
        onClick={() => openForm()}
        className="w-full mb-6 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-primary/40 active:scale-95"
      >
        <Plus className="h-5 w-5" />
        Создать новый сервер
        </button>
      </AnimatedItem>

      {/* List */}
      <AnimatedItem className="space-y-3">
        {loading && locations.length === 0 ? (
           <div className="flex justify-center p-8"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>
        ) : locations.map((loc) => {
          const flagCode = flagCodeForLoc(loc)
          return (
          <div key={loc.id} className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm transition-colors hover:border-primary/30">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/50 text-xl overflow-hidden ring-1 ring-border shadow-sm">
                  {flagCode ? (
                    <img
                      src={`https://flagcdn.com/w80/${flagCode}.png`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg leading-none">{loc.flag || '🌐'}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    {displayLabel(loc)}
                    {loc.isActive ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">{loc.host}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openForm(loc)} className="p-2 bg-secondary rounded-lg text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors">
                  <Edit className="h-4 w-4" />
                </button>
                <button onClick={() => deleteLocation(loc.id)} className="p-2 bg-secondary rounded-lg text-muted-foreground hover:bg-red-500/20 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="flex mt-3 pt-3 border-t border-border/50 gap-2">
              <button 
                onClick={() => deployLocation(loc.id)}
                disabled={loc.isDeploying}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-400 transition-colors hover:bg-indigo-500/20 disabled:opacity-50"
              >
                {loc.isDeploying ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Terminal className="h-3.5 w-3.5" />}
                {loc.isDeploying ? 'Развертывается...' : 'Синхронизация узла'}
              </button>
            </div>
          </div>
        )})}
        {locations.length === 0 && !loading && (
          <div className="text-center py-10 opacity-50"><Globe className="mx-auto h-12 w-12 mb-3" /><p>Нет серверов</p></div>
        )}
      </AnimatedItem>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="mb-4 text-lg font-bold text-foreground">{editingLoc ? 'Редактировать Сервер' : 'Новый Сервер'}</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Страна</label>
                <select
                  value={countryListValue}
                  onChange={(e) => onCountrySelectChange(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
                >
                  <option value="">Выберите страну…</option>
                  {COUNTRY_PRESETS.map((p) => (
                    <option key={p.country} value={p.country}>
                      {p.labelRu} — {p.country} ({p.iso})
                    </option>
                  ))}
                  <option value={COUNTRY_PRESET_CUSTOM}>Другое… (ввести вручную)</option>
                </select>
              </div>
              {countryListValue === COUNTRY_PRESET_CUSTOM && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Страна (EN)</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Switzerland"
                      className="w-full rounded-xl border border-transparent bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Код ISO</label>
                    <input
                      type="text"
                      placeholder="CH"
                      value={formData.flag}
                      onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                      className="w-full rounded-xl border border-transparent bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
              )}
              {countryListValue !== '' && countryListValue !== COUNTRY_PRESET_CUSTOM && (
                <p className="text-[10px] text-muted-foreground">
                  Флаг: <span className="font-mono text-foreground">{formData.flag || '—'}</span> (подставлен автоматически)
                </p>
              )}
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">IP Адрес</label>
                <input type="text" value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})} className="w-full rounded-xl bg-secondary px-3 py-2 font-mono text-sm text-foreground outline-none border border-transparent focus:border-primary/50" />
              </div>
              <div>
                <label className="mb-1 text-xs font-semibold text-muted-foreground block">SSH Пароль</label>
                <input type="text" value={formData.sshPass} onChange={e => setFormData({...formData, sshPass: e.target.value})} className="w-full rounded-xl bg-secondary px-3 py-2 font-mono text-sm text-foreground outline-none border border-transparent focus:border-primary/50" />
              </div>
              <label className="flex items-center gap-2 py-2">
                <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="accent-primary" />
                <span className="text-sm font-semibold text-foreground">Сервер Активен</span>
              </label>
              
              {!editingLoc && (
                <div className="mt-1 rounded-xl border border-border bg-secondary/40 p-3">
                  <p className="text-[10px] font-medium leading-relaxed text-muted-foreground">
                    При создании сервера автоматически выдаются ключи VLESS Reality и UUID.
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 rounded-xl bg-secondary py-3 text-sm font-bold text-foreground hover:bg-secondary/80">Отмена</button>
              <button
                onClick={saveLocation}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50"
                disabled={!countryListValue || !formData.country?.trim() || !formData.host?.trim()}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deploy Log Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Terminal className="h-5 w-5" /> Журнал Установки
              </h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto rounded-xl bg-black/90 p-4 font-mono text-xs text-green-400 whitespace-pre-wrap leading-relaxed shadow-inner border border-white/10">
              {deployLogs}
              <div ref={logsEndRef} />
            </div>
            
            <div className="mt-4 flex justify-end">
              <button 
                onClick={() => setIsLogModalOpen(false)} 
                className="rounded-xl bg-secondary px-6 py-2.5 text-sm font-bold text-foreground hover:bg-secondary/80"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatedContainer>
  )
}
