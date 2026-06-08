import { updateSession } from '@/lib/supabase/proxy'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * GLOBAL API PAUSE / KILL SWITCH
 * ------------------------------------------------------------------
 * While this is `true`, every request to `/api/*` is short-circuited
 * and returns 503 before any route handler runs — so NO external API
 * calls (Alpaca, Finnhub, Polygon, Supabase queries in routes, etc.)
 * are made. Nothing is deleted; flip this back to `false` to resume.
 *
 * Can also be controlled without a code change via the env var
 * `API_PAUSED` ("true"/"false"). The env var, if set, wins.
 */
const API_PAUSED_DEFAULT = true

function isApiPaused() {
  const envFlag = process.env.API_PAUSED
  if (envFlag === 'true') return true
  if (envFlag === 'false') return false
  return API_PAUSED_DEFAULT
}

export async function proxy(request: NextRequest) {
  // Kill switch: block all API traffic while paused
  if (request.nextUrl.pathname.startsWith('/api/') && isApiPaused()) {
    return NextResponse.json(
      {
        error: 'paused',
        message: 'API calls are paused for this project. Set API_PAUSED to false (or flip the flag in proxy.ts) to resume.',
      },
      { status: 503, headers: { 'x-api-paused': '1' } },
    )
  }

  // Skip auth middleware if Supabase env vars are not set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL2
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY2
  if (!supabaseUrl || !supabaseKey) {
    return
  }
  
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
