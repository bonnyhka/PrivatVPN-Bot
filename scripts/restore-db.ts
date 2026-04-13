import prisma from '@/lib/db'

async function main() {
  console.log('RESTORATION V7 (The Full 26 User Restore)...')

  // 1. Plan Configs (Tariffs)
  const plans = [
    { id: 'scout', price: 100, trafficLimit: 100 * 1024 * 1024 * 1024, features: '["1 устройство", "1 локация (Германия)", "Скорость 50 Мбит/с", "Лимит 100 ГБ трафика"]' },
    { id: 'guardian', price: 150, trafficLimit: 200 * 1024 * 1024 * 1024, features: '["3 устройства", "2 локации (DE, FI)", "Скорость 100 Мбит/с", "Лимит 200 ГБ трафика"]' },
    { id: 'fortress', price: 220, trafficLimit: 500 * 1024 * 1024 * 1024, features: '["5 устройств", "Все 3 локации", "Скорость 500 Мбит/с", "Лимит 500 ГБ трафика"]' },
    { id: 'citadel', price: 350, trafficLimit: null, features: '["10 устройств", "Все 3 локации", "Скорость 1 Гбит/с", "Безлимитный трафик"]' }
  ]

  for (const p of plans) {
    await prisma.planConfig.upsert({
      where: { id: p.id },
      update: { price: p.price, trafficLimit: p.trafficLimit, features: p.features },
      create: { id: p.id, price: p.price, trafficLimit: p.trafficLimit, features: p.features } as any
    })
  }

  // 2. The 26 Users (CUIDs and UUIDs recovered from logs/screenshots)
  const userIds = [
    // Core from March 20 / Active session
    "cmmxn8m5f0000ujicq0uarnfy", "cmn8zb3z80001wt7od4ea6v1x", "7923347249",
    "cmmxohklb00007xuryhnsi6e6", "cmmxoliyp00017xuravng19tk", "cmmxoluqk00027xurn1jxiwfe", "cmmxr3vad000412y871agexv4",
    // From Log Grep (cmn...)
    "cmn0hhky20002pr24mmy4sux2", "cmn0jcfqn000dpr24f7dan6kh", "cmn0m1qa50004tifasdqdzbry",
    "cmn1luz7a000eu67uaqknfe6i", "cmn1srkec001eu67uysvtan5k", "cmn1tr1z8001lu67ugrx5hndf",
    "cmn1ys9pl000g14cnhry3pksj", "cmn2o4kux001a13a03rbn7sd4", "cmn4w1re8000ajrajtw71xtv1",
    "cmn5w5399000edbn99f2xff82", "cmn63pqbt000pdbn9nq7h1e8l", "cmn6bdkr90006z7vx8j39t95d",
    "cmn7krmtm0009101a99gwmrqc", "cmn8z6r2c0005atioxjewwa1h",
    // From Screenshot (Differences spotted)
    "cmn5w5394000cdbn99ds9p4ta", "cmn4w1re50008jrajn4jqgtyl", "9038c180-b10a-4a39-8e90-c3aa0bf37bda",
    // From stats log (UUIDs)
    "113a910e-94de-4b78-8416-157945336d79", "13adf112-fb29-48cf-ba3f-0697193c9ee3",
    "97513733-428a-45bc-839c-a70926f4423d", "9e9fead5-a5d5-4545-afc3-756dfb4d42d0",
    "abcadff7-5ec5-448e-91e9-1983352f564a", "afba3ca4-ba7d-49bb-93f5-8abba910ae75",
    "e8643d9d-a130-4947-a16a-86771d777f51",
    // MOCK_USER
    "1"
  ]

  const trafficMap: Record<string, bigint> = {
    '13adf112-fb29-48cf-ba3f-0697193c9ee3': BigInt('9677286470'),
    '97513733-428a-45bc-839c-a70926f4423d': BigInt('27109245316'),
    'afba3ca4-ba7d-49bb-93f5-8abba910ae75': BigInt('1121063784'),
    'abcadff7-5ec5-448e-91e9-1983352f564a': BigInt('7901667129'),
    '9e9fead5-a5d5-4545-afc3-756dfb4d42d0': BigInt('4632191002'),
  }

  const telegramMapping: Record<string, string> = {
    "cmmxn8m5f0000ujicq0uarnfy": "5005525666",
    "cmn8zb3z80001wt7od4ea6v1x": "5005525666", 
    "7923347249": "7923347249",
    "cmmxohklb00007xuryhnsi6e6": "7923347249",
    "cmmxoliyp00017xuravng19tk": "659277716",
    "cmmxoluqk00027xurn1jxiwfe": "831896239",
    "cmmxr3vad000412y871agexv4": "1590328289"
  }

  console.log('Wiping existing users/subs for clean re-seed...')
  await prisma.subscription.deleteMany({})
  await prisma.user.deleteMany({})

  console.log('Re-seeding 26+ users...')
  const usedTIds = new Set<string>()

  for (const id of userIds) {
    let tId = telegramMapping[id] || id // Use ID as TId if unknown
    
    // Ensure uniqueness for TId
    if (usedTIds.has(tId)) {
       tId = tId + "_bak"
    }
    usedTIds.add(tId)

    const role = (tId === "5005525666" || tId === "7923347249") ? "owner" : "user"

    await prisma.user.create({
      data: {
        id: id,
        telegramId: tId,
        username: id.slice(0, 8),
        role: role
      } as any
    })

    await prisma.subscription.create({
      data: {
        userId: id,
        planId: 'citadel',
        status: 'active',
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        trafficUsed: trafficMap[id] || BigInt(0),
        vlessUuid: id,
        subscriptionUrl: `https://privatevp.space/api/sub/${id}`
      } as any
    })
  }

  console.log('Restoration V7 Complete! Total users:', await prisma.user.count())
}

main().finally(() => prisma.$disconnect())
