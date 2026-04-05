import prisma from '../lib/db';
import fs from 'fs';
import path from 'path';

// Using direct Telegram API via fetch to avoid telegraf dependency in the main project
const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error('BOT_TOKEN environment variable is required for broadcast-welcome.ts');
}

const START_TEXT = '<b>Добро пожаловать в PrivatVPN! 🛡️</b>\n\n' +
  'Надежный сервис для безопасного и свободного доступа в сеть.\n' +
  'Текущие локации: 🇩🇪 Германия | 🇳🇱 Нидерланды\n\n' +
  '👇 <i>Выберите нужное действие в меню ниже:</i>';

const WEB_APP_URL = process.env.WEB_APP_URL || 'https://privatevp.space/';

async function sendPhoto(chatId: string, photoPath: string, caption: string) {
  const url = `https://api.telegram.org/bot${token}/sendPhoto`;
  
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');
  
  const buffer = fs.readFileSync(photoPath);
  const blob = new Blob([buffer], { type: 'image/png' });
  formData.append('photo', blob, 'banner.png');

  const keyboard = {
    inline_keyboard: [
      [{ text: '🔗 Подключиться', web_app: { url: WEB_APP_URL } }],
      [
        { text: 'ℹ️ О нас', callback_data: 'about_us' },
        { text: '📣 Наш канал', url: 'https://t.me/privatvpnru' }
      ]
    ]
  };
  formData.append('reply_markup', JSON.stringify(keyboard));

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  return response.json();
}

async function broadcast() {
  // Simple fetch all and filter in JS to avoid Prisma {not: null} issues on some setups
  const allUsers = await prisma.user.findMany({
    select: { telegramId: true, role: true }
  });
  
  const users = allUsers.filter(u => u.telegramId && (u.role === 'user' || u.role === 'admin' || u.role === 'owner'));

  console.log(`Starting broadcast to ${users.length} users...`);

  const photoPath = '/root/bot/welcome-banner.png';
  if (!fs.existsSync(photoPath)) {
    console.error(`Banner not found at ${photoPath}`);
    process.exit(1);
  }

  let success = 0;
  let failed = 0;

  for (const user of users) {
    if (!user.telegramId) continue;
    try {
      const result: any = await sendPhoto(user.telegramId, photoPath, START_TEXT);
      if (result.ok) {
        success++;
      } else {
        console.error(`Failed to send to ${user.telegramId}:`, result.description);
        failed++;
        if (result.error_code === 429) {
          const retryAfter = result.parameters?.retry_after || 30;
          console.log(`Rate limit hit, waiting ${retryAfter}s...`);
          await new Promise(r => setTimeout(r, retryAfter * 1000));
        }
      }

      if (success % 10 === 0 && success > 0) console.log(`Sent to ${success} users...`);
      
      // Delay (max 20 per second)
      await new Promise(r => setTimeout(r, 60));
    } catch (error: any) {
      console.error(`Network error for ${user.telegramId}:`, error.message);
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
