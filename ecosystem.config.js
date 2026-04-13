const fs = require('fs')
const path = require('path')

/** Парсинг .env без зависимости dotenv — секреты не храним в этом файле */
function parseEnvFile(filePath) {
  const out = {}
  if (!fs.existsSync(filePath)) return out
  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const appRoot = __dirname
const appEnv = parseEnvFile(path.join(appRoot, '.env'))

const webDefaults = {
  NODE_ENV: 'production',
  PORT: 3000,
  ...appEnv,
}

const botDefaults = {
  NODE_ENV: 'production',
  ...appEnv,
  WEB_APP_URL: appEnv.WEB_APP_URL || 'https://privatevp.space/',
}

module.exports = {
  apps: [
    {
      name: 'bot',
      script: 'bot.js',
      cwd: path.join(appRoot, 'bot'),
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: botDefaults,
    },
    {
      name: 'web-app',
      script: 'node_modules/next/dist/bin/next',
      // Явный порт 3000: бот и прокси бьют в 127.0.0.1:3000
      args: 'start -p 3000',
      cwd: appRoot,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: webDefaults,
    },
    {
      name: 'sync-stats',
      script: 'npx',
      args: 'tsx scripts/sync-stats-singbox.ts',
      cwd: appRoot,
      cron_restart: '*/10 * * * *',
      autorestart: false,
      env: { NODE_ENV: 'production', ...appEnv },
    },
    {
      name: 'load-monitor',
      script: 'npx',
      args: 'tsx scripts/update-load.ts',
      cwd: appRoot,
      cron_restart: '*/5 * * * *',
      autorestart: false,
      env: { NODE_ENV: 'production', ...appEnv },
    },
    {
      name: 'location-diagnostics',
      script: 'node',
      args: 'scripts/update-location-diagnostics.js',
      cwd: appRoot,
      autorestart: true,
      restart_delay: 5000,
      env: { NODE_ENV: 'production', ...appEnv },
    },
    {
      name: 'realtime-speed',
      script: 'npx',
      args: 'tsx scripts/realtime-speed.ts',
      cwd: appRoot,
      autorestart: true,
      restart_delay: 5000,
      env: { NODE_ENV: 'production', ...appEnv },
    },
    {
      name: 'reset-traffic',
      script: 'npx',
      args: 'tsx scripts/reset-traffic-monthly.ts',
      cwd: appRoot,
      cron_restart: '0 0 * * *',
      autorestart: false,
      env: { NODE_ENV: 'production', ...appEnv },
    },
    {
      name: 'check-expirations',
      script: 'npx',
      args: 'tsx scripts/check-expirations.ts',
      cwd: appRoot,
      cron_restart: '*/15 * * * *',
      autorestart: false,
      env: { NODE_ENV: 'production', ...appEnv },
    },
    {
      name: 'check-servers',
      script: 'npx',
      args: 'tsx scripts/check-servers.ts',
      cwd: appRoot,
      cron_restart: '*/5 * * * *',
      autorestart: false,
      env: { NODE_ENV: 'production', ...appEnv },
    },
    {
      name: 'check-devices',
      script: 'npx',
      args: 'tsx scripts/check-devices.ts',
      cwd: appRoot,
      cron_restart: '*/2 * * * *',
      autorestart: false,
      env: { NODE_ENV: 'production', ...appEnv },
    },
    {
      name: 'expire-pending-payments',
      script: 'npx',
      args: 'tsx scripts/expire-pending-payments.ts',
      cwd: appRoot,
      cron_restart: '*/10 * * * *',
      autorestart: false,
      env: { NODE_ENV: 'production', ...appEnv },
    },
  ],
}
