require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const token = process.env.BOT_TOKEN;
const bot = new Telegraf(token);

const START_TEXT = '<b>Добро пожаловать в PrivatVPN! 🛡️</b>\n\n' +
  'Надежный сервис для безопасного и свободного доступа в сеть.\n' +
  'Текущие локации: 🇩🇪 Германия | 🇳🇱 Нидерланды\n\n' +
  '👇 <i>Выберите нужное действие в меню ниже:</i>';

const WEB_APP_URL = process.env.WEB_APP_URL || 'https://privatevp.space/';
const START_KEYBOARD = Markup.inlineKeyboard([
  [
    Markup.button.webApp('🔗 Подключиться', WEB_APP_URL)
  ],
  [
    Markup.button.callback('ℹ️ О нас', 'about_us'),
    Markup.button.url('📣 Наш канал', 'https://t.me/privatvpnru')
  ]
]);

async function broadcast() {
  const users = await prisma.user.findMany({
    where: { 
      telegramId: { not: null },
      role: 'user' // Optional: broadcast to users only
    },
    select: { telegramId: true }
  });

  console.log(`Starting broadcast to ${users.length} users...`);

  const photoPath = path.join(__dirname, 'welcome-banner.png');
  let success = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await bot.telegram.sendPhoto(user.telegramId, { source: photoPath }, {
        caption: START_TEXT,
        parse_mode: 'HTML',
        ...START_KEYBOARD
      });
      success++;
      if (success % 10 === 0) console.log(`Sent to ${success} users...`);
      
      // Delay to avoid rate limits (approx 20 per second max)
      await new Promise(r => setTimeout(r, 60));
    } catch (error) {
      console.error(`Failed to send to ${user.telegramId}:`, error.message);
      failed++;
    }
  }

  console.log(`Broadcast finished. Success: ${success}, Failed: ${failed}`);
}

broadcast()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
