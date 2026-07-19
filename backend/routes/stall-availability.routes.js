import { Router } from 'express'
import { getPublicStallAvailability, getVendorStallAvailability, patchStallOverride } from '../controllers/stall-availability.controller.js'
import { requireVendor } from '../middleware/require-vendor.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()

router.get('/', asyncHandler(getPublicStallAvailability))
router.get('/vendor', requireVendor, asyncHandler(getVendorStallAvailability))
router.patch('/override', requireVendor, asyncHandler(patchStallOverride))

export default router
