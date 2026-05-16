'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Maximize2, RefreshCw, Monitor, Code2, History } from 'lucide-react'
import CodeViewer from './CodeViewer'
import SessionList from './SessionList'
import type { PreviewTab, Session, GenerationStatus } from '@/lib/types'

interface PreviewPanelProps {
  html: string
  status: GenerationStatus
  generatedChars: number
  sessions: Session[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onRenameSession: (id: string, title: string) => void
}

const TABS: { id: PreviewTab; label: string; icon: React.ReactNode }[] = [
  { id: 'preview', label: 'Live Preview', icon: <Monitor className="w-3.5 h-3.5" /> },
  { id: 'code', label: 'Code', icon: <Code2 className="w-3.5 h-3.5" /> },
  { id: 'sessions', label: 'Sessions', icon: <History className="w-3.5 h-3.5" /> },
]

/** Steps shown while the agent thinks and generates */
const AGENT_STEPS = [
  { id: 'planning', label: 'Planning layout & structure…' },
  { id: 'generating-start', label: 'Writing HTML & Tailwind…' },
  { id: 'generating-mid', label: 'Adding interactivity…' },
  { id: 'generating-end', label: 'Polishing styles & animations…' },
]

function useAgentStep(status: GenerationStatus, chars: number) {
  if (status === 'planning') return AGENT_STEPS[0]
  if (status === 'generating') {
    if (chars < 1000) return AGENT_STEPS[1]
    if (chars < 4000) return AGENT_STEPS[2]
    return AGENT_STEPS[3]
  }
  return null
}

export default function PreviewPanel({
  html,
  status,
  generatedChars,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
}: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('preview')
  const [iframeKey, setIframeKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const isLoading = status === 'planning' || status === 'generating'
  const agentStep = useAgentStep(status, generatedChars)

  // Auto-switch to preview tab when generation starts
  useEffect(() => {
    if (status === 'planning' || status === 'generating') {
      setActiveTab('preview')
    }
  }, [status])

  const handleFullscreen = () => {
    if (!html) return
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
  }

  const handleRefresh = () => setIframeKey((k) => k + 1)

  // Format char count for display
  const charsLabel =
    generatedChars > 0
      ? generatedChars >= 1000
        ? `${(generatedChars / 1000).toFixed(1)}k chars`
        : `${generatedChars} chars`
      : null

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${activeTab === tab.id
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }
              `}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'sessions' && sessions.length > 0 && (
                <span className="ml-1 bg-zinc-700 text-zinc-300 rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                  {sessions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'preview' && html && !isLoading && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              title="Refresh preview"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFullscreen}
              title="Open in new tab"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live generation progress badge */}
        {isLoading && charsLabel && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[11px] text-indigo-300 font-mono tabular-nums">{charsLabel}</span>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {activeTab === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0"
            >
              {/* No content yet — full loading state */}
              {isLoading && !html ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={agentStep?.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="text-center"
                    >
                      <p className="text-sm text-zinc-300 font-medium">{agentStep?.label}</p>
                      <p className="text-xs text-zinc-500 mt-1">This usually takes 15–25 seconds</p>
                    </motion.div>
                  </AnimatePresence>
                  {/* Skeleton shimmer */}
                  <div className="w-72 space-y-2 mt-2">
                    {[85, 65, 75, 55, 70].map((w, i) => (
                      <div key={i} className="h-2 rounded-full bg-zinc-800 overflow-hidden" style={{ width: `${w}%` }}>
                        <motion.div
                          className="h-full bg-gradient-to-r from-transparent via-zinc-600/40 to-transparent"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : html ? (
                <>
                  {/* Live iframe */}
                  <iframe
                    key={iframeKey}
                    ref={iframeRef}
                    srcDoc={html}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    className="w-full h-full border-0 bg-white"
                    title="Generated Preview"
                  />
                  {/* Generation overlay — shown on top of existing content when re-generating */}
                  <AnimatePresence>
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-[#0a0a0a]/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 pointer-events-none"
                      >
                        <div className="bg-zinc-900/90 border border-zinc-700 rounded-2xl px-5 py-4 flex flex-col items-center gap-2 shadow-xl">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                            <AnimatePresence mode="wait">
                              <motion.span
                                key={agentStep?.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-xs text-zinc-300 font-medium"
                              >
                                {agentStep?.label}
                              </motion.span>
                            </AnimatePresence>
                          </div>
                          {charsLabel && (
                            <span className="text-[11px] text-zinc-500 font-mono">{charsLabel} generated</span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <div className="w-16 h-16 rounded-3xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
                    <Monitor className="w-7 h-7 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-400 font-medium">Your generated page appears here</p>
                  <p className="text-xs text-zinc-600 mt-1.5 max-w-xs leading-relaxed">
                    Describe what you want to build in the chat, and watch it come to life in real time
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'code' && (
            <motion.div
              key="code"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0"
            >
              <CodeViewer html={html} />
            </motion.div>
          )}

          {activeTab === 'sessions' && (
            <motion.div
              key="sessions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0"
            >
              <SessionList
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelect={onSelectSession}
                onDelete={onDeleteSession}
                onRename={onRenameSession}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
