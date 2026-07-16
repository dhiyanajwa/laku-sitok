import { Router } from 'express'
import { postAdvisorQuestion } from '../controllers/advisor.controller.js'
import { requireVendor } from '../middleware/require-vendor.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()
router.post('/ask', requireVendor, asyncHandler(postAdvisorQuestion))
export default router
