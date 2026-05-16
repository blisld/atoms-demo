'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Edit2, Check, X, MessageSquare } from 'lucide-react'
import type { Session } from '@/lib/types'

interface SessionListProps {
  sessions: Session[]
  activeSessionId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
}

export default function SessionList({
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
  onRename,
}: SessionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const startEdit = (session: Session) => {
    setEditingId(session.id)
    setEditValue(session.title)
  }

  const confirmEdit = (id: string) => {
    if (editValue.trim()) onRename(id, editValue.trim())
    setEditingId(null)
  }

  const cancelEdit = () => setEditingId(null)

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 text-sm p-8">
        <MessageSquare className="w-8 h-8 mb-3 opacity-30" />
        <p>No sessions yet</p>
        <p className="text-xs mt-1 text-zinc-600">Start chatting to create your first session</p>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-1 overflow-y-auto h-full">
      <AnimatePresence initial={false}>
        {sessions
          .slice()
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map((session) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className={`
                group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer
                transition-all duration-150
                ${activeSessionId === session.id
                  ? 'bg-indigo-500/10 border border-indigo-500/20'
                  : 'hover:bg-zinc-800 border border-transparent'
                }
              `}
              onClick={() => onSelect(session.id)}
            >
              <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${session.generatedHtml ? 'bg-indigo-500/15 border border-indigo-500/20' : 'bg-zinc-700'}`}>
                <MessageSquare className={`w-3.5 h-3.5 ${session.generatedHtml ? 'text-indigo-400' : 'text-zinc-400'}`} />
              </div>

              <div className="flex-1 min-w-0">
                {editingId === session.id ? (
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmEdit(session.id)
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-full bg-zinc-700 rounded px-1.5 py-0.5 text-sm text-zinc-100 outline-none"
                  />
                ) : (
                  <>
                    <p className="text-sm text-zinc-200 truncate font-medium leading-snug">
                      {session.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {session.messages.length} msg{session.messages.length !== 1 ? 's' : ''}
                      {session.generatedHtml && (
                        <span className="ml-1.5 text-indigo-500">· has page</span>
                      )}
                    </p>
                  </>
                )}
              </div>

              {editingId === session.id ? (
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => confirmEdit(session.id)} className="p-1 hover:text-green-400 text-zinc-400 transition-colors">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={cancelEdit} className="p-1 hover:text-red-400 text-zinc-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => startEdit(session)}
                    className="p-1 hover:text-zinc-200 text-zinc-500 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(session.id)}
                    className="p-1 hover:text-red-400 text-zinc-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  )
}
