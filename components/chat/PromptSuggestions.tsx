'use client'

import { QUICK_PROMPTS } from '@/lib/prompts'
import { Sparkles } from 'lucide-react'

interface PromptSuggestionsProps {
  onSelect: (prompt: string) => void
  disabled?: boolean
}

export default function PromptSuggestions({ onSelect, disabled }: PromptSuggestionsProps) {
  return (
    <div className="px-4 pb-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3 h-3 text-zinc-500" />
        <span className="text-xs text-zinc-500 font-medium">Quick start</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {QUICK_PROMPTS.map(({ label, prompt }) => (
          <button
            key={label}
            onClick={() => onSelect(prompt)}
            disabled={disabled}
            className="
              flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
              bg-zinc-800 text-zinc-300 border border-zinc-700
              hover:bg-zinc-700 hover:border-zinc-600 hover:text-white
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-150 whitespace-nowrap
            "
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
