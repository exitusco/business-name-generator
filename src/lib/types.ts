export interface NameSuggestion {
  name: string;
  variants: string[];
}

export interface DomainCheck {
  domain: string;
  available: boolean | null; // null = still checking
}

export interface NameCard {
  id: string;
  name: string;
  exactDomain: DomainCheck;
  variantDomains: DomainCheck[];
  gradient: string;
  fontFamily: string;
  textColor: string;
}

export interface UserConfig {
  businessDescription: string;
  industry: string;
  nameStyles: string[];
  phoneticTransparency: string;
  domainModifiers: string;
  competitorNames: string;
  otherDetails: string;
  prioritizeAvailability: string;
}

export interface SavedName {
  name: string;
  savedAt: number;
  gradient: string;
  fontFamily: string;
  textColor: string;
  availableDomains: string[];
}

export const NAME_STYLES = [
  'Abstract / Invented (e.g. Xerox, Kodak)',
  'Compound words (e.g. Facebook, YouTube)',
  'Real dictionary words (e.g. Apple, Slack)',
  'Human names (e.g. Wendy\'s, Oscar)',
  'Acronyms / Initials (e.g. IBM, BMW)',
  'Portmanteau (e.g. Pinterest, Groupon)',
  'Metaphorical (e.g. Amazon, Oracle)',
  'Misspelled / Modified (e.g. Lyft, Tumblr)',
  'Descriptive (e.g. General Electric, PayPal)',
  'Short & Punchy (e.g. Uber, Zoom)',
];

export const CARD_FONTS = [
  "'DM Serif Display', serif",
  "'Playfair Display', serif",
  "'Syne', sans-serif",
  "'Archivo Black', sans-serif",
  "'Bebas Neue', sans-serif",
  "'Righteous', cursive",
  "'Space Mono', monospace",
  "'Crimson Pro', serif",
  "'Caveat', cursive",
  "'Outfit', sans-serif",
];

export const GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)',
  'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
  'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
  'linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)',
  'linear-gradient(135deg, #0b486b 0%, #f56217 100%)',
  'linear-gradient(135deg, #232526 0%, #414345 100%)',
  'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)',
  'linear-gradient(135deg, #1a2a6c 0%, #b21f1f 50%, #fdbb2d 100%)',
  'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  'linear-gradient(135deg, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)',
  'linear-gradient(135deg, #200122 0%, #6f0000 100%)',
  'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
  'linear-gradient(135deg, #373b44 0%, #4286f4 100%)',
  'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
  'linear-gradient(135deg, #4e54c8 0%, #8f94fb 100%)',
  'linear-gradient(135deg, #0d0d0d 0%, #434343 100%)',
  'linear-gradient(135deg, #093028 0%, #237a57 100%)',
  'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',
];
