import { auth } from '@clerk/nextjs/server';
import { FEATURE_SLUGS, ANONYMOUS_FEATURES, FREE_FEATURES, PRO_FEATURES } from '@/lib/features';
import type { FeatureAccess } from '@/lib/features';

export async function getServerFeatures(): Promise<FeatureAccess & { userId: string | null }> {
  const { userId, has } = await auth();

  if (!userId) {
    return { ...ANONYMOUS_FEATURES, userId: null };
  }

  const hasAdvancedAI = has?.({ feature: FEATURE_SLUGS.ADVANCED_AI }) ?? false;
  const hasAIChat = has?.({ feature: FEATURE_SLUGS.AI_CHAT }) ?? false;

  const isPro = hasAdvancedAI || hasAIChat;

  return {
    ...(isPro ? PRO_FEATURES : FREE_FEATURES),
    userId,
  };
}
