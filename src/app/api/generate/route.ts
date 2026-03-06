import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { config, existingNames = [], savedNames = [], batchSize = 10, nonce = '', chatHistory = [], model: requestedModel } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });

    // Use client-requested model, fall back to env var, then default
    const model = requestedModel || process.env.AI_MODEL || 'google/gemini-3-flash-preview';

    const seed = nonce || Math.random().toString(36).slice(2, 10);
    const tld = config.tld || 'com';

    const stylesList = [...(config.nameStyles || []), ...(config.customStyles || [])];
    const stylesStr = stylesList.length > 0 ? stylesList.join(', ') : 'any style';

    const obscurity = config.obscurityLevel ?? 50;
    let obscurityDirective = '';
    if (obscurity < 25) {
      obscurityDirective = 'Lean toward familiar, recognizable words and references. The name should feel immediately understandable.';
    } else if (obscurity < 50) {
      obscurityDirective = 'Balance familiarity with creativity. Clever twists on real words, unexpected combinations.';
    } else if (obscurity < 75) {
      obscurityDirective = 'Favor distinctive, uncommon names. Coined words, rare references, creative portmanteaus.';
    } else {
      obscurityDirective = 'Strongly favor invented, never-before-seen names. Unique letter combinations that are pronounceable but not real words. These should almost certainly have available .${tld} domains.';
    }

    const prompt = `You are a world-class brand naming consultant — the kind who names companies like Spotify, Stripe, Figma, and Notion. Your job is to generate ${batchSize} exceptional business names.

THE BUSINESS:
${config.businessDescription}
${config.industry ? `Industry: ${config.industry}` : ''}
${config.competitorNames ? `Names they admire: ${config.competitorNames}` : ''}
${config.otherDetails ? `Notes: ${config.otherDetails}` : ''}

WHAT MAKES A GREAT BUSINESS NAME:
- It's memorable after hearing it once
- It looks good in a logo, on a business card, in an app store
- It has emotional resonance — it makes you FEEL something about the brand
- It's easy to say, easy to spell, and sounds good spoken aloud
- It works as a .${tld} domain (short enough, no hyphens, no confusion)

STYLE PREFERENCES: ${stylesStr}
PHONETIC CLARITY: ${config.phoneticTransparency || 'no preference'}
UNIQUENESS: ${obscurityDirective}

VARIETY IS CRITICAL: In every batch, include a MIX:
- 2-3 safe, strong, straightforward names (the kind a Fortune 500 would pick)
- 3-4 creative, distinctive names (the kind a well-funded startup would pick)
- 2-3 bold, surprising, or unusual names (the kind that makes someone stop scrolling)
This variety should be present in EVERY batch, regardless of how many batches have been generated.

${existingNames.length > 0 ? `DO NOT REPEAT these names: ${existingNames.join(', ')}` : ''}

${savedNames.length > 0 ? `NAMES THE USER HAS SAVED (they like these — use them as a signal of taste, but don't over-index on them):
${savedNames.join(', ')}` : ''}

${chatHistory.length > 0 ? `CONVERSATION WITH THE USER (read carefully):
The user has been chatting with a naming assistant while browsing names. Here is their conversation:

${chatHistory.map((m: any) => {
  if (m.role === 'system-event') return `[EVENT] ${m.content}`;
  if (m.role === 'user') return `USER: ${m.content}`;
  return `ASSISTANT: ${m.content}`;
}).join('\n')}

HOW TO WEIGH THIS CONVERSATION vs THE CONFIGURATION ABOVE:
- The CONFIGURATION (styles, obscurity, industry, etc.) represents the user's DELIBERATE baseline preferences. These are your foundation.
- The CONVERSATION is real-time feedback layered on top. How much it should shift your output depends on:
  * EXPLICIT INSTRUCTIONS from the user (e.g. "only show me two-word names") → these OVERRIDE the configuration
  * STRONG PREFERENCES expressed repeatedly → moderate shift from baseline
  * A SINGLE SAVE EVENT (e.g. [EVENT] Saved "Carrot") → very weak signal. Do NOT pivot your entire approach based on one save. It's just one data point.
  * ASSISTANT COMMENTARY about what the user "seems to like" → this is the assistant's interpretation, not the user's words. Treat it as a hint, not a directive.
  * SHORT CONVERSATIONS with few user messages → barely shift from the configured baseline
- When in doubt, lean toward the configured preferences. The conversation supplements; it doesn't replace.` : ''}

SESSION SEED: ${seed}
Generate DIFFERENT names every time. Never repeat yourself. Be fresh and surprising.

CATEGORY: Classify each name as one of: invented, real-word, compound, short, playful, elegant, human, metaphor, technical, geographic${stylesList.some(s => !['invented','real-word','compound','short','playful','elegant','human','metaphor','technical','geographic'].includes(s)) ? `, or a custom category if appropriate` : ''}

DOMAIN VARIANTS — THIS IS CRITICAL, READ CAREFULLY:
For each name, generate 2-5 alternative domain strings by adding a prefix or suffix. These MUST:

1. BE CONTEXTUALLY APPROPRIATE TO THE BUSINESS. Think about what the customer actually DOES:
   - Hiring/staffing/contracting: "hire___", "team___", "___crew", "___works", "___staff"
   - SaaS/software: "get___", "try___", "___app", "___hq"
   - E-commerce/retail: "shop___", "buy___", "___store"
   - Community/social: "join___", "meet___", "___hub"
   - Agency/services: "___studio", "___labs", "___co"
   - Food/restaurant: "eat___", "order___", "___eats"
   - Finance: "___pay", "___fi", "___fund"
   - Health/wellness: "___health", "___well", "my___"
   - Education: "learn___", "___academy", "___ed"
   Do NOT use generic prefixes like "use" or "get" when a business-specific one exists.

2. READ CLEARLY when squished into one string. Test by reading it back:
   - BAD: "hireaethelred" (unreadable), "useelara" (confusing double-e), "gettonix" (looks like "getto")
   - GOOD: "hiretalon" (clear), "teamforged" (clear), "ironworksapp" (clear)

3. NOT create accidental words at the join point. Check carefully.

4. VARY the modifier across names — don't use the same prefix/suffix pattern for every name.

OUTPUT FORMAT — Return ONLY a JSON array. No markdown. No explanation. Each object:
{
  "name": "BusinessName",
  "category": "category-id",
  "rationale": "One punchy sentence (max 15 words) on why this name works for THIS specific business.",
  "variants": ["prefixname", "namesuffix", "etc"]
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 1.1,
        max_tokens: 16000,
        reasoning: { max_tokens: 1024 },
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
    try { suggestions = JSON.parse(cleaned); } catch {
      console.error('Failed to parse:', cleaned.slice(0, 500));
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 });
    }

    if (!Array.isArray(suggestions)) return NextResponse.json({ error: 'Not an array' }, { status: 502 });

    const sanitized = suggestions
      .filter((s: any) => s?.name?.trim())
      .map((s: any) => {
        const name = s.name.trim().replace(/\.[a-z]+$/i, '');
        const nameLower = name.toLowerCase().replace(/\s+/g, '');
        let variants = Array.isArray(s.variants)
          ? s.variants.map((v: string) => String(v).trim().toLowerCase().replace(/\.[a-z]+$/i, '').replace(/\s+/g, ''))
              .filter((v: string) => v.length > 0 && v !== nameLower)
          : [];
        variants = variants.filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i).slice(0, 7);
        if (variants.length === 0) {
          const p = nameLower[0] !== 't' ? 'try' : 'get';
          variants = [`${p}${nameLower}`];
        }
        return { name, category: s.category || 'invented', rationale: typeof s.rationale === 'string' ? s.rationale.slice(0, 150) : '', variants };
      });

    return NextResponse.json({ suggestions: sanitized });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
