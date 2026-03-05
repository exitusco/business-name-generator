import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { name, businessDescription, industry, existingVariants = [], tld = 'com' } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.AI_MODEL || 'google/gemini-2.5-flash-preview';
    if (!apiKey) return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });

    const prompt = `Generate more domain name variants for the business name "${name}".

Business: ${businessDescription || 'not specified'}
${industry ? `Industry: ${industry}` : ''}
TLD: .${tld}

Existing variants already shown (do NOT repeat): ${existingVariants.join(', ') || 'none'}

Generate 4-8 NEW creative domain variants. These can be:
- Prefix variants: get${name.toLowerCase()}, try${name.toLowerCase()}, etc.
- Suffix variants: ${name.toLowerCase()}app, ${name.toLowerCase()}hq, etc.
- Abbreviation variants: shortened/abbreviated versions
- Creative respellings that keep the sound
- The name combined with a relevant industry word

CRITICAL READABILITY RULES:
1. Every variant must read as clearly recognizable words when squished together. Read it aloud.
2. No double-letter collisions at join points (e.g. get + talon = "gettalon" is bad)
3. No variants that create unintended words across the join (e.g. "therapist" reading)
4. Each must work as a .${tld} domain (no spaces, lowercase, alphanumeric only)

Return ONLY a JSON array of strings (no .${tld} suffix). Example: ["getluminary","luminaryhq","trylumi"]`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model, messages: [{ role: 'user', content: prompt }],
        temperature: 0.9, max_tokens: 4000, reasoning: { max_tokens: 512 },
      }),
    });

    if (!response.ok) return NextResponse.json({ error: 'AI request failed' }, { status: 502 });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let variants: string[];
    try { variants = JSON.parse(cleaned); } catch {
      return NextResponse.json({ error: 'Failed to parse' }, { status: 502 });
    }

    if (!Array.isArray(variants)) return NextResponse.json({ error: 'Not an array' }, { status: 502 });

    const sanitized = variants
      .map((v: any) => String(v).trim().toLowerCase().replace(/\.[a-z]+$/i, '').replace(/\s+/g, ''))
      .filter((v: string) => v.length > 0 && !existingVariants.includes(v));

    return NextResponse.json({ variants: sanitized.slice(0, 8) });
  } catch (err) {
    console.error('Generate-variants error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
