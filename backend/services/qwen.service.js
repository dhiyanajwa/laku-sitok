import { appError } from '../utils/app-error.js'

function getChatCompletionsUrl() {
  const configuredEndpoint = process.env.QWEN_ENDPOINT?.trim()
  if (!configuredEndpoint) return ''
  const endpoint = configuredEndpoint.replace(/\/$/, '')
  return endpoint.endsWith('/chat/completions') ? endpoint : `${endpoint}/chat/completions`
}

export async function createQwenCompletion({ systemPrompt, userPrompt, temperature = 0.3, maxTokens = 500 }) {
  const endpoint = getChatCompletionsUrl()
  const apiKey = process.env.QWEN_API_KEY
  const model = process.env.QWEN_MODEL
  if (!endpoint || !apiKey || !model) throw appError('The Qwen AI service is not configured yet.', 503)

  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(30000),
    })
  } catch (error) {
    if (error.name === 'TimeoutError') throw appError('The Qwen AI service took too long to respond. Please try again.', 504)
    throw appError('Unable to reach the Qwen AI service. Please try again.', 503)
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 429) throw appError('The Qwen AI service is busy or rate-limited. Please try again shortly.', 429)
    if (response.status === 401 || response.status === 403) throw appError('The Qwen API key is not accepted.', 503)
    throw appError(body.error?.message || body.message || 'The Qwen AI service could not complete this request.', 503)
  }

  const message = body.choices?.[0]?.message
  const content = typeof message?.content === 'string'
    ? message.content.trim()
    : Array.isArray(message?.content)
      ? message.content.map((part) => part.text || '').join('').trim()
      : ''
  if (!content) throw appError('The Qwen AI service did not produce a final answer. Please try again.', 503)
  return { content, model: body.model || model }
}

export async function createAdvisorCompletion(input) {
  const completion = await createQwenCompletion(input)
  return { answer: completion.content, model: completion.model }
}