import { useState, useEffect } from 'react'
import { Layout } from './components/Layout'
import { Wifi, ShieldAlert, CheckCircle2, RefreshCw, Power, Globe, Activity, Lock, User, Eye, EyeOff, Clock, RotateCcw, ShieldX, Server, Laptop, Smartphone, Monitor, Cpu, Database, Ban, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ubus } from './lib/ubus'

// Mock data for development
const MOCK_WIFI = {
  ssid24: "PrivatVPN_2.4G",
  pass24: "password123",
  enabled24: true,
  ssid50: "PrivatVPN_5G",
  pass50: "password123",
  enabled50: true
}

const LOCATIONS = [
  { id: 'nl', name: 'Нидерланды', speed: '940 Мбит/с' },
  { id: 'de', name: 'Германия', speed: '880 Мбит/с' },
  { id: 'us', name: 'США - Нью-Йорк', speed: '720 Мбит/с' },
  { id: 'nl', name: 'Нидерланды', speed: '910 Мбит/с' },
]

const MOCK_DEVICES = [
  { id: 1, name: "Ilya's iPhone 15 Pro", mac: "A4:C4:94:11:F5:BB", ip: "192.168.0.104", type: "wifi5g", blocked: false, icon: Smartphone },
  { id: 2, name: "Work Station (Ethernet)", mac: "5C:F9:38:9B:C1:22", ip: "192.168.0.101", type: "lan", blocked: false, icon: Monitor },
  { id: 3, name: "Smart TV Living Room", mac: "00:1A:A3:4C:D8:EF", ip: "192.168.0.122", type: "wifi24", blocked: false, icon: Monitor },
  { id: 4, name: "Unknown Android Device", mac: "12:FD:B3:9C:AA:45", ip: "192.168.0.130", type: "wifi24", blocked: true, icon: Smartphone },
  { id: 5, name: "MacBook Pro M2", mac: "DC:A4:16:B3:88:9C", ip: "192.168.0.105", type: "wifi5g", blocked: false, icon: Laptop }
]

function Devices() {
  const [devices, setDevices] = useState(MOCK_DEVICES)

  const toggleBlock = (id: number) => {
    setDevices(devices.map(d => d.id === id ? { ...d, blocked: !d.blocked } : d))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-2xl font-semibold text-foreground">Подключенные Устройства</h2>
        <span className="text-xs font-bold text-muted-foreground bg-primary/10 text-primary px-3 py-1 rounded-full">{devices.length} активных</span>
      </div>

      <div className="grid gap-4">
        {devices.map(device => {
          const Icon = device.icon
          return (
            <div key={device.id} className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition-all", device.blocked ? "border-destructive/30 bg-destructive/5 opacity-70" : "border-border bg-card hover:border-primary/30")}>
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <div className={cn("p-3 rounded-xl border", device.blocked ? "bg-muted border-border" : "bg-primary/10 border-primary/20 text-primary glow-blue")}>
                  <Icon className="h-6 w-6 text-foreground" style={{ color: device.blocked ? 'var(--color-muted-foreground)' : 'var(--color-primary)' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={cn("font-bold text-sm", device.blocked ? "text-muted-foreground line-through" : "text-foreground")}>{device.name}</h3>
                    {device.blocked && <span className="text-[9px] uppercase font-black tracking-widest bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-md">Заблокирован</span>}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5 tracking-tighter flex items-center gap-2">
                    <span className="text-foreground/70">{device.ip}</span> • <span>{device.mac}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-border sm:border-0 justify-between sm:justify-end">
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{device.type === 'lan' ? 'Кабель' : device.type === 'wifi5g' ? '5 GHz' : '2.4 GHz'}</span>
                  <div className={cn("h-1.5 w-12 rounded-full mt-1", device.blocked ? "bg-border" : "bg-primary shadow-[0_0_5px_rgba(59,130,246,0.5)]")} />
                </div>
                <button 
                  onClick={() => toggleBlock(device.id)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5",
                    device.blocked ? "bg-background border border-border text-foreground hover:bg-success/10 hover:text-success hover:border-success/30" : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  )}
                >
                  {device.blocked ? <ShieldCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                  {device.blocked ? "Разблокировать" : "Отключить"}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Wireless() {
  const [data, setData] = useState(MOCK_WIFI)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }, 1500)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-2xl font-semibold text-foreground">Настройки Wi-Fi</h2>
        <div className="flex gap-2">
           {success && <div className="flex items-center gap-1 text-success text-sm font-medium animate-in fade-in duration-300"><CheckCircle2 className="h-4 w-4" /> Настройки сохранены</div>}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 2.4GHz */}
        <div className={cn("rounded-xl border border-border p-6 shadow-sm transition-colors", data.enabled24 ? "bg-card" : "bg-card/50 opacity-80")}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Wifi className="h-5 w-5" />
              <h3 className="font-bold text-foreground">Сеть 2.4GHz</h3>
            </div>
            <button 
              onClick={() => setData({...data, enabled24: !data.enabled24})}
              className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", data.enabled24 ? "bg-primary" : "bg-muted")}
            >
              <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", data.enabled24 ? "translate-x-6" : "translate-x-1")} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-tighter">Имя сети (SSID)</label>
              <input 
                type="text" 
                disabled={!data.enabled24}
                value={data.ssid24}
                onChange={e => setData({...data, ssid24: e.target.value})}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none transition-colors disabled:opacity-50 text-foreground"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-tighter">Пароль</label>
              <input 
                type="password" 
                disabled={!data.enabled24}
                value={data.pass24}
                onChange={e => setData({...data, pass24: e.target.value})}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none transition-colors disabled:opacity-50 text-foreground"
              />
            </div>
          </div>
        </div>

        {/* 5GHz */}
        <div className={cn("rounded-xl border border-border p-6 shadow-sm transition-colors", data.enabled50 ? "bg-card" : "bg-card/50 opacity-80")}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Wifi className="h-5 w-5" />
              <h3 className="font-bold text-foreground">Сеть 5GHz</h3>
            </div>
            <button 
              onClick={() => setData({...data, enabled50: !data.enabled50})}
              className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", data.enabled50 ? "bg-primary" : "bg-muted")}
            >
              <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", data.enabled50 ? "translate-x-6" : "translate-x-1")} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-tighter">Имя сети (SSID)</label>
              <input 
                type="text" 
                disabled={!data.enabled50}
                value={data.ssid50}
                onChange={e => setData({...data, ssid50: e.target.value})}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none transition-colors disabled:opacity-50 text-foreground"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-tighter">Пароль</label>
              <input 
                type="password" 
                disabled={!data.enabled50}
                value={data.pass50}
                onChange={e => setData({...data, pass50: e.target.value})}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none transition-colors disabled:opacity-50 text-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Сохранить изменения"}
        </button>
      </div>
    </div>
  )
}

function VPN() {
  const [enabled, setEnabled] = useState(true)
  const [selectedLoc, setSelectedLoc] = useState('fi')
  const [toggling, setToggling] = useState(false)
  const [ping, setPing] = useState(24)
  const [speed, setSpeed] = useState(12.5)
  
  // Pro Settings States
  const [killSwitch, setKillSwitch] = useState(true)
  const [smartRouting, setSmartRouting] = useState(true)
  const [customDns, setCustomDns] = useState('1.1.1.1')

  useEffect(() => {
    if (!enabled) return;
    const i = setInterval(() => {
      setPing(prev => prev + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3))
      setSpeed(prev => Math.max(0.1, prev + (Math.random() > 0.5 ? Math.random() : -Math.random()) * 2))
    }, 1500)
    return () => clearInterval(i)
  }, [enabled])

  const handleToggle = () => {
    setToggling(true)
    setTimeout(() => {
      setEnabled(!enabled)
      setToggling(false)
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Управление VPN</h2>
          <p className="text-xs text-muted-foreground mt-1 tracking-tight">Роутинг всего трафика через защищенный VLESS туннель</p>
        </div>
        <button 
          onClick={handleToggle}
          disabled={toggling}
          className={cn(
             "flex items-center gap-2 rounded-full px-6 py-2 text-sm font-bold transition-all active:scale-95 shadow-lg whitespace-nowrap",
             enabled 
               ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20" 
               : "bg-primary text-primary-foreground shadow-primary/30 hover:brightness-110"
          )}
        >
          {toggling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
          {enabled ? "Отключить маршрутизацию" : "Активировать VPN"}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Status Card */}
        <div className="col-span-1 rounded-xl border border-border bg-card p-6 shadow-sm md:col-span-2 relative overflow-hidden flex flex-col">
           {enabled && <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />}
           <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors", enabled ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted border-border text-muted-foreground")}>
                    <Globe className="h-6 w-6" />
                 </div>
                 <div>
                    <p className="text-sm font-bold text-foreground">Статус соединения</p>
                    <p className={cn("text-[11px] font-black uppercase tracking-widest", enabled ? "text-primary glow-text" : "text-muted-foreground")}>
                       {enabled ? "VLESS Reality Активен" : "Отключен"}
                    </p>
                 </div>
              </div>
              {enabled && (
                <div className="flex items-center gap-6 text-xs font-bold text-muted-foreground bg-background border border-border px-4 py-2 rounded-xl">
                    <div className="flex flex-col items-end">
                       <span className="uppercase text-[9px] tracking-widest text-muted-foreground opacity-70 mb-0.5">Пинг</span>
                       <span className="text-primary font-black text-sm">{ping} <span className="text-[10px] text-muted-foreground font-medium">мс</span></span>
                    </div>
                </div>
              )}
           </div>

           <div className="grid gap-4 sm:grid-cols-2 mb-6">
              {LOCATIONS.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLoc(loc.id)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-4 transition-all hover:scale-[1.02] text-left",
                    selectedLoc === loc.id 
                      ? "border-primary bg-primary/10" 
                      : "border-border bg-background hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <img src={`https://flagcdn.com/w40/${loc.id}.png`} alt={loc.name} className="h-5 w-7 rounded-sm object-cover shadow-sm opacity-90" />
                    <div>
                      <p className="text-xs font-bold text-foreground">{loc.name}</p>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mt-0.5">{loc.speed}</p>
                    </div>
                  </div>
                  {selectedLoc === loc.id && <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
                </button>
              ))}
           </div>

           <div className="mt-auto space-y-4 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-sm font-bold text-foreground">Kill Switch (Блокировка утечек)</p>
                    <p className="text-[10px] text-muted-foreground pr-8 mt-0.5">Принудительно отключать весь интернет, если VPN соединение отвалилось.</p>
                 </div>
                 <button onClick={() => setKillSwitch(!killSwitch)} className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", killSwitch ? "bg-primary" : "bg-muted")}>
                    <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", killSwitch ? "translate-x-6" : "translate-x-1")} />
                 </button>
              </div>
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-sm font-bold text-foreground">Смарт-Роутинг</p>
                    <p className="text-[10px] text-muted-foreground pr-8 mt-0.5">Российский трафик идет напрямую, зарубежные сайты — через зашифрованный туннель.</p>
                 </div>
                 <button onClick={() => setSmartRouting(!smartRouting)} className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", smartRouting ? "bg-primary" : "bg-muted")}>
                    <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", smartRouting ? "translate-x-6" : "translate-x-1")} />
                 </button>
              </div>
           </div>
        </div>

        {/* Stats Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
           <div>
             <div className="mb-6 flex items-center gap-2 text-foreground pb-4 border-b border-border">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="font-bold">Живая Статистика</h3>
             </div>
             <div className="space-y-6">
                <div>
                   <div className="mb-1 flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span>Загрузка (RX)</span>
                      <span className="text-primary">{speed.toFixed(1)} Мбит/с</span>
                   </div>
                   <div className="h-2 w-full rounded-full bg-background border border-border overflow-hidden">
                      <div className="h-full rounded-full bg-primary shadow-[0_0_5px_rgba(59,130,246,0.5)] transition-all duration-300" style={{ width: `${Math.min(100, speed * 2)}%` }} />
                   </div>
                </div>
                <div>
                   <div className="mb-1 flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span>Отдача (TX)</span>
                      <span className="text-primary">{(speed * 0.3).toFixed(1)} Мбит/с</span>
                   </div>
                   <div className="h-2 w-full rounded-full bg-background border border-border overflow-hidden">
                      <div className="h-full rounded-full bg-primary shadow-[0_0_5px_rgba(59,130,246,0.5)] transition-all duration-300" style={{ width: `${Math.min(100, speed * 0.6)}%` }} />
                   </div>
                </div>
             </div>
           </div>

           <div className="pt-6 mt-6 border-t border-border space-y-4">
              <div>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Свой DNS-Сервер</p>
                 <input 
                    type="text" 
                    value={customDns}
                    onChange={e => setCustomDns(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:border-primary outline-none text-foreground font-medium"
                 />
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Всего трафика пропущено</p>
                 <p className="text-xl font-black text-foreground drop-shadow-sm">114.2 <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Гигабайт</span></p>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

function Overview() {
  const [uptimeSec, setUptimeSec] = useState<number | null>(null);
  const [cpu, setCpu] = useState(12);
  const [ram, setRam] = useState(48);

  useEffect(() => {
    let isActive = true

    const loadSystemInfo = async () => {
      try {
        const info = await ubus.call<{ uptime?: number }>('system', 'info')
        if (!isActive) return
        const nextUptime = Number(info?.uptime || 0)
        setUptimeSec(Number.isFinite(nextUptime) && nextUptime > 0 ? nextUptime : null)
      } catch {
        if (!isActive) return
        setUptimeSec(null)
      }
    }

    loadSystemInfo()
    const interval = setInterval(loadSystemInfo, 30000)

    return () => {
      isActive = false
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
       setCpu(prev => Math.min(100, Math.max(2, prev + (Math.random() > 0.5 ? 2 : -2) * Math.floor(Math.random() * 5))))
       setRam(prev => Math.min(100, Math.max(30, prev + (Math.random() > 0.5 ? 1 : -1) * Math.random())))
    }, 2000)
    return () => clearInterval(t)
  }, [])

  const formatSystemUptime = (value: number | null) => {
    if (!value || !Number.isFinite(value) || value <= 0) return 'нет данных'
    const days = Math.floor(value / 86400)
    const hours = Math.floor((value % 86400) / 3600)
    const minutes = Math.floor((value % 3600) / 60)

    if (days > 0) return hours > 0 ? `${days} д ${hours} ч` : `${days} д`
    if (hours > 0) return minutes > 0 ? `${hours} ч ${minutes} м` : `${hours} ч`
    if (minutes > 0) return `${minutes} м`
    return '<1 м'
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-4">Общая Сводка Шлюза</h2>
      
      {/* Network Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm hover:border-primary/30 transition-colors">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 text-center">Провайдер</p>
          <div className="flex flex-col items-center justify-center py-4 text-success">
            <Globe className="h-10 w-10 mb-2 opacity-50" />
            <span className="text-base font-bold uppercase tracking-widest">PPoE Вкл</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/20 transition-all" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 text-center relative z-10">Туннель VPN</p>
          <div className="flex flex-col items-center justify-center py-4 text-primary relative z-10">
            <div className="relative mb-2">
              <ShieldAlert className="h-10 w-10 opacity-70" />
              <div className="absolute top-0 -right-1 h-2.5 w-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(59,130,246,1)]" />
            </div>
            <span className="text-base font-bold uppercase tracking-widest glow-text">Защищен</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 text-center">Аптайм системы</p>
          <div className="flex flex-col items-center justify-center py-4 text-foreground">
            <Clock className="h-10 w-10 mb-2 opacity-30 text-muted-foreground" />
            <span className="text-base font-black">{formatSystemUptime(uptimeSec)}</span>
          </div>
        </div>
      </div>

      {/* Hardware Monitors */}
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest pt-4">Мониторинг Железа</h3>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-foreground">
                 <Cpu className="h-5 w-5 text-primary" />
                 <h4 className="font-bold text-sm">Процессор (MediaTek)</h4>
              </div>
              <span className="text-xs font-black text-primary">{cpu.toFixed(0)}%</span>
           </div>
           <div className="h-2 w-full rounded-full bg-background border border-border overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500", cpu > 80 ? "bg-destructive" : cpu > 50 ? "bg-warning" : "bg-primary")} style={{ width: `${cpu}%` }} />
           </div>
           <div className="mt-4 flex justify-between text-[10px] text-muted-foreground font-bold">
              <span>0%</span>
              <span>1.3 GHz Dual-Core</span>
              <span>100%</span>
           </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-foreground">
                 <Database className="h-5 w-5 text-primary" />
                 <h4 className="font-bold text-sm">Оперативная Память</h4>
              </div>
              <span className="text-xs font-black text-primary">{ram.toFixed(1)}%</span>
           </div>
           <div className="h-2 w-full rounded-full bg-background border border-border overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500", ram > 85 ? "bg-destructive" : ram > 65 ? "bg-warning" : "bg-primary")} style={{ width: `${ram}%` }} />
           </div>
           <div className="mt-4 flex justify-between text-[10px] text-muted-foreground font-bold">
              <span>0 MB</span>
              <span>DDR4 (256 MB)</span>
              <span>256 MB</span>
           </div>
        </div>
      </div>
    </div>
  )
}

function Advanced() {
  const [rebooting, setRebooting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [ports, setPorts] = useState([{ id: 1, internal_ip: '192.168.0.50', internal_port: '8080', external_port: '8080', protocol: 'TCP' }])
  
  const handleReboot = () => {
    setRebooting(true)
    setTimeout(() => setRebooting(false), 3000)
  }

  const handleReset = () => {
    if (confirm("Вы уверены, что хотите сбросить все настройки? Это действие необратимо.")) {
       setResetting(true)
       setTimeout(() => setResetting(false), 3000)
    }
  }

  const addPort = () => {
    setPorts([...ports, { id: Date.now(), internal_ip: '', internal_port: '', external_port: '', protocol: 'TCP' }])
  }

  const removePort = (id: number) => {
    setPorts(ports.filter(p => p.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-2xl font-semibold text-foreground">Дополнительные Настройки</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-warning">
              <RotateCcw className="h-5 w-5" />
              <h3 className="font-bold text-foreground">Системные операции</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Перезагрузите роутер при возникновении неполадок в сети или выполните полный сброс до заводских настроек.</p>
            <div className="flex gap-4">
              <button 
                onClick={handleReboot}
                disabled={rebooting || resetting}
                className="flex flex-1 justify-center items-center gap-2 rounded-lg bg-background border border-border px-4 py-2.5 text-sm font-bold text-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-50"
              >
                {rebooting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                Перезагрузка
              </button>
              <button 
                onClick={handleReset}
                disabled={rebooting || resetting}
                className="flex flex-1 justify-center items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2.5 text-sm font-bold text-destructive transition-all hover:bg-destructive/20 active:scale-95 disabled:opacity-50"
              >
                {resetting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
                Сброс настроек
              </button>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-primary">
              <Lock className="h-5 w-5" />
              <h3 className="font-bold text-foreground">Пароль администратора</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Измените пароль для доступа к этому веб-интерфейсу.</p>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Пароль обновлен!') }}>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Текущий пароль</label>
                <input 
                  type="password" 
                  required
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none transition-colors text-foreground"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Новый пароль</label>
                <input 
                  type="password" 
                  required
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none transition-colors text-foreground"
                />
              </div>
              <div className="pt-2">
                <button 
                  type="submit"
                  className="flex w-full justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-95"
                >
                  Обновить пароль
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          {/* Port Forwarding Module */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col h-full">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-success">
                <Server className="h-5 w-5" />
                <h3 className="font-bold text-foreground">Проброс портов</h3>
              </div>
              <button onClick={addPort} className="text-[10px] uppercase bg-primary/20 text-primary px-3 py-1.5 rounded-full font-black hover:bg-primary/30 transition-colors tracking-widest">
                Добавить
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Настройте переадресацию внешних портов на внутренние IP-адреса локальной сети.</p>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {ports.map((port) => (
                <div key={port.id} className="p-4 rounded-lg bg-background border border-border space-y-3 relative group transition-colors hover:border-primary/30">
                  <button onClick={() => removePort(port.id)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors">
                    &times;
                  </button>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="mb-1 block font-bold text-muted-foreground">Внутренний IP</label>
                      <input type="text" placeholder="192.168.0.x" defaultValue={port.internal_ip} className="w-full rounded-md border border-border bg-card px-2 py-1.5 focus:border-primary outline-none text-foreground font-medium" />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-muted-foreground">Протокол</label>
                      <select className="w-full rounded-md border border-border bg-card px-2 py-1.5 focus:border-primary outline-none text-foreground font-medium" defaultValue={port.protocol}>
                        <option>TCP</option>
                        <option>UDP</option>
                        <option>TCP/UDP</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-muted-foreground">Вн. порт</label>
                      <input type="text" placeholder="80" defaultValue={port.internal_port} className="w-full rounded-md border border-border bg-card px-2 py-1.5 focus:border-primary outline-none text-foreground font-medium" />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-muted-foreground">Внешн. порт</label>
                      <input type="text" placeholder="80" defaultValue={port.external_port} className="w-full rounded-md border border-border bg-card px-2 py-1.5 focus:border-primary outline-none text-foreground font-medium" />
                    </div>
                  </div>
                </div>
              ))}
              {ports.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8 border border-dashed border-border rounded-lg bg-background/50">
                  Нет правил переадресации. Добавьте новое правило.
                </div>
              )}
            </div>
            {ports.length > 0 && (
              <div className="pt-4 mt-auto border-t border-border">
                <button className="flex w-full justify-center rounded-lg bg-background border border-border px-4 py-2.5 text-sm font-bold text-primary shadow-sm transition-all hover:bg-muted active:scale-95">
                  Применить правила
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      onLogin()
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-background to-background" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 mb-8 flex flex-col items-center justify-center text-foreground">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-card border border-border shadow-[0_0_30px_rgba(59,130,246,0.15)]">
           <Lock className="h-8 w-8 text-primary glow-blue" />
        </div>
        <h1 className="text-3xl font-black tracking-tight drop-shadow-sm">PrivatVPN</h1>
        <p className="text-sm font-bold text-primary uppercase tracking-widest mt-1">Вход в шлюз</p>
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-[2rem] border border-border bg-card/60 backdrop-blur-xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <User className="h-4 w-4" />
              </div>
              <input 
                type="text" 
                disabled 
                value="Администратор"
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm font-medium text-muted-foreground opacity-70"
              />
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Lock className="h-4 w-4" />
              </div>
              <input 
                type={showPass ? "text" : "password"}
                placeholder="Пароль от роутера"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-12 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all font-medium tracking-widest"
              />
              <button 
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="group w-full rounded-xl bg-primary py-4 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] active:scale-95 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-5 w-5 animate-spin mx-auto" /> : "Войти"}
          </button>
        </form>
        
        <p className="mt-8 text-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
          Работает на OpenWrt & PrivatVPN
        </p>
      </div>
    </div>
  )
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  if (!isLoggedIn) {
     return <Login onLogin={() => setIsLoggedIn(true)} />
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'overview' && <Overview />}
      {activeTab === 'devices' && <Devices />}
      {activeTab === 'wireless' && <Wireless />}
      {activeTab === 'vpn' && <VPN />}
      {activeTab === 'advanced' && <Advanced />}
    </Layout>
  )
}

export default App
