import { Router } from 'express'
import { getAgentActivity } from '../controllers/agent.controller.js'
import { requireVendor } from '../middleware/require-vendor.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()
router.get('/activity', requireVendor, asyncHandler(getAgentActivity))
export default router
