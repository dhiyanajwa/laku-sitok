import { Router } from 'express'
import { getProducts, patchProduct, postProduct, removeProduct } from '../controllers/product.controller.js'
import { requireVendor } from '../middleware/require-vendor.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()

router.get('/', asyncHandler(getProducts))
router.post('/', requireVendor, asyncHandler(postProduct))
router.patch('/:id', requireVendor, asyncHandler(patchProduct))
router.delete('/:id', requireVendor, asyncHandler(removeProduct))

export default router
