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

// Curated gradients — all dark-to-mid-tone, cohesive aesthetic
// Each uses a rich two-stop or three-stop gradient anchored in deep darks
// with a single accent color direction for visual interest
export const GRADIENTS = [
  // Deep blue family
  'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)',
  'linear-gradient(135deg, #0b1120 0%, #1a365d 100%)',
  'linear-gradient(150deg, #0f172a 0%, #1e40af 100%)',

  // Teal / ocean
  'linear-gradient(135deg, #0a1628 0%, #134e5e 50%, #1a6b5a 100%)',
  'linear-gradient(140deg, #0d1b2a 0%, #1b4d5c 100%)',

  // Purple / violet
  'linear-gradient(135deg, #0f0a1e 0%, #2d1b69 50%, #4c1d95 100%)',
  'linear-gradient(150deg, #13091f 0%, #3b0764 100%)',
  'linear-gradient(135deg, #1a0533 0%, #4338ca 100%)',

  // Warm dark — ember / wine
  'linear-gradient(135deg, #1a0a0a 0%, #6b1a1a 50%, #8b2500 100%)',
  'linear-gradient(140deg, #1c0f0f 0%, #7f1d1d 100%)',
  'linear-gradient(135deg, #1a0a14 0%, #831843 100%)',

  // Forest / emerald
  'linear-gradient(135deg, #0a1a0f 0%, #14532d 50%, #166534 100%)',
  'linear-gradient(140deg, #0b1a12 0%, #065f46 100%)',

  // Slate / graphite with subtle color
  'linear-gradient(135deg, #0f1419 0%, #1e293b 50%, #334155 100%)',
  'linear-gradient(150deg, #111318 0%, #27303f 50%, #3e4c5e 100%)',

  // Mixed accent — deep base with warm pop
  'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #9f5820 100%)',
  'linear-gradient(135deg, #13091f 0%, #312e81 50%, #7c3aed 100%)',
  'linear-gradient(135deg, #0a1628 0%, #1e3a5f 50%, #0d9488 100%)',
  'linear-gradient(135deg, #1a0a14 0%, #4c1d6e 50%, #be185d 100%)',
  'linear-gradient(140deg, #0f172a 0%, #1e3050 50%, #c2410c 100%)',
];
