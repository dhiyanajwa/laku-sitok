import supabase from '../config/supabase.js'
import { appError } from '../utils/app-error.js'

const TIME_ZONE = 'Asia/Kuala_Lumpur'
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/
const KL_OFFSET = '+08:00'
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function timeOnly(value) {
  const match = String(value || '').match(TIME_PATTERN)
  return match ? `${match[1]}:${match[2]}` : ''
}

function partsFor(date) {
  return Object.fromEntries(dateFormatter.formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
}

function dateFor(parts) {
  return `${parts.year}-${parts.month}-${parts.day}`
}

function addDays(dateText, days) {
  const [year, month, day] = dateText.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function atKlTime(dateText, timeText) {
  return new Date(`${dateText}T${timeText}:00${KL_OFFSET}`)
}

function buildWindow(startDate, openingTime, closingTime) {
  const opensAt = atKlTime(startDate, openingTime)
  const closingDate = closingTime <= openingTime ? addDays(startDate, 1) : startDate
  const closesAt = atKlTime(closingDate, closingTime)
  return { opensAt, closesAt }
}

function iso(value) {
  return value ? value.toISOString() : null
}

function timeLabel(value) {
  const [hourText, minute] = value.split(':')
  const hour = Number(hourText)
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`
}

function calculateSchedule(settings, now) {
  const openingTime = timeOnly(settings.opening_time)
  const closingTime = timeOnly(settings.closing_time)
  if (!openingTime || !closingTime || openingTime === closingTime) {
    return { configured: false, isOpen: false, nextChangeAt: null, nextOpeningAt: null, nextClosingAt: null, openingTime: openingTime || null, closingTime: closingTime || null }
  }

  const today = dateFor(partsFor(now))
  const windows = [-1, 0, 1, 2].map((offset) => buildWindow(addDays(today, offset), openingTime, closingTime))
  const activeWindow = windows.find((window) => now >= window.opensAt && now < window.closesAt)
  const nextWindow = windows.find((window) => window.opensAt > now)

  return {
    configured: true,
    isOpen: Boolean(activeWindow),
    nextChangeAt: activeWindow ? activeWindow.closesAt : nextWindow?.opensAt || null,
    nextOpeningAt: activeWindow ? activeWindow.opensAt : nextWindow?.opensAt || null,
    nextClosingAt: activeWindow ? activeWindow.closesAt : nextWindow?.closesAt || null,
    openingTime,
    closingTime,
  }
}

function suggestedExpiry(schedule, mode, now) {
  if (mode === 'closed' && schedule.isOpen) return schedule.nextChangeAt
  if (mode === 'open' && schedule.isOpen) return schedule.nextChangeAt

  const currentDate = dateFor(partsFor(now))
  const nextOpenDate = schedule.nextOpeningAt ? dateFor(partsFor(schedule.nextOpeningAt)) : null
  if (mode === 'open' && nextOpenDate === currentDate) return schedule.nextClosingAt

  return new Date(now.getTime() + (2 * 60 * 60 * 1000))
}

function formatAvailability(settings, now = new Date()) {
  const schedule = calculateSchedule(settings, now)
  const overrideActive = settings.stall_override && settings.override_expires_at && new Date(settings.override_expires_at) > now
  const overrideMode = overrideActive ? settings.stall_override : null
  const isOpen = overrideMode === 'open' ? true : overrideMode === 'closed' ? false : schedule.isOpen
  const source = overrideMode ? 'manual' : 'schedule'
  const nextChangeAt = overrideMode ? new Date(settings.override_expires_at) : schedule.nextChangeAt

  let label = 'Schedule needed'
  let customerMessage = 'This stall is not accepting orders yet. Please check back later.'
  if (isOpen) {
    label = 'Open now'
    customerMessage = 'Ordering is available now.'
  } else if (schedule.configured && nextChangeAt) {
    label = overrideMode === 'closed' ? 'Temporarily closed' : 'Closed'
    customerMessage = `Ordering is unavailable. Opens at ${timeLabel(schedule.openingTime)}.`
  }

  return {
    isOpen,
    source,
    label,
    customerMessage,
    scheduleConfigured: schedule.configured,
    openingTime: schedule.openingTime,
    closingTime: schedule.closingTime,
    opensAt: iso(schedule.nextOpeningAt),
    closesAt: iso(schedule.nextClosingAt),
    nextChangeAt: iso(nextChangeAt),
    override: overrideMode ? { mode: overrideMode, setAt: settings.override_set_at, expiresAt: settings.override_expires_at } : null,
    suggestedOverrideExpiresAt: iso(suggestedExpiry(schedule, isOpen ? 'closed' : 'open', now)),
    timezone: TIME_ZONE,
  }
}

async function getSettings(vendorId) {
  const { data, error } = await supabase
    .from('marketing_settings')
    .select('opening_time, closing_time, stall_override, override_set_at, override_expires_at')
    .eq('vendor_id', vendorId)
    .maybeSingle()
  if (error) throw error
  if (data) return data

  const { data: created, error: createError } = await supabase
    .from('marketing_settings')
    .insert({ vendor_id: vendorId })
    .select('opening_time, closing_time, stall_override, override_set_at, override_expires_at')
    .single()
  if (createError) throw createError
  return created
}

export async function getStallAvailability(vendorId) {
  return formatAvailability(await getSettings(vendorId))
}

export async function setStallOverride(vendorId, input) {
  const mode = input?.mode
  if (!['open', 'closed', 'clear'].includes(mode)) throw appError('Choose open, closed, or clear for the stall status.')

  if (mode === 'clear') {
    const { error } = await supabase.from('marketing_settings').upsert({ vendor_id: vendorId, stall_override: null, override_set_at: null, override_expires_at: null }, { onConflict: 'vendor_id' })
    if (error) throw error
    return getStallAvailability(vendorId)
  }

  const now = new Date()
  const requestedExpiry = new Date(input.expiresAt)
  if (Number.isNaN(requestedExpiry.getTime()) || requestedExpiry <= now) throw appError('Choose an override end time in the future.')
  if (requestedExpiry.getTime() - now.getTime() > 24 * 60 * 60 * 1000) throw appError('A manual stall override can last up to 24 hours.')

  const { error } = await supabase
    .from('marketing_settings')
    .upsert({ vendor_id: vendorId, stall_override: mode, override_set_at: now.toISOString(), override_expires_at: requestedExpiry.toISOString() }, { onConflict: 'vendor_id' })
  if (error) throw error
  return getStallAvailability(vendorId)
}

export async function assertStallIsOpen(vendorId) {
  const availability = await getStallAvailability(vendorId)
  if (!availability.isOpen) throw appError(availability.customerMessage, 409)
  return availability
}
