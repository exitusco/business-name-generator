function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1: number, l2: number): number {
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

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

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

const TEXT_CANDIDATES = [
  '#ffffff', '#f0f0f0', '#e8e6e3', '#ffd6a5', '#c4a1ff',
  '#a5d8ff', '#b5e48c', '#ffc9c9', '#fce4a6', '#d0bfff',
  '#1a1a2e', '#0a0a0f',
];

export function pickTextColor(gradient: string): string {
  const bg = averageGradientColor(gradient);
  const bgLum = luminance(...bg);
  let bestColor = '#ffffff';
  let bestRatio = 0;
  for (const candidate of TEXT_CANDIDATES) {
    const rgb = hexToRgb(candidate);
    const ratio = contrastRatio(bgLum, luminance(...rgb));
    if (ratio > bestRatio) { bestRatio = ratio; bestColor = candidate; }
  }
  if (bestRatio < 4.5) {
    const wr = contrastRatio(bgLum, luminance(255, 255, 255));
    const br = contrastRatio(bgLum, luminance(0, 0, 0));
    bestColor = wr > br ? '#ffffff' : '#0a0a0f';
  }
  return bestColor;
}

// Status colors:
// - Blue for DNS "likely free" estimates
// - Green for WhoisXML confirmed available
// - Pink/muted for taken
export const STATUS_COLORS = {
  confirmed: { bg: 'rgba(34, 197, 94, 0.10)', border: 'rgba(34, 197, 94, 0.5)', text: '#22c55e', dot: '#22c55e', glow: 'rgba(34, 197, 94, 0.08)' },
  likelyFree: { bg: 'rgba(0, 114, 178, 0.10)', border: 'rgba(0, 114, 178, 0.4)', text: '#0072B2', dot: '#0072B2', glow: 'rgba(0, 114, 178, 0.06)' },
  taken: { bg: 'rgba(204, 121, 167, 0.06)', border: 'rgba(204, 121, 167, 0.25)', text: '#CC79A7', dot: '#CC79A7', glow: 'transparent' },
  loading: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(42, 42, 58, 1)', text: '#666', dot: '#444', glow: 'transparent' },
};
