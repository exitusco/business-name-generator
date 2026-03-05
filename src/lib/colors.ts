// Calculate relative luminance per WCAG
function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Parse a gradient string to extract color stops and compute the average
function averageGradientColor(gradient: string): [number, number, number] {
  const hexMatches = gradient.match(/#[0-9a-fA-F]{6}/g) || [];
  if (hexMatches.length === 0) return [30, 30, 50];
  
  let r = 0, g = 0, b = 0;
  for (const hex of hexMatches) {
    r += parseInt(hex.slice(1, 3), 16);
    g += parseInt(hex.slice(3, 5), 16);
    b += parseInt(hex.slice(5, 7), 16);
  }
  const n = hexMatches.length;
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

// A set of candidate text colors to choose from
const TEXT_CANDIDATES = [
  '#ffffff',
  '#f0f0f0',
  '#e8e6e3',
  '#ffd6a5',
  '#c4a1ff',
  '#a5d8ff',
  '#b5e48c',
  '#ffc9c9',
  '#fce4a6',
  '#d0bfff',
  '#1a1a2e',
  '#0a0a0f',
  '#2d1b69',
];

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// Pick the text color with the best contrast ratio against the gradient background
// Ensures minimum 4.5:1 contrast ratio (WCAG AA)
export function pickTextColor(gradient: string): string {
  const bg = averageGradientColor(gradient);
  const bgLum = luminance(...bg);
  
  let bestColor = '#ffffff';
  let bestRatio = 0;
  
  for (const candidate of TEXT_CANDIDATES) {
    const rgb = hexToRgb(candidate);
    const candLum = luminance(...rgb);
    const ratio = contrastRatio(bgLum, candLum);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestColor = candidate;
    }
  }
  
  // If best ratio is still below 4.5, force white or black
  if (bestRatio < 4.5) {
    const whiteRatio = contrastRatio(bgLum, luminance(255, 255, 255));
    const blackRatio = contrastRatio(bgLum, luminance(0, 0, 0));
    bestColor = whiteRatio > blackRatio ? '#ffffff' : '#0a0a0f';
  }
  
  return bestColor;
}
