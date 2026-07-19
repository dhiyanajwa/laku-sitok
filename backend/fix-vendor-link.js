import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const TARGET_EMAIL = 'dhiya@gmail.com'

async function main() {
  // 1. Find the auth user by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) { console.error('Failed to list auth users:', listError.message); process.exit(1) }

  const authUser = users.find(u => u.email === TARGET_EMAIL)
  if (!authUser) {
    console.error(`No Supabase Auth user found with email: ${TARGET_EMAIL}`)
    console.error('Make sure you created the account in Supabase Authentication.')
    process.exit(1)
  }
  console.log(`Found auth user: ${authUser.email} (id: ${authUser.id})`)

  // 2. Check if there's already a vendor row in public.users
  const { data: existingVendor } = await supabase
    .from('users')
    .select('id, name, email, role, auth_user_id')
    .eq('role', 'vendor')
    .single()

  if (existingVendor) {
    console.log(`Found existing vendor row: ${existingVendor.email} (id: ${existingVendor.id})`)

    // Update the existing vendor row to link dhiya's auth UUID
    const { error: updateError } = await supabase
      .from('users')
      .update({ auth_user_id: authUser.id, email: TARGET_EMAIL })
      .eq('id', existingVendor.id)

    if (updateError) { console.error('Failed to update vendor link:', updateError.message); process.exit(1) }
    console.log(`✅ Linked ${TARGET_EMAIL} auth ID to vendor "${existingVendor.name}"`)
  } else {
    // No vendor row at all — insert one
    const { error: insertError } = await supabase
      .from('users')
      .insert({ name: 'Warung Murni', email: TARGET_EMAIL, role: 'vendor', auth_user_id: authUser.id })

    if (insertError) { console.error('Failed to insert vendor row:', insertError.message); process.exit(1) }
    console.log(`✅ Created new vendor row for ${TARGET_EMAIL}`)
  }

  console.log('\nDone! You can now log in with dhiya@gmail.com and access vendor pages.')
}

main()
