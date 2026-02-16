export type UserRole = 'user' | 'support' | 'admin' | 'owner'

export interface User {
  id: string
  telegramId: string
  username: string
  displayName: string
  role: UserRole
  avatar?: string
  createdAt: string
  subscription?: Subscription
}

export interface Subscription {
  id: string
  planId: string
  status: 'active' | 'expired' | 'cancelled'
  expiresAt: string
  vpnKey?: string
  autoRenew: boolean
}

export interface Plan {
  id: string
  name: string
  price: number
  period: string
  periodMonths: number
  features: string[]
  popular?: boolean
  badge?: string
  discount?: number
  devicesCount: number
  speedLabel: string
}

export interface VpnKey {
  id: string
  key: string
  userId: string
  username: string
  planName: string
  createdAt: string
  expiresAt: string
  status: 'active' | 'expired' | 'revoked'
}

export interface SupportTicket {
  id: string
  userId: string
  username: string
  subject: string
  status: 'open' | 'in-progress' | 'resolved'
  assignedTo?: string
  createdAt: string
}

export type AppView =
  | 'home'
  | 'plans'
  | 'payment'
  | 'my-vpn'
  | 'support'
  | 'admin'
  | 'admin-users'
  | 'admin-keys'
  | 'admin-support'
  | 'admin-admins'
