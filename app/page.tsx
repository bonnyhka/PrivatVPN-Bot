'use client'

import { useState } from 'react'
import type { AppView, Plan } from '@/lib/types'
import { MOCK_USER } from '@/lib/store'
import { BottomNav } from '@/components/bottom-nav'
import { HomeView } from '@/components/home-view'
import { PlansView } from '@/components/plans-view'
import { PaymentView } from '@/components/payment-view'
import { MyVpnView } from '@/components/my-vpn-view'
import { SupportView } from '@/components/support-view'
import { ReferralView } from '@/components/referral-view'
import { AdminView } from '@/components/admin-view'
import { AdminUsersView } from '@/components/admin-users-view'
import { AdminKeysView } from '@/components/admin-keys-view'
import { AdminSupportView } from '@/components/admin-support-view'
import { AdminAdminsView } from '@/components/admin-admins-view'
import { AdminMessagesView } from '@/components/admin-messages-view'

export default function Page() {
  const [currentView, setCurrentView] = useState<AppView>('home')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const user = MOCK_USER

  const handleNavigate = (view: AppView) => {
    setCurrentView(view)
    window.scrollTo(0, 0)
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      {currentView === 'home' && <HomeView user={user} onNavigate={handleNavigate} />}
      {currentView === 'plans' && (
        <PlansView onNavigate={handleNavigate} onSelectPlan={setSelectedPlan} />
      )}
      {currentView === 'payment' && (
        <PaymentView plan={selectedPlan} onNavigate={handleNavigate} />
      )}
      {currentView === 'my-vpn' && <MyVpnView user={user} onNavigate={handleNavigate} />}
      {currentView === 'support' && <SupportView />}
      {currentView === 'referral' && <ReferralView user={user} onNavigate={handleNavigate} />}
      {currentView === 'admin' && <AdminView onNavigate={handleNavigate} />}
      {currentView === 'admin-users' && <AdminUsersView onNavigate={handleNavigate} />}
      {currentView === 'admin-keys' && <AdminKeysView onNavigate={handleNavigate} />}
      {currentView === 'admin-support' && <AdminSupportView onNavigate={handleNavigate} />}
      {currentView === 'admin-admins' && <AdminAdminsView onNavigate={handleNavigate} />}
      {currentView === 'admin-messages' && <AdminMessagesView onNavigate={handleNavigate} />}

      <BottomNav currentView={currentView} onNavigate={handleNavigate} userRole={user.role} />
    </div>
  )
}
