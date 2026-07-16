const MAX_EVENTS_PER_VENDOR = 30
const eventsByVendor = new Map()

export function recordAgentActivity(vendorId, activity) {
  const events = eventsByVendor.get(vendorId) || []
  const event = {
    id: crypto.randomUUID(),
    agent: activity.agent,
    title: activity.title,
    detail: activity.detail,
    createdAt: new Date().toISOString(),
  }

  events.unshift(event)
  eventsByVendor.set(vendorId, events.slice(0, MAX_EVENTS_PER_VENDOR))
  return event
}

export function listAgentActivity(vendorId) {
  return eventsByVendor.get(vendorId) || []
}
