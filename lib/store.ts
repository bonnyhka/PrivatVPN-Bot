import type { Plan, VpnKey, User, SupportTicket, Referral, BotMessage, Discount } from './types'

export const PLANS: Plan[] = [
  {
    id: 'scout',
    name: 'Scout',
    price: 99,
    period: '/ мес',
    periodMonths: 1,
    features: [
      '1 устройство',
      'Локация: Германия',
      'До 50 Мбит/с',
      '100 ГБ трафика',
    ],
    devicesCount: 1,
    speedLabel: '50 Мбит/с',
    trafficLimit: 100 * 1024 * 1024 * 1024,
  },
  {
    id: 'guardian',
    name: 'Guardian',
    price: 149,
    period: '/ мес',
    periodMonths: 1,
    features: [
      '3 устройства',
      'Локации: Германия и Нидерланды',
      'До 100 Мбит/с',
      '200 ГБ трафика',
    ],
    popular: true,
    badge: 'Выбор большинства',
    devicesCount: 3,
    speedLabel: '100 Мбит/с',
    trafficLimit: 200 * 1024 * 1024 * 1024,
  },
  {
    id: 'fortress',
    name: 'Fortress',
    price: 199,
    period: '/ мес',
    periodMonths: 1,
    features: [
      '5 устройств',
      'Все локации: Германия, Нидерланды и Финляндия',
      'До 500 Мбит/с',
      '500 ГБ трафика',
    ],
    badge: 'MAX',
    devicesCount: 5,
    speedLabel: '500 Мбит/с',
    trafficLimit: 500 * 1024 * 1024 * 1024,
  },
  {
    id: 'citadel',
    name: 'Citadel',
    price: 299,
    period: '/ мес',
    periodMonths: 1,
    features: [
      '10 устройств',
      'Все локации: Германия, Нидерланды и Финляндия',
      'До 1 Гбит/с',
      'Безлимитный трафик',
    ],
    badge: 'VIP',
    devicesCount: 10,
    speedLabel: '1 Гбит/с',
    trafficLimit: Number.MAX_SAFE_INTEGER,
  },
]

export const MOCK_USER: User = {
  id: '1',
  telegramId: '123456789',
  username: 'privat_user',
  displayName: 'Alex K.',
  role: 'owner',
  balance: 0,
  referralCode: 'REF123',
  referralsCount: 0,
  createdAt: '2025-01-15',
  subscription: {
    id: 'sub-1',
    planId: 'guardian',
    status: 'active',
    expiresAt: '2026-03-15',
    subscriptionUrl: 'https://sub.example.com/api/user/...',
    autoRenew: true,
  },
}

export const MOCK_VPN_KEYS: VpnKey[] = [
  {
    id: 'key-1',
    key: 'vless://user1@nl1.privat-vpn.io:443?type=ws&security=tls',
    userId: '1',
    username: 'privat_user',
    planName: 'Guardian',
    createdAt: '2025-12-01',
    expiresAt: '2026-03-15',
    status: 'active',
  },
  {
    id: 'key-2',
    key: 'vless://user2@de1.privat-vpn.io:443?type=ws&security=tls',
    userId: '2',
    username: 'cyber_fox',
    planName: 'Fortress',
    createdAt: '2025-11-20',
    expiresAt: '2026-02-20',
    status: 'active',
  },
  {
    id: 'key-3',
    key: 'vless://user3@fi1.privat-vpn.io:443?type=ws&security=tls',
    userId: '3',
    username: 'shadow_net',
    planName: 'Scout',
    createdAt: '2025-10-05',
    expiresAt: '2025-12-05',
    status: 'expired',
  },
]

export const MOCK_ADMIN_USER: User = {
  id: 'admin-1',
  telegramId: '987654321',
  username: 'admin_user',
  displayName: 'Admin Root',
  role: 'admin',
  balance: 0,
  referralCode: 'ADM001',
  referralsCount: 0,
  createdAt: '2025-01-01',
  subscription: {
    id: 'sub-admin',
    planId: 'citadel',
    status: 'active',
    expiresAt: '2026-12-31',
    autoRenew: true,
  },
}

export const MOCK_SUPPORT_USER: User = {
  id: 'support-1',
  telegramId: '555555555',
  username: 'support_pro',
  displayName: 'Support Team',
  role: 'support',
  balance: 0,
  referralCode: 'SUP001',
  referralsCount: 0,
  createdAt: '2025-02-01',
  subscription: {
    id: 'sub-support',
    planId: 'guardian',
    status: 'expired',
    expiresAt: '2025-03-01',
    autoRenew: false,
  },
}

export const MOCK_USERS: User[] = [
  MOCK_USER,
  MOCK_ADMIN_USER,
  MOCK_SUPPORT_USER,
  {
    id: '4',
    telegramId: '444444444',
    username: 'new_user',
    displayName: 'New Member',
    role: 'user',
    balance: 0,
    referralCode: 'NEW444',
    referralsCount: 0,
    createdAt: '2025-03-10',
  },
  {
    id: '5',
    telegramId: '555555555',
    username: 'active_client',
    displayName: 'Active Client',
    role: 'user',
    balance: 250,
    referralCode: 'CLI555',
    referralsCount: 5,
    createdAt: '2025-01-20',
    subscription: {
      id: 'sub-5',
      planId: 'fortress',
      status: 'active',
      expiresAt: '2026-04-20',
      autoRenew: true,
    },
  },
]

export const MOCK_TICKETS: SupportTicket[] = [
  {
    id: 'ticket-1',
    userId: '4',
    username: 'neo_matrix',
    subject: 'Не подключается VPN в Германии',
    status: 'open',
    createdAt: '2026-02-14',
  },
  {
    id: 'ticket-2',
    userId: '5',
    username: 'dark_angel',
    subject: 'Низкая скорость на тарифе Standard',
    status: 'in-progress',
    assignedTo: 'shadow_net',
    createdAt: '2026-02-13',
  },
  {
    id: 'ticket-3',
    userId: '1',
    username: 'sentinel_user',
    subject: 'Вопрос про Double VPN',
    status: 'resolved',
    assignedTo: 'shadow_net',
    createdAt: '2026-02-10',
  },
]

export const LOCATIONS = [
  { country: 'Нидерланды', flag: 'NL', ping: 24, load: 35 },
  { country: 'Германия', flag: 'DE', ping: 31, load: 52 },
  { country: 'Нидерланды', flag: 'NL', ping: 11, load: 22 },
  { country: 'США', flag: 'US', ping: 89, load: 67 },
  { country: 'Япония', flag: 'JP', ping: 142, load: 41 },
  { country: 'Сингапур', flag: 'SG', ping: 128, load: 33 },
]

export const MOCK_REFERRALS: Referral[] = [
  {
    id: 'ref-1',
    fromUserId: '1',
    toUsername: 'neo_matrix',
    toDisplayName: 'Neo Matrix',
    reward: 30,
    status: 'credited',
    createdAt: '2025-11-20',
  },
  {
    id: 'ref-2',
    fromUserId: '1',
    toUsername: 'dark_angel',
    toDisplayName: 'Dark Angel',
    reward: 30,
    status: 'credited',
    createdAt: '2025-12-05',
  },
  {
    id: 'ref-3',
    fromUserId: '1',
    toUsername: 'new_user_123',
    toDisplayName: 'New User 123',
    reward: 30,
    status: 'pending',
    createdAt: '2026-02-10',
  },
]

export const MOCK_DISCOUNTS: Discount[] = [
  {
    id: 'disc-1',
    code: 'WELCOME20',
    mode: 'promo',
    delivery: 'code',
    audience: 'all',
    type: 'percent',
    value: 20,
    usedCount: 145,
    maxUses: 500,
    validFrom: '2026-01-01',
    validTo: '2026-06-30',
    applicablePlans: 'all',
    isActive: true,
    description: 'Скидка 20% для новых пользователей',
  },
  {
    id: 'disc-2',
    code: 'SPRING50',
    mode: 'promo',
    delivery: 'code',
    audience: 'all',
    type: 'fixed',
    value: 50,
    minPurchase: 99,
    usedCount: 78,
    maxUses: 200,
    validFrom: '2026-03-01',
    validTo: '2026-03-31',
    applicablePlans: ['guardian', 'fortress', 'citadel'],
    isActive: true,
    description: 'Весенняя акция',
  },
  {
    id: 'disc-3',
    code: 'VIP30',
    mode: 'promo',
    delivery: 'code',
    audience: 'all',
    type: 'percent',
    value: 30,
    usedCount: 23,
    maxUses: 50,
    validFrom: '2026-02-01',
    validTo: '2026-04-30',
    applicablePlans: ['citadel'],
    isActive: true,
    description: 'Скидка 30% только на Citadel',
  },
  {
    id: 'disc-4',
    code: 'NEWYEAR25',
    mode: 'promo',
    delivery: 'code',
    audience: 'all',
    type: 'percent',
    value: 25,
    usedCount: 312,
    maxUses: 300,
    validFrom: '2025-12-25',
    validTo: '2026-01-10',
    applicablePlans: 'all',
    isActive: false,
    description: 'Новогодняя скидка (завершена)',
  },
]

export const BOT_MESSAGES: BotMessage[] = [
  {
    id: 'msg-start',
    name: 'Приветствие',
    trigger: '/start',
    text: `<b>PrivatVPN</b> -- твоя приватность в сети

Безопасный, быстрый и анонимный VPN прямо в Telegram.

<b>Что умеет бот:</b>
-- Подключение VPN в 1 клик
-- Управление подпиской
-- Выбор серверов по всему миру
-- Реферальная программа

Нажми кнопку ниже, чтобы открыть приложение.`,
    parseMode: 'HTML',
  },
  {
    id: 'msg-payment-success',
    name: 'Успешная оплата',
    trigger: 'payment_success',
    text: `<b>Оплата прошла успешно!</b>

Тариф: <b>{plan_name}</b>
Срок: до <b>{expire_date}</b>

<b>Ваш VPN ключ:</b>
<code>{vpn_key}</code>

<b>Инструкция:</b>
1. Скопируйте ключ выше
2. Откройте V2RayNG (Android) или Streisand (iOS)
3. Добавьте конфигурацию из буфера обмена
4. Нажмите "Подключить"

Приятного и безопасного серфинга!`,
    parseMode: 'HTML',
  },
  {
    id: 'msg-key-expiring',
    name: 'Истекает подписка',
    trigger: 'key_expiring_3d',
    text: `<b>Ваша подписка истекает через 3 дня</b>

Тариф: <b>{plan_name}</b>
Истекает: <b>{expire_date}</b>

Продлите подписку, чтобы не потерять доступ к VPN. Откройте приложение и перейдите в раздел "Мой VPN".

Если у вас включено автопродление -- мы спишем оплату автоматически.`,
    parseMode: 'HTML',
  },
  {
    id: 'msg-key-expired',
    name: 'Подписка истекла',
    trigger: 'key_expired',
    text: `<b>Ваша подписка истекла</b>

Ваш VPN ключ больше не активен. Чтобы продолжить пользоваться PrivatVPN, выберите тариф и оплатите подписку.

Актуальные тарифы уже доступны в приложении -- откройте раздел с тарифами, чтобы выбрать подходящий вариант.`,
    parseMode: 'HTML',
  },
  {
    id: 'msg-referral-reward',
    name: 'Реферальный бонус',
    trigger: 'referral_reward',
    text: `<b>+{reward} руб на баланс!</b>

Ваш друг <b>@{friend_username}</b> подключил PrivatVPN по вашей ссылке. Бонус начислен на ваш баланс.

Приглашайте друзей -- получайте <b>30 руб</b> за каждого!

Ваша ссылка: <code>{ref_link}</code>`,
    parseMode: 'HTML',
  },
  {
    id: 'msg-support-reply',
    name: 'Ответ поддержки',
    trigger: 'support_reply',
    text: `<b>Ответ от поддержки</b>

Тикет: <b>{ticket_subject}</b>

{reply_text}

Если вопрос решён -- нажмите "Закрыть тикет" в приложении.`,
    parseMode: 'HTML',
  },
  {
    id: 'msg-new-server',
    name: 'Новый сервер',
    trigger: 'manual_broadcast',
    text: `<b>Новый сервер доступен!</b>

Мы добавили сервер в <b>{country}</b>
Пинг: <b>{ping} мс</b>

Переключитесь на новый сервер в приложении для лучшей скорости.`,
    parseMode: 'HTML',
  },
]
