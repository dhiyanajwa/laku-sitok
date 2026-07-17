import { generateMarketingCampaign } from '../agents/marketing.agent.js'
import { editMarketingCampaign, getEligibleMarketingProducts, getMarketingSettings as loadMarketingSettings, listMarketingCampaigns, recordMarketingShare, setMarketingCampaignStatus, updateMarketingSettings } from '../services/marketing.service.js'

export async function getMarketingSettings(request, response) { response.json({ data: await loadMarketingSettings(request.vendorId) }) }
export async function patchMarketingSettings(request, response) { response.json({ data: await updateMarketingSettings(request.vendorId, request.body) }) }
export async function getMarketingProducts(request, response) { response.json({ data: await getEligibleMarketingProducts(request.vendorId) }) }
export async function getMarketingCampaigns(request, response) { response.json({ data: await listMarketingCampaigns(request.vendorId) }) }
export async function postMarketingCampaign(request, response) { response.status(201).json({ data: await generateMarketingCampaign(request.vendorId, request.vendor?.name, request.body) }) }
export async function patchMarketingCampaign(request, response) { response.json({ data: await editMarketingCampaign(request.vendorId, request.params.id, request.body) }) }
export async function postMarketingCampaignStatus(request, response) { response.json({ data: await setMarketingCampaignStatus(request.vendorId, request.params.id, request.body.status) }) }
export async function postMarketingCampaignShare(request, response) { response.json({ data: await recordMarketingShare(request.vendorId, request.params.id, request.body?.channel || 'whatsapp') }) }


