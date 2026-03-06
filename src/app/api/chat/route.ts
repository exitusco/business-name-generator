import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system-event';
  content: string;
  timestamp?: number;
}

export interface SuggestedChange {
  field: string;       // config key: 'tld', 'industry', 'obscurityLevel', 'otherDetails', 'phoneticTransparency', 'nameStyles', etc.
  label: string;       // human-readable label: "TLD", "Industry", "Notes"
  value: any;          // the new value to set
  displayValue: string; // what to show the user: ".co", "Healthcare", etc.
  action: 'set' | 'append'; // 'set' replaces, 'append' adds to existing (for otherDetails/notes)
}

export interface ChatResponse {
  message: string;
  generateNames: boolean;
  suggestedChanges: SuggestedChange[];
}

export async function POST(req: NextRequest) {
  try {
    const { messages, config, savedNames = [], namesShown = 0 } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.AI_MODEL || 'google/gemini-2.5-flash-preview';
    if (!apiKey) return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });

    const systemPrompt = `You are a creative naming assistant helping a user find the perfect business name. You're part of a domain name generator app.

CURRENT CONFIGURATION:
- Business: ${config?.businessDescription || 'not specified'}
- Industry: ${config?.industry || 'not specified'}
- TLD: .${config?.tld || 'com'}
- Name styles: ${(config?.nameStyles || []).concat(config?.customStyles || []).join(', ') || 'any'}
- Obscurity level: ${config?.obscurityLevel ?? 50}/100
- Phonetic transparency: ${config?.phoneticTransparency || 'no preference'}
- Notes: ${config?.otherDetails || 'none'}
- Names shown: ${namesShown}
- Names saved: ${savedNames.length > 0 ? savedNames.join(', ') : 'none yet'}

YOUR ROLE:
- Concise creative director. SHORT responses (1-3 sentences).
- When the user saves a name, react briefly. Don't be effusive.
- When the user expresses frustration, acknowledge quickly.
- Answer questions directly.

WHEN TO GENERATE NEW NAMES (generateNames: true):
- ONLY when the user explicitly asks for more/different names
- ONLY when typed feedback implies they want a new direction
- NEVER in response to [SYSTEM EVENT] like saves
- NEVER when just chatting or asking questions

SUGGESTING CONFIGURATION CHANGES:
When the user expresses a preference that maps to a configuration setting, suggest a change. Available fields:
- "tld" (string): domain extension, e.g. "co", "io". Use when user says things like "let's try .io"
- "industry" (string): business industry
- "obscurityLevel" (number 0-100): how unique/invented names should be
- "phoneticTransparency" (string): "yes", "no", or "no preference"
- "nameStyles" (string[]): array of style IDs: invented, real-word, compound, short, playful, elegant, human, metaphor, technical, geographic
- "otherDetails" (string): free-form notes. Use action "append" for adding instructions that don't fit other fields.

WHEN to suggest changes:
- User says "I want .co domains" → suggest tld change
- User says "make them more creative" → suggest obscurityLevel increase
- User says "I only want single real words" → suggest nameStyles change
- User says "nothing with numbers" → suggest appending to otherDetails
- User says "I changed my mind, this is for a restaurant" → suggest industry change
- Any explicit instruction that doesn't fit a specific field → suggest appending to otherDetails/notes

WHEN NOT to suggest changes:
- Vague feedback like "these are okay" — just respond conversationally
- A single save — just comment on it

RESPOND WITH ONLY A JSON OBJECT (no markdown, no backticks):
{
  "message": "Your response text.",
  "generateNames": false,
  "suggestedChanges": [
    {
      "field": "tld",
      "label": "TLD",
      "value": "co",
      "displayValue": ".co",
      "action": "set"
    }
  ]
}

suggestedChanges should be an empty array [] if no changes are suggested. You can suggest multiple changes at once if appropriate.`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: ChatMessage) => ({
        role: m.role === 'system-event' ? 'user' : m.role,
        content: m.role === 'system-event' ? `[SYSTEM EVENT] ${m.content}` : m.content,
      })),
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        temperature: 0.8,
        max_tokens: 4000,
        reasoning: { max_tokens: 512 },
      }),
    });

    if (!response.ok) {
      console.error('Chat API error:', await response.text());
      return NextResponse.json({ error: 'Chat request failed' }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { message: content.slice(0, 300), generateNames: false, suggestedChanges: [] };
    }

    // Validate suggestedChanges
    const validFields = ['tld', 'industry', 'obscurityLevel', 'phoneticTransparency', 'nameStyles', 'customStyles', 'otherDetails', 'businessDescription', 'competitorNames'];
    const suggestedChanges = Array.isArray(parsed.suggestedChanges)
      ? parsed.suggestedChanges.filter((sc: any) =>
          sc && typeof sc.field === 'string' && validFields.includes(sc.field) && sc.label && sc.displayValue !== undefined
        ).map((sc: any) => ({
          field: sc.field,
          label: String(sc.label),
          value: sc.value,
          displayValue: String(sc.displayValue),
          action: sc.action === 'append' ? 'append' : 'set',
        }))
      : [];

    return NextResponse.json({
      message: parsed.message || '',
      generateNames: !!parsed.generateNames,
      suggestedChanges,
    });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
