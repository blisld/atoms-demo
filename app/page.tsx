'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { GitFork, Zap } from 'lucide-react'
import { toast } from 'sonner'
import ChatInterface from '@/components/chat/ChatInterface'
import PreviewPanel from '@/components/preview/PreviewPanel'
import { generateId, deriveTitle, extractHtml, withChatBridge } from '@/lib/htmlGenerator'
import type { Message, Session, GenerationStatus } from '@/lib/types'

const STORAGE_KEY = 'atoms-demo-sessions'
const ACTIVE_KEY = 'atoms-demo-active-session'

function loadSessions(): Session[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveSessions(sessions: Session[]) {
  // Strip htmlSnapshot before persisting — it can be very large and
  // is only needed in memory for the current session's multi-turn context.
  // generatedHtml (the latest committed page) is kept for session restore.
  const slim = sessions.map((s) => ({
    ...s,
    messages: s.messages.map(({ htmlSnapshot: _, ...msg }) => msg),
  }))
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
  } catch {
    // QuotaExceededError: prune oldest sessions and retry once
    const pruned = slim.slice(-5)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned)) } catch { /* ignore */ }
  }
}

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [streamingHtml, setStreamingHtml] = useState('')
  const [generatedChars, setGeneratedChars] = useState(0)

  const rawHtmlRef = useRef('')
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Stable ref so the postMessage listener always calls the latest handleSend
  // without needing to re-register the event listener on every render.
  const handleSendRef = useRef<(text: string) => void>(() => {})

  // Throttle iframe updates to avoid over-rendering during streaming
  const scheduleIframeUpdate = useCallback(() => {
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current)
    updateTimerRef.current = setTimeout(() => {
      const partial = rawHtmlRef.current
      if (partial.includes('<')) {
        setStreamingHtml(extractHtml(partial) || partial)
      }
      setGeneratedChars(partial.length)
    }, 180)
  }, [])

  // Hydrate from localStorage
  useEffect(() => {
    const stored = loadSessions()
    setSessions(stored)
    const activeId = localStorage.getItem(ACTIVE_KEY)
    if (activeId && stored.some((s) => s.id === activeId)) {
      setActiveSessionId(activeId)
    } else if (stored.length > 0) {
      setActiveSessionId(stored[stored.length - 1].id)
    }
  }, [])

  useEffect(() => {
    if (sessions.length > 0) saveSessions(sessions)
  }, [sessions])

  useEffect(() => {
    if (activeSessionId) localStorage.setItem(ACTIVE_KEY, activeSessionId)
  }, [activeSessionId])

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null

  // ── Iframe communication: two layers for reliability ──────────────────────
  //
  // Layer 1 (direct): expose window.updatePreviewWithNewInstruction so the
  //   injected bridge can call window.parent.updatePreviewWithNewInstruction()
  //   directly — no event loop, no timing issues.
  //
  // Layer 2 (postMessage fallback): catch messages from pages where the
  //   direct call isn't available (e.g. cross-origin or Claude-generated UI
  //   that uses postMessage on its own).
  useEffect(() => {
    type AW = Window & { updatePreviewWithNewInstruction?: (t: string) => void }
    ;(window as AW).updatePreviewWithNewInstruction = (text: string) => {
      const t = (text ?? '').trim()
      if (t) handleSendRef.current(t)
    }

    const onMessage = (event: MessageEvent<unknown>) => {
      const d = event.data
      if (
        d &&
        typeof d === 'object' &&
        (d as Record<string, unknown>).type === 'atoms-iterate'
      ) {
        const text = String((d as Record<string, unknown>).text ?? '').trim()
        if (text) handleSendRef.current(text)
      }
    }
    window.addEventListener('message', onMessage)

    return () => {
      delete (window as AW).updatePreviewWithNewInstruction
      window.removeEventListener('message', onMessage)
    }
  }, [])

  const createNewSession = useCallback((): Session => {
    const session: Session = {
      id: generateId(),
      title: 'New Session',
      messages: [],
      generatedHtml: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setSessions((prev) => [...prev, session])
    setActiveSessionId(session.id)
    return session
  }, [])

  const handleNewSession = () => {
    createNewSession()
    setStreamingHtml('')
    setGeneratedChars(0)
  }

  const handleSend = async (text: string) => {
    let session = activeSession
    if (!session) {
      session = createNewSession()
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }

    const isFirstMessage = session.messages.length === 0

    // Immediately append user message to session
    setSessions((prev) =>
      prev.map((s) =>
        s.id === session!.id
          ? {
              ...s,
              title: isFirstMessage ? deriveTitle(text) : s.title,
              messages: [...s.messages, userMessage],
              updatedAt: Date.now(),
            }
          : s
      )
    )

    // Reset streaming state
    rawHtmlRef.current = ''
    setStreamingHtml('')
    setGeneratedChars(0)
    setStatus('planning')

    try {
      // Build the full message history including the new user message.
      // Assistant messages carry `htmlSnapshot` — the actual HTML they
      // generated — which buildApiMessages uses to reconstruct multi-turn
      // context for Claude (see lib/llm.ts).
      const messagesForApi: Message[] = [...session.messages, userMessage]

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesForApi }),
      })

      if (!response.ok) {
        const err = await response.json() as { error?: string }
        throw new Error(err.error ?? 'Generation failed')
      }

      setStatus('generating')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No response stream')

      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break outer

          let parsed: { chunk?: string; error?: string }
          try {
            parsed = JSON.parse(data) as { chunk?: string; error?: string }
          } catch {
            continue // skip malformed SSE lines
          }

          if (parsed.error) throw new Error(parsed.error)
          if (parsed.chunk) {
            rawHtmlRef.current += parsed.chunk
            scheduleIframeUpdate()
          }
        }
      }

      // Final flush
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current)
      const finalRaw = rawHtmlRef.current
      if (!finalRaw) throw new Error('Empty response from AI')

      const finalHtml = extractHtml(finalRaw) || finalRaw
      setStreamingHtml(finalHtml)
      setGeneratedChars(finalRaw.length)

      const sizeLabel = finalRaw.length >= 1000
        ? `${(finalRaw.length / 1000).toFixed(1)}k chars`
        : `${finalRaw.length} chars`

      // Store htmlSnapshot so subsequent turns can use it as Claude context
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `✅ Page generated! (${sizeLabel})`,
        htmlSnapshot: finalHtml,
        timestamp: Date.now(),
      }

      setSessions((prev) =>
        prev.map((s) =>
          s.id === session!.id
            ? {
                ...s,
                messages: [...s.messages, assistantMessage],
                generatedHtml: finalHtml,
                updatedAt: Date.now(),
              }
            : s
        )
      )

      setStatus('done')
    } catch (err) {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current)
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)

      setSessions((prev) =>
        prev.map((s) =>
          s.id === session!.id
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: generateId(),
                    role: 'assistant',
                    content: `❌ ${message}`,
                    timestamp: Date.now(),
                  },
                ],
                updatedAt: Date.now(),
              }
            : s
        )
      )

      setStatus('error')
    }
  }

  // Keep the ref pointing at the latest handleSend so the postMessage
  // listener (registered once on mount) always calls the current version.
  useEffect(() => {
    handleSendRef.current = handleSend
  })

  const handleRemix = () => {
    if (!activeSession?.generatedHtml) return
    handleSend(
      'Take the current page and create a completely different visual variant. Keep the same content and functionality but dramatically change the color scheme, layout, typography, and animations. Make it feel like a totally fresh design.'
    )
  }

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id)
    setStreamingHtml('')
    setGeneratedChars(0)
  }

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (activeSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id)
      setActiveSessionId(remaining.length > 0 ? remaining[remaining.length - 1].id : null)
      setStreamingHtml('')
    }
    toast.success('Session deleted')
  }

  const handleRenameSession = (id: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s))
    )
  }

  // During generation show the live stream; afterwards show the committed HTML.
  // The bridge is injected at display-time so stored snapshots stay clean.
  const isGenerating = status === 'generating' || status === 'planning'
  const baseHtml = isGenerating
    ? streamingHtml || activeSession?.generatedHtml || ''
    : activeSession?.generatedHtml || ''
  // Only add the bridge to fully committed (non-streaming) HTML so the bar
  // doesn't flicker in and out while the page is still being written.
  const displayHtml = !isGenerating && baseHtml
    ? withChatBridge(baseHtml)
    : baseHtml

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Top navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0 z-10"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" fill="currentColor" />
          </div>
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">Atoms Demo</span>
          <span className="hidden sm:block px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            AI Web Generator
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 76 65" fill="currentColor">
              <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
            </svg>
            Deployed on Vercel
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200 transition-all"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </motion.nav>

      {/* Main split layout — 38% chat : 62% preview */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="flex flex-col border-b md:border-b-0 md:border-r border-zinc-800 h-[50vh] md:h-auto md:w-[38%] flex-shrink-0"
        >
          <ChatInterface
            messages={activeSession?.messages ?? []}
            status={status}
            onSend={handleSend}
            onNewSession={handleNewSession}
            onRemix={handleRemix}
            hasGeneratedHtml={!!activeSession?.generatedHtml}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="flex-1 min-h-0 flex flex-col h-[50vh] md:h-auto"
        >
          <PreviewPanel
            html={displayHtml}
            status={status}
            generatedChars={generatedChars}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
          />
        </motion.div>
      </div>
    </div>
  )
}
