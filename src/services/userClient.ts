import { createClient } from '@supabase/supabase-js'

export const createUserClient = (jwt: string) =>
  createClient(
    process.env['SUPABASE_URL'] ?? '',
    process.env['SUPABASE_ANON_KEY'] ?? '',
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  )
