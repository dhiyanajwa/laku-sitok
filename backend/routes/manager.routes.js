import { Router } from 'express'
import { getManagerActions, getManagerContext, postManagerActionCancellation, postManagerActionConfirmation, postManagerRequest } from '../controllers/manager.controller.js'
import { requireVendor } from '../middleware/require-vendor.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()
router.use(requireVendor)
router.get('/context', asyncHandler(getManagerContext))
router.get('/actions', asyncHandler(getManagerActions))
router.post('/request', asyncHandler(postManagerRequest))
router.post('/actions/:id/confirm', asyncHandler(postManagerActionConfirmation))
router.post('/actions/:id/cancel', asyncHandler(postManagerActionCancellation))

export default router