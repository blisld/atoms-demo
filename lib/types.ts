export type Role = 'user' | 'assistant'

export interface Message {
  id: string
  role: Role
  /** Display text shown in the chat bubble */
  content: string
  /**
   * For assistant messages that returned generated HTML:
   * stores the actual HTML so it can be replayed as conversation
   * context in subsequent Claude API calls (multi-turn iteration).
   */
  htmlSnapshot?: string
  timestamp: number
}

export interface Session {
  id: string
  title: string
  messages: Message[]
  /** The most recently generated HTML for this session */
  generatedHtml: string | null
  createdAt: number
  updatedAt: number
}

export type GenerationStatus =
  | 'idle'
  | 'planning'
  | 'generating'
  | 'done'
  | 'error'

export type PreviewTab = 'preview' | 'code' | 'sessions'
