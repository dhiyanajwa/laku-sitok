import axios from 'axios'
import { supabase } from '../config/supabase'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000' })

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) config.headers.Authorization = `Bearer ${data.session.access_token}`
  return config
})

export const getHealth = () => api.get('/api/health')
export const getAnalyticsOverview = () => api.get('/api/analytics/overview')
export const askAdvisor = (question) => api.post('/api/advisor/ask', { question })
export const getAgentActivity = () => api.get('/api/agents/activity')
export const getProducts = () => api.get('/api/products')
export const createOrder = (order) => api.post('/api/orders', order)
export const getOrderTracking = (trackingToken) => api.get(`/api/orders/track/${trackingToken}`)
export const getOrders = () => api.get('/api/orders')
export const updateOrderStatus = (orderId, status) => api.patch(`/api/orders/${orderId}/status`, { status })
export const getInventory = () => api.get('/api/inventory')
export const updateInventory = (productId, values) => api.patch(`/api/inventory/${productId}`, values)
