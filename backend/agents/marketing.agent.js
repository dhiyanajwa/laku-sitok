import { getAnalyticsOverview } from '../services/analytics.service.js'
import { createAdvisorCompletion } from '../services/openrouter.service.js'
import { createMarketingCampaign, getEligibleMarketingProduct, getMarketingSettings } from '../services/marketing.service.js'
import { appError } from '../utils/app-error.js'
import { recordAgentActivity } from './activity.agent.js'

function parseDraft(answer) {
  const candidate = answer.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
  try {
    const draft = JSON.parse(candidate)
    if (!draft.title || !draft.caption) throw new Error('Missing required fields')
    return {
      title: String(draft.title).trim().slice(0, 120),
      caption: String(draft.caption).trim().slice(0, 1000),
      callToAction: String(draft.callToAction || '').trim().slice(0, 180),
      hashtags: Array.isArray(draft.hashtags) ? draft.hashtags.map((tag) => String(tag).trim().replace(/^#/, '')).filter(Boolean).slice(0, 8) : [],
      reason: String(draft.reason || '').trim().slice(0, 280),
    }
  } catch {
    throw appError('The Marketing Agent returned an invalid draft. Please generate it again.', 503)
  }
}

export async function generateMarketingCampaign(vendorId, vendorName, input) {
  const product = await getEligibleMarketingProduct(vendorId, input.productId)
  const settings = await getMarketingSettings(vendorId)
  const analytics = await getAnalyticsOverview(vendorId)
  const tone = input.tone?.trim().slice(0, 80) || settings.brandTone
  const language = input.language?.trim().slice(0, 40) || settings.language
  const bestSeller = analytics.bestSeller?.name || 'No completed-sales result is available yet'

  recordAgentActivity(vendorId, { agent: 'Manager Agent', title: 'Marketing workflow started', detail: 'The manager requested a verified promotion draft.' })
  recordAgentActivity(vendorId, { agent: 'Inventory Agent', title: 'Promotion stock verified', detail: `${product.name} has ${product.quantity} units, above its reorder level of ${product.reorderLevel}.` })
  recordAgentActivity(vendorId, { agent: 'Business Intelligence Agent', title: 'Marketing context prepared', detail: `Best seller context: ${bestSeller}.` })

  const systemPrompt = `You write concise, honest social-media promotion drafts for Malaysian food vendors. Use only supplied facts. Never invent discounts, ingredients, availability, sales, locations, operating hours, or urgency. Return valid JSON only with title, caption, callToAction, hashtags (array), and reason. Do not include customer information.`
  const userPrompt = `Vendor: ${vendorName || 'Laku Sitok vendor'}\nTone: ${tone}\nLanguage: ${language}\nProduct: ${product.name}\nCurrent price: RM ${product.price.toFixed(2)}\nStock is verified as sufficient.\nLocation: ${settings.location || 'not supplied'}\nOperating hours: ${settings.operatingHours || 'not supplied'}\nOptional completed-sales context: best seller is ${bestSeller}.\nHashtags enabled: ${settings.hashtagsEnabled ? 'yes' : 'no'}.\nCreate one owner-reviewable promotion. Avoid claims about popularity unless the supplied best-seller field exactly supports it.`

  const completion = await createAdvisorCompletion({ systemPrompt, userPrompt })
  const parsed = parseDraft(completion.answer)
  if (!settings.hashtagsEnabled) parsed.hashtags = []
  const campaign = await createMarketingCampaign(vendorId, { productId: product.id, ...parsed, tone, language })
  recordAgentActivity(vendorId, { agent: 'Marketing Agent', title: 'Promotion draft generated', detail: `A grounded draft for ${product.name} is ready for vendor review.` })
  return { campaign, model: completion.model }
}
