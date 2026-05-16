import OpenAI from 'openai'
import { SYSTEM_PROMPT } from './prompts'
import { extractHtml } from './htmlGenerator'
import type { Message } from './types'

// Supports both official Anthropic API and OpenAI-compatible proxy services.
// Set CLAUDE_BASE_URL in .env.local to point to a proxy (e.g. https://vip.aipro.love/v1).
const client = new OpenAI({
  apiKey: process.env.CLAUDE_API_KEY,
  baseURL: process.env.CLAUDE_BASE_URL ?? 'https://api.anthropic.com/v1',
})

// Model name — adjust if your proxy uses a different alias
const MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-4-5'

export interface GenerateOptions {
  messages: Message[]
  onChunk?: (chunk: string) => void
}

export interface GenerateResult {
  html: string
  raw: string
}

/**
 * Builds the OpenAI-format message array from session history.
 *
 * Multi-turn iteration strategy:
 * - User messages → plain text content
 * - Assistant messages with `htmlSnapshot` → actual generated HTML
 *   so Claude can see the exact current page and make targeted edits
 *
 * Example 3-turn conversation sent to the API:
 *   user  → "Build me a portfolio"
 *   asst  → "<!DOCTYPE html>…"   (turn 1 HTML)
 *   user  → "Change hero to dark mode"
 *   asst  → "<!DOCTYPE html>…"   (turn 2 HTML)
 *   user  → "Add a contact form"  ← latest request
 */
function buildApiMessages(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
  const result: OpenAI.ChatCompletionMessageParam[] = []

  for (const msg of messages) {
    if (msg.role === 'user') {
      result.push({ role: 'user', content: msg.content })
    } else if (msg.role === 'assistant' && msg.htmlSnapshot) {
      result.push({ role: 'assistant', content: msg.htmlSnapshot })
    }
  }

  // Ensure strict alternation and end with user turn
  return dedupeRoles(result)
}

function dedupeRoles(
  msgs: OpenAI.ChatCompletionMessageParam[]
): OpenAI.ChatCompletionMessageParam[] {
  const out: OpenAI.ChatCompletionMessageParam[] = []
  for (const msg of msgs) {
    if (out.length === 0 || out[out.length - 1].role !== msg.role) {
      out.push(msg)
    } else {
      // Merge consecutive same-role messages
      const prev = out[out.length - 1]
      const prevText = typeof prev.content === 'string' ? prev.content : ''
      const newText = typeof msg.content === 'string' ? msg.content : ''
      prev.content = `${prevText}\n\n${newText}`
    }
  }
  while (out.length > 0 && out[out.length - 1].role !== 'user') {
    out.pop()
  }
  return out
}

export async function generateHtml(
  options: GenerateOptions
): Promise<GenerateResult> {
  const { messages, onChunk } = options
  const apiMessages = buildApiMessages(messages)

  if (apiMessages.length === 0) {
    throw new Error('No user messages to send.')
  }

  if (onChunk) {
    let raw = ''
    const stream = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 8000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...apiMessages,
      ],
      stream: true,
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        raw += delta
        onChunk(delta)
      }
    }

    return { html: extractHtml(raw) || raw, raw }
  } else {
    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 8000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...apiMessages,
      ],
      stream: false,
    })

    const raw = response.choices[0]?.message?.content ?? ''
    return { html: extractHtml(raw) || raw, raw }
  }
}
