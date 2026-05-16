'use client'

import { useState } from 'react'
import { Check, Copy, Download } from 'lucide-react'
import { toast } from 'sonner'

interface CodeViewerProps {
  html: string
}

export default function CodeViewer({ html }: CodeViewerProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(html)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExport = () => {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'generated-page.html'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded as .html')
  }

  if (!html) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No code generated yet
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 flex-shrink-0">
        <span className="text-xs text-zinc-500 font-mono">generated-page.html</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Code display */}
      <div className="flex-1 overflow-auto min-h-0">
        <pre className="p-4 text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
          <code>{html}</code>
        </pre>
      </div>
    </div>
  )
}
