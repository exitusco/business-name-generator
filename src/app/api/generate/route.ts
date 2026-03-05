import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { config, existingNames = [], rejectedNames = [], batchSize = 10, batchNumber = 1 } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.AI_MODEL || 'google/gemini-2.5-flash-preview';

    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });
    }

    const stylesList = config.nameStyles?.length > 0
      ? config.nameStyles.join(', ')
      : 'any style';

    let creativityDirective = '';
    if (batchNumber <= 2) {
      creativityDirective = 'Start with strong, intuitive names that clearly connect to the business.';
    } else if (batchNumber <= 4) {
      creativityDirective = 'The user has seen conventional options. Get more creative — try unexpected metaphors, invented words, unusual word pairings, and names from other languages.';
    } else if (batchNumber <= 7) {
      creativityDirective = 'The user is deep into browsing. Be bold: abstract coinages, surprising cultural references, synesthetic names, portmanteaus of unusual word pairs, mythology, science, or nature.';
    } else {
      creativityDirective = 'Go WILD. Extremely creative, unconventional names. Coin entirely new words. Mash unexpected concepts together. Obscure languages, scientific terms, rare words, abstract concepts.';
    }

    const prompt = `You are a creative business naming expert. Generate exactly ${batchSize} unique business name suggestions.

BUSINESS CONTEXT:
- Description: ${config.businessDescription}
${config.industry ? `- Industry: ${config.industry}` : ''}
${config.competitorNames ? `- Competitor names they like: ${config.competitorNames}` : ''}
${config.otherDetails ? `- Additional details: ${config.otherDetails}` : ''}

NAMING PREFERENCES:
- Preferred styles: ${stylesList}
- Phonetically transparent (easy to spell from hearing): ${config.phoneticTransparency || 'no preference'}
- Prioritize names likely to have .com domain available: ${config.prioritizeAvailability || 'no preference'}

${config.prioritizeAvailability === 'yes' ? `IMPORTANT: Strongly prioritize names that are UNLIKELY to already be registered as .com domains. Favor invented/coined words, unusual letter combinations, creative portmanteaus, and unique compound words over common dictionary words.` : ''}

CREATIVITY LEVEL (batch ${batchNumber}): ${creativityDirective}

${existingNames.length > 0 ? `ALREADY SUGGESTED (do NOT repeat): ${existingNames.join(', ')}` : ''}
${rejectedNames.length > 0 ? `PREVIOUSLY REJECTED (generate names DIFFERENT in style from these): ${rejectedNames.join(', ')}` : ''}

DOMAIN VARIANTS — CRITICAL RULES:
For each name, generate domain-friendly variants: the business name combined with a short prefix or suffix to form an alternative .com domain. Follow these rules STRICTLY:

1. READABILITY IS PARAMOUNT. The combined domain must read naturally as two clear words. Before including a variant, read the full string aloud. If the prefix/suffix blurs into the name creating an unreadable string, DO NOT include it.
   - BAD: "hireaethelred" (hire + aethelred = unreadable mush)
   - BAD: "useelara" (use + elara = "usee lara"?)
   - BAD: "gettonix" (get + tonix = looks like "getto nix")
   - GOOD: "tryluminary" (try + luminary = clearly two words)
   - GOOD: "goslate" (go + slate = reads perfectly)
   - GOOD: "heyorca" (hey + orca = clear)

2. Check for UNFORTUNATE letter collisions at the join point. If the prefix ends with the same letter the name starts with (get + Talon = "gettalon"), or creates a misleading read, skip that variant.

3. Choose prefixes that make sense for the SPECIFIC business type:
   - SaaS/tech: get, try, use
   - Service/agency: hire, book
   - Retail/products: shop, buy
   - Community/social: join, meet
   - General: go, hey, my

4. Return between 1 and 7 variants per name. Fewer is fine if only a few read well. More is fine if many work. Quality over quantity — only include variants that genuinely read cleanly.

5. Each variant should be UNIQUE to that name. Do not use the same prefix pattern for every name.

Respond with ONLY a valid JSON array, no markdown, no explanation. Each object:
- "name": the business name (no .com)
- "variants": array of domain-ready strings WITHOUT .com (e.g. "tryluminary")

Example: [{"name":"Luminary","variants":["tryluminary","getluminary","goluminary"]},{"name":"Slate","variants":["goslate","tryslate"]},{"name":"Orca","variants":["heyorca","meetorca","joinorca","myorca"]}]`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: Math.min(0.85 + (batchNumber * 0.03), 1.2),
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter error:', errText);
      return NextResponse.json({ error: 'AI API request failed' }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let suggestions;
    try {
      suggestions = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', cleaned);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 });
    }

    if (!Array.isArray(suggestions)) {
      return NextResponse.json({ error: 'AI response was not an array' }, { status: 502 });
    }

    const sanitized = suggestions
      .filter((s: any) => s && typeof s.name === 'string' && s.name.trim())
      .map((s: any) => {
        const name = s.name.trim().replace(/\.com$/i, '');
        const nameLower = name.toLowerCase().replace(/\s+/g, '');
        let variants = Array.isArray(s.variants)
          ? s.variants
              .map((v: string) => String(v).trim().toLowerCase().replace(/\.com$/i, '').replace(/\s+/g, ''))
              .filter((v: string) => v.length > 0 && v !== nameLower)
          : [];

        // Deduplicate
        variants = variants.filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i);

        // Cap at 7
        variants = variants.slice(0, 7);

        // If AI returned nothing, add one safe fallback
        if (variants.length === 0) {
          const prefix = 'get';
          const candidate = `${prefix}${nameLower}`;
          // Only add if it doesn't create a double letter at the join
          if (nameLower[0] !== prefix[prefix.length - 1]) {
            variants = [candidate];
          } else {
            variants = [`try${nameLower}`];
          }
        }

        return { name, variants };
      });

    return NextResponse.json({ suggestions: sanitized });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
