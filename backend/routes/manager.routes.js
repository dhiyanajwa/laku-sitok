import { Router } from 'express'
import { getManagerActions, getManagerContext, postManagerActionCancellation, postManagerActionConfirmation, postManagerRequest } from '../controllers/manager.controller.js'
import { requireVendor } from '../middleware/require-vendor.js'
import { managerActionRateLimit, managerRequestRateLimit } from '../middleware/rate-limit.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()
router.use(requireVendor)
router.get('/context', asyncHandler(getManagerContext))
router.get('/actions', asyncHandler(getManagerActions))
router.post('/request', managerRequestRateLimit, asyncHandler(postManagerRequest))
router.post('/actions/:id/confirm', managerActionRateLimit, asyncHandler(postManagerActionConfirmation))
router.post('/actions/:id/cancel', managerActionRateLimit, asyncHandler(postManagerActionCancellation))

export default router