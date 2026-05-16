'use client'

import { useRef, useEffect, useState, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Plus, RotateCcw } from 'lucide-react'
import MessageBubble, { TypingIndicator } from './MessageBubble'
import PromptSuggestions from './PromptSuggestions'
import type { Message, GenerationStatus } from '@/lib/types'

interface ChatInterfaceProps {
  messages: Message[]
  status: GenerationStatus
  onSend: (text: string) => void
  onNewSession: () => void
  onRemix: () => void
  hasGeneratedHtml: boolean
}

export default function ChatInterface({
  messages,
  status,
  onSend,
  onNewSession,
  onRemix,
  hasGeneratedHtml,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isLoading = status === 'planning' || status === 'generating'

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    }
  }, [input])

  // Re-focus textarea when loading finishes
  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus()
    }
  }, [isLoading])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    onSend(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Quick-prompt click: fill input and send immediately
  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return
    setInput(prompt)
    // Use setTimeout so state flush happens before send
    setTimeout(() => {
      onSend(prompt)
      setInput('')
    }, 0)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <h2 className="text-sm font-semibold text-zinc-200">Chat</h2>
        <div className="flex items-center gap-1">
          {hasGeneratedHtml && (
            <button
              onClick={onRemix}
              disabled={isLoading}
              title="Remix — generate a fresh visual variant"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Remix
            </button>
          )}
          <button
            onClick={onNewSession}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            New Session
          </button>
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {isEmpty ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-zinc-400 font-medium">Describe your web app idea</p>
                <p className="text-xs text-zinc-600 mt-1">or pick a template below to get started</p>
              </motion.div>
            ) : (
              messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))
            )}
          </AnimatePresence>

          {isLoading && <TypingIndicator status={status} />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick prompts */}
      <PromptSuggestions onSelect={handleQuickPrompt} disabled={isLoading} />

      {/* Input area */}
      <div className="px-4 pb-4 flex-shrink-0">
        <div
          className={`
            flex items-end gap-2 bg-zinc-800/80 border rounded-2xl px-4 py-3 transition-colors duration-150
            ${isLoading ? 'border-zinc-700/50 opacity-75' : 'border-zinc-700 focus-within:border-indigo-500/60'}
          `}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? 'Generating…' : 'Describe your web app idea…'}
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none min-h-[20px] max-h-[160px] leading-relaxed disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-150"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <p className="text-[11px] text-zinc-600 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
