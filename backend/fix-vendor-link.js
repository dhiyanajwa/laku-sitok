import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const demoVendorEmail = process.env.DEMO_VENDOR_EMAIL?.trim().toLowerCase()
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const missing = [
  !demoVendorEmail && 'DEMO_VENDOR_EMAIL',
  !supabaseUrl && 'SUPABASE_URL',
  !supabaseServiceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
].filter(Boolean)

if (missing.length) {
  console.error('Set ' + missing.join(', ') + ' in backend/.env before running this helper.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })

  if (authError) {
    throw new Error('Could not list Supabase Auth users: ' + authError.message)
  }

  const authUser = authData.users.find((user) => user.email?.trim().toLowerCase() === demoVendorEmail)

  if (!authUser) {
    throw new Error('No Supabase Auth user matches DEMO_VENDOR_EMAIL. Create the dedicated demo account first.')
  }

  const { data: vendor, error: vendorError } = await supabase
    .from('users')
    .select('id, name, email, role, auth_user_id')
    .eq('name', 'Warung Murni')
    .eq('role', 'vendor')
    .maybeSingle()

  if (vendorError) {
    throw new Error('Could not find the Warung Murni vendor record: ' + vendorError.message)
  }

  if (!vendor) {
    throw new Error('No Warung Murni vendor record exists. Run database/seed.sql before linking the Auth user.')
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ auth_user_id: authUser.id, email: demoVendorEmail })
    .eq('id', vendor.id)

  if (updateError) {
    throw new Error('Could not update the vendor Auth link: ' + updateError.message)
  }

  console.log('Vendor Auth link updated for the configured demo account.')
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
