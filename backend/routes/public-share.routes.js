import { Router } from 'express'
import { getPublicMarketingCampaign } from '../services/marketing.service.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]))
}

router.get('/campaign/:shareToken', asyncHandler(async (request, response) => {
  const campaign = await getPublicMarketingCampaign(request.params.shareToken)
  const baseUrl = (process.env.BACKEND_PUBLIC_URL || `${request.protocol}://${request.get('host')}`).replace(/\/$/, '')
  const campaignUrl = `${baseUrl}/share/campaign/${campaign.shareToken}`
  const menuUrl = `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/menu`
  const title = `${campaign.title} | Laku Sitok`
  const description = campaignText(campaign)

  response.type('html').send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Laku Sitok">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(campaignUrl)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
</head><body style="font-family:Arial,sans-serif;max-width:680px;margin:48px auto;padding:0 20px;color:#16332b">
<h1>${escapeHtml(campaign.title)}</h1><p style="white-space:pre-wrap;font-size:18px;line-height:1.55">${escapeHtml(description)}</p>
<p><strong>${escapeHtml(campaign.productName)}</strong> — RM ${campaign.productPrice.toFixed(2)}</p>
<a href="${escapeHtml(menuUrl)}" style="display:inline-block;background:#167a5a;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">View customer menu</a>
</body></html>`)
}))

function campaignText(campaign) {
  const tags = campaign.hashtags.length ? `\n\n${campaign.hashtags.map((tag) => `#${tag}`).join(' ')}` : ''
  return `${campaign.caption}${campaign.callToAction ? `\n\n${campaign.callToAction}` : ''}${tags}`
}

export default router
