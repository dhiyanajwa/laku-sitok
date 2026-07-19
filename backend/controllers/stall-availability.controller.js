import { getStallAvailability, setStallOverride } from '../services/stall-availability.service.js'
import { getVendorId } from '../services/vendor.service.js'

export async function getPublicStallAvailability(request, response) {
  const vendorId = await getVendorId(request.query.vendorId)
  response.json({ data: await getStallAvailability(vendorId) })
}

export async function getVendorStallAvailability(request, response) {
  response.json({ data: await getStallAvailability(request.vendorId) })
}

export async function patchStallOverride(request, response) {
  response.json({ data: await setStallOverride(request.vendorId, request.body) })
}
