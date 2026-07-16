import { Router } from 'express'
import { getOverview } from '../controllers/analytics.controller.js'
import { requireVendor } from '../middleware/require-vendor.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()
router.get('/overview', requireVendor, asyncHandler(getOverview))
export default router
