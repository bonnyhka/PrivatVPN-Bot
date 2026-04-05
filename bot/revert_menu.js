require('dotenv').config();
const { Telegraf } = require('telegraf');

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('Error: BOT_TOKEN is not defined in .env file');
  process.exit(1);
}

const bot = new Telegraf(token);
bot.telegram.callApi('setChatMenuButton', { menu_button: { type: 'default' } })
  .then(() => {
    console.log('Menu button reverted to default');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
