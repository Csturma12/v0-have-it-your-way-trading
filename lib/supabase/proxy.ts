import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Skip if Supabase env vars are not properly configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL2
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY2

  // Validate URL format - must start with https:// or http://
  // This prevents crashes when env vars are accidentally swapped (URL field has the key, etc.)
  const isValidUrl = supabaseUrl && /^https?:\/\//i.test(supabaseUrl)

  if (!supabaseUrl || !supabaseKey || !isValidUrl) {
    if (supabaseUrl && !isValidUrl) {
      console.warn(
        '[v0] NEXT_PUBLIC_SUPABASE_URL is set but does not look like a valid URL. ' +
        'It should start with https://. Got: ' + supabaseUrl.slice(0, 20) + '...'
      )
    }
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const publicPaths = ['/auth/login', '/auth/sign-up', '/auth/callback', '/auth/error', '/auth/sign-up-success']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))
  
  // API routes that should be accessible (for webhooks, etc.)
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  if (!user && !isPublicPath && !isApiRoute) {
    // No user and trying to access protected route - redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
