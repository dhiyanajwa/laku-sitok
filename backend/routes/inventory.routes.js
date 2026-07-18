import { Router } from 'express'
import { getInventory, patchInventory } from '../controllers/inventory.controller.js'
import { getAvailability, getAvailabilityForProduct, getIngredients, getRecipeForProduct, patchIngredient, postIngredient, postIngredientAdjustment, putRecipeForProduct } from '../controllers/ingredient.controller.js'
import { requireVendor } from '../middleware/require-vendor.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()
router.use(requireVendor)
router.get('/', asyncHandler(getInventory))
router.patch('/:productId', asyncHandler(patchInventory))
router.get('/ingredients', asyncHandler(getIngredients))
router.post('/ingredients', asyncHandler(postIngredient))
router.patch('/ingredients/:ingredientId', asyncHandler(patchIngredient))
router.post('/ingredients/:ingredientId/adjust', asyncHandler(postIngredientAdjustment))
router.get('/availability', asyncHandler(getAvailability))
router.get('/recipes/:productId', asyncHandler(getRecipeForProduct))
router.put('/recipes/:productId', asyncHandler(putRecipeForProduct))
router.get('/availability/:productId', asyncHandler(getAvailabilityForProduct))
export default router