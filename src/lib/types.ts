export interface DomainCheck {
  domain: string;
  available: boolean | null;
  method: 'whoisxml' | 'dns' | 'pending';
}

export interface NameCardData {
  id: string;
  name: string;
  category: string; // which naming style it is
  exactDomain: DomainCheck;
  variantDomains: DomainCheck[];
  gradient: string;
  fontFamily: string;
  textColor: string;
  verified: boolean;
  verifying: boolean;
  loadingVariants: boolean;
}

export interface UserConfig {
  businessDescription: string;
  industry: string;
  nameStyles: string[];
  customStyles: string[];
  phoneticTransparency: string;
  domainModifiers: string;
  competitorNames: string;
  otherDetails: string;
  obscurityLevel: number; // 0-100 slider
  tld: string; // e.g. "com", "io", "co"
}

export interface SavedName {
  name: string;
  category: string;
  savedAt: number;
  gradient: string;
  fontFamily: string;
  textColor: string;
  availableDomains: string[];
}

// Refactored: simpler, more intuitive naming style categories
export const NAME_STYLES = [
  { id: 'invented', label: 'Invented words', desc: 'Kodak, Spotify, Zillow' },
  { id: 'real-word', label: 'Real words', desc: 'Apple, Slack, Notion' },
  { id: 'compound', label: 'Two words combined', desc: 'YouTube, Snapchat, Mailchimp' },
  { id: 'short', label: 'Short & punchy', desc: 'Uber, Zoom, Bolt' },
  { id: 'playful', label: 'Playful or quirky', desc: 'Google, Wobble, Figma' },
  { id: 'elegant', label: 'Elegant & premium', desc: 'Luminary, Veritas, Aether' },
  { id: 'human', label: 'Person\'s name', desc: 'Oscar, Wendy\'s, Ada' },
  { id: 'metaphor', label: 'Metaphorical', desc: 'Amazon, Oracle, Salesforce' },
  { id: 'technical', label: 'Technical or scientific', desc: 'Palantir, Anthropic, Vertex' },
  { id: 'geographic', label: 'Place-inspired', desc: 'Patagonia, Brooklyn, Aspen' },
];

// Category tag colors — colorblind-safe (blue/orange/teal palette)
export const CATEGORY_COLORS: Record<string, string> = {
  'invented': '#5b9bd5',
  'real-word': '#ed7d31',
  'compound': '#70ad47',
  'short': '#ffc000',
  'playful': '#e06caa',
  'elegant': '#a580d0',
  'human': '#43b0a8',
  'metaphor': '#d95f5f',
  'technical': '#5b9bd5',
  'geographic': '#ed7d31',
  'custom': '#8c8c8c',
};

// Expanded, logo-worthy display fonts — no Arial-adjacent sans-serifs
export const CARD_FONTS = [
  // Serif / Display Serif
  "'DM Serif Display', serif",
  "'Playfair Display', serif",
  "'Cormorant Garamond', serif",
  "'Abril Fatface', cursive",
  "'Libre Baskerville', serif",
  "'Lora', serif",
  // Bold / Impact display
  "'Archivo Black', sans-serif",
  "'Bebas Neue', sans-serif",
  "'Anton', sans-serif",
  "'Oswald', sans-serif",
  "'Russo One', sans-serif",
  // Character / personality
  "'Righteous', cursive",
  "'Syne', sans-serif",
  "'Space Mono', monospace",
  "'Caveat', cursive",
  "'Permanent Marker', cursive",
  "'Fascinate', cursive",
  "'Bungee', cursive",
  "'Monoton', cursive",
  "'Press Start 2P', monospace",
  // Modern geometric
  "'Raleway', sans-serif",
  "'Josefin Sans', sans-serif",
  "'Comfortaa', cursive",
  "'Fredoka', sans-serif",
];

// Curated dark gradients
export const GRADIENTS = [
  'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)',
  'linear-gradient(135deg, #0b1120 0%, #1a365d 100%)',
  'linear-gradient(150deg, #0f172a 0%, #1e40af 100%)',
  'linear-gradient(135deg, #0a1628 0%, #134e5e 50%, #1a6b5a 100%)',
  'linear-gradient(140deg, #0d1b2a 0%, #1b4d5c 100%)',
  'linear-gradient(135deg, #0f0a1e 0%, #2d1b69 50%, #4c1d95 100%)',
  'linear-gradient(150deg, #13091f 0%, #3b0764 100%)',
  'linear-gradient(135deg, #1a0533 0%, #4338ca 100%)',
  'linear-gradient(135deg, #1a0a0a 0%, #6b1a1a 50%, #8b2500 100%)',
  'linear-gradient(140deg, #1c0f0f 0%, #7f1d1d 100%)',
  'linear-gradient(135deg, #1a0a14 0%, #831843 100%)',
  'linear-gradient(135deg, #0a1a0f 0%, #14532d 50%, #166534 100%)',
  'linear-gradient(140deg, #0b1a12 0%, #065f46 100%)',
  'linear-gradient(135deg, #0f1419 0%, #1e293b 50%, #334155 100%)',
  'linear-gradient(150deg, #111318 0%, #27303f 50%, #3e4c5e 100%)',
  'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #9f5820 100%)',
  'linear-gradient(135deg, #13091f 0%, #312e81 50%, #7c3aed 100%)',
  'linear-gradient(135deg, #0a1628 0%, #1e3a5f 50%, #0d9488 100%)',
  'linear-gradient(135deg, #1a0a14 0%, #4c1d6e 50%, #be185d 100%)',
  'linear-gradient(140deg, #0f172a 0%, #1e3050 50%, #c2410c 100%)',
];

// Common TLDs for quick validation — we also validate against IANA list at runtime
export const COMMON_TLDS = [
  'com','net','org','io','co','ai','app','dev','xyz','me','info','biz',
  'us','uk','ca','de','fr','au','in','tech','online','site','store',
  'shop','club','pro','agency','design','studio','gg','cc','tv','fm',
];
