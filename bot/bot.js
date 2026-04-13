const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const { getBotStartText } = require('../lib/telegram-location-summary');

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('Error: BOT_TOKEN is not defined in .env file');
  process.exit(1);
}

// URL of the Mini App
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://privatevp.space/';
const bot = new Telegraf(token);
const prisma = new PrismaClient();

const SUBSCRIBE_TEXT = '<b>👑 Получи бесплатный доступ!</b>\n\n' +
  'Чтобы активировать <b>бесплатный пробный период (1 день)</b> и начать пользоваться всеми преимуществами PrivatVPN, подпишись на наш официальный канал.\n\n' +
  'Там мы публикуем новости, обновления и полезные гайды.\n\n' +
  '<i>👇 Подпишись и нажми кнопку ниже:</i>';

const CHANNEL_ID = '@privatvpnru';

const SUBSCRIBE_KEYBOARD = Markup.inlineKeyboard([
  [Markup.button.url('📣 Подписаться на канал', 'https://t.me/privatvpnru')],
  [Markup.button.callback('Проверить ✅', 'verify_subscription')]
]);

const START_KEYBOARD = (payload) => Markup.inlineKeyboard([
  [
    Markup.button.webApp('🔗 Подключиться', payload ? `${WEB_APP_URL}?startapp=${payload}` : WEB_APP_URL)
  ],
  [
    Markup.button.url('🛰 Telegram Proxy', 'tg://proxy?server=144.31.220.23&port=543&secret=eed2709de4ef1349ff8f13dc64efb17311676f6f676c652e636f6d')
  ],
  [
    Markup.button.callback('ℹ️ О нас', 'about_us'),
    Markup.button.url('📣 Наш канал', 'https://t.me/privatvpnru')
  ]
]);

const lastMenuMessages = new Map();

async function checkSubscription(ctx) {
  try {
    const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch (err) {
    console.error('Check Subscription Error:', err.message);
    return false;
  }
}

async function giveTrial(ctx, payload) {
  try {
    const res = await fetch('http://127.0.0.1:3000/api/bot/trial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BOT_TOKEN}`
      },
      body: JSON.stringify({
        telegramId: String(ctx.from.id),
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        startParam: payload || undefined
      })
    });
    const data = await res.json().catch(() => ({}));
    if (data.success && data.isNewTrial) {
      await ctx.replyWithHTML(
        '<tg-emoji emoji-id="5461151367559141950">🎉</tg-emoji> <b>Вам начислен 1 день бесплатного доступа (Тариф Guardian)!</b>\n\nНажмите «Подключиться», чтобы получить настройки.'
      );
    }
  } catch (error) {
    console.error('Trial API fetch failed:', error);
  }
}

bot.start(async (ctx) => {
  const startPayload = ctx.payload;

  // Delete previous menu if exists
  const prevMsgId = lastMenuMessages.get(ctx.from.id);
  if (prevMsgId) {
    ctx.telegram.deleteMessage(ctx.chat.id, prevMsgId).catch(() => {});
  }

  const isSubscribed = await checkSubscription(ctx);

  if (!isSubscribed) {
    const sentMsg = await ctx.replyWithPhoto({ source: './welcome-banner.png' }, {
      caption: SUBSCRIBE_TEXT,
      parse_mode: 'HTML',
      ...SUBSCRIBE_KEYBOARD
    });
    lastMenuMessages.set(ctx.from.id, sentMsg.message_id);
    return;
  }

  // Send the main greeting with banner
  try {
    const startText = await getBotStartText(prisma);
    const sentMsg = await ctx.replyWithPhoto({ source: './welcome-banner.png' }, {
      caption: startText,
      parse_mode: 'HTML',
      ...START_KEYBOARD(startPayload)
    });
    lastMenuMessages.set(ctx.from.id, sentMsg.message_id);
    
    // Background trial check
    giveTrial(ctx, startPayload);
  } catch (err) {
    console.error(err);
  }
});

bot.action('verify_subscription', async (ctx) => {
  try {
    const isSubscribed = await checkSubscription(ctx);
    if (!isSubscribed) {
      return ctx.answerCbQuery('❌ Пожалуйста, сначала подпишитесь на канал!', { show_alert: true });
    }

    ctx.answerCbQuery('✅ Спасибо за подписку!');
    const startText = await getBotStartText(prisma);
    
    await ctx.editMessageCaption(startText, {
      parse_mode: 'HTML',
      ...START_KEYBOARD(undefined)
    });

    // Background trial award
    giveTrial(ctx);
  } catch (error) {
    console.error('Verify Subscription Error:', error);
    ctx.answerCbQuery('Произошла ошибка. Попробуйте еще раз.').catch(() => {});
  }
});

bot.action('about_us', async (ctx) => {
  try {
    ctx.answerCbQuery();
    await ctx.editMessageMedia({
      type: 'photo',
      media: { source: './about-banner.png' },
      caption: '<b>ℹ️ О сервисе PrivatVPN</b>\n\n' +
        'Мы создали PrivatVPN для тех, кто не готов мириться с ограничениями и ценит свою цифровую свободу.\n\n' +
        '<b>🚀 Почему выбирают нас:</b>\n\n' +
        '🛡️ <b>Приватность</b> — Используем VLESS Reality и современные протоколы, которые невозможно отличить от обычного трафика.\n' +
        '⚡ <b>Extreme Speed</b> — Прямые каналы до европейских дата-центров. Видео в 4K без задержек.\n' +
        '📱 <b>Удобство</b> — Подключение в один клик через это меню или наше нативное приложение.\n' +
        '🔒 <b>Без логов</b> — Мы не храним историю ваших действий. Ваш интернет — ваши правила.\n\n' +
        '<i>Присоединяйся к сообществу свободных людей! 💙</i>',
      parse_mode: 'HTML'
    }, Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Назад', 'back_to_start')]
    ]));
  } catch (error) {
    console.error('About Us Error:', error);
    ctx.reply('Произошла ошибка при загрузке информации. Попробуйте снова.').catch(console.error);
  }
});

bot.action('back_to_start', async (ctx) => {
  try {
    ctx.answerCbQuery();
    const startText = await getBotStartText(prisma);
    await ctx.editMessageMedia({
      type: 'photo',
      media: { source: './welcome-banner.png' },
      caption: startText,
      parse_mode: 'HTML'
    }, START_KEYBOARD(undefined));
  } catch (error) {
    console.error('Back to Start Error:', error);
    
    // In case of error, send fresh and delete old
    const prevMsgId = lastMenuMessages.get(ctx.from.id);
  if (prevMsgId) {
      ctx.telegram.deleteMessage(ctx.chat.id, prevMsgId).catch(() => {});
    }

    try {
      const startText = await getBotStartText(prisma);
      const sentMsg = await ctx.replyWithPhoto({ source: './welcome-banner.png' }, {
        caption: startText,
        parse_mode: 'HTML',
        ...START_KEYBOARD(undefined)
      });
      lastMenuMessages.set(ctx.from.id, sentMsg.message_id);
    } catch (e) {
      console.error(e);
    }
  }
});

bot.telegram.setMyCommands([
  { command: 'start', description: 'Запустить бота' }
]).catch(console.error);

bot.launch();

// Enable graceful stop
process.once('SIGINT', async () => {
  await prisma.$disconnect().catch(() => {});
  bot.stop('SIGINT');
});
process.once('SIGTERM', async () => {
  await prisma.$disconnect().catch(() => {});
  bot.stop('SIGTERM');
});

console.log('Bot is running...');
