import supabase from '../config/supabase.js'

export async function requireVendor(request, response, next) {
  const authorization = request.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    return response.status(401).json({ status: 'error', message: 'Sign in as a vendor to continue.' })
  }

  const token = authorization.slice(7)
  const { data: authData, error: authError } = await supabase.auth.getUser(token)

  if (authError || !authData.user) {
    return response.status(401).json({ status: 'error', message: 'Your session is invalid or has expired.' })
  }

  const { data: vendor, error: vendorError } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('auth_user_id', authData.user.id)
    .eq('role', 'vendor')
    .single()

  if (vendorError || !vendor) {
    return response.status(403).json({ status: 'error', message: 'This account is not linked to a vendor.' })
  }

  request.vendorId = vendor.id
  request.vendor = vendor
  return next()
}
