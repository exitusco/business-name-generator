import { NextRequest, NextResponse } from 'next/server';

// Cache the IANA TLD list in memory
let cachedTlds: Set<string> | null = null;
let lastFetch = 0;

async function getTlds(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedTlds && now - lastFetch < 86400000) return cachedTlds; // cache 24h

  try {
    const resp = await fetch('https://data.iana.org/TLD/tlds-alpha-by-domain.txt', {
      signal: AbortSignal.timeout(5000),
    });
    const text = await resp.text();
    const tlds = new Set(
      text.split('\n')
        .map(l => l.trim().toLowerCase())
        .filter(l => l && !l.startsWith('#'))
    );
    cachedTlds = tlds;
    lastFetch = now;
    return tlds;
  } catch {
    // Fallback: common TLDs if IANA is unreachable
    return new Set([
      'com','net','org','io','co','ai','app','dev','xyz','me','info','biz',
      'us','uk','ca','de','fr','au','in','tech','online','site','store',
      'shop','club','pro','agency','design','studio','gg','cc','tv','fm',
    ]);
  }
}

export async function GET(req: NextRequest) {
  const tld = req.nextUrl.searchParams.get('tld')?.toLowerCase().replace(/^\./, '') || '';
  if (!tld) return NextResponse.json({ valid: false });
  const tlds = await getTlds();
  return NextResponse.json({ valid: tlds.has(tld) });
}
