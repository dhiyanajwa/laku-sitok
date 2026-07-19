import { Router } from 'express'
import { getMarketingCampaigns, getMarketingProducts, getMarketingSettings, patchMarketingCampaign, patchMarketingSettings, postMarketingCampaign, postMarketingCampaignShare, postMarketingCampaignStatus } from '../controllers/marketing.controller.js'
import { requireVendor } from '../middleware/require-vendor.js'
import { vendorAiRateLimit } from '../middleware/rate-limit.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()
router.use(requireVendor)
router.get('/settings', asyncHandler(getMarketingSettings))
router.patch('/settings', asyncHandler(patchMarketingSettings))
router.get('/products', asyncHandler(getMarketingProducts))
router.get('/campaigns', asyncHandler(getMarketingCampaigns))
router.post('/campaigns/generate', vendorAiRateLimit, asyncHandler(postMarketingCampaign))
router.patch('/campaigns/:id', asyncHandler(patchMarketingCampaign))
router.post('/campaigns/:id/status', asyncHandler(postMarketingCampaignStatus))
router.post('/campaigns/:id/share-opened', asyncHandler(postMarketingCampaignShare))
export default router
