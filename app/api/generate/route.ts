import { generateHtml } from '@/lib/llm'
import type { Message } from '@/lib/types'

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { messages: Message[] }
    const { messages } = body

    if (!messages || messages.length === 0) {
      return Response.json({ error: 'No messages provided' }, { status: 400 })
    }

    if (!process.env.CLAUDE_API_KEY) {
      return Response.json(
        { error: 'CLAUDE_API_KEY is not configured. Add it to .env.local.' },
        { status: 500 }
      )
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await generateHtml({
            messages,
            onChunk: (chunk: string) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)
              )
            },
          })
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Generation failed'
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
