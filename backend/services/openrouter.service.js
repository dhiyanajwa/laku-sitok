import { appError } from '../utils/app-error.js'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'poolside/laguna-m.1:free'

export async function createAdvisorCompletion({ systemPrompt, userPrompt }) {
  if (!process.env.OPENROUTER_API_KEY) throw appError('The AI advisor is not configured yet.', 503)

  let response
  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-OpenRouter-Title': 'Laku Sitok',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.3,
        reasoning: { effort: 'none', exclude: true },
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(30000),
    })
  } catch (error) {
    if (error.name === 'TimeoutError') throw appError('The AI advisor took too long to respond. Please try again.', 504)
    throw appError('Unable to reach the AI advisor. Please try again.', 503)
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 429) throw appError('The AI advisor is busy or rate-limited. Please try again shortly.', 429)
    if (response.status === 401 || response.status === 403) throw appError('The AI advisor key is not accepted by OpenRouter.', 503)
    throw appError(body.error?.message || 'The AI advisor could not complete that request.', 503)
  }

  const message = body.choices?.[0]?.message
  const answer = typeof message?.content === 'string'
    ? message.content.trim()
    : Array.isArray(message?.content)
      ? message.content.map((part) => part.text || '').join('').trim()
      : ''
  if (!answer) throw appError('The AI advisor did not produce a final answer. Please try again.', 503)
  return { answer, model: body.model || MODEL }
}

