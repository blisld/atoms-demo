# Atoms Demo — AI Web Generator

A high-quality [Atoms.dev](https://atoms.dev) inspired demo that showcases **conversation-driven AI web page generation**. Describe what you want to build, watch it come to life in real time, then keep iterating through natural language.

---

## ✨ Highlights

| Feature | Details |
|---|---|
| **Real-time streaming preview** | iframe updates every 180 ms as Claude generates — you see the page building character by character |
| **True multi-turn iteration** | Each conversation turn sends the full HTML history back to Claude, so you can say "make it dark mode" or "add a login form" and get accurate targeted edits |
| **Agent thinking visualization** | 4-phase progress indicator: *Planning → Writing HTML → Adding interactivity → Polishing* |
| **Session history** | Multiple independent sessions, each with its own chat history and generated page. Persisted to `localStorage`. Supports rename and delete. |
| **One-click export** | Download the generated page as a standalone `.html` file |
| **Remix** | One click to generate a completely different visual variant while keeping the same content |
| **6 quick-start templates** | Portfolio, SaaS Dashboard, Todo App, Fitness Tracker, E-commerce, Landing Page |
| **Responsive layout** | 38 % chat / 62 % preview on desktop; stacked on mobile |

---

## 🚀 Quick Start

### 1. Clone & install

```bash
git clone <repo-url>
cd atoms-demo
npm install
```

### 2. Set your Claude API key

```bash
cp .env.local.example .env.local   # or just edit .env.local directly
```

Edit `.env.local`:

```env
CLAUDE_API_KEY=sk-ant-api03-your-key-here
```

Get a key at [console.anthropic.com](https://console.anthropic.com/).

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🏗 Architecture

```
app/
├── layout.tsx              Root layout (Geist font, Sonner toasts)
├── page.tsx                Main client page — state, streaming, session mgmt
├── globals.css             Dark-first theme (#0a0a0a) + shimmer animations
└── api/generate/route.ts   SSE streaming endpoint → Claude API

components/
├── chat/
│   ├── ChatInterface.tsx   Left panel: messages, input, session controls
│   ├── MessageBubble.tsx   User / AI bubbles + TypingIndicator
│   └── PromptSuggestions.tsx  Quick-start template chips (horizontal scroll)
└── preview/
    ├── PreviewPanel.tsx    Right panel: Live Preview / Code / Sessions tabs
    ├── CodeViewer.tsx      Syntax-highlighted code + Copy + Export
    └── SessionList.tsx     Session browser with rename / delete

lib/
├── types.ts                Message (+ htmlSnapshot), Session, GenerationStatus
├── prompts.ts              System prompt + 6 quick-start templates
├── llm.ts                  Claude streaming wrapper + multi-turn buildApiMessages
└── htmlGenerator.ts        extractHtml, deriveTitle, generateId
```

### Multi-turn iteration design

Each assistant message stores `htmlSnapshot` — the full HTML it produced for that turn. When `buildApiMessages` constructs the Claude API call, it replaces the display text with the actual HTML, giving Claude a proper view of every page version in the conversation history:

```
user   → "Build me a portfolio"
asst   → "<!DOCTYPE html>…" (actual HTML, not "✅ generated!")
user   → "Change hero to dark mode"
asst   → "<!DOCTYPE html>…" (updated HTML)
user   → "Add a contact form"   ← Claude sees full context and edits precisely
```

---

## 🛠 Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript strict |
| Styling | Tailwind CSS v4 |
| Animation | framer-motion |
| Icons | lucide-react |
| Toast | sonner |
| AI | Claude (Anthropic SDK) — streaming via SSE |
| State | React `useState` + `localStorage` |
| Preview | `<iframe sandbox>` + `srcDoc` |

---

## 🌐 Deploy to Vercel

```bash
vercel --prod
```

Add `CLAUDE_API_KEY` in **Vercel → Project → Settings → Environment Variables**.

Or use the button:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

## 📸 Screenshots

> _Add screenshots here after first run_

**Main interface (desktop)**
<!-- screenshot: full app, two-column layout -->

**Real-time streaming preview**
<!-- screenshot: iframe updating mid-generation -->

**Session history panel**
<!-- screenshot: Sessions tab with multiple entries -->

---

## 📄 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `CLAUDE_API_KEY` | ✅ | Anthropic API key (`sk-ant-…`) |

---

## 🤝 License

MIT
