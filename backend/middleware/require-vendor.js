import supabase from '../config/supabase.js'

async function attachVendorFromToken(request, token) {
  const { data: authData, error: authError } = await supabase.auth.getUser(token)

  if (authError || !authData.user) {
    return { error: { status: 401, message: 'Your session is invalid or has expired.' } }
  }

  const { data: vendor, error: vendorError } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('auth_user_id', authData.user.id)
    .eq('role', 'vendor')
    .single()

  if (vendorError || !vendor) {
    return { error: { status: 403, message: 'This account is not linked to a vendor.' } }
  }

  request.vendorId = vendor.id
  request.vendor = vendor
  return { vendor }
}

export async function requireVendor(request, response, next) {
  const authorization = request.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    return response.status(401).json({ status: 'error', message: 'Sign in as a vendor to continue.' })
  }

  const result = await attachVendorFromToken(request, authorization.slice(7))
  if (result.error) return response.status(result.error.status).json({ status: 'error', message: result.error.message })
  return next()
}

// Customer pages can load the single public vendor menu without a login. When
// a vendor is signed in, use that vendor instead of falling back to demo data.
export async function attachVendorIfSignedIn(request, response, next) {
  const authorization = request.headers.authorization
  if (!authorization?.startsWith('Bearer ')) return next()

  const result = await attachVendorFromToken(request, authorization.slice(7))
  if (result.error) return response.status(result.error.status).json({ status: 'error', message: result.error.message })
  return next()
}
