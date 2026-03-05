import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { domains, tld = 'com' } = await req.json();
    if (!Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json({ error: 'domains array required' }, { status: 400 });
    }

    const apiKey = process.env.WHOISXML_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'WHOISXML_API_KEY not configured' }, { status: 500 });

    const results: Record<string, boolean> = {};

    const promises = domains.map(async (domain: string) => {
      try {
        const clean = domain.toLowerCase().replace(/\s+/g, '');
        const full = clean.includes('.') ? clean : `${clean}.${tld}`;
        const resp = await fetch(
          `https://domain-availability.whoisxmlapi.com/api/v1?apiKey=${apiKey}&domainName=${encodeURIComponent(full)}&credits=DA`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (!resp.ok) { results[domain] = false; return; }
        const data = await resp.json();
        results[domain] = data?.DomainInfo?.domainAvailability === 'AVAILABLE';
      } catch { results[domain] = false; }
    });

    await Promise.all(promises);
    return NextResponse.json({ results });
  } catch (err) {
    console.error('Check-domain error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
