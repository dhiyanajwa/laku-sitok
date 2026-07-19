import { Router } from 'express'
import { getProducts, getPublicProducts, patchProduct, postProduct, postRecipeDraft, removeProduct } from '../controllers/product.controller.js'
import { requireVendor } from '../middleware/require-vendor.js'
import { vendorAiRateLimit } from '../middleware/rate-limit.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()

// The customer menu must never receive cost, stock, recipe, or popularity data.
router.get('/', asyncHandler(getPublicProducts))
router.get('/vendor', requireVendor, asyncHandler(getProducts))
router.post('/', requireVendor, asyncHandler(postProduct))
router.post('/recipe-draft', requireVendor, vendorAiRateLimit, asyncHandler(postRecipeDraft))
router.patch('/:id', requireVendor, asyncHandler(patchProduct))
router.delete('/:id', requireVendor, asyncHandler(removeProduct))

export default router
