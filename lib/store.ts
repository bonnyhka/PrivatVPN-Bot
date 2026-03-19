import type { Plan, VpnKey, User, SupportTicket, Referral, BotMessage } from './types'

export const PLANS: Plan[] = [
  {
    id: 'scout',
    name: 'Scout',
    price: 50,
    period: '/ мес',
    periodMonths: 1,
    features: [
      '1 устройство',
      '5 серверов',
      'До 50 Мбит/с',
      'Без рекламы',
    ],
    devicesCount: 1,
    speedLabel: '50 Мбит/с',
  },
  {
    id: 'guardian',
    name: 'Guardian',
    price: 99,
    period: '/ мес',
    periodMonths: 1,
    features: [
      '3 устройства',
      '12 серверов',
      'До 200 Мбит/с',
      'Kill Switch',
      'Zero-Log политика',
    ],
    popular: true,
    badge: 'Выбор большинства',
    devicesCount: 3,
    speedLabel: '200 Мбит/с',
  },
  {
    id: 'fortress',
    name: 'Fortress',
    price: 179,
    period: '/ мес',
    periodMonths: 1,
    features: [
      '5 устройств',
      '25+ серверов',
      'Без ограничений скорости',
      'Kill Switch',
      'Double VPN',
      'Приоритетная поддержка',
    ],
    badge: 'MAX',
    devicesCount: 5,
    speedLabel: 'Без лимита',
  },
  {
    id: 'citadel',
    name: 'Citadel',
    price: 449,
    period: '/ 3 мес',
    periodMonths: 3,
    features: [
      '7 устройств',
      'Все серверы мира',
      'Без ограничений скорости',
      'Double VPN + Tor',
      'Выделенный IP',
      'Поддержка 24/7 VIP',
    ],
    badge: '-17%',
    discount: 17,
    devicesCount: 7,
    speedLabel: 'Без лимита',
  },
]

export const MOCK_USER: User = {
  id: '1',
  telegramId: '123456789',
  username: 'privat_user',
  displayName: 'Alex K.',
  role: 'owner',
  createdAt: '2025-01-15',
  subscription: {
    id: 'sub-1',
    planId: 'guardian',
    status: 'active',
    expiresAt: '2026-03-15',
    vpnKey: 'vless://abc123...xyz789',
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

export const MOCK_USERS: User[] = [
  MOCK_USER,
  {
    id: '2',
    telegramId: '987654321',
    username: 'cyber_fox',
    displayName: 'Cyber Fox',
    role: 'admin',
    createdAt: '2025-02-10',
    subscription: { id: 'sub-2', planId: 'fortress', status: 'active', expiresAt: '2026-02-20', autoRenew: true },
  },
  {
    id: '3',
    telegramId: '555666777',
    username: 'shadow_net',
    displayName: 'Shadow Net',
    role: 'support',
    createdAt: '2025-03-05',
    subscription: { id: 'sub-3', planId: 'lite', status: 'expired', expiresAt: '2025-12-05', autoRenew: false },
  },
  {
    id: '4',
    telegramId: '111222333',
    username: 'neo_matrix',
    displayName: 'Neo Matrix',
    role: 'user',
    createdAt: '2025-06-15',
  },
  {
    id: '5',
    telegramId: '444555666',
    username: 'dark_angel',
    displayName: 'Dark Angel',
    role: 'user',
    createdAt: '2025-08-20',
    subscription: { id: 'sub-5', planId: 'standard', status: 'active', expiresAt: '2026-04-01', autoRenew: true },
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
  { country: 'Финляндия', flag: 'FI', ping: 18, load: 28 },
  { country: 'США', flag: 'US', ping: 89, load: 67 },
  { country: 'Япония', flag: 'JP', ping: 142, load: 41 },
  { country: 'Сингапур', flag: 'SG', ping: 128, load: 33 },
]

export const MOCK_REFERRALS: Referral[] = [
  {
    id: 'ref-1',
    fromUserId: '1',
    toUserId: '4',
    toUsername: 'neo_matrix',
    reward: 30,
    status: 'credited',
    createdAt: '2025-11-20',
  },
  {
    id: 'ref-2',
    fromUserId: '1',
    toUserId: '5',
    toUsername: 'dark_angel',
    reward: 30,
    status: 'credited',
    createdAt: '2025-12-05',
  },
  {
    id: 'ref-3',
    fromUserId: '1',
    toUserId: '6',
    toUsername: 'new_user_123',
    reward: 30,
    status: 'pending',
    createdAt: '2026-02-10',
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

Тарифы от <b>50 руб/мес</b> -- откройте приложение, чтобы посмотреть все планы.`,
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
