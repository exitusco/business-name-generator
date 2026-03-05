import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);
const resolveMx = promisify(dns.resolveMx);
const resolveNs = promisify(dns.resolveNs);

async function checkDns(domain: string): Promise<boolean> {
  try { await resolve4(domain); return false; } catch {}
  try { await resolveMx(domain); return false; } catch {}
  try { await resolveNs(domain); return false; } catch {}
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { domains, tld = 'com' } = await req.json();
    if (!Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json({ error: 'domains array required' }, { status: 400 });
    }

    const results: Record<string, boolean> = {};
    const promises = domains.map(async (domain: string) => {
      try {
        const full = domain.includes('.') ? domain : `${domain}.${tld}`;
        results[domain] = await checkDns(full);
      } catch { results[domain] = false; }
    });

    await Promise.all(promises);
    return NextResponse.json({ results, method: 'dns' });
  } catch (err) {
    console.error('DNS check error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
