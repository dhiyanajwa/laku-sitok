const DEFAULT_MAX_TRACKED_KEYS = 10_000

function requestKey(request) {
  return request.ip || request.socket?.remoteAddress || 'unknown-client'
}

function discardExpiredEntries(store, now, windowMs) {
  for (const [key, timestamps] of store) {
    const active = timestamps.filter((timestamp) => timestamp > now - windowMs)
    if (active.length) store.set(key, active)
    else store.delete(key)
  }
}

/**
 * Small in-memory limiter for the single-instance hackathon deployment.
 * Use a shared external store before running multiple backend instances.
 */
export function createRateLimit({ windowMs, maxRequests, message, key = requestKey, maxTrackedKeys = DEFAULT_MAX_TRACKED_KEYS }) {
  const requestsByKey = new Map()
  let lastCleanupAt = 0

  return (request, response, next) => {
    const now = Date.now()
    const identifier = String(key(request) || 'unknown-client')
    if (now - lastCleanupAt >= Math.min(windowMs, 60_000) || requestsByKey.size >= maxTrackedKeys) {
      discardExpiredEntries(requestsByKey, now, windowMs)
      lastCleanupAt = now
    }
    if (!requestsByKey.has(identifier) && requestsByKey.size >= maxTrackedKeys) {
      requestsByKey.delete(requestsByKey.keys().next().value)
    }

    const recentRequests = (requestsByKey.get(identifier) || []).filter((timestamp) => timestamp > now - windowMs)

    if (recentRequests.length >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((recentRequests[0] + windowMs - now) / 1000))
      response.set('Retry-After', String(retryAfterSeconds))
      response.status(429).json({
        status: 'error',
        message,
        retryAfterSeconds,
      })
      return
    }

    recentRequests.push(now)
    requestsByKey.set(identifier, recentRequests)
    next()
  }
}

const vendorKey = (request) => `vendor:${request.vendorId || 'unknown'}`

export const publicOrderRateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000,
  maxRequests: 12,
  message: 'Too many order attempts from this connection. Please wait a few minutes and try again.',
})

// This shared budget protects the external AI provider across the three AI-generation entry points.
export const vendorAiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 8,
  message: 'You have reached the AI request limit for this vendor. Please try again in a few minutes.',
  key: vendorKey,
})

// Most Manager requests are deterministic, so this limit is intentionally more generous.
export const managerRequestRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many Manager requests. Please wait a moment and try again.',
  key: vendorKey,
})

export const managerActionRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many Manager action attempts. Please wait a moment and try again.',
  key: vendorKey,
})
