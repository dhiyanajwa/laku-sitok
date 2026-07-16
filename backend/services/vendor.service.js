import supabase from '../config/supabase.js'
import { appError } from '../utils/app-error.js'

const demoVendorEmail = 'owner@warungmurni.test'

export async function getVendorId(vendorId) {
  if (vendorId) return vendorId

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', demoVendorEmail)
    .eq('role', 'vendor')
    .single()

  if (error || !data) {
    throw appError('Demo vendor was not found. Run database/seed.sql first.', 500)
  }

  return data.id
}
