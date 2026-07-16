import { getAnalyticsOverview } from '../services/analytics.service.js'

export function getBusinessOverview(vendorId) {
  return getAnalyticsOverview(vendorId)
}
