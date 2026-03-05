import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { config, existingNames = [], rejectedNames = [], batchSize = 10, batchNumber = 1, nonce = '' } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.AI_MODEL || 'google/gemini-2.5-flash-preview';
    if (!apiKey) return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });

    // Random seed to ensure different outputs even with identical prompts
    const seed = nonce || Math.random().toString(36).slice(2, 10);

    const tld = config.tld || 'com';

    const stylesList = [
      ...(config.nameStyles || []),
      ...(config.customStyles || []),
    ];
    const stylesStr = stylesList.length > 0 ? stylesList.join(', ') : 'any style';

    // Obscurity: 0 = conventional, 50 = balanced, 100 = very obscure/invented
    const obscurity = config.obscurityLevel ?? 50;
    let obscurityDirective = '';
    if (obscurity < 25) {
      obscurityDirective = 'Use familiar, recognizable words. Prioritize names that feel immediately understandable. Common dictionary words and well-known references are ideal.';
    } else if (obscurity < 50) {
      obscurityDirective = 'Mix familiar words with some creative twists. Slight modifications of real words or clever compounds are good.';
    } else if (obscurity < 75) {
      obscurityDirective = 'Lean toward unique and distinctive names. Invented words, unusual compounds, and creative coinages that are unlikely to be registered as domains.';
    } else {
      obscurityDirective = 'Strongly favor invented, abstract, or highly unusual names. These should be completely unique strings that almost certainly have available .${tld} domains. Prioritize pronounceability but not familiarity.';
    }

    let creativityDirective = '';
    if (batchNumber <= 2) {
      creativityDirective = 'Start with strong, intuitive names that clearly connect to the business.';
    } else if (batchNumber <= 4) {
      creativityDirective = 'The user has seen conventional options. Try unexpected metaphors, invented words, unusual pairings.';
    } else if (batchNumber <= 7) {
      creativityDirective = 'Be bold: abstract coinages, cultural references, synesthetic names, mythology, science.';
    } else {
      creativityDirective = 'Go WILD. Coin new words. Obscure languages, scientific terms, abstract concepts. Surprise the user.';
    }

    const prompt = `You are a creative business naming expert. Generate exactly ${batchSize} unique business name suggestions.

BUSINESS CONTEXT:
- Description: ${config.businessDescription}
${config.industry ? `- Industry: ${config.industry}` : ''}
${config.competitorNames ? `- Competitor names they like: ${config.competitorNames}` : ''}
${config.otherDetails ? `- Additional details: ${config.otherDetails}` : ''}
- Target TLD: .${tld}

NAMING PREFERENCES:
- Preferred styles: ${stylesStr}
- Phonetically transparent: ${config.phoneticTransparency || 'no preference'}
- Domain obscurity (0=familiar, 100=very unique): ${obscurity}

${obscurityDirective}

CREATIVITY (batch ${batchNumber}, seed ${seed}): ${creativityDirective}
IMPORTANT: Generate completely DIFFERENT names each time, even for the same business description. Be surprising and varied.

${existingNames.length > 0 ? `ALREADY SUGGESTED (do NOT repeat): ${existingNames.join(', ')}` : ''}
${rejectedNames.length > 0 ? `PREVIOUSLY REJECTED (try different approaches): ${rejectedNames.join(', ')}` : ''}

CATEGORY: For each name, classify it into ONE of these categories: invented, real-word, compound, short, playful, elegant, human, metaphor, technical, geographic${stylesList.some(s => !['invented','real-word','compound','short','playful','elegant','human','metaphor','technical','geographic'].includes(s)) ? `, or use the user's custom category name if it fits` : ''}

DOMAIN VARIANTS — RULES:
For each name, generate 1-7 domain variants (prefix/suffix combos). CRITICAL:
1. READABILITY: combined string must read as clear separate words. Read aloud before including.
   BAD: "hireaethelred", "useelara", "gettonix"
   GOOD: "tryluminary", "goslate", "heyorca"
2. No double-letter collisions at join points.
3. Choose prefixes appropriate to the business type.
4. Vary prefixes across names — don't reuse the same pattern for every name.
5. Quality over quantity. 1 good variant beats 4 bad ones.

Return ONLY a JSON array. Each object:
- "name": business name (no .${tld})
- "category": one of the category IDs above
- "rationale": 1 sentence (max 15 words) explaining why this name fits the business. Be specific, not generic.
- "variants": array of domain strings without .${tld}

Example: [{"name":"Luminary","category":"elegant","rationale":"Evokes brilliance and leadership in the consulting space.","variants":["tryluminary","goluminary"]},{"name":"Bolt","category":"short","rationale":"Suggests speed and reliability for a logistics platform.","variants":["getbolt","bolthq"]}]`;

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
        temperature: Math.min(0.95 + (batchNumber * 0.03), 1.3),
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
      console.error('Failed to parse:', cleaned);
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
        return { name, category: s.category || 'invented', rationale: typeof s.rationale === 'string' ? s.rationale.slice(0, 120) : '', variants };
      });

    return NextResponse.json({ suggestions: sanitized });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
