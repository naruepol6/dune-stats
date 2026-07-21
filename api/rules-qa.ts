// Rules Q&A endpoint (Google Gemini).
//
// Answers questions about Dune: Imperium - Uprising using the official rules
// FAQ (Dune_Faq.pdf) plus Gemini's own knowledge. Streams the answer back as
// newline-delimited JSON so the page can render it token-by-token.
//
// Runs as a Vercel Node.js Function. The Gemini key stays server-side; the
// browser only ever talks to this endpoint.
//
// The FAQ PDF is bundled with the function (see `functions.includeFiles` in
// vercel.json) and sent inline on each request, with the document placed first
// so Gemini 2.5 implicit caching can reuse it across questions. This avoids the
// Gemini Files API, whose uploads auto-expire after 48 hours.
//
// Required env vars (set in Vercel -> Project Settings -> Environment Variables):
//   GEMINI_API_KEY       - your Google AI Studio / Gemini API key
// Optional (enables per-IP rate limiting; without them the endpoint is open):
//   SUPABASE_URL                 - falls back to VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY    - server-only key, NEVER expose to the frontend

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GoogleGenAI } from '@google/genai'

const MODEL = 'gemini-2.5-flash'
const MAX_QUESTION_CHARS = 1000
const MAX_HISTORY_TURNS = 8 // keep follow-up context bounded (cost + latency)
const RATE_LIMIT_MAX = 20 // questions per IP...
const RATE_LIMIT_WINDOW_SECONDS = 3600 // ...per hour

const SYSTEM_PROMPT =
  'You are a rules expert for the board game Dune: Imperium - Uprising. ' +
  'Answer questions about how the game works using the official Comprehensive ' +
  'Rules FAQ provided as a PDF document, together with your own knowledge of ' +
  'the game. When the FAQ directly addresses the question, rely on it and name ' +
  'the relevant FAQ section or page number in your answer so the player can ' +
  'look it up. Be concise and practical - players are usually mid-game and want ' +
  'a clear ruling. If the FAQ does not cover the question and you are not ' +
  'confident, say so plainly rather than guessing. Only answer questions about ' +
  'this game; politely decline unrelated requests.'

// Read and encode the bundled FAQ once per cold start (reused on warm invocations).
const FAQ_BASE64 = readFileSync(join(process.cwd(), 'Dune_Faq.pdf')).toString('base64')

type Turn = { role: 'user' | 'assistant'; content: string }

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Returns true if the request is allowed. Fails open if rate limiting is not configured. */
async function checkRateLimit(ip: string): Promise<boolean> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey || !ip) return true

  try {
    const res = await fetch(`${url}/rest/v1/rpc/rules_qa_rate_check`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        p_ip: ip,
        p_max: RATE_LIMIT_MAX,
        p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      }),
    })
    if (!res.ok) return true // don't block users if the limiter itself errors
    return (await res.json()) === true
  } catch {
    return true
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return json(500, { error: 'Server not configured. Set GEMINI_API_KEY.' })
  }

  let body: { question?: unknown; history?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON body.' })
  }

  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (!question) return json(400, { error: 'Missing question.' })
  if (question.length > MAX_QUESTION_CHARS) {
    return json(400, { error: `Question too long (max ${MAX_QUESTION_CHARS} characters).` })
  }

  const rawHistory = Array.isArray(body.history) ? (body.history as unknown[]) : []
  const history: Turn[] = rawHistory
    .filter(
      (t): t is Turn =>
        !!t &&
        typeof t === 'object' &&
        (((t as Turn).role === 'user' || (t as Turn).role === 'assistant') as boolean) &&
        typeof (t as Turn).content === 'string',
    )
    .slice(-MAX_HISTORY_TURNS)

  const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '')
    .split(',')[0]
    .trim()
  if (!(await checkRateLimit(ip))) {
    return json(429, { error: 'Rate limit reached. Try again later.' })
  }

  const ai = new GoogleGenAI({ apiKey })

  // The FAQ document goes in the first user turn only, before its text, so the
  // shared prefix (document) is identical across requests for implicit caching.
  // Gemini roles are 'user' / 'model'.
  const turns: Turn[] = [...history, { role: 'user', content: question }]
  const contents = turns.map((t, i) => {
    const role = t.role === 'assistant' ? 'model' : 'user'
    if (i === 0 && t.role === 'user') {
      return {
        role,
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: FAQ_BASE64 } },
          { text: t.content },
        ],
      }
    }
    return { role, parts: [{ text: t.content }] }
  })

  // Non-streaming: return the whole answer in one response. Returning a
  // streaming ReadableStream from a Vercel Node function proved unreliable
  // (the response never completed, hitting the 60s function timeout). This
  // call finishes in well under 10s. The timing logs and the timeout guard
  // below make any future stall show up as a clean error in the runtime logs
  // instead of a silent 60s kill.
  const t0 = Date.now()
  console.log(`[rules-qa] calling Gemini (${MODEL}), question chars=${question.length}`)

  try {
    const result = await Promise.race([
      ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          maxOutputTokens: 2048,
          // The answer is grounded in the FAQ that's in-context, so heavy
          // reasoning isn't needed - disabling "thinking" keeps the call fast.
          // Raise to e.g. 512 for tougher rulings.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini call timed out after 45s')), 45_000),
      ),
    ])

    const answer = result.text ?? ''
    console.log(`[rules-qa] Gemini responded in ${Date.now() - t0}ms, answer chars=${answer.length}`)
    if (!answer) {
      return json(502, { error: 'The model returned an empty answer. Try rephrasing.' })
    }
    return json(200, { answer })
  } catch (err) {
    console.error(`[rules-qa] Gemini call failed after ${Date.now() - t0}ms:`, err)
    return json(502, {
      error: err instanceof Error ? err.message : 'Something went wrong.',
    })
  }
}
