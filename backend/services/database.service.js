import supabase from '../config/supabase.js'

export async function checkDatabaseConnection() {
  const { error } = await supabase.from('users').select('id').limit(1)

  if (error?.code === '42P01') {
    return {
      connected: true,
      schemaReady: false,
      message: 'Supabase is connected. Run database/schema.sql to create the tables.',
    }
  }

  if (error) {
    throw error
  }

  return {
    connected: true,
    schemaReady: true,
    message: 'Supabase database is connected and the schema is ready.',
  }
}
