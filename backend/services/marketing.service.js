import supabase from '../config/supabase.js'
import { appError } from '../utils/app-error.js'
import { listProducts } from './product.service.js'

export const OPENING_CAMPAIGN_TYPES = new Set(['stall_opening', 'opening_later', 'today_special', 'closing_soon'])
const ALL_CAMPAIGN_TYPES = new Set(['product_promotion', ...OPENING_CAMPAIGN_TYPES])
const SETTINGS_SELECT = 'brand_tone, language, location, operating_hours, opening_time, closing_time, hashtags_enabled, stall_tagline, google_maps_url, whatsapp_order_url, delivery_url, review_url, selling_points, default_hashtags'
const CAMPAIGN_SELECT = `id, share_token, campaign_type, daily_note, product_name, product_price, title, caption, call_to_action, hashtags, reason, language, tone, status, created_at, updated_at, selected_product_id, campaign_activity(id, activity_type, detail, created_at)`

function optionalText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) || null : null
}

function textList(value, fieldName, maxItems, maxItemLength) {
  if (!Array.isArray(value)) throw appError(`${fieldName} must be a list.`)
  return value
    .map((item) => String(item || '').trim().slice(0, maxItemLength))
    .filter(Boolean)
    .slice(0, maxItems)
}

function optionalHttpsUrl(value, fieldName) {
  const url = optionalText(value, 500)
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') throw new Error('Unsupported protocol')
    return parsed.toString()
  } catch {
    throw appError(`${fieldName} must be a valid https:// link.`)
  }
}

function optionalTime(value, fieldName) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw appError(`${fieldName} must be a valid time.`)
  return value
}

function normaliseSettings(input) {
  const updates = {}
  const hasOpeningTime = input.openingTime !== undefined
  const hasClosingTime = input.closingTime !== undefined
  if (hasOpeningTime !== hasClosingTime) throw appError('Choose both an opening and closing time.')
  if (hasOpeningTime) {
    const openingTime = optionalTime(input.openingTime, 'Opening time')
    const closingTime = optionalTime(input.closingTime, 'Closing time')
    if (openingTime === closingTime) throw appError('Opening and closing time cannot be the same.')
    updates.opening_time = openingTime
    updates.closing_time = closingTime
  }
  if (input.brandTone !== undefined) {
    const value = optionalText(input.brandTone, 80)
    if (!value) throw appError('Brand tone cannot be empty.')
    updates.brand_tone = value
  }
  if (input.language !== undefined) {
    const value = optionalText(input.language, 40)
    if (!value) throw appError('Language cannot be empty.')
    updates.language = value
  }
  if (input.location !== undefined) updates.location = optionalText(input.location, 120)
  if (input.operatingHours !== undefined) updates.operating_hours = optionalText(input.operatingHours, 120)
  if (input.stallTagline !== undefined) updates.stall_tagline = optionalText(input.stallTagline, 180)
  if (input.googleMapsUrl !== undefined) updates.google_maps_url = optionalHttpsUrl(input.googleMapsUrl, 'Google Maps link')
  if (input.whatsappOrderUrl !== undefined) updates.whatsapp_order_url = optionalHttpsUrl(input.whatsappOrderUrl, 'WhatsApp order link')
  if (input.deliveryUrl !== undefined) updates.delivery_url = optionalHttpsUrl(input.deliveryUrl, 'Delivery link')
  if (input.reviewUrl !== undefined) updates.review_url = optionalHttpsUrl(input.reviewUrl, 'Review link')
  if (input.sellingPoints !== undefined) updates.selling_points = textList(input.sellingPoints, 'Selling points', 5, 90)
  if (input.defaultHashtags !== undefined) updates.default_hashtags = textList(input.defaultHashtags, 'Default hashtags', 10, 40).map((tag) => tag.replace(/^#/, ''))
  if (input.hashtagsEnabled !== undefined) {
    if (typeof input.hashtagsEnabled !== 'boolean') throw appError('hashtagsEnabled must be true or false.')
    updates.hashtags_enabled = input.hashtagsEnabled
  }
  if (!Object.keys(updates).length) throw appError('Provide at least one marketing setting to update.')
  return updates
}

function campaignPayload(input) {
  const updates = {}
  if (input.title !== undefined) {
    const value = optionalText(input.title, 120)
    if (!value) throw appError('Title cannot be empty.')
    updates.title = value
  }
  if (input.caption !== undefined) {
    const value = optionalText(input.caption, 1000)
    if (!value) throw appError('Caption cannot be empty.')
    updates.caption = value
  }
  if (input.callToAction !== undefined) updates.call_to_action = optionalText(input.callToAction, 180)
  if (input.hashtags !== undefined) updates.hashtags = textList(input.hashtags, 'Hashtags', 10, 40).map((tag) => tag.replace(/^#/, ''))
  if (!Object.keys(updates).length) throw appError('Provide a campaign field to update.')
  return updates
}

function formatSettings(settings) {
  return {
    brandTone: settings.brand_tone,
    language: settings.language,
    location: settings.location || '',
    operatingHours: settings.operating_hours || '',
    openingTime: settings.opening_time ? String(settings.opening_time).slice(0, 5) : '',
    closingTime: settings.closing_time ? String(settings.closing_time).slice(0, 5) : '',
    stallTagline: settings.stall_tagline || '',
    googleMapsUrl: settings.google_maps_url || '',
    whatsappOrderUrl: settings.whatsapp_order_url || '',
    deliveryUrl: settings.delivery_url || '',
    reviewUrl: settings.review_url || '',
    sellingPoints: settings.selling_points || [],
    defaultHashtags: settings.default_hashtags || [],
    hashtagsEnabled: settings.hashtags_enabled,
  }
}

async function activity(campaignId, vendorId, type, detail) {
  const { error } = await supabase.from('campaign_activity').insert({ campaign_id: campaignId, vendor_id: vendorId, activity_type: type, detail })
  if (error) throw error
}

export async function getMarketingSettings(vendorId) {
  const { data, error } = await supabase.from('marketing_settings').select(SETTINGS_SELECT).eq('vendor_id', vendorId).maybeSingle()
  if (error) throw error
  if (data) return formatSettings(data)

  const { data: created, error: createError } = await supabase
    .from('marketing_settings')
    .insert({ vendor_id: vendorId })
    .select(SETTINGS_SELECT)
    .single()
  if (createError) throw createError
  return formatSettings(created)
}

export async function updateMarketingSettings(vendorId, input) {
  const { data, error } = await supabase
    .from('marketing_settings')
    .upsert({ vendor_id: vendorId, ...normaliseSettings(input) }, { onConflict: 'vendor_id' })
    .select(SETTINGS_SELECT)
    .single()
  if (error) throw error
  return formatSettings(data)
}

export function getMissingMarketingProfileFields(settings) {
  const missing = []
  if (!settings.location) missing.push('location')
  if (!settings.operatingHours) missing.push('operating hours')
  return missing
}

export async function getEligibleMarketingProducts(vendorId) {
  const products = await listProducts(vendorId)
  return products
    .filter((product) => product.is_available && product.recipeComplete !== false && Number(product.availableQuantity ?? product.inventory?.quantity ?? 0) > 0)
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: Number(product.availableQuantity ?? product.inventory?.quantity ?? 0),
      stockMode: product.stockMode || product.stock_mode || 'ready_item',
    }))
}

export async function getEligibleMarketingProduct(vendorId, productId) {
  if (!productId) throw appError('Choose an available menu item to highlight.')
  const products = await getEligibleMarketingProducts(vendorId)
  const product = products.find((item) => item.id === productId)
  if (!product) throw appError('Choose an available menu item with stock ready to sell.', 409)
  return product
}

export async function createMarketingCampaign(vendorId, draft) {
  if (!ALL_CAMPAIGN_TYPES.has(draft.campaignType)) throw appError('Choose a valid campaign type.')
  const highlightProductId = draft.highlightProductId || draft.productId || null
  const product = highlightProductId ? await getEligibleMarketingProduct(vendorId, highlightProductId) : null
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert({
      vendor_id: vendorId,
      campaign_type: draft.campaignType,
      daily_note: optionalText(draft.dailyNote, 240),
      selected_product_id: product?.id || null,
      product_name: product?.name || null,
      product_price: product?.price ?? null,
      title: draft.title,
      caption: draft.caption,
      call_to_action: draft.callToAction || null,
      hashtags: draft.hashtags || [],
      reason: draft.reason || null,
      language: draft.language,
      tone: draft.tone,
    })
    .select(CAMPAIGN_SELECT)
    .single()
  if (error) throw error
  await activity(data.id, vendorId, 'draft_created', product ? `Opening draft created with ${product.name} as an optional highlight.` : 'Opening draft created from the stall marketing profile.')
  return getMarketingCampaign(vendorId, data.id)
}

export async function listMarketingCampaigns(vendorId) {
  const { data, error } = await supabase.from('marketing_campaigns').select(CAMPAIGN_SELECT).eq('vendor_id', vendorId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(formatCampaign)
}

export async function getMarketingCampaign(vendorId, campaignId) {
  const { data, error } = await supabase.from('marketing_campaigns').select(CAMPAIGN_SELECT).eq('id', campaignId).eq('vendor_id', vendorId).single()
  if (error?.code === 'PGRST116') throw appError('Campaign not found.', 404)
  if (error) throw error
  return formatCampaign(data)
}

function formatCampaign(campaign) {
  return {
    id: campaign.id,
    shareToken: campaign.share_token,
    campaignType: campaign.campaign_type || 'product_promotion',
    dailyNote: campaign.daily_note || '',
    productId: campaign.selected_product_id || null,
    productName: campaign.product_name || '',
    productPrice: campaign.product_price === null || campaign.product_price === undefined ? null : Number(campaign.product_price),
    title: campaign.title,
    caption: campaign.caption,
    callToAction: campaign.call_to_action || '',
    hashtags: campaign.hashtags || [],
    reason: campaign.reason || '',
    language: campaign.language,
    tone: campaign.tone,
    status: campaign.status,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
    activity: (campaign.campaign_activity || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((item) => ({ id: item.id, type: item.activity_type, detail: item.detail || '', createdAt: item.created_at })),
  }
}

export async function editMarketingCampaign(vendorId, campaignId, input) {
  const campaign = await getMarketingCampaign(vendorId, campaignId)
  if (campaign.status !== 'draft') throw appError('Only draft campaigns can be edited.', 409)
  const { error } = await supabase.from('marketing_campaigns').update(campaignPayload(input)).eq('id', campaignId).eq('vendor_id', vendorId)
  if (error) throw error
  await activity(campaignId, vendorId, 'draft_edited', 'Vendor edited the campaign draft.')
  return getMarketingCampaign(vendorId, campaignId)
}

export async function setMarketingCampaignStatus(vendorId, campaignId, status) {
  if (!['approved', 'rejected'].includes(status)) throw appError('Campaign status must be approved or rejected.')
  const campaign = await getMarketingCampaign(vendorId, campaignId)
  if (campaign.status !== 'draft') throw appError('This campaign has already been reviewed.', 409)
  const { error } = await supabase.from('marketing_campaigns').update({ status }).eq('id', campaignId).eq('vendor_id', vendorId)
  if (error) throw error
  await activity(campaignId, vendorId, status, status === 'approved' ? 'Vendor approved this campaign for sharing.' : 'Vendor rejected this campaign.')
  return getMarketingCampaign(vendorId, campaignId)
}

export async function recordMarketingShare(vendorId, campaignId, channel) {
  const campaign = await getMarketingCampaign(vendorId, campaignId)
  if (campaign.status !== 'approved') throw appError('Approve the campaign before sharing it.', 409)
  if (channel !== 'whatsapp') throw appError('WhatsApp is the only sharing channel currently enabled.')
  await activity(campaignId, vendorId, 'share_opened', 'Vendor opened WhatsApp with the approved campaign caption.')
  return getMarketingCampaign(vendorId, campaignId)
}

export async function getPublicMarketingCampaign(shareToken) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(shareToken || '')) throw appError('Promotion link not found.', 404)
  const { data, error } = await supabase.from('marketing_campaigns')
    .select('share_token, campaign_type, product_name, product_price, title, caption, call_to_action, hashtags, status')
    .eq('share_token', shareToken).eq('status', 'approved').maybeSingle()
  if (error) throw error
  if (!data) throw appError('Promotion link not found.', 404)
  return {
    shareToken: data.share_token,
    campaignType: data.campaign_type || 'product_promotion',
    productName: data.product_name || '',
    productPrice: data.product_price === null || data.product_price === undefined ? null : Number(data.product_price),
    title: data.title,
    caption: data.caption,
    callToAction: data.call_to_action || '',
    hashtags: data.hashtags || [],
  }
}