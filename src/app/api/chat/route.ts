import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system-event';
  content: string;
  timestamp?: number;
}

export interface ChatResponse {
  message: string;
  generateNames: boolean;
  namingGuidance?: string; // passed to generate endpoint as context
}

export async function POST(req: NextRequest) {
  try {
    const { messages, config, savedNames = [], namesShown = 0 } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.AI_MODEL || 'google/gemini-2.5-flash-preview';
    if (!apiKey) return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });

    const systemPrompt = `You are a creative naming assistant helping a user find the perfect business name. You're part of a domain name generator app — the user sees a grid of AI-generated business name suggestions, and you're their creative partner in this process.

CURRENT CONTEXT:
- Business: ${config?.businessDescription || 'not specified'}
${config?.industry ? `- Industry: ${config.industry}` : ''}
- Names shown so far: ${namesShown}
- Names saved: ${savedNames.length > 0 ? savedNames.join(', ') : 'none yet'}

YOUR ROLE:
- You're a thoughtful creative director, not a chatbot. Be concise and opinionated.
- Give SHORT responses (1-3 sentences max). You're a collaborator, not a lecturer.
- When the user saves a name, react briefly and note what you observe about their taste. Don't be effusive.
- When the user expresses frustration or dislikes patterns, acknowledge it quickly and explain what you'll change.
- If the user asks a question about a specific name, answer directly.

WHEN TO GENERATE NEW NAMES (set generateNames: true):
- User explicitly asks for more names or different names
- User gives feedback that implies they want a new direction (e.g. "I hate all the compound names")
- User saves a name AND you think generating similar ones would help
- Do NOT generate names if the user is just chatting or asking a question

WHEN TO ASK CLARIFYING QUESTIONS:
- Only if the user seems stuck or their preferences are contradictory
- Maximum once every 20 names shown
- Keep questions specific: "Do you want the name to feel techy or human?" not "What do you think?"

RESPOND WITH ONLY A JSON OBJECT (no markdown, no backticks):
{
  "message": "Your response text. Keep it short.",
  "generateNames": false,
  "namingGuidance": "Optional: if generateNames is true, write 1-2 sentences of specific guidance for what kind of names to generate next. This gets passed to the naming AI."
}`;

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
        reasoning: { max_tokens: 256 },
      }),
    });

    if (!response.ok) {
      console.error('Chat API error:', await response.text());
      return NextResponse.json({ error: 'Chat request failed' }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let parsed: ChatResponse;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // If AI didn't return valid JSON, treat the whole thing as a text message
      parsed = { message: content.slice(0, 300), generateNames: false };
    }

    return NextResponse.json({
      message: parsed.message || '',
      generateNames: !!parsed.generateNames,
      namingGuidance: parsed.namingGuidance || '',
    });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
