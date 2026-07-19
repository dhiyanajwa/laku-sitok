import { Router } from 'express'
import { getProducts, patchProduct, postProduct, postRecipeDraft, removeProduct } from '../controllers/product.controller.js'
import { attachVendorIfSignedIn, requireVendor } from '../middleware/require-vendor.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()

router.get('/', attachVendorIfSignedIn, asyncHandler(getProducts))
router.post('/', requireVendor, asyncHandler(postProduct))
router.post('/recipe-draft', requireVendor, asyncHandler(postRecipeDraft))
router.patch('/:id', requireVendor, asyncHandler(patchProduct))
router.delete('/:id', requireVendor, asyncHandler(removeProduct))

export default router
