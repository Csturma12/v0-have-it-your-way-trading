import { createBrowserClient } from '@supabase/ssr'

let warned = false

/**
 * Creates a Supabase browser client.
 * Returns null if env vars are missing or malformed (e.g. URL field contains a key).
 * This prevents the entire app from crashing when Supabase isn't configured correctly.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL2
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY2

  // Validate URL must start with http:// or https://
  // Catches the common mistake of putting the secret/anon key in the URL field
  const isValidUrl = supabaseUrl && /^https?:\/\//i.test(supabaseUrl)

  if (!supabaseUrl || !supabaseKey || !isValidUrl) {
    if (typeof window !== 'undefined' && !warned) {
      warned = true
      const preview = supabaseUrl ? supabaseUrl.slice(0, 25) + '...' : '(empty)'
      console.warn(
        '[v0] Supabase is not configured correctly. Auth features will be disabled. ' +
        'NEXT_PUBLIC_SUPABASE_URL should start with https://. Got: ' + preview
      )
    }
    return null
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
