// Feature flags configuration
// Maps Clerk billing feature slugs to app capabilities

export const FEATURE_SLUGS = {
  BASIC_AI: 'basic_ai',
  ADVANCED_AI: 'advanced_ai',
  BASIC_AVAILABILITY: 'basic_availability_checks',
  ADVANCED_AVAILABILITY: 'advanced_availability_checks',
  AI_CHAT: 'ai_chat',
  EXTRA_VARIANTS: 'extra_variants',
} as const;

// AI models available in the app
export interface AIModel {
  id: string;
  name: string;
  provider: string;
  tier: 'free' | 'pro';
  description: string;
}

export const AI_MODELS: AIModel[] = [
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'Google', tier: 'free', description: 'Fast and capable' },
  { id: 'inception/mercury-2', name: 'Mercury 2', provider: 'Inception', tier: 'free', description: 'Balanced performance' },
  { id: 'x-ai/grok-4.1-fast', name: 'Grok 4.1 Fast', provider: 'xAI', tier: 'free', description: 'Quick and creative' },
  { id: 'openai/gpt-5.4', name: 'GPT-5.4', provider: 'OpenAI', tier: 'pro', description: 'Premium quality' },
  { id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'Google', tier: 'pro', description: 'Advanced reasoning' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic', tier: 'pro', description: 'Nuanced and precise' },
];

export const DEFAULT_FREE_MODEL = 'google/gemini-3-flash-preview';
export const DEFAULT_PRO_MODEL = 'anthropic/claude-haiku-4.5';

// Feature access for each tier
export interface FeatureAccess {
  basicAI: boolean;
  advancedAI: boolean;
  basicAvailability: boolean;
  advancedAvailability: boolean;
  aiChat: boolean;
  extraVariants: boolean;
  tier: 'anonymous' | 'free' | 'pro';
}

// Anonymous and free have the same features
export const ANONYMOUS_FEATURES: FeatureAccess = {
  basicAI: true,
  advancedAI: false,
  basicAvailability: true,
  advancedAvailability: false,
  aiChat: false,
  extraVariants: false,
  tier: 'anonymous',
};

export const FREE_FEATURES: FeatureAccess = {
  basicAI: true,
  advancedAI: false,
  basicAvailability: true,
  advancedAvailability: false,
  aiChat: false,
  extraVariants: false,
  tier: 'free',
};

export const PRO_FEATURES: FeatureAccess = {
  basicAI: true,
  advancedAI: true,
  basicAvailability: true,
  advancedAvailability: true,
  aiChat: true,
  extraVariants: true,
  tier: 'pro',
};
