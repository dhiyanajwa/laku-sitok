import supabase from '../config/supabase.js'
import { appError } from '../utils/app-error.js'

export async function getVendorId(vendorId) {
  if (vendorId) return vendorId

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'vendor')
    .limit(2)

  if (error) throw error
  if (!data?.length) {
    throw appError('No vendor profile is available yet. Sign in to the vendor portal and add your menu items there.', 404)
  }
  if (data.length > 1) {
    throw appError('Choose a vendor before opening the public customer menu.', 400)
  }

  return data[0].id
}
