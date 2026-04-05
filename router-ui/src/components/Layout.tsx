import React from 'react'
import { Shield, Wifi, Globe, BarChart3, Settings, LogOut, Laptop } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarItemProps {
  icon: React.ElementType
  label: string
  active?: boolean
  onClick?: () => void
}

function SidebarItem({ icon: Icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-3 px-6 py-4 text-sm font-medium transition-all duration-200",
        active 
          ? "bg-primary/10 text-primary border-r-4 border-primary" 
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5", active ? "text-primary glow-blue" : "text-muted-foreground group-hover:text-foreground")} />
      {label}
      {active && (
        <div className="absolute right-0 top-0 h-full w-1 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
      )}
    </button>
  )
}

export function Layout({ children, activeTab, onTabChange }: { children: React.ReactNode, activeTab: string, onTabChange: (tab: string) => void }) {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Dark Theme Header */}
      <header className="flex h-16 w-full items-center justify-between border-b border-border bg-card px-8 text-foreground shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 backdrop-blur-sm border border-primary/30 shadow-[0_0_15px_rgba(0,123,255,0.2)]">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">PrivatVPN <span className="font-light text-muted-foreground">Router</span></h1>
            <p className="text-[10px] uppercase tracking-widest text-primary font-semibold">Premium Gateway</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-2 text-sm font-medium md:flex">
             <div className="h-2 w-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
             <span className="text-muted-foreground">VPN: <span className="text-success">Подключен</span></span>
          </div>
          <button className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors">
            <LogOut className="h-3.5 w-3.5" />
            Выйти
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card h-full flex flex-col pt-4">
          <div className="flex-1 space-y-1">
            <SidebarItem 
              icon={Globe} 
              label="Общая Сводка" 
              active={activeTab === 'overview'} 
              onClick={() => onTabChange('overview')}
            />
            <SidebarItem 
              icon={Laptop} 
              label="Устройства (LAN)" 
              active={activeTab === 'devices'} 
              onClick={() => onTabChange('devices')}
            />
            <SidebarItem 
              icon={Wifi} 
              label="Настройки Wi-Fi" 
              active={activeTab === 'wireless'} 
              onClick={() => onTabChange('wireless')}
            />
            <SidebarItem 
              icon={BarChart3} 
              label="Управление VPN" 
              active={activeTab === 'vpn'} 
              onClick={() => onTabChange('vpn')}
            />
            <SidebarItem 
              icon={Settings} 
              label="Дополнительно" 
              active={activeTab === 'advanced'} 
              onClick={() => onTabChange('advanced')}
            />
          </div>
          
          <div className="p-6 border-t border-border bg-background/50">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter mb-2">Информация об устройстве</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Модель:</span>
                <span className="text-foreground font-medium">Xiaomi AX3000T</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Локальный IP:</span>
                <span className="text-foreground font-medium">192.168.0.1</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Внешний IP:</span>
                <span className="text-foreground font-medium">87.120.84.26</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="mx-auto max-w-[1200px] relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

