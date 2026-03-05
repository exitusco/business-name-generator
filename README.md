# NameCraft — AI Domain Name Generator

AI-powered business name generator with real-time .com domain availability checking.

## Features

- **AI Name Generation** — Uses OpenRouter (configurable model, Gemini 2.5 Flash default) to generate creative business names
- **Real Domain Availability** — WhoisXML API checks for accurate .com availability
- **Infinite Scroll** — Continuously generates new names as you scroll
- **Smart Domain Variants** — AI generates context-appropriate modifier domains (get___, use___, join___, etc.)
- **Visual Cards** — Each name gets a unique gradient, font, and contrast-checked color
- **Save & Collect** — Bookmark favorites locally (no auth needed)
- **Direct Purchase** — Click any domain to search/buy on Porkbun
- **Mobile Friendly** — Fully responsive design

## Getting Started

### 1. Get API Keys

You need two API keys:

**OpenRouter** (for AI generation):
1. Go to [openrouter.ai](https://openrouter.ai)
2. Create an account and add credits ($5 goes a long way)
3. Create an API key

**WhoisXML API** (for domain checks):
1. Go to [whoisxmlapi.com](https://domain-availability.whoisxmlapi.com/api)
2. Sign up — you get **100 free credits** (no credit card needed)
3. Find your API key on the "My Products" page
4. For production use, their paid plans start at ~$19/mo for 1,000 queries

### 2. Local Development

```bash
# Clone and install
git clone <your-repo-url>
cd namecraft
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your actual API keys

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Deploy to Vercel

This is designed for one-click Vercel deployment:

```bash
# Install Vercel CLI (if not already)
npm i -g vercel

# Deploy from the project directory
vercel
```

**Or deploy via the Vercel dashboard:**

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Add environment variables in the Vercel dashboard:
   - `OPENROUTER_API_KEY` — your OpenRouter key
   - `WHOISXML_API_KEY` — your WhoisXML API key
   - `AI_MODEL` — (optional) override model, e.g. `anthropic/claude-3.5-sonnet`
   - `NEXT_PUBLIC_SITE_URL` — your deployed domain
5. Click Deploy

**Add a custom domain:**
1. In Vercel dashboard → your project → Settings → Domains
2. Add your domain (e.g. `namecraft.yourdomain.com`)
3. Update DNS as instructed by Vercel (usually a CNAME record)

### Updating

After making changes:

```bash
# If using Vercel CLI:
vercel --prod

# If connected to GitHub:
# Just push to main — Vercel auto-deploys
git push origin main
```

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Landing — business description input
│   ├── configure/page.tsx    # Optional preferences form
│   ├── results/page.tsx      # Infinite scroll name cards
│   ├── saved/page.tsx        # Saved names collection
│   └── api/
│       ├── generate/route.ts # OpenRouter AI name generation
│       └── check-domain/route.ts # WhoisXML domain availability
├── components/
│   └── Header.tsx            # Shared header with nav
└── lib/
    ├── types.ts              # Shared types and constants
    └── colors.ts             # WCAG contrast calculation
```

## Configuration

All configuration is via environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | Yes | — | OpenRouter API key |
| `WHOISXML_API_KEY` | Yes | — | WhoisXML domain availability API key |
| `AI_MODEL` | No | `google/gemini-2.5-flash-preview` | OpenRouter model identifier |
| `NEXT_PUBLIC_SITE_URL` | No | `http://localhost:3000` | Your deployed URL |

### Changing the AI Model

Any model available on [OpenRouter](https://openrouter.ai/models) works. Just set the `AI_MODEL` env var:

```
AI_MODEL=anthropic/claude-3.5-sonnet
AI_MODEL=openai/gpt-4o
AI_MODEL=meta-llama/llama-3-70b-instruct
```

## Cost Estimates

- **OpenRouter**: ~$0.001–$0.01 per batch of 10 names (depends on model)
- **WhoisXML**: 1 credit per domain check. Each name uses ~3-5 credits (exact + variants)
  - Free tier: 100 credits
  - Starter: ~$19/mo for 1,000 credits
  - For heavy use, consider their higher tiers

## License

MIT
