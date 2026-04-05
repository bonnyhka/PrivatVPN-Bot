import prisma from '@/lib/db';
import { PLANS } from './lib/store';

async function main() {
  const subs = await prisma.subscription.findMany({ 
    where: { 
      status: 'active',
      expiresAt: { gt: new Date() }
    } 
  });
  console.log('active subs in DB:', subs.length);
  const allowed = subs.filter(sub => {
    const plan = PLANS.find(p => p.id === sub.planId);
    if (!plan) return false;
    let limit;
    if (plan.trafficLimit === Number.MAX_SAFE_INTEGER) {
      limit = BigInt(Number.MAX_SAFE_INTEGER);
    } else {
      limit = BigInt(Math.floor(plan.trafficLimit * (1024 ** 3)));
    }
    if (sub.trafficUsed >= limit) {
      console.log('Filtered out by traffic limit:', sub.userId);
      return false;
    }
    return true;
  });
  console.log('Allowed subs after traffic filter:', allowed.length);
  const nazar = allowed.find(s => s.userId === 'cmn0evva70008143dj7nul6nm');
  console.log('Is Nazar (cmn0evva70008143dj7nul6nm) allowed?', !!nazar);
  if (nazar) {
    console.log('Nazar UUID from DB:', nazar.vlessUuid);
    console.log('Nazar traffic limit (BigInt):', BigInt(Math.floor(PLANS.find(p => p.id === nazar.planId).trafficLimit * (1024 ** 3))).toString());
    console.log('Nazar traffic used (BigInt):', nazar.trafficUsed.toString());
  }
  await prisma.$disconnect();
}
main().catch(console.error);
