// Client-side domain availability cache
// Survives across card opens/closes within the same session
// Keyed by full domain string (e.g. "myapp.com")

type CacheEntry = {
  available: boolean;
  method: 'dns' | 'whoisxml';
  ts: number;
};

const cache = new Map<string, CacheEntry>();

// DNS results are approximate — cache for 5 minutes
const DNS_TTL = 5 * 60 * 1000;
// WhoisXML results are authoritative — cache for 30 minutes
const WHOISXML_TTL = 30 * 60 * 1000;

export function getCached(domain: string): CacheEntry | null {
  const entry = cache.get(domain.toLowerCase());
  if (!entry) return null;
  const ttl = entry.method === 'whoisxml' ? WHOISXML_TTL : DNS_TTL;
  if (Date.now() - entry.ts > ttl) {
    cache.delete(domain.toLowerCase());
    return null;
  }
  return entry;
}

export function setCache(domain: string, available: boolean, method: 'dns' | 'whoisxml') {
  cache.set(domain.toLowerCase(), { available, method, ts: Date.now() });
}

// Batch check: returns cached results and list of uncached domains
export function partitionCached(domains: string[], tld: string): {
  cached: Record<string, { available: boolean; method: 'dns' | 'whoisxml' }>;
  uncached: string[];
} {
  const cached: Record<string, { available: boolean; method: 'dns' | 'whoisxml' }> = {};
  const uncached: string[] = [];

  for (const d of domains) {
    const full = d.includes('.') ? d : `${d}.${tld}`;
    const entry = getCached(full);
    if (entry) {
      cached[d] = { available: entry.available, method: entry.method };
    } else {
      uncached.push(d);
    }
  }

  return { cached, uncached };
}

export function cacheSize(): number {
  return cache.size;
}
