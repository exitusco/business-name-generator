import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);
const resolveMx = promisify(dns.resolveMx);
const resolveNs = promisify(dns.resolveNs);

// DNS-based availability check: free, fast, ~90-95% accurate
// A domain is "likely taken" if it has A, MX, or NS records
// A domain with ENOTFOUND on all is "likely available"
// NOTE: This can miss parked domains with no records — that's the tradeoff
async function checkDomainViaDns(domain: string): Promise<boolean> {
  const fullDomain = domain.includes('.') ? domain : `${domain}.com`;

  try {
    // Try A record first (most common)
    await resolve4(fullDomain);
    return false; // has A records = taken
  } catch {}

  try {
    // Try MX records (email configured = taken)
    await resolveMx(fullDomain);
    return false;
  } catch {}

  try {
    // Try NS records (nameservers configured = taken, even if no A/MX)
    await resolveNs(fullDomain);
    return false;
  } catch {}

  // No DNS records found — likely available
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { domains } = await req.json();

    if (!Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json({ error: 'domains array required' }, { status: 400 });
    }

    const results: Record<string, boolean> = {};

    // Fire all DNS lookups concurrently — they're fast and free
    const promises = domains.map(async (domain: string) => {
      try {
        results[domain] = await checkDomainViaDns(domain);
      } catch {
        // On error, assume taken (conservative)
        results[domain] = false;
      }
    });

    await Promise.all(promises);

    return NextResponse.json({ results, method: 'dns' });
  } catch (err) {
    console.error('DNS check error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
