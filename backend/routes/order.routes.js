import { Router } from 'express'
import { getOrderTracking, getOrders, patchOrderStatus, postOrder } from '../controllers/order.controller.js'
import { requireVendor } from '../middleware/require-vendor.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()
router.get('/track/:trackingToken', asyncHandler(getOrderTracking))
router.get('/', requireVendor, asyncHandler(getOrders))
router.post('/', asyncHandler(postOrder))
router.patch('/:id/status', requireVendor, asyncHandler(patchOrderStatus))
export default router
