import { useRef, useState, type FormEvent } from 'react'
import { Button, Card, ErrorBox } from '../components/ui'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type StreamMsg = { t: 'text'; v: string } | { t: 'error'; v: string }

const SUGGESTIONS = [
  'Can you retreat units during the Combat phase?',
  'How does the Spice Must Flow victory condition work?',
  'When exactly do you gain the bonus from a revealed intrigue card?',
]

export default function RulesQA() {
  const [thread, setThread] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollAnchor = useRef<HTMLDivElement>(null)

  async function ask(question: string) {
    const trimmed = question.trim()
    if (!trimmed || streaming) return

    setError(null)
    setInput('')

    // History = completed turns only (the new question is added below).
    const history = thread.map((m) => ({ role: m.role, content: m.content }))

    setThread((t) => [
      ...t,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: '' },
    ])
    setStreaming(true)
    requestAnimationFrame(() =>
      scrollAnchor.current?.scrollIntoView({ behavior: 'smooth' }),
    )

    try {
      const res = await fetch('/api/rules-qa', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: trimmed, history }),
      })

      if (!res.ok || !res.body) {
        let message = `Request failed (${res.status}).`
        try {
          const data = await res.json()
          if (data?.error) message = data.error
        } catch {
          /* keep default message */
        }
        throw new Error(message)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const appendText = (v: string) =>
        setThread((t) =>
          t.map((m, i) => (i === t.length - 1 ? { ...m, content: m.content + v } : m)),
        )

      const handle = (msg: StreamMsg) => {
        if (msg.t === 'text') appendText(msg.v)
        else if (msg.t === 'error') throw new Error(msg.v)
      }

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.trim()) handle(JSON.parse(line) as StreamMsg)
        }
      }
      if (buffer.trim()) handle(JSON.parse(buffer) as StreamMsg)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      // Drop the empty assistant placeholder so it doesn't linger blank.
      setThread((t) =>
        t.length && t[t.length - 1].role === 'assistant' && !t[t.length - 1].content
          ? t.slice(0, -1)
          : t,
      )
    } finally {
      setStreaming(false)
      requestAnimationFrame(() =>
        scrollAnchor.current?.scrollIntoView({ behavior: 'smooth' }),
      )
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void ask(input)
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Rules AI
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ask about Dune: Imperium - Uprising rules. Answers draw on the official
          Comprehensive Rules FAQ and cite the relevant section where it applies.
        </p>
      </header>

      {thread.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Try asking
          </p>
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void ask(s)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:border-cyan-400 hover:bg-cyan-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:bg-slate-800"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {thread.length > 0 && (
        <div className="space-y-3">
          {thread.map((m, i) => (
            <Card
              key={i}
              className={`p-3 ${
                m.role === 'user' ? 'bg-slate-50 dark:bg-slate-800/50' : ''
              }`}
            >
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {m.role === 'user' ? 'You' : 'Rules AI'}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                {m.content}
                {m.role === 'assistant' && !m.content && streaming && (
                  <span className="text-slate-400">Thinking...</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {error && <ErrorBox message={error} />}

      <div ref={scrollAnchor} />

      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 -mx-3 flex gap-2 border-t border-slate-200 bg-slate-50/90 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4 dark:border-slate-800 dark:bg-slate-950/90"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a rules question..."
          disabled={streaming}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-cyan-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <Button type="submit" disabled={streaming || !input.trim()}>
          {streaming ? 'Asking...' : 'Ask'}
        </Button>
      </form>

      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        AI can make mistakes. Double-check important rulings against the FAQ.
      </p>
    </div>
  )
}
