import { createAdvisorCompletion } from '../services/qwen.service.js'
import { OPENING_CAMPAIGN_TYPES, createMarketingCampaign, getEligibleMarketingProduct, getMarketingSettings, getMissingMarketingProfileFields } from '../services/marketing.service.js'
import { appError } from '../utils/app-error.js'
import { recordAgentActivity } from './activity.agent.js'
import { getStallAvailability } from '../services/stall-availability.service.js'

const CAMPAIGN_LABELS = {
  stall_opening: 'We are open now',
  opening_later: 'Opening later today',
  today_special: "Today's special",
  closing_soon: 'Closing soon',
}

function parseDraft(answer) {
  const candidate = answer.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
  try {
    const draft = JSON.parse(candidate)
    if (!draft.title || !draft.caption) throw new Error('Missing required fields')
    return {
      title: String(draft.title).trim().slice(0, 120),
      caption: String(draft.caption).trim().slice(0, 1000),
      callToAction: String(draft.callToAction || '').trim().slice(0, 180),
      hashtags: Array.isArray(draft.hashtags) ? draft.hashtags.map((tag) => String(tag).trim().replace(/^#/, '')).filter(Boolean).slice(0, 10) : [],
      reason: String(draft.reason || '').trim().slice(0, 280),
    }
  } catch {
    throw appError('The Marketing Agent returned an invalid opening post. Please generate it again.', 503)
  }
}

function optionalDailyNote(value) {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw appError('Daily note must be text.')
  return value.trim().slice(0, 240)
}

function quoted(value) {
  return value ? `"${value}"` : 'not supplied'
}

export async function generateMarketingCampaign(vendorId, vendorName, input) {
  const campaignType = input.campaignType?.trim()
  if (!OPENING_CAMPAIGN_TYPES.has(campaignType)) throw appError('Choose a valid opening announcement type.')

  const settings = await getMarketingSettings(vendorId)
  const missing = getMissingMarketingProfileFields(settings)
  if (missing.length) throw appError(`Complete your Stall marketing profile first: add ${missing.join(' and ')}.`, 422)

  if (campaignType === 'stall_opening') {
    const availability = await getStallAvailability(vendorId)
    if (!availability.isOpen) throw appError('Your stall is currently closed. Open it from the dashboard first, or choose Opening later.', 409)
  }

  const dailyNote = optionalDailyNote(input.dailyNote)
  const highlightProduct = input.highlightProductId ? await getEligibleMarketingProduct(vendorId, input.highlightProductId) : null
  const tone = settings.brandTone
  const language = settings.language
  const defaultHashtags = settings.hashtagsEnabled ? settings.defaultHashtags : []

  recordAgentActivity(vendorId, { agent: 'Manager Agent', title: 'Opening-post workflow started', detail: `${CAMPAIGN_LABELS[campaignType]} was requested.` })
  if (highlightProduct) recordAgentActivity(vendorId, { agent: 'Inventory Agent', title: 'Optional highlight verified', detail: `${highlightProduct.name} is available to mention.` })

  const systemPrompt = 'You write concise, honest opening announcements for Malaysian food-stall vendors. Use only the supplied facts. Never invent prices, offers, ingredients, availability, operating hours, locations, links, delivery services, quality claims, or urgency. If a fact is not supplied, omit it. Return valid JSON only with title, caption, callToAction, hashtags (array), and reason. Do not include customer information.'
  const userPrompt = `Vendor name: ${quoted(vendorName || 'Laku Sitok vendor')}
Campaign intent: ${CAMPAIGN_LABELS[campaignType]}
Tone: ${quoted(tone)}
Language: ${quoted(language)}
Stall tagline: ${quoted(settings.stallTagline)}
Location: ${quoted(settings.location)}
Operating hours: ${quoted(settings.operatingHours)}
Google Maps link: ${quoted(settings.googleMapsUrl)}
WhatsApp order link: ${quoted(settings.whatsappOrderUrl)}
Delivery link: ${quoted(settings.deliveryUrl)}
Review link: ${quoted(settings.reviewUrl)}
Vendor-supplied selling points: ${settings.sellingPoints.length ? settings.sellingPoints.join(' | ') : 'not supplied'}
Vendor-supplied default hashtags: ${defaultHashtags.length ? defaultHashtags.map((tag) => `#${tag}`).join(' ') : 'not supplied'}
Vendor daily note: ${quoted(dailyNote)}
Optional highlighted menu item: ${highlightProduct ? `${highlightProduct.name}, RM ${highlightProduct.price.toFixed(2)}` : 'not supplied'}

Create a complete owner-reviewable opening post. Use line breaks so it is easy to read in a WhatsApp Status. Mention the optional menu item only if it is supplied. Do not add any section for a missing link.`

  const completion = await createAdvisorCompletion({ systemPrompt, userPrompt, temperature: 0.4, maxTokens: 700 })
  const parsed = parseDraft(completion.answer)
  if (!settings.hashtagsEnabled) parsed.hashtags = []
  else parsed.hashtags = [...new Set([...defaultHashtags, ...parsed.hashtags])].slice(0, 10)

  const campaign = await createMarketingCampaign(vendorId, {
    campaignType,
    dailyNote,
    highlightProductId: highlightProduct?.id,
    ...parsed,
    tone,
    language,
  })
  recordAgentActivity(vendorId, { agent: 'Marketing Agent', title: 'Opening post generated', detail: 'A grounded opening announcement is ready for vendor review.' })
  return { campaign, model: completion.model }
}