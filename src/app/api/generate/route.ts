import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { config, existingNames = [], batchSize = 10 } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.AI_MODEL || 'google/gemini-2.5-flash-preview';

    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });
    }

    const stylesList = config.nameStyles?.length > 0
      ? config.nameStyles.join(', ')
      : 'any style';

    const prompt = `You are a creative business naming expert. Generate exactly ${batchSize} unique business name suggestions.

BUSINESS CONTEXT:
- Description: ${config.businessDescription}
${config.industry ? `- Industry: ${config.industry}` : ''}
${config.competitorNames ? `- Competitor names they like: ${config.competitorNames}` : ''}
${config.otherDetails ? `- Additional details: ${config.otherDetails}` : ''}

NAMING PREFERENCES:
- Preferred styles: ${stylesList}
- Phonetically transparent (easy to spell from hearing): ${config.phoneticTransparency || 'no preference'}
- Domain modifiers acceptable (like join___, use___, get___): ${config.domainModifiers || 'no preference'}
- Prioritize names likely to have .com domain available: ${config.prioritizeAvailability || 'no preference'}

${config.prioritizeAvailability === 'yes' ? `IMPORTANT: Strongly prioritize names that are UNLIKELY to already be registered as .com domains. Favor invented/coined words, unusual letter combinations, creative portmanteaus, and unique compound words. Avoid common dictionary words, popular phrases, or obvious business terms that are almost certainly already taken. The names should still sound professional and relevant, but lean toward the creative and distinctive end of the spectrum.` : ''}

${existingNames.length > 0 ? `ALREADY SUGGESTED (do NOT repeat any of these): ${existingNames.join(', ')}` : ''}

For each name, also provide 2-4 domain modifier variants IF domain modifiers are acceptable. These should be contextually appropriate for the business type. For example:
- For a SaaS/tech business: use___, get___, try___
- For a service business: hire___, book___
- For a retail/product business: shop___, buy___
- For a community/social: join___, meet___
Do NOT include generic modifiers that don't fit the business context.

If domain modifiers are NOT acceptable, provide an empty variants array.

Respond with ONLY a valid JSON array, no markdown, no explanation. Each object must have:
- "name": the business name (just the name, no .com)
- "variants": array of modified domain-ready names WITHOUT the .com (e.g. "getslack", "useslack")

Example: [{"name":"Luminary","variants":["getluminary","useluminary"]},{"name":"Pebble","variants":["trypebble","shopepebble"]}]`;

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
        temperature: 0.9,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter error:', errText);
      return NextResponse.json({ error: 'AI API request failed' }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON from response, stripping any markdown fences
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

    // Sanitize: ensure each item has name and variants
    const sanitized = suggestions
      .filter((s: any) => s && typeof s.name === 'string' && s.name.trim())
      .map((s: any) => ({
        name: s.name.trim().replace(/\.com$/i, ''),
        variants: Array.isArray(s.variants)
          ? s.variants.map((v: string) => String(v).trim().toLowerCase().replace(/\.com$/i, '').replace(/\s+/g, ''))
          : [],
      }));

    return NextResponse.json({ suggestions: sanitized });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
