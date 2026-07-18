import { createProduct, deleteProduct, listProducts, updateProduct } from '../services/product.service.js'
import { createRecipeDraft } from '../services/recipe-suggestion.service.js'
import { getVendorId } from '../services/vendor.service.js'

export async function getProducts(request, response) {
  const vendorId = await getVendorId(request.query.vendorId)
  response.json({ data: await listProducts(vendorId) })
}

export async function postProduct(request, response) {
  response.status(201).json({ data: await createProduct(request.vendorId, request.body) })
}

export async function postRecipeDraft(request, response) {
  response.json({ data: await createRecipeDraft(request.vendorId, request.body) })
}

export async function patchProduct(request, response) {
  response.json({ data: await updateProduct(request.params.id, request.vendorId, request.body) })
}

export async function removeProduct(request, response) {
  await deleteProduct(request.params.id, request.vendorId)
  response.status(204).send()
}
