export const DIRECT_DOMAIN_SUFFIXES = [
  // Russian domains — always direct (no VPN needed)
  'ru',
  'su',
  'рф',
  'gosuslugi.ru',
  'sberbank.ru',
  'tinkoff.ru',
  'vtb.ru',
  'yandex.ru',
  'vk.com',
  'mail.ru',
  'mos.ru',
  'nalog.gov.ru',
  // Steam & Valve — not blocked in Russia, avoid extra VPN lag for gaming
  'steampowered.com',
  'steamcommunity.com',
  'steamstatic.com',
  'steamgames.com',
  'steam-chat.com',
  'valvesoftware.com',
  'steamusercontent.com',
  'steamcontent.com',
  // Popular game platforms — not blocked
  'epicgames.com',
  'easyanticheat.net',
  'battleye.com',
  'faceit.com',
  // Microsoft / Xbox / Game Pass
  'xbox.com',
  'xboxlive.com',
  'microsoft.com',
  'live.com',
  'windowsupdate.com',
  // CDN providers — faster without VPN
]

export const DIRECT_DOMAIN_KEYWORDS = [
  'gosuslugi',
  'nalog',
  'yandex',
  'vk',
  // Steam-related keywords
  'steamserver',
  'steampipe',
]

// IP CIDR ranges for direct bypass (Valve/Steam game servers)
// These are the main Valve game server IP ranges
export const DIRECT_IP_CIDR = [
  '208.64.200.0/22',
  '146.66.152.0/21',
  '185.25.180.0/22',
  '155.133.248.0/21',
  '155.133.256.0/21', 
  '155.133.230.0/23',
  '162.254.196.0/22',
  '162.254.192.0/22',
  '205.196.6.0/24',
  '103.10.124.0/23',
  '103.28.54.0/23',
]
