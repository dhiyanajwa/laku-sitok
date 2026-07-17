import supabase from '../config/supabase.js'
import { appError } from '../utils/app-error.js'

const CAMPAIGN_SELECT = `id, share_token, product_name, product_price, title, caption, call_to_action, hashtags, reason, language, tone, status, created_at, updated_at, selected_product_id, campaign_activity(id, activity_type, detail, created_at)`

function normaliseSettings(input) {
  const updates = {}
  if (input.brandTone !== undefined) {
    const value = input.brandTone?.trim()
    if (!value) throw appError('Brand tone cannot be empty.')
    updates.brand_tone = value.slice(0, 80)
  }
  if (input.language !== undefined) {
    const value = input.language?.trim()
    if (!value) throw appError('Language cannot be empty.')
    updates.language = value.slice(0, 40)
  }
  if (input.location !== undefined) updates.location = input.location?.trim().slice(0, 120) || null
  if (input.operatingHours !== undefined) updates.operating_hours = input.operatingHours?.trim().slice(0, 120) || null
  if (input.hashtagsEnabled !== undefined) {
    if (typeof input.hashtagsEnabled !== 'boolean') throw appError('hashtagsEnabled must be true or false.')
    updates.hashtags_enabled = input.hashtagsEnabled
  }
  if (!Object.keys(updates).length) throw appError('Provide at least one setting to update.')
  return updates
}

function campaignPayload(input) {
  const updates = {}
  if (input.title !== undefined) {
    const value = input.title?.trim()
    if (!value) throw appError('Title cannot be empty.')
    updates.title = value.slice(0, 120)
  }
  if (input.caption !== undefined) {
    const value = input.caption?.trim()
    if (!value) throw appError('Caption cannot be empty.')
    updates.caption = value.slice(0, 1000)
  }
  if (input.callToAction !== undefined) updates.call_to_action = input.callToAction?.trim().slice(0, 180) || null
  if (input.hashtags !== undefined) {
    if (!Array.isArray(input.hashtags)) throw appError('hashtags must be a list.')
    updates.hashtags = input.hashtags.map((tag) => String(tag).trim().replace(/^#/, '')).filter(Boolean).slice(0, 8)
  }
  if (!Object.keys(updates).length) throw appError('Provide a campaign field to update.')
  return updates
}

async function activity(campaignId, vendorId, type, detail) {
  const { error } = await supabase.from('campaign_activity').insert({ campaign_id: campaignId, vendor_id: vendorId, activity_type: type, detail })
  if (error) throw error
}

export async function getMarketingSettings(vendorId) {
  const { data, error } = await supabase.from('marketing_settings').select('brand_tone, language, location, operating_hours, hashtags_enabled').eq('vendor_id', vendorId).maybeSingle()
  if (error) throw error
  if (data) return { brandTone: data.brand_tone, language: data.language, location: data.location || '', operatingHours: data.operating_hours || '', hashtagsEnabled: data.hashtags_enabled }

  const { data: created, error: createError } = await supabase.from('marketing_settings').insert({ vendor_id: vendorId }).select('brand_tone, language, location, operating_hours, hashtags_enabled').single()
  if (createError) throw createError
  return { brandTone: created.brand_tone, language: created.language, location: '', operatingHours: '', hashtagsEnabled: created.hashtags_enabled }
}

export async function updateMarketingSettings(vendorId, input) {
  const { data, error } = await supabase.from('marketing_settings').upsert({ vendor_id: vendorId, ...normaliseSettings(input) }, { onConflict: 'vendor_id' }).select('brand_tone, language, location, operating_hours, hashtags_enabled').single()
  if (error) throw error
  return { brandTone: data.brand_tone, language: data.language, location: data.location || '', operatingHours: data.operating_hours || '', hashtagsEnabled: data.hashtags_enabled }
}

export async function getEligibleMarketingProducts(vendorId) {
  const { data, error } = await supabase.from('inventory').select('quantity, reorder_level, products!inner(id, name, price, is_available, vendor_id)').eq('products.vendor_id', vendorId).eq('products.is_available', true)
  if (error) throw error
  return (data || []).map((row) => ({ id: row.products.id, name: row.products.name, price: Number(row.products.price), quantity: row.quantity, reorderLevel: row.reorder_level })).filter((product) => product.quantity > product.reorderLevel)
}

export async function getEligibleMarketingProduct(vendorId, productId) {
  if (!productId) throw appError('Choose a product to promote.')
  const products = await getEligibleMarketingProducts(vendorId)
  const product = products.find((item) => item.id === productId)
  if (!product) throw appError('Choose an available product with stock above its reorder level.', 409)
  return product
}

export async function createMarketingCampaign(vendorId, draft) {
  const product = await getEligibleMarketingProduct(vendorId, draft.productId)
  const { data, error } = await supabase.from('marketing_campaigns').insert({
    vendor_id: vendorId, selected_product_id: product.id, product_name: product.name, product_price: product.price,
    title: draft.title, caption: draft.caption, call_to_action: draft.callToAction || null, hashtags: draft.hashtags || [],
    reason: draft.reason || null, language: draft.language, tone: draft.tone,
  }).select(CAMPAIGN_SELECT).single()
  if (error) throw error
  await activity(data.id, vendorId, 'draft_created', `AI draft created for ${product.name}.`)
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
    id: campaign.id, shareToken: campaign.share_token, productId: campaign.selected_product_id, productName: campaign.product_name, productPrice: Number(campaign.product_price),
    title: campaign.title, caption: campaign.caption, callToAction: campaign.call_to_action || '', hashtags: campaign.hashtags || [],
    reason: campaign.reason || '', language: campaign.language, tone: campaign.tone, status: campaign.status,
    createdAt: campaign.created_at, updatedAt: campaign.updated_at,
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
  const details = {
    whatsapp: 'Vendor opened WhatsApp with the approved campaign caption.',
    // Facebook activity is deferred with the Facebook sharing feature.
    // facebook: 'Vendor opened Facebook share with the approved campaign.',
  }
  if (!details[channel]) throw appError('WhatsApp is the only sharing channel currently enabled.')
  await activity(campaignId, vendorId, 'share_opened', details[channel])
  return getMarketingCampaign(vendorId, campaignId)
}
export async function getPublicMarketingCampaign(shareToken) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(shareToken || '')) throw appError('Promotion link not found.', 404)
  const { data, error } = await supabase.from('marketing_campaigns')
    .select('share_token, product_name, product_price, title, caption, call_to_action, hashtags, status')
    .eq('share_token', shareToken).eq('status', 'approved').maybeSingle()
  if (error) throw error
  if (!data) throw appError('Promotion link not found.', 404)
  return { shareToken: data.share_token, productName: data.product_name, productPrice: Number(data.product_price), title: data.title, caption: data.caption, callToAction: data.call_to_action || '', hashtags: data.hashtags || [] }
}

