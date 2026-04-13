'use client'

import { useEffect, useState } from 'react'
import nextDynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import type { AppView, Plan } from '@/lib/types'
import { BottomNav } from '@/components/bottom-nav'
import { useTelegramUser } from '@/components/providers/telegram-provider'
import { HomeView } from '@/components/home-view'
import { Header } from '@/components/header'
import { usePlans } from '@/hooks/use-plans'
import { AppErrorBoundary } from '@/components/app-error-boundary'
import { Toaster } from '@/components/ui/toaster'

const PlansView = nextDynamic(() => import('@/components/plans-view').then((mod) => mod.PlansView), { ssr: false })
const PaymentView = nextDynamic(() => import('@/components/payment-view').then((mod) => mod.PaymentView), { ssr: false })
const MyVpnView = nextDynamic(() => import('@/components/my-vpn-view').then((mod) => mod.MyVpnView), { ssr: false })
const SupportView = nextDynamic(() => import('@/components/support-view').then((mod) => mod.SupportView), { ssr: false })
const ReferralView = nextDynamic(() => import('@/components/referral-view').then((mod) => mod.ReferralView), { ssr: false })
const AdminView = nextDynamic(() => import('@/components/admin-view').then((mod) => mod.AdminView), { ssr: false })
const AdminUsersView = nextDynamic(() => import('@/components/admin-users-view').then((mod) => mod.AdminUsersView), { ssr: false })
const AdminKeysView = nextDynamic(() => import('@/components/admin-keys-view').then((mod) => mod.AdminKeysView), { ssr: false })
const AdminSupportView = nextDynamic(() => import('@/components/admin-support-view').then((mod) => mod.AdminSupportView), { ssr: false })
const AdminAdminsView = nextDynamic(() => import('@/components/admin-admins-view').then((mod) => mod.AdminAdminsView), { ssr: false })
const AdminRoutersView = nextDynamic(() => import('@/components/admin-routers-view').then((mod) => mod.AdminRoutersView), { ssr: false })
const AdminOrdersView = nextDynamic(() => import('@/components/admin-orders-view').then((mod) => mod.AdminOrdersView), { ssr: false })
const AdminSecurityView = nextDynamic(() => import('@/components/admin-security-view').then((mod) => mod.AdminSecurityView), { ssr: false })
const MarketView = nextDynamic(() => import('@/components/market-view').then((mod) => mod.MarketView), { ssr: false })
const AdminDiscountsView = nextDynamic(() => import('@/components/admin-discounts-view').then((mod) => mod.AdminDiscountsView), { ssr: false })
const AdminPricingView = nextDynamic(() => import('@/components/admin-pricing-view').then((mod) => mod.AdminPricingView), { ssr: false })
const DocumentsView = nextDynamic(() => import('@/components/documents-view').then((mod) => mod.DocumentsView), { ssr: false })
const GuideTour = nextDynamic(() => import('@/components/guide-tour').then((mod) => mod.GuideTour), { ssr: false })
const ConnectView = nextDynamic(() => import('@/components/connect-view').then((mod) => mod.ConnectView), { ssr: false })
import type { ServiceStatusViewProps } from "@/components/service-status-view"
const ServiceStatusView = nextDynamic<ServiceStatusViewProps>(() => import("@/components/service-status-view").then((mod) => mod.ServiceStatusView), { ssr: false })
const GiftOpening = nextDynamic(() => import('@/components/gift-opening').then((mod) => mod.GiftOpening), { ssr: false })
const AdminInfoView = nextDynamic(
  () => import('@/components/admin-info-view').then((mod) => mod.AdminInfoView),
  { ssr: false }
)
const AdminLocationsView = nextDynamic(
  () => import('@/components/admin-locations-view').then((mod) => mod.AdminLocationsView),
  { ssr: false }
)

const VIEW_STORAGE_KEY = 'privatvpn_current_view_v2'
const LEGACY_VIEW_STORAGE_KEY = 'privatvpn_current_view'
const SAFE_RESTORABLE_VIEWS: AppView[] = ['home', 'plans', 'my-vpn', 'support', 'referral', 'connect', 'market', 'service-status']

export function PageClient() {
  const [currentView, setCurrentView] = useState<AppView>('home')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [isGift, setIsGift] = useState(false)
  const { user, isLoading, error } = useTelegramUser()
  const { plans, isLoading: plansLoading, setPlans } = usePlans()
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(LEGACY_VIEW_STORAGE_KEY)
      const savedView = localStorage.getItem(VIEW_STORAGE_KEY) as AppView | null
      if (savedView && SAFE_RESTORABLE_VIEWS.includes(savedView)) {
        setCurrentView(savedView)
      }
    } catch (storageError) {
      console.error('Failed to restore current view:', storageError)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(VIEW_STORAGE_KEY, currentView)
    } catch (storageError) {
      console.error('Failed to persist current view:', storageError)
    }
  }, [currentView])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const seen = localStorage.getItem('has_seen_tour_v5')
      if (!seen) setShowOnboarding(true)
    } catch (storageError) {
      console.error('Failed to restore onboarding state:', storageError)
    }
  }, [])

  const handleOnboardingComplete = () => {
    localStorage.setItem('has_seen_tour_v5', 'true')
    setShowOnboarding(false)
  }

  if (isLoading || plansLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p>Загрузка данных...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex h-screen items-center justify-center p-4 text-center text-foreground">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6">
          <h2 className="mb-2 text-lg font-bold text-red-500">Ошибка</h2>
          <p className="text-sm text-foreground/80">{error || 'Пользователь не найден'}</p>
        </div>
      </div>
    )
  }

  const handleNavigate = (view: AppView) => {
    setCurrentView(view)
    window.scrollTo(0, 0)
  }

  const handleSafeReset = () => {
    setCurrentView('home')
    window.scrollTo(0, 0)
  }

  return (
    <AppErrorBoundary onReset={handleSafeReset}>
      <div className="fancy-bg" />
      <div className="mx-auto min-h-screen max-w-md">
        <Header user={user} onNavigate={handleNavigate} />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="pb-20"
          >
            {currentView === 'home' && <HomeView user={user} plans={plans} onNavigate={handleNavigate} />}
            {currentView === 'plans' && (
              <PlansView user={user} plans={plans} onNavigate={handleNavigate} onSelectPlan={setSelectedPlan} setIsGift={setIsGift} />
            )}
            {currentView === 'payment' && (
              <PaymentView user={user} plan={selectedPlan} isGift={isGift} setIsGift={setIsGift} onNavigate={handleNavigate} />
            )}
            {currentView === 'my-vpn' && <MyVpnView user={user} onNavigate={handleNavigate} />}
            {currentView === 'support' && <SupportView />}
            {currentView === 'referral' && <ReferralView user={user} onNavigate={handleNavigate} />}
            {currentView === 'admin' && <AdminView onNavigate={handleNavigate} />}
            {currentView === 'admin-users' && <AdminUsersView onNavigate={handleNavigate} />}
            {currentView === 'admin-keys' && <AdminKeysView plans={plans} onNavigate={handleNavigate} />}
            {currentView === 'admin-support' && <AdminSupportView onNavigate={handleNavigate} />}
            {currentView === 'admin-admins' && <AdminAdminsView onNavigate={handleNavigate} />}
            {currentView === 'admin-discounts' && <AdminDiscountsView plans={plans} onNavigate={handleNavigate} />}
            {currentView === 'admin-pricing' && <AdminPricingView plans={plans} setPlans={setPlans} onNavigate={handleNavigate} />}
            {currentView === 'admin-routers' && <AdminRoutersView onNavigate={handleNavigate} />}
            {currentView === 'admin-orders' && <AdminOrdersView onNavigate={handleNavigate} />}
            {currentView === 'admin-security' && <AdminSecurityView onNavigate={handleNavigate} />}
            {currentView === 'admin-info' && <AdminInfoView onNavigate={handleNavigate} />}
            {currentView === 'admin-locations' && <AdminLocationsView onNavigate={handleNavigate} />}
            {currentView === 'market' && <MarketView onNavigate={handleNavigate} />}
            {currentView === 'connect' && <ConnectView user={user} onNavigate={handleNavigate} />}
            {currentView === 'documents' && <DocumentsView onNavigate={handleNavigate} />}
            {currentView === 'service-status' && <ServiceStatusView onNavigate={handleNavigate} />}
          </motion.div>
        </AnimatePresence>

        {currentView !== 'market' && (
          <BottomNav currentView={currentView} onNavigate={handleNavigate} userRole={user.role} />
        )}

        <Toaster />
        {showOnboarding && <GuideTour onComplete={handleOnboardingComplete} />}
        <GiftOpening />
      </div>
    </AppErrorBoundary>
  )
}
