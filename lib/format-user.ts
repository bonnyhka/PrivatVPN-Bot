export function formatUserForClient(user: any) {
  const { subscription: rawSub, ...userData } = user

  return {
    ...userData,
    displayName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username || 'User',
    referralsCount: user._count?.referrals || 0,
    referrals: user.referralActions?.map((ref: any) => ({
      id: ref.id,
      fromUserId: ref.referrerId,
      toUsername: ref.referred?.username || '',
      toDisplayName: ref.referred?.firstName || 'Друг',
      toAvatar: ref.referred?.avatar || null,
      reward: ref.amount,
      status: ref.status,
      createdAt: ref.createdAt.toISOString()
    })) || [],
    subscription: rawSub ? {
      id: rawSub.id,
      planId: rawSub.planId,
      status: rawSub.status,
      expiresAt: rawSub.expiresAt.toISOString(),
      subscriptionUrl: rawSub.subscriptionUrl || `https://privatevp.space/api/sub/${rawSub.id}`,
      trafficUsed: rawSub.trafficUsed?.toString() || '0',
      autoRenew: rawSub.autoRenew,
      vlessUuid: rawSub.vlessUuid || undefined,
      tgProxyUrl: user.tgProxyUrl,
    } : undefined
  }
}
