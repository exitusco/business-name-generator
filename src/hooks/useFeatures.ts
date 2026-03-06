'use client';

import { useAuth } from '@clerk/nextjs';
import { FEATURE_SLUGS, ANONYMOUS_FEATURES, FREE_FEATURES, PRO_FEATURES, AI_MODELS, DEFAULT_FREE_MODEL, DEFAULT_PRO_MODEL } from '@/lib/features';
import type { FeatureAccess, AIModel } from '@/lib/features';

export function useFeatures(): FeatureAccess & {
  availableModels: AIModel[];
  allModels: AIModel[];
  defaultModel: string;
  isSignedIn: boolean;
} {
  const { isSignedIn, has } = useAuth();

  // Anonymous user
  if (!isSignedIn) {
    return {
      ...ANONYMOUS_FEATURES,
      availableModels: AI_MODELS.filter(m => m.tier === 'free'),
      allModels: AI_MODELS,
      defaultModel: DEFAULT_FREE_MODEL,
      isSignedIn: false,
    };
  }

  // Check if user has pro features
  const hasAdvancedAI = has?.({ feature: FEATURE_SLUGS.ADVANCED_AI }) ?? false;
  const hasAIChat = has?.({ feature: FEATURE_SLUGS.AI_CHAT }) ?? false;
  const hasAdvancedAvailability = has?.({ feature: FEATURE_SLUGS.ADVANCED_AVAILABILITY }) ?? false;
  const hasExtraVariants = has?.({ feature: FEATURE_SLUGS.EXTRA_VARIANTS }) ?? false;

  const isPro = hasAdvancedAI || hasAIChat; // any pro feature means pro tier

  const features: FeatureAccess = isPro ? PRO_FEATURES : FREE_FEATURES;

  return {
    ...features,
    availableModels: isPro ? AI_MODELS : AI_MODELS.filter(m => m.tier === 'free'),
    allModels: AI_MODELS,
    defaultModel: isPro ? DEFAULT_PRO_MODEL : DEFAULT_FREE_MODEL,
    isSignedIn: true,
  };
}
