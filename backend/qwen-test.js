import 'dotenv/config'

const apiKey = process.env.QWEN_API_KEY
const model = process.env.QWEN_MODEL
const configuredEndpoint = process.env.QWEN_ENDPOINT

if (!apiKey || !model || !configuredEndpoint) {
  console.error('Qwen test is not configured. Set QWEN_API_KEY, QWEN_ENDPOINT, and QWEN_MODEL in backend/.env.')
  process.exit(1)
}

// Accept either a complete OpenAI-compatible chat-completions URL or its base URL.
const endpoint = configuredEndpoint.replace(/\/$/, '').endsWith('/chat/completions')
  ? configuredEndpoint.replace(/\/$/, '')
  : `${configuredEndpoint.replace(/\/$/, '')}/chat/completions`

try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: Qwen connection successful' }],
      temperature: 0,
      max_tokens: 30,
    }),
    signal: AbortSignal.timeout(30000),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = body.error?.message || body.message || 'No error message was returned.'
    throw new Error(`Qwen request failed (${response.status}): ${message}`)
  }

  const content = body.choices?.[0]?.message?.content
  if (!content) throw new Error('Qwen returned a successful response with no message content.')

  console.log('Qwen connection successful.')
  console.log(`Model: ${body.model || model}`)
  console.log(`Response: ${content}`)
} catch (error) {
  const message = error.name === 'TimeoutError'
    ? 'Qwen request timed out after 30 seconds.'
    : error.message
  console.error(`Qwen test failed: ${message}`)
  process.exit(1)
}
