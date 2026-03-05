import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { domains } = await req.json();

    if (!Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json({ error: 'domains array required' }, { status: 400 });
    }

    const apiKey = process.env.WHOISXML_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'WHOISXML_API_KEY not configured' }, { status: 500 });
    }

    // Check domains in parallel, max 10 concurrent
    const results: Record<string, boolean> = {};
    const batchSize = 10;

    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize);
      const promises = batch.map(async (domain: string) => {
        try {
          const cleanDomain = domain.toLowerCase().replace(/\s+/g, '');
          const fullDomain = cleanDomain.includes('.') ? cleanDomain : `${cleanDomain}.com`;

          const resp = await fetch(
            `https://domain-availability.whoisxmlapi.com/api/v1?apiKey=${apiKey}&domainName=${encodeURIComponent(fullDomain)}&credits=DA`,
            { signal: AbortSignal.timeout(10000) }
          );

          if (!resp.ok) {
            console.error(`Domain check failed for ${fullDomain}: ${resp.status}`);
            results[domain] = false;
            return;
          }

          const data = await resp.json();
          // WhoisXML returns "AVAILABLE" or "UNAVAILABLE" in DomainInfo.domainAvailability
          results[domain] = data?.DomainInfo?.domainAvailability === 'AVAILABLE';
        } catch (err) {
          console.error(`Domain check error for ${domain}:`, err);
          results[domain] = false;
        }
      });

      await Promise.all(promises);
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error('Check-domain error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
