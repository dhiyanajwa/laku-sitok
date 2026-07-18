import { adjustIngredient, createIngredient, getProductAvailability, getRecipe, listIngredients, listProductAvailability, replaceRecipe, updateIngredient } from '../services/ingredient.service.js'

export async function getIngredients(request, response) { response.json({ data: await listIngredients(request.vendorId) }) }
export async function postIngredient(request, response) { response.status(201).json({ data: await createIngredient(request.vendorId, request.body) }) }
export async function patchIngredient(request, response) { response.json({ data: await updateIngredient(request.params.ingredientId, request.vendorId, request.body) }) }
export async function postIngredientAdjustment(request, response) { response.json({ data: await adjustIngredient(request.params.ingredientId, request.vendorId, request.body) }) }
export async function getAvailability(request, response) { response.json({ data: await listProductAvailability(request.vendorId) }) }
export async function getRecipeForProduct(request, response) { response.json({ data: await getRecipe(request.vendorId, request.params.productId) }) }
export async function putRecipeForProduct(request, response) { response.json({ data: await replaceRecipe(request.vendorId, request.params.productId, request.body) }) }
export async function getAvailabilityForProduct(request, response) { response.json({ data: await getProductAvailability(request.vendorId, request.params.productId) }) }