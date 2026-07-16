import { Router } from 'express'
import { getInventory, patchInventory } from '../controllers/inventory.controller.js'
import { requireVendor } from '../middleware/require-vendor.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()

router.get('/', requireVendor, asyncHandler(getInventory))
router.patch('/:productId', requireVendor, asyncHandler(patchInventory))

export default router
