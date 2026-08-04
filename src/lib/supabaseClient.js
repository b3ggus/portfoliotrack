// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// These come from your .env file (see setup notes) — never hardcode them directly.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
