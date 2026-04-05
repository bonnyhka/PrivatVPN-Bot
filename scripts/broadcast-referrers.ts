import prisma from '@/lib/db'
import { sendTelegramPhoto } from '../lib/telegram'
import path from 'path'

async function broadcastReferrers() {
  const referrers = await prisma.user.findMany({
    where: {
      referralActions: { some: {} }
    },
    include: {
      _count: { select: { referralActions: true } }
    }
  })

  console.log(`Found ${referrers.length} referrers. Starting broadcast...`)

  const bannerPath = path.join(process.cwd(), 'public', 'images', 'referral-banner.png')

  let success = 0
  let failed = 0

  for (const ref of referrers) {
    if (!ref.telegramId) continue
    
    const count = ref._count.referralActions
    const link = `https://t.me/privatruvpn_bot?start=${ref.referralCode}`
    
    // Pluralization for "друг" in Russian
    let friendText = 'друзей'
    if (count % 10 === 1 && count % 100 !== 11) friendText = 'друга'
    else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) friendText = 'друзей' // wait, 2 друга, 5 друзей.
    
    // Simple manual pluralization for small numbers
    const friendWord = count === 1 ? 'друга' : 'друзей'

    const caption = `<b>💖 Вместе теплее!</b>\n\nСпасибо, что приглашаете друзей! Вы уже привели к нам <b>${count} ${friendWord}</b>. ✨\n\nПродолжайте в том же духе — за каждого активного друга вы получаете <b>30 руб</b> на баланс!\n\nВаша ссылка: <code>${link}</code>`

    try {
      const ok = await sendTelegramPhoto(ref.telegramId, bannerPath, caption, {
        inline_keyboard: [[{ text: '👥 Пригласить ещё', url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Пользуюсь этим VPN, работает отлично! Попробуй тоже.')}` }]]
      })
      if (ok) success++
      else failed++
    } catch (err) {
      console.error(`Failed to send to ${ref.telegramId}:`, err)
      failed++
    }
    
    // Small delay
    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`Broadcast finished. Success: ${success}, Failed: ${failed}`)
}

broadcastReferrers()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
